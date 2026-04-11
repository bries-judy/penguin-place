-- ═══════════════════════════════════════════
-- PENGUIN PLACE — Migratie 009: Placements
-- Introductie van de placements tabel als
-- enkelvoudige bron van waarheid voor
-- groepskoppelingen over tijd.
-- ═══════════════════════════════════════════

-- ───────────────────────────────────────────
-- STAP 1: PLACEMENTS TABEL
-- ───────────────────────────────────────────
-- Een placement koppelt een kind (via contract) aan een groep
-- voor een bepaalde periode. Vervangt contracten.groep_id.
-- groepen heeft geen ON DELETE CASCADE — het verwijderen van
-- een groep met actieve placements mislukt bewust.

CREATE TABLE public.placements (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisatie_id  UUID NOT NULL REFERENCES public.organisaties(id) ON DELETE CASCADE,
  kind_id         UUID NOT NULL REFERENCES public.kinderen(id) ON DELETE CASCADE,
  contract_id     UUID NOT NULL REFERENCES public.contracten(id) ON DELETE CASCADE,
  groep_id        UUID NOT NULL REFERENCES public.groepen(id),
  startdatum      DATE NOT NULL,
  einddatum       DATE,  -- null = open einde (huidige plaatsing)
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ───────────────────────────────────────────
-- STAP 2: INDEXEN
-- ───────────────────────────────────────────

CREATE INDEX idx_placements_contract_id     ON public.placements (contract_id);
CREATE INDEX idx_placements_kind_id         ON public.placements (kind_id);
CREATE INDEX idx_placements_groep_id        ON public.placements (groep_id);
CREATE INDEX idx_placements_organisatie_id  ON public.placements (organisatie_id);

-- ───────────────────────────────────────────
-- STAP 3: CROSS-TENANT VALIDATIE
-- ───────────────────────────────────────────
-- contracten en groepen dragen geen organisatie_id rechtstreeks;
-- beide verbinden via locaties.organisatie_id. Een gewone FK kan
-- dit niet controleren, dus valideren we via een STABLE functie
-- in een CHECK constraint.
--
-- Let op: een CHECK constraint wordt alleen opnieuw geëvalueerd
-- bij INSERT of UPDATE op de placements rij zelf. Als een locatie
-- achteraf naar een andere organisatie wordt verplaatst, worden
-- bestaande placements NIET automatisch hergevalideerd.
-- Voeg zo nodig een trigger toe op public.locaties als dit risico
-- relevant is.

CREATE OR REPLACE FUNCTION public.validate_placement_organisatie(
  p_organisatie_id UUID,
  p_kind_id        UUID,
  p_contract_id    UUID,
  p_groep_id       UUID
) RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    -- kind behoort tot dezelfde organisatie
    (SELECT organisatie_id FROM public.kinderen WHERE id = p_kind_id) = p_organisatie_id
    -- locatie van het contract behoort tot dezelfde organisatie
    AND (
      SELECT l.organisatie_id
      FROM public.locaties l
      JOIN public.contracten c ON c.locatie_id = l.id
      WHERE c.id = p_contract_id
    ) = p_organisatie_id
    -- locatie van de groep behoort tot dezelfde organisatie
    AND (
      SELECT l.organisatie_id
      FROM public.locaties l
      JOIN public.groepen g ON g.locatie_id = l.id
      WHERE g.id = p_groep_id
    ) = p_organisatie_id
$$;

ALTER TABLE public.placements
  ADD CONSTRAINT chk_placements_same_organisatie
  CHECK (
    public.validate_placement_organisatie(organisatie_id, kind_id, contract_id, groep_id)
  );

-- ───────────────────────────────────────────
-- STAP 4: UPDATED_AT TRIGGER
-- ───────────────────────────────────────────
-- Hergebruik van handle_updated_at() uit 001_core_schema.sql

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.placements
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ───────────────────────────────────────────
-- STAP 5: DATAMIGRATIE (idempotent)
-- ───────────────────────────────────────────
-- Voor elk contract met een groep_id wordt een placement aangemaakt.
-- De NOT EXISTS guard zorgt dat herhaald uitvoeren veilig is.
-- Contracten met groep_id IS NULL (nog niet aan groep gekoppeld)
-- worden bewust overgeslagen — die hebben nog geen placement.

INSERT INTO public.placements (
  organisatie_id,
  kind_id,
  contract_id,
  groep_id,
  startdatum,
  einddatum
)
SELECT
  k.organisatie_id,
  c.kind_id,
  c.id        AS contract_id,
  c.groep_id,
  c.startdatum,
  c.einddatum
FROM public.contracten c
JOIN public.kinderen k ON k.id = c.kind_id
WHERE c.groep_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.placements p
    WHERE p.contract_id = c.id
  );

