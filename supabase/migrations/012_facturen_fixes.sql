-- ═══════════════════════════════════════════════════════════════
-- PENGUIN PLACE — Migratie 012: Factureringssysteem — bugfixes
-- ═══════════════════════════════════════════════════════════════
--
-- Fixes two bugs in generate_maand_facturen (migration 011):
--
--   Bug 1: INTERVAL '1 month - 1 day' parses unreliably.
--          Fix: use (v_periode_start + INTERVAL '1 month')::DATE - 1
--
--   Bug 2: SELECT INTO ... GROUP BY i.totaal_bedrag could return
--          multiple rows (crash) or zero rows (NULL) at end of loop.
--          Fix: read totaal_bedrag directly from the updated invoice row,
--          count lines with a scalar subquery.
--
-- Also: adds uurtarief/maandprijs to the demo contracts so the
--       function produces non-zero invoices on the seed data.
-- ═══════════════════════════════════════════════════════════════


-- ─────────────────────────────────────────────────────
-- 1. Fixed generate_maand_facturen
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
  uitkomst       TEXT
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
  IF p_maand < 1 OR p_maand > 12 THEN
    RAISE EXCEPTION 'Ongeldige maand: %', p_maand;
  END IF;

  v_periode_start  := make_date(p_jaar, p_maand, 1);
  -- Bug 1 fix: use DATE arithmetic instead of INTERVAL string with subtraction
  v_periode_eind   := (v_periode_start + INTERVAL '1 month')::DATE - 1;
  v_dagen_in_maand := EXTRACT(DAY FROM v_periode_eind)::INTEGER;

  -- ── Outer loop: one invoice per billing contact ──────────────────────────
  FOR v_parent IN
    SELECT DISTINCT
      cp.id                               AS contactpersoon_id,
      cp.voornaam || ' ' || cp.achternaam AS naam,
      cp.email
    FROM public.contactpersonen cp
    JOIN public.kinderen   k ON k.id      = cp.kind_id
    JOIN public.contracten c ON c.kind_id = k.id
    WHERE k.organisatie_id = p_organisatie_id
      AND cp.ontvangt_factuur = true
      AND c.status            = 'actief'
      AND c.startdatum        <= v_periode_eind
      AND (c.einddatum IS NULL OR c.einddatum >= v_periode_start)
  LOOP

    -- ── Idempotency: skip if invoice already exists ───────────────────────
    IF EXISTS (
      SELECT 1 FROM public.invoices inv
      WHERE inv.organisatie_id = p_organisatie_id
        AND inv.parent_id      = v_parent.contactpersoon_id
        AND inv.periode_start  = v_periode_start
        AND inv.periode_eind   = v_periode_eind
    ) THEN
      RETURN QUERY
        SELECT v_parent.naam,
               v_parent.email,
               NULL::UUID,
               NULL::TEXT,
               NULL::DECIMAL,
               0::INTEGER,
               'overgeslagen_bestaat'::TEXT;
      CONTINUE;
    END IF;

    -- ── Create invoice shell ──────────────────────────────────────────────
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

    -- ── Inner loop: one line per active contract for this parent's children ─
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
        k.voornaam
          || CASE WHEN k.tussenvoegsel IS NOT NULL THEN ' ' || k.tussenvoegsel ELSE '' END
          || ' ' || k.achternaam AS kind_naam
      FROM public.contracten    c
      JOIN public.kinderen      k  ON k.id      = c.kind_id
      JOIN public.contactpersonen cp ON cp.kind_id = k.id
      WHERE cp.id       = v_parent.contactpersoon_id
        AND c.status    = 'actief'
        AND c.startdatum <= v_periode_eind
        AND (c.einddatum IS NULL OR c.einddatum >= v_periode_start)
      ORDER BY k.achternaam, c.startdatum
    LOOP

      -- Days active this month (for pro-rating)
      v_dagen_actief := (
        LEAST(v_periode_eind,   COALESCE(v_contract.einddatum, v_periode_eind))
        - GREATEST(v_periode_start, v_contract.startdatum)
      ) + 1;

      -- Base monthly amount
      IF v_contract.maandprijs IS NOT NULL THEN
        v_maandprijs_calc := v_contract.maandprijs;

      ELSIF v_contract.uurtarief IS NOT NULL
        AND v_contract.uren_per_dag IS NOT NULL
        AND cardinality(v_contract.zorgdagen) > 0
      THEN
        -- uren_per_dag × dagen_per_week × 52/12 × uurtarief
        v_maandprijs_calc := ROUND(
          v_contract.uren_per_dag
          * cardinality(v_contract.zorgdagen)
          * 52.0 / 12.0
          * v_contract.uurtarief,
          2
        );

      ELSE
        v_maandprijs_calc := 0.00;
      END IF;

      -- Pro-rate if contract is only partially active this month
      IF v_dagen_actief < v_dagen_in_maand THEN
        v_bedrag := ROUND(v_maandprijs_calc * v_dagen_actief::DECIMAL / v_dagen_in_maand, 2);
      ELSE
        v_bedrag := v_maandprijs_calc;
      END IF;

      INSERT INTO public.invoice_lines (
        invoice_id, contract_id, kind_id,
        omschrijving, bedrag, dagen_actief, dagen_in_maand
      ) VALUES (
        v_invoice_id,
        v_contract.contract_id,
        v_contract.kind_id,
        CASE
          WHEN v_contract.maandprijs IS NOT NULL THEN
            'Maandprijs opvang ' || v_contract.kind_naam
            || CASE WHEN v_dagen_actief < v_dagen_in_maand
               THEN ' (' || v_dagen_actief || '/' || v_dagen_in_maand || ' dgn)'
               ELSE '' END

          WHEN v_contract.uurtarief IS NOT NULL THEN
            'Opvang ' || v_contract.kind_naam
            || ' (' || cardinality(v_contract.zorgdagen) || ' dgn/wk'
            || ', ' || v_contract.uren_per_dag || ' u/dag'
            || ', €' || v_contract.uurtarief || '/u)'
            || CASE WHEN v_dagen_actief < v_dagen_in_maand
               THEN ' — pro rato ' || v_dagen_actief || '/' || v_dagen_in_maand || ' dgn'
               ELSE '' END

          ELSE
            'Opvang ' || v_contract.kind_naam
            || ' — TARIEF ONTBREEKT (contract ' || v_contract.contract_id || ')'
        END,
        v_bedrag,
        v_dagen_actief,
        v_dagen_in_maand
      );

    END LOOP; -- inner: contracts

    -- Update invoice totaal = sum of all lines
    -- Fully qualify all table references to avoid ambiguity with output columns
    -- (invoice_id and factuurnummer are both RETURNS TABLE output cols = PL/pgSQL vars)
    UPDATE public.invoices inv
    SET totaal_bedrag = (
      SELECT COALESCE(SUM(il.bedrag), 0)
      FROM public.invoice_lines il
      WHERE il.invoice_id = v_invoice_id
    )
    WHERE inv.id = v_invoice_id;

    SELECT inv.totaal_bedrag
    INTO   v_totaal
    FROM   public.invoices inv
    WHERE  inv.id = v_invoice_id;

    SELECT COUNT(*)::INTEGER
    INTO   v_aantal
    FROM   public.invoice_lines il
    WHERE  il.invoice_id = v_invoice_id;

    RETURN QUERY
      SELECT v_parent.naam,
             v_parent.email,
             v_invoice_id,
             v_factuurnummer,
             v_totaal,
             v_aantal,
             'aangemaakt'::TEXT;

  END LOOP; -- outer: parents

