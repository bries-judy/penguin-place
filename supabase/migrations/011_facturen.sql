-- ═══════════════════════════════════════════════════════════════
-- PENGUIN PLACE — Migratie 011: Factureringssysteem
-- ═══════════════════════════════════════════════════════════════
--
-- Introduces: invoices, invoice_lines, factuur_nummers
-- Billing source: contracten (NOT planned_attendance)
-- Multi-tenant: all tables scoped to organisatie_id
-- Idempotency: UNIQUE (organisatie_id, parent_id, periode_start, periode_eind)
--
-- ⚠️  Known limitation (MVP):
--     contactpersonen are per-child. A parent with two children
--     has two separate contactpersoon rows. The generation function
--     groups by contactpersoon_id — if the same physical person is
--     registered separately for each child they will receive two
--     invoices. Resolution: add an ouders table in a future migration.
-- ═══════════════════════════════════════════════════════════════


-- ─────────────────────────────────────────────────────
-- 1. Enum: factuur_status
-- ─────────────────────────────────────────────────────

CREATE TYPE public.factuur_status AS ENUM ('draft', 'sent', 'paid', 'overdue');


-- ─────────────────────────────────────────────────────
-- 2. Sequence table: factuur_nummers
--    Atomic per-org per-year counter.
--    Protected by SECURITY DEFINER — clients cannot read/write it directly.
-- ─────────────────────────────────────────────────────

CREATE TABLE public.factuur_nummers (
  organisatie_id  UUID    NOT NULL REFERENCES public.organisaties(id) ON DELETE CASCADE,
  jaar            INTEGER NOT NULL,
  laatste_nummer  INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (organisatie_id, jaar)
);


-- ─────────────────────────────────────────────────────
-- 3. Table: invoices
-- ─────────────────────────────────────────────────────

CREATE TABLE public.invoices (
  id              UUID                  PRIMARY KEY DEFAULT gen_random_uuid(),
  organisatie_id  UUID                  NOT NULL REFERENCES public.organisaties(id),
  parent_id       UUID                  NOT NULL REFERENCES public.contactpersonen(id),
  periode_start   DATE                  NOT NULL,
  periode_eind    DATE                  NOT NULL,
  totaal_bedrag   DECIMAL(10,2)         NOT NULL DEFAULT 0,
  status          public.factuur_status NOT NULL DEFAULT 'draft',
  factuurnummer   TEXT                  NOT NULL,
  created_at      TIMESTAMPTZ           NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ           NOT NULL DEFAULT now(),

  -- Factuurnummer must be globally unique (each org sequences independently)
  CONSTRAINT invoices_factuurnummer_unique UNIQUE (factuurnummer),

  -- Idempotency: one invoice per parent per billing period per org
  CONSTRAINT invoices_idempotency UNIQUE (organisatie_id, parent_id, periode_start, periode_eind),

  -- Sanity: period must be valid
  CONSTRAINT invoices_periode_check CHECK (periode_eind >= periode_start)
);

CREATE INDEX idx_invoices_organisatie_id ON public.invoices (organisatie_id);
CREATE INDEX idx_invoices_parent_id      ON public.invoices (parent_id);
CREATE INDEX idx_invoices_periode        ON public.invoices (periode_start, periode_eind);
CREATE INDEX idx_invoices_status         ON public.invoices (status);

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


-- ─────────────────────────────────────────────────────
-- 4. Table: invoice_lines
--    Immutable once created (no updated_at).
--    dagen_actief / dagen_in_maand stored for audit transparency.
-- ─────────────────────────────────────────────────────

CREATE TABLE public.invoice_lines (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id      UUID          NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  contract_id     UUID          NOT NULL REFERENCES public.contracten(id),
  kind_id         UUID          NOT NULL REFERENCES public.kinderen(id),
  omschrijving    TEXT,
  bedrag          DECIMAL(10,2) NOT NULL,
  dagen_actief    INTEGER,      -- actual days charged this period
  dagen_in_maand  INTEGER,      -- total days in billing month (for pro-rate audit)
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),

  CONSTRAINT invoice_lines_bedrag_check CHECK (bedrag >= 0)
);