-- ───────────────────────────────────────────
-- STAP 6: DEPRECEER contracten.groep_id
-- ───────────────────────────────────────────
-- Kolom blijft bestaan voor achterwaartse compatibiliteit.
-- NIET verwijderen — dit volgt in migratie 010_drop_groep_id.sql
-- nadat alle applicatiecode is bijgewerkt.

COMMENT ON COLUMN public.contracten.groep_id IS
  'DEPRECATED: Gebruik de placements tabel voor groepskoppelingen. '
  'Dit veld wordt verwijderd in een toekomstige migratie (010_drop_groep_id.sql). '
  'Schrijf niet meer naar dit veld in nieuwe code.';

-- ───────────────────────────────────────────
-- STAP 7: ROW LEVEL SECURITY
-- ───────────────────────────────────────────

ALTER TABLE public.placements ENABLE ROW LEVEL SECURITY;

-- SELECT: alle geauthenticeerde gebruikers binnen dezelfde organisatie
CREATE POLICY "Lees placements van eigen organisatie" ON public.placements
  FOR SELECT TO authenticated
  USING (organisatie_id = public.get_organisatie_id());

-- INSERT: klantadviseur en hoger
CREATE POLICY "Klantadviseur en hoger voegen placements toe" ON public.placements
  FOR INSERT TO authenticated
  WITH CHECK (
    organisatie_id = public.get_organisatie_id()
    AND public.has_any_role('beheerder', 'vestigingsmanager', 'klantadviseur')
  );

-- UPDATE: klantadviseur en hoger
CREATE POLICY "Klantadviseur en hoger updaten placements" ON public.placements
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
CREATE POLICY "Manager en beheerder verwijderen placements" ON public.placements
  FOR DELETE TO authenticated
  USING (
    organisatie_id = public.get_organisatie_id()
    AND public.has_any_role('beheerder', 'vestigingsmanager')
  );

-- ───────────────────────────────────────────
-- STAP 8: VALIDATIEQUERY'S (handmatig uitvoeren na migratie)
-- ───────────────────────────────────────────
--
-- 1. Elk contract met groep_id moet ≥1 placement hebben:
--    SELECT c.id, c.groep_id
--    FROM public.contracten c
--    WHERE c.groep_id IS NOT NULL
--      AND NOT EXISTS (SELECT 1 FROM public.placements p WHERE p.contract_id = c.id);
--    -- Verwacht: 0 rijen
--
-- 2. Geen wees-placements:
--    SELECT p.id
--    FROM public.placements p
--    LEFT JOIN public.contracten c ON c.id = p.contract_id
--    LEFT JOIN public.kinderen k   ON k.id = p.kind_id
--    LEFT JOIN public.groepen g    ON g.id = p.groep_id
--    WHERE c.id IS NULL OR k.id IS NULL OR g.id IS NULL;
--    -- Verwacht: 0 rijen
--
-- 3. Geen cross-tenant placements:
--    SELECT p.id
--    FROM public.placements p
--    JOIN public.kinderen k ON k.id = p.kind_id
--    WHERE k.organisatie_id <> p.organisatie_id;
--    -- Verwacht: 0 rijen
--
-- 4. Telcontrole:
--    SELECT COUNT(*) FROM public.contracten WHERE groep_id IS NOT NULL;
--    SELECT COUNT(*) FROM public.placements;
--    -- Beide aantallen moeten overeenkomen (bij schone migratie)
