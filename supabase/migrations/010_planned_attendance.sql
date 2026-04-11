-- ═══════════════════════════════════════════════════════════════
-- PENGUIN PLACE — Migratie 010: Planned Attendance
-- Introduceert de planned_attendance tabel als persistente,
-- querybare planningslaag gegenereerd vanuit contracten +
-- placements.
--
-- Scope: operationele planning en capaciteitsbeheer.
-- planned_attendance is GEEN factureringsbron.
-- Facturering blijft gebaseerd op contracten zelf.
-- ═══════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────
-- STAP 1: BRON ENUM
-- ───────────────────────────────────────────────────────────────
-- Geeft aan hoe een planningsregel is ontstaan:
--   contract      → gegenereerd vanuit zorgdagen in contract
--   flex_override → goedgekeurde flex_dag (vervangt of vult aan)
--   manual        → handmatig ingevoerd door medewerker

CREATE TYPE public.bron_type AS ENUM (
  'contract',
  'flex_override',
  'manual'
);

-- ───────────────────────────────────────────────────────────────
-- STAP 2: PLANNED_ATTENDANCE TABEL
-- ───────────────────────────────────────────────────────────────
-- Één rij = één verwachte opvangdag voor één kind op basis van
-- een actief contract + plaatsing.
--
-- UNIQUE(contract_id, datum): per contract maximaal één
-- planningsregel per dag. Spiegelt de bestaande UNIQUE op
-- flex_dagen(contract_id, datum). Waarborgt idempotentie.
--
-- groepen heeft geen ON DELETE CASCADE — het verwijderen van een
-- groep met actieve planningsregels mislukt bewust.

CREATE TABLE public.planned_attendance (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organisatie_id   UUID        NOT NULL REFERENCES public.organisaties(id) ON DELETE CASCADE,
  kind_id          UUID        NOT NULL REFERENCES public.kinderen(id)     ON DELETE CASCADE,
  contract_id      UUID        NOT NULL REFERENCES public.contracten(id)   ON DELETE CASCADE,
  placement_id     UUID        NOT NULL REFERENCES public.placements(id)   ON DELETE CASCADE,
  groep_id         UUID        NOT NULL REFERENCES public.groepen(id),
  datum            DATE        NOT NULL,
  starttijd        TIME        NOT NULL,
  eindtijd         TIME        NOT NULL,
  bron             public.bron_type NOT NULL DEFAULT 'contract',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT uq_planned_attendance_contract_datum UNIQUE (contract_id, datum),
  CONSTRAINT chk_planned_attendance_tijd CHECK (eindtijd > starttijd)
);

COMMENT ON TABLE public.planned_attendance IS
  'Verwachte opvangdagen gegenereerd vanuit contracten en placements. '
  'Doel: operationele planning en capaciteitsbeheer. '
  'GEEN factureringsbron — facturering blijft gebaseerd op contracten.';

COMMENT ON COLUMN public.planned_attendance.bron IS
  'contract = gegenereerd vanuit zorgdagen; '
  'flex_override = goedgekeurde flex_dag; '
  'manual = handmatig ingevoerd.';

COMMENT ON COLUMN public.planned_attendance.starttijd IS
  'Tijdelijk vastgezet op 08:00. '
  'TODO: configureerbaar maken via groepen.starttijd_default of locaties.';

-- ───────────────────────────────────────────────────────────────
-- STAP 3: INDEXEN
-- ───────────────────────────────────────────────────────────────

CREATE INDEX idx_pa_datum          ON public.planned_attendance (datum);
CREATE INDEX idx_pa_groep_id       ON public.planned_attendance (groep_id);
CREATE INDEX idx_pa_contract_id    ON public.planned_attendance (contract_id);
CREATE INDEX idx_pa_kind_id        ON public.planned_attendance (kind_id);
CREATE INDEX idx_pa_organisatie_id ON public.planned_attendance (organisatie_id);

-- Samengestelde index voor de meest voorkomende query:
-- bezetting per groep op een dag
CREATE INDEX idx_pa_groep_datum    ON public.planned_attendance (groep_id, datum);