CREATE INDEX idx_invoice_lines_invoice_id  ON public.invoice_lines (invoice_id);
CREATE INDEX idx_invoice_lines_contract_id ON public.invoice_lines (contract_id);


-- ─────────────────────────────────────────────────────
-- 5. Row Level Security
-- ─────────────────────────────────────────────────────

ALTER TABLE public.invoices        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_lines   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.factuur_nummers ENABLE ROW LEVEL SECURITY;

-- factuur_nummers: no direct client access; only via SECURITY DEFINER function
CREATE POLICY "factuur_nummers_geen_directe_toegang" ON public.factuur_nummers
  AS RESTRICTIVE FOR ALL TO authenticated USING (false);

-- invoices: scoped to own organisation
CREATE POLICY "invoices_select" ON public.invoices
  FOR SELECT TO authenticated
  USING (organisatie_id = public.get_organisatie_id());

CREATE POLICY "invoices_insert" ON public.invoices
  FOR INSERT TO authenticated
  WITH CHECK (
    organisatie_id = public.get_organisatie_id()
    AND public.has_any_role('beheerder', 'vestigingsmanager', 'klantadviseur')
  );

CREATE POLICY "invoices_update" ON public.invoices
  FOR UPDATE TO authenticated
  USING (
    organisatie_id = public.get_organisatie_id()
    AND public.has_any_role('beheerder', 'vestigingsmanager', 'klantadviseur')
  )
  WITH CHECK (
    organisatie_id = public.get_organisatie_id()
    AND public.has_any_role('beheerder', 'vestigingsmanager', 'klantadviseur')
  );

CREATE POLICY "invoices_delete" ON public.invoices
  FOR DELETE TO authenticated
  USING (
    organisatie_id = public.get_organisatie_id()
    AND public.has_role('beheerder')
  );

-- invoice_lines: access granted via parent invoice's organisatie_id
CREATE POLICY "invoice_lines_select" ON public.invoice_lines
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.invoices i
    WHERE i.id = invoice_id
      AND i.organisatie_id = public.get_organisatie_id()
  ));

CREATE POLICY "invoice_lines_insert" ON public.invoice_lines
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.invoices i
      WHERE i.id = invoice_id
        AND i.organisatie_id = public.get_organisatie_id()
    )
    AND public.has_any_role('beheerder', 'vestigingsmanager', 'klantadviseur')
  );

CREATE POLICY "invoice_lines_delete" ON public.invoice_lines
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.invoices i
      WHERE i.id = invoice_id
        AND i.organisatie_id = public.get_organisatie_id()
    )
    AND public.has_role('beheerder')
  );


