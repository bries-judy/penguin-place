-- ══════════════════════════════════════════════════════════
-- PENGUIN PLACE — Migratie 008: Flex workflow
-- ══════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────
-- Status enum + kolommen voor flex_dagen
-- ─────────────────────────────────────────────────────

CREATE TYPE public.flex_dag_status AS ENUM (
  'aangevraagd',  -- ouder aangevraagd, wacht op beoordeling coördinator
  'goedgekeurd',  -- coördinator heeft goedgekeurd
  'geweigerd',    -- coördinator heeft geweigerd
  'geannuleerd'   -- ouder heeft geannuleerd (vóór uiterste annuleringstermijn)
);

ALTER TABLE public.flex_dagen
  ADD COLUMN status          public.flex_dag_status NOT NULL DEFAULT 'goedgekeurd',
  ADD COLUMN reden_weiger    TEXT,
  ADD COLUMN beoordeeld_door UUID REFERENCES auth.users(id),
  ADD COLUMN beoordeeld_op   TIMESTAMPTZ;

CREATE INDEX idx_flex_dagen_status ON public.flex_dagen (status);

-- ─────────────────────────────────────────────────────
-- Demo: 3 flex-kinderen
-- ─────────────────────────────────────────────────────

INSERT INTO public.kinderen (id, organisatie_id, voornaam, achternaam, geboortedatum) VALUES
  ('30000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000001', 'Fenna', 'de Jong',   '2022-08-14'),
  ('30000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000001', 'Bram',  'Peters',    '2023-01-15'),
  ('30000000-0000-0000-0000-000000000013', '00000000-0000-0000-0000-000000000001', 'Roos',  'Vermeulen', '2023-06-10');

-- ─────────────────────────────────────────────────────
-- Demo: Flex contracten (flexpool=true, geen vaste groep)
-- ─────────────────────────────────────────────────────

INSERT INTO public.contracten
  (id, kind_id, locatie_id, groep_id, opvangtype, contracttype, status, zorgdagen, startdatum, flexpool)
VALUES
  ('40000000-0000-0000-0000-000000000001',
   '30000000-0000-0000-0000-000000000011',
   '10000000-0000-0000-0000-000000000001',  -- Boomhut Middelburg
   NULL, 'kdv', 'flex', 'actief', '{}', '2025-09-01', true),

  ('40000000-0000-0000-0000-000000000002',
   '30000000-0000-0000-0000-000000000012',
   '10000000-0000-0000-0000-000000000001',
   NULL, 'kdv', 'flex', 'actief', '{}', '2025-11-01', true),

  ('40000000-0000-0000-0000-000000000003',
   '30000000-0000-0000-0000-000000000013',
   '10000000-0000-0000-0000-000000000001',
   NULL, 'kdv', 'flex', 'actief', '{}', '2026-01-15', true);

-- ─────────────────────────────────────────────────────
-- Demo: Flex aanvragen met status 'aangevraagd'
-- (Referentiedatum: week van 13 april 2026)
-- ─────────────────────────────────────────────────────

INSERT INTO public.flex_dagen (contract_id, groep_id, datum, status) VALUES
  -- Fenna wil ma 13 april in Zonnebloem
  ('40000000-0000-0000-0000-000000000001',
   '20000000-0000-0000-0000-000000000001', '2026-04-13', 'aangevraagd'),

  -- Bram wil wo 15 april in Zonnebloem
  ('40000000-0000-0000-0000-000000000002',
   '20000000-0000-0000-0000-000000000001', '2026-04-15', 'aangevraagd'),

  -- Roos wil do 16 april in Regenboog
  ('40000000-0000-0000-0000-000000000003',
   '20000000-0000-0000-0000-000000000002', '2026-04-16', 'aangevraagd'),

  -- Fenna wil vr 17 april in Regenboog
  ('40000000-0000-0000-0000-000000000001',
   '20000000-0000-0000-0000-000000000002', '2026-04-17', 'aangevraagd'),

  -- Bram wil ma 20 april in Zonnebloem
  ('40000000-0000-0000-0000-000000000002',
   '20000000-0000-0000-0000-000000000001', '2026-04-20', 'aangevraagd'),

  -- Roos wil di 21 april in Zonnebloem
  ('40000000-0000-0000-0000-000000000003',
   '20000000-0000-0000-0000-000000000001', '2026-04-21', 'aangevraagd');