-- ───────────────────────────────────────────────────────────────
-- STAP 4: UPDATED_AT TRIGGER
-- ───────────────────────────────────────────────────────────────
-- Hergebruik van handle_updated_at() uit 001_core_schema.sql

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.planned_attendance
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ───────────────────────────────────────────────────────────────
-- STAP 5: GENERATOR FUNCTIE
-- ───────────────────────────────────────────────────────────────
-- Genereert planned_attendance rijen vanuit één contract.
--
-- Parameters:
--   p_contract_id  — het te verwerken contract
--   p_future_only  — true = verleden NIET overschrijven
--   p_allow_past   — true = verleden expliciet overschrijven
--                    (voor backfill; overschrijft p_future_only)
--
-- Retourneert het aantal geupsertede rijen.
--
-- Idempotentie: bestaande 'contract' rijen worden verwijderd
-- vóór het invoegen. Rijen met bron 'flex_override' of 'manual'
-- worden nooit verwijderd door de generator.
--
-- Starttijd: vast 08:00 (zie TODO hierboven).
-- Eindtijd:  starttijd + uren_per_dag uur.
--
-- Weekdag mapping:
--   PostgreSQL EXTRACT(DOW): 0=zo, 1=ma, …, 6=za
--   zorgdagen encoding:      0=ma, 1=di, 2=wo, 3=do, 4=vr
--   Conversie: weekdag_idx = DOW - 1  (zo → -1, za → 5, beide buiten 0–4)