-- ─────────────────────────────────────────────────────
-- 6. Function: next_factuurnummer
--    Atomically increments the per-org per-year counter.
--    Returns format: "YYYY-XXXX" (e.g. "2026-0001")
--    SECURITY DEFINER so it can write factuur_nummers even
--    though clients have no direct table access.
-- ─────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.next_factuurnummer(
  p_organisatie_id UUID,
  p_jaar           INTEGER
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_nummer INTEGER;
BEGIN
  INSERT INTO public.factuur_nummers (organisatie_id, jaar, laatste_nummer)
  VALUES (p_organisatie_id, p_jaar, 1)
  ON CONFLICT (organisatie_id, jaar)
  DO UPDATE SET laatste_nummer = factuur_nummers.laatste_nummer + 1
  RETURNING laatste_nummer INTO v_nummer;

  RETURN p_jaar::TEXT || '-' || LPAD(v_nummer::TEXT, 4, '0');
END;
$$;


-- ─────────────────────────────────────────────────────
-- 7. Function: generate_maand_facturen
--    Core billing logic. Call once per month per organisation.
--
--    Algorithm:
--      1. Find distinct billing contacts (ontvangt_factuur = true)
--         who have ≥1 active contract overlapping the billing period.
--      2. For each billing contact:
--         a. Skip if invoice already exists (idempotent).
--         b. Create invoice (status = draft, totaal = 0).
--         c. For each active contract of that contact's children:
--            - Determine base monthly amount:
--              * maandprijs if set, else
--              * uren_per_dag × cardinality(zorgdagen) × 52/12 × uurtarief, else
--              * €0.00 with "TARIEF ONTBREEKT" warning
--            - Pro-rate if contract starts or ends mid-month.
--            - Insert invoice_line.
--         d. Update invoice totaal_bedrag = SUM(lines).
--      3. Return one row per contact with outcome status.
--
--    Pro-rate formula:
--      bedrag = ROUND(maandprijs × dagen_actief / dagen_in_maand, 2)
--      where dagen_actief = LEAST(periode_eind, einddatum) - GREATEST(periode_start, startdatum) + 1
--
--    Hourly formula:
--      maandprijs = ROUND(uren_per_dag × cardinality(zorgdagen) × 52.0/12.0 × uurtarief, 2)
--
--    SECURITY DEFINER so it can bypass RLS on factuur_nummers.
-- ─────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.generate_maand_facturen(
  p_organisatie_id UUID,
  p_jaar           INTEGER,
  p_maand          INTEGER
)
RETURNS TABLE (
  parent_naam    TEXT,
  parent_email   TEXT,
  invoice_id     UUID,
  factuurnummer  TEXT,
  totaal_bedrag  DECIMAL,
  aantal_regels  INTEGER,
  uitkomst       TEXT   -- 'aangemaakt' | 'overgeslagen_bestaat' | 'overgeslagen_geen_tarief'
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_periode_start    DATE;
  v_periode_eind     DATE;
  v_dagen_in_maand   INTEGER;
  v_parent           RECORD;
  v_contract         RECORD;
  v_invoice_id       UUID;
  v_factuurnummer    TEXT;
  v_bedrag           DECIMAL(10,2);
  v_dagen_actief     INTEGER;
  v_maandprijs_calc  DECIMAL(10,2);
  v_totaal           DECIMAL(10,2);
  v_aantal           INTEGER;
BEGIN
  -- Guard: valid month
  IF p_maand < 1 OR p_maand > 12 THEN
    RAISE EXCEPTION 'Ongeldige maand: %', p_maand;
  END IF;

  v_periode_start  := make_date(p_jaar, p_maand, 1);
  v_periode_eind   := (v_periode_start + INTERVAL '1 month - 1 day')::DATE;
  v_dagen_in_maand := EXTRACT(DAY FROM v_periode_eind)::INTEGER;

  -- ── Outer loop: one invoice per billing contact ──────────────────────────
  FOR v_parent IN
    SELECT DISTINCT
      cp.id                                     AS contactpersoon_id,
      cp.voornaam || ' ' || cp.achternaam       AS naam,
      cp.email
    FROM public.contactpersonen cp
    JOIN public.kinderen k  ON k.id  = cp.kind_id
    JOIN public.contracten c ON c.kind_id = k.id
    WHERE k.organisatie_id = p_organisatie_id
      AND cp.ontvangt_factuur = true
      AND c.status = 'actief'
      AND c.startdatum <= v_periode_eind
      AND (c.einddatum IS NULL OR c.einddatum >= v_periode_start)
    ORDER BY cp.voornaam || ' ' || cp.achternaam
  LOOP

    -- ── Idempotency check ────────────────────────────────────────────────
    IF EXISTS (
      SELECT 1 FROM public.invoices
      WHERE organisatie_id = p_organisatie_id
        AND parent_id      = v_parent.contactpersoon_id
        AND periode_start  = v_periode_start
        AND periode_eind   = v_periode_eind
    ) THEN
      RETURN QUERY
        SELECT v_parent.naam,
               v_parent.email,
               NULL::UUID,
               NULL::TEXT,
               NULL::DECIMAL,
               0,
               'overgeslagen_bestaat'::TEXT;
      CONTINUE;
    END IF;

    -- ── Create invoice shell (totaal updated after lines) ────────────────
    v_factuurnummer := public.next_factuurnummer(p_organisatie_id, p_jaar);

    INSERT INTO public.invoices (
      organisatie_id, parent_id,
      periode_start,  periode_eind,
      totaal_bedrag,  status, factuurnummer
    ) VALUES (
      p_organisatie_id, v_parent.contactpersoon_id,
      v_periode_start,  v_periode_eind,
      0, 'draft', v_factuurnummer
    )
    RETURNING id INTO v_invoice_id;

    -- ── Inner loop: one line per contract for this parent's children ──────
    FOR v_contract IN
      SELECT
        c.id            AS contract_id,
        c.kind_id,
        c.maandprijs,
        c.uurtarief,
        c.uren_per_dag,
        c.zorgdagen,
        c.startdatum,
        c.einddatum,
        k.voornaam || CASE WHEN k.tussenvoegsel IS NOT NULL
                      THEN ' ' || k.tussenvoegsel ELSE '' END
                    || ' ' || k.achternaam       AS kind_naam
      FROM public.contracten c
      JOIN public.kinderen k       ON k.id  = c.kind_id
      JOIN public.contactpersonen cp ON cp.kind_id = k.id
      WHERE cp.id   = v_parent.contactpersoon_id
        AND c.status = 'actief'
        AND c.startdatum <= v_periode_eind
        AND (c.einddatum IS NULL OR c.einddatum >= v_periode_start)
      ORDER BY k.achternaam, c.startdatum
    LOOP

      -- ── Days active this month (pro-rate inputs) ────────────────────
      v_dagen_actief := (
        LEAST(v_periode_eind, COALESCE(v_contract.einddatum, v_periode_eind))
        - GREATEST(v_periode_start, v_contract.startdatum)
      ) + 1;

      -- ── Determine base monthly amount ───────────────────────────────
      IF v_contract.maandprijs IS NOT NULL THEN
        -- Fixed monthly price
        v_maandprijs_calc := v_contract.maandprijs;

      ELSIF v_contract.uurtarief IS NOT NULL
        AND v_contract.uren_per_dag IS NOT NULL
        AND cardinality(v_contract.zorgdagen) > 0
      THEN
        -- Hourly formula:
        -- uren_per_dag × aantal_dagen_per_week × (52 weken / 12 maanden) × uurtarief
        -- cardinality(zorgdagen) = aantal_dagen_per_week
        v_maandprijs_calc := ROUND(
          v_contract.uren_per_dag
          * cardinality(v_contract.zorgdagen)
          * 52.0 / 12.0
          * v_contract.uurtarief,
          2
        );

      ELSE
        -- Missing pricing data — insert €0.00 warning line, never silently skip
        v_maandprijs_calc := 0.00;
      END IF;

      -- ── Pro-rate if partial month ───────────────────────────────────
      IF v_dagen_actief < v_dagen_in_maand THEN
        v_bedrag := ROUND(v_maandprijs_calc * v_dagen_actief::DECIMAL / v_dagen_in_maand, 2);
      ELSE
        v_bedrag := v_maandprijs_calc;
      END IF;

      -- ── Insert line ─────────────────────────────────────────────────
      INSERT INTO public.invoice_lines (
        invoice_id, contract_id, kind_id,
        omschrijving, bedrag,
        dagen_actief, dagen_in_maand
      ) VALUES (
        v_invoice_id,
        v_contract.contract_id,
        v_contract.kind_id,
        CASE
          WHEN v_contract.maandprijs IS NOT NULL THEN
            'Maandprijs opvang ' || v_contract.kind_naam
            || CASE WHEN v_dagen_actief < v_dagen_in_maand
               THEN ' (' || v_dagen_actief || '/' || v_dagen_in_maand || ' dagen)'
               ELSE '' END

          WHEN v_contract.uurtarief IS NOT NULL THEN
            'Opvang ' || v_contract.kind_naam
            || ' (' || cardinality(v_contract.zorgdagen) || ' dgn/wk'
            || ', ' || v_contract.uren_per_dag || ' u/dag'
            || ', €' || v_contract.uurtarief || '/u)'
            || CASE WHEN v_dagen_actief < v_dagen_in_maand
               THEN ' — pro rato ' || v_dagen_actief || '/' || v_dagen_in_maand || ' dagen'
               ELSE '' END

          ELSE
            'Opvang ' || v_contract.kind_naam || ' — TARIEF ONTBREEKT (contract ' || v_contract.contract_id || ')'
        END,
        v_bedrag,
        v_dagen_actief,
        v_dagen_in_maand
      );

    END LOOP; -- contracts

    -- ── Update invoice totaal = sum of lines ─────────────────────────────
    UPDATE public.invoices
    SET totaal_bedrag = (
      SELECT COALESCE(SUM(bedrag), 0)
      FROM public.invoice_lines
      WHERE invoice_id = v_invoice_id
    )
    WHERE id = v_invoice_id;

    SELECT totaal_bedrag, COUNT(*)::INTEGER
    INTO v_totaal, v_aantal
    FROM public.invoice_lines il
    JOIN public.invoices i ON i.id = il.invoice_id
    WHERE il.invoice_id = v_invoice_id
    GROUP BY i.totaal_bedrag;

    RETURN QUERY
      SELECT v_parent.naam,
             v_parent.email,
             v_invoice_id,
             v_factuurnummer,
             v_totaal,
             v_aantal,
             'aangemaakt'::TEXT;

  END LOOP; -- parents

END;
$$;


-- ─────────────────────────────────────────────────────
-- 8. Validation helper: check_factuur_integriteit
--    Run after generation to surface data issues.
--    Returns rows where something is wrong.
-- ─────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.check_factuur_integriteit(
  p_organisatie_id UUID DEFAULT NULL
)
RETURNS TABLE (
  probleem      TEXT,
  invoice_id    UUID,
  factuurnummer TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Invoices with no lines
  SELECT
    'Factuur zonder regels'::TEXT,
    i.id,
    i.factuurnummer
  FROM public.invoices i
  LEFT JOIN public.invoice_lines il ON il.invoice_id = i.id
  WHERE il.id IS NULL
    AND (p_organisatie_id IS NULL OR i.organisatie_id = p_organisatie_id)

  UNION ALL

  -- Invoices where totaal_bedrag != SUM(lines)
  SELECT
    'Totaalbedrag klopt niet (verschil: €' ||
      ABS(i.totaal_bedrag - COALESCE(SUM(il.bedrag), 0))::TEXT || ')',
    i.id,
    i.factuurnummer
  FROM public.invoices i
  LEFT JOIN public.invoice_lines il ON il.invoice_id = i.id
  WHERE (p_organisatie_id IS NULL OR i.organisatie_id = p_organisatie_id)
  GROUP BY i.id, i.factuurnummer, i.totaal_bedrag
  HAVING ABS(i.totaal_bedrag - COALESCE(SUM(il.bedrag), 0)) > 0.01

  -- Lines with missing pricing (€0 warning lines)
  UNION ALL
  SELECT
    'Factuuregel zonder tarief (TARIEF ONTBREEKT)',
    i.id,
    i.factuurnummer
  FROM public.invoice_lines il
  JOIN public.invoices i ON i.id = il.invoice_id
  WHERE il.omschrijving LIKE '%TARIEF ONTBREEKT%'
    AND (p_organisatie_id IS NULL OR i.organisatie_id = p_organisatie_id);
$$;