END;
$$;


-- ─────────────────────────────────────────────────────
-- 2. Billing prices on demo contracts
--
--    Migration 003 seeded contracts without uurtarief/maandprijs.
--    We add realistic prices so generate_maand_facturen produces
--    non-zero invoices on the demo dataset.
--
--    kdv (dagopvang) — fixed maandprijs per kind
--    bso             — hourly rate via uurtarief + uren_per_dag
-- ─────────────────────────────────────────────────────

-- Emma de Vries  — 3 dgn/wk kdv → vaste maandprijs
UPDATE public.contracten SET maandprijs = 780.00
WHERE kind_id = '30000000-0000-0000-0000-000000000001'
  AND status  = 'actief';

-- Liam Jansen    — 5 dgn/wk kdv → vaste maandprijs
UPDATE public.contracten SET maandprijs = 1240.00
WHERE kind_id = '30000000-0000-0000-0000-000000000002'
  AND status  = 'actief';

-- Noa van den Berg — 5 dgn/wk kdv → hourly (€10.50/u, 8.5u/dag)
UPDATE public.contracten SET uurtarief = 10.50
WHERE kind_id = '30000000-0000-0000-0000-000000000003'
  AND status  = 'actief';

-- Finn Bakker    — 2 dgn/wk kdv → vaste maandprijs
UPDATE public.contracten SET maandprijs = 520.00
WHERE kind_id = '30000000-0000-0000-0000-000000000004'
  AND status  = 'actief';

-- Sara Visser    — 5 dgn/wk kdv → vaste maandprijs
UPDATE public.contracten SET maandprijs = 1240.00
WHERE kind_id = '30000000-0000-0000-0000-000000000005'
  AND status  = 'actief';

-- Tim Smit       — 2 dgn/wk kdv → hourly (€10.50/u)
UPDATE public.contracten SET uurtarief = 10.50
WHERE kind_id = '30000000-0000-0000-0000-000000000006'
  AND status  = 'actief';

-- Julia Mulder   — 3 dgn/wk kdv → vaste maandprijs
UPDATE public.contracten SET maandprijs = 780.00
WHERE kind_id = '30000000-0000-0000-0000-000000000007'
  AND status  = 'actief';

-- Max de Boer    — 3 dgn/wk kdv → vaste maandprijs
UPDATE public.contracten SET maandprijs = 780.00
WHERE kind_id = '30000000-0000-0000-0000-000000000008'
  AND status  = 'actief';

-- Sofie Meijer   — 3 dgn/wk kdv → hourly (€10.50/u)
UPDATE public.contracten SET uurtarief = 10.50
WHERE kind_id = '30000000-0000-0000-0000-000000000009'
  AND status  = 'actief';

-- Lars Dekker    — 2 dgn/wk kdv → vaste maandprijs
UPDATE public.contracten SET maandprijs = 520.00
WHERE kind_id = '30000000-0000-0000-0000-000000000010'
  AND status  = 'actief';