CREATE OR REPLACE FUNCTION public.generate_planned_attendance(
  p_contract_id UUID,
  p_future_only BOOLEAN DEFAULT false,
  p_allow_past  BOOLEAN DEFAULT false
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $func$
DECLARE
  v_contract       RECORD;
  v_placement      RECORD;
  v_current_date   DATE;
  v_range_start    DATE;
  v_range_end      DATE;
  v_placement_end  DATE;
  v_loop_end       DATE;
  v_weekday_idx    INTEGER;
  v_starttijd      TIME    := '08:00';
  v_eindtijd       TIME;
  v_upsert_count   INTEGER := 0;
  v_today          DATE    := CURRENT_DATE;
BEGIN
  -- ── Haal contract op ──────────────────────────────────────────
  SELECT
    c.id,
    c.kind_id,
    c.zorgdagen,
    c.uren_per_dag,
    c.startdatum,
    c.einddatum,
    c.contracttype,
    k.organisatie_id
  INTO v_contract
  FROM public.contracten c
  JOIN public.kinderen   k ON k.id = c.kind_id
  WHERE c.id = p_contract_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Contract % niet gevonden', p_contract_id;
  END IF;

  -- ── Toegangscontrole ──────────────────────────────────────────
  -- Zorg dat de aanroeper tot dezelfde organisatie behoort.
  IF v_contract.organisatie_id <> public.get_organisatie_id() THEN
    RAISE EXCEPTION 'Toegang geweigerd: contract % behoort niet tot uw organisatie',
      p_contract_id;
  END IF;

  -- ── Flex contracten zonder vaste zorgdagen ────────────────────
  -- Flex kinderen (flexpool=true, zorgdagen leeg) krijgen geen
  -- 'contract' rijen. Hun planning wordt aangemaakt via
  -- verwerkGoedgekeurdeFlexDag() wanneer een flex_dag wordt
  -- goedgekeurd.
  IF array_length(v_contract.zorgdagen, 1) IS NULL
     OR array_length(v_contract.zorgdagen, 1) = 0 THEN
    RETURN 0;
  END IF;

  -- ── Valideer: geen overlappende placements ────────────────────
  IF EXISTS (
    SELECT 1
    FROM public.placements p1
    JOIN public.placements p2
      ON  p1.contract_id = p2.contract_id
      AND p1.id          <> p2.id
      AND p1.startdatum  <= COALESCE(p2.einddatum, 'infinity'::DATE)
      AND COALESCE(p1.einddatum, 'infinity'::DATE) >= p2.startdatum
    WHERE p1.contract_id = p_contract_id
  ) THEN
    RAISE EXCEPTION
      'Overlappende placements gevonden voor contract %. '
      'Herstel de placements voordat planning gegenereerd wordt.',
      p_contract_id;
  END IF;

  -- ── Bepaal generatievenster ───────────────────────────────────
  -- Horizon: einddatum van contract, of maximaal 1 jaar vooruit
  -- als het contract open-ended is. Voorkomt onbegrensd genereren.
  v_range_end := COALESCE(
    v_contract.einddatum,
    v_today + INTERVAL '1 year'
  );

  IF p_allow_past THEN
    -- Volledige herberekening (backfill)
    v_range_start := v_contract.startdatum;
  ELSIF p_future_only THEN
    -- Pas toekomst bij; verleden ongewijzigd laten
    v_range_start := GREATEST(v_contract.startdatum, v_today + 1);
  ELSE
    -- Standaard: vanaf contractstart (inclusief vandaag)
    v_range_start := v_contract.startdatum;
  END IF;

  -- ── Verwijder te vervangen 'contract' rijen ───────────────────
  -- Rijen met bron 'flex_override' of 'manual' worden nooit
  -- verwijderd door de generator — dat is bewust.
  DELETE FROM public.planned_attendance
  WHERE contract_id = p_contract_id
    AND bron        = 'contract'
    AND datum      >= v_range_start;

  -- ── Genereer rijen per placement ─────────────────────────────
  FOR v_placement IN
    SELECT id, groep_id, startdatum, einddatum
    FROM   public.placements
    WHERE  contract_id = p_contract_id
    ORDER  BY startdatum
  LOOP
    -- Klamp placement-periode op generatievenster
    v_placement_end := COALESCE(v_placement.einddatum, v_range_end);
    v_loop_end      := LEAST(v_placement_end, v_range_end);
    v_current_date  := GREATEST(v_placement.startdatum, v_range_start);

    WHILE v_current_date <= v_loop_end LOOP
      -- Weekdag 0=zo→-1, 1=ma→0, …, 5=vr→4, 6=za→5
      v_weekday_idx := EXTRACT(DOW FROM v_current_date)::INTEGER - 1;

      -- Sla weekenddagen over (−1 en 5 vallen buiten 0–4)
      IF v_weekday_idx BETWEEN 0 AND 4 THEN
        IF v_weekday_idx = ANY(v_contract.zorgdagen) THEN

          v_eindtijd := v_starttijd
                      + (v_contract.uren_per_dag * INTERVAL '1 hour');

          INSERT INTO public.planned_attendance (
            organisatie_id,
            kind_id,
            contract_id,
            placement_id,
            groep_id,
            datum,
            starttijd,
            eindtijd,
            bron
          ) VALUES (
            v_contract.organisatie_id,
            v_contract.kind_id,
            p_contract_id,
            v_placement.id,
            v_placement.groep_id,
            v_current_date,
            v_starttijd,
            v_eindtijd,
            'contract'
          )
          -- Bij conflict (dezelfde datum, andere bron): NIET
          -- overschrijven. Een flex_override of manual rij wint
          -- altijd van een contract rij.
          ON CONFLICT (contract_id, datum) DO UPDATE SET
            placement_id = EXCLUDED.placement_id,
            groep_id     = EXCLUDED.groep_id,
            starttijd    = EXCLUDED.starttijd,
            eindtijd     = EXCLUDED.eindtijd,
            updated_at   = now()
          WHERE planned_attendance.bron = 'contract';

          v_upsert_count := v_upsert_count + 1;
        END IF;
      END IF;

      v_current_date := v_current_date + 1;
    END LOOP;
  END LOOP;

  RETURN v_upsert_count;
END;
$func$;

COMMENT ON FUNCTION public.generate_planned_attendance(UUID, BOOLEAN, BOOLEAN) IS
  'Genereert planned_attendance rijen voor één contract vanuit '
  'contracten.zorgdagen + placements. Idempotent. '
  'Flex/manual rijen worden nooit overschreven door de generator. '
  'Retourneert aantal verwerkte rijen.';

-- ───────────────────────────────────────────────────────────────
-- STAP 6: ROW LEVEL SECURITY
-- ───────────────────────────────────────────────────────────────

ALTER TABLE public.planned_attendance ENABLE ROW LEVEL SECURITY;

-- SELECT: alle geauthenticeerde gebruikers van eigen organisatie
CREATE POLICY "Lees planned_attendance van eigen organisatie"
  ON public.planned_attendance
  FOR SELECT TO authenticated
  USING (organisatie_id = public.get_organisatie_id());

-- INSERT: klantadviseur en hoger
CREATE POLICY "Klantadviseur en hoger voegen planned_attendance toe"
  ON public.planned_attendance
  FOR INSERT TO authenticated
  WITH CHECK (
    organisatie_id = public.get_organisatie_id()
    AND public.has_any_role('beheerder', 'vestigingsmanager', 'klantadviseur')
  );

-- UPDATE: klantadviseur en hoger
CREATE POLICY "Klantadviseur en hoger updaten planned_attendance"
  ON public.planned_attendance
  FOR UPDATE TO authenticated
  USING (
    organisatie_id = public.get_organisatie_id()
    AND public.has_any_role('beheerder', 'vestigingsmanager', 'klantadviseur')
  )
  WITH CHECK (
    organisatie_id = public.get_organisatie_id()
    AND public.has_any_role('beheerder', 'vestigingsmanager', 'klantadviseur')
  );

-- DELETE: vestigingsmanager en beheerder
CREATE POLICY "Manager en beheerder verwijderen planned_attendance"
  ON public.planned_attendance
  FOR DELETE TO authenticated
  USING (
    organisatie_id = public.get_organisatie_id()
    AND public.has_any_role('beheerder', 'vestigingsmanager')
  );

-- ───────────────────────────────────────────────────────────────
-- STAP 7: VALIDATIEQUERY'S (handmatig uitvoeren na migratie)
-- ───────────────────────────────────────────────────────────────
--
-- 1. Tabel correct aangemaakt:
--    SELECT * FROM planned_attendance LIMIT 0;
--    -- Verwacht: lege resultaatset zonder fout
--
-- 2. Generator basistest (vervang <uuid> door een bestaand contract
--    met zorgdagen en een actieve placement):
--    SELECT public.generate_planned_attendance('<uuid>');
--    -- Verwacht: integer ≥ 0
--
-- 3. Idempotentietest (twee keer uitvoeren geeft zelfde resultaat):
--    SELECT COUNT(*) FROM planned_attendance WHERE contract_id = '<uuid>';
--    SELECT public.generate_planned_attendance('<uuid>');
--    SELECT COUNT(*) FROM planned_attendance WHERE contract_id = '<uuid>';
--    -- Beide tellingen moeten gelijk zijn
--
-- 4. Geen planningsrijen buiten contractperiode:
--    SELECT pa.id, pa.datum, c.startdatum, c.einddatum
--    FROM planned_attendance pa
--    JOIN contracten c ON c.id = pa.contract_id
--    WHERE pa.datum < c.startdatum
--       OR (c.einddatum IS NOT NULL AND pa.datum > c.einddatum);
--    -- Verwacht: 0 rijen
--
-- 5. Geen cross-tenant rijen:
--    SELECT pa.id
--    FROM planned_attendance pa
--    JOIN kinderen k ON k.id = pa.kind_id
--    WHERE k.organisatie_id <> pa.organisatie_id;
--    -- Verwacht: 0 rijen
--
-- 6. Alle weekdagen kloppen met zorgdagen van het contract:
--    SELECT pa.id, pa.datum, EXTRACT(DOW FROM pa.datum)::int - 1 AS weekdag_idx,
--           c.zorgdagen
--    FROM planned_attendance pa
--    JOIN contracten c ON c.id = pa.contract_id
--    WHERE pa.bron = 'contract'
--      AND NOT ((EXTRACT(DOW FROM pa.datum)::int - 1) = ANY(c.zorgdagen));
--    -- Verwacht: 0 rijen
