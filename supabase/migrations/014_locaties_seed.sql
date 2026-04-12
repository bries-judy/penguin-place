-- ═══════════════════════════════════════════
-- PENGUIN PLACE — Migratie 014: Locaties seed data (uitbreiding)
-- Vult de nieuwe velden uit migratie 013 voor de bestaande demo-locaties.
-- Voegt openingstijden toe (trigger werkt alleen bij nieuwe INSERT).
-- ═══════════════════════════════════════════

-- ───────────────────────────────────────────
-- UPDATE locaties met nieuwe velden
-- ───────────────────────────────────────────

UPDATE public.locaties SET
  code                    = 'MID-001',
  type                    = 'kdv',
  status                  = 'actief',
  huisnummer              = '12',
  telefoon                = '0118-412300',
  email                   = 'boomhut@kibeo.nl',
  website                 = 'https://www.kibeo.nl/boomhut-middelburg',
  lrk_nummer              = '185600001234',
  ggd_regio               = 'GGD Zeeland',
  laatste_inspectie_datum = '2024-09-15',
  inspectie_oordeel       = 'goed',
  volgende_inspectie_datum= '2026-09-15',
  vergunning_geldig_tot   = '2027-03-01',
  cao                     = 'kinderopvang',
  noodcontact_naam        = 'Ingrid Verhoeven',
  noodcontact_telefoon    = '06-51234567',
  iban                    = 'NL91ABNA0417164300',
  kvk_nummer              = '22045678',
  buitenspeelruimte       = true,
  buitenspeelruimte_m2    = 180,
  heeft_keuken            = true,
  rolstoeltoegankelijk    = true,
  parkeerplaatsen         = 6
WHERE id = '10000000-0000-0000-0000-000000000001';

UPDATE public.locaties SET
  code                    = 'VLI-001',
  type                    = 'combinatie',
  status                  = 'actief',
  huisnummer              = '4',
  telefoon                = '0118-467800',
  email                   = 'zeester@kibeo.nl',
  website                 = 'https://www.kibeo.nl/zeester-vlissingen',
  lrk_nummer              = '185600005678',
  ggd_regio               = 'GGD Zeeland',
  laatste_inspectie_datum = '2024-05-20',
  inspectie_oordeel       = 'voldoende',
  volgende_inspectie_datum= '2025-11-20',
  vergunning_geldig_tot   = '2026-06-01',
  cao                     = 'kinderopvang',
  noodcontact_naam        = 'Peter Bakker',
  noodcontact_telefoon    = '06-67891234',
  iban                    = 'NL20INGB0001234567',
  kvk_nummer              = '22045679',
  buitenspeelruimte       = true,
  buitenspeelruimte_m2    = 120,
  heeft_keuken            = true,
  rolstoeltoegankelijk    = false,
  parkeerplaatsen         = 4
WHERE id = '10000000-0000-0000-0000-000000000002';

UPDATE public.locaties SET
  code                    = 'GOE-001',
  type                    = 'bso',
  status                  = 'in_opbouw',
  huisnummer              = '8',
  telefoon                = '0113-231900',
  email                   = 'zandkasteel@kibeo.nl',
  lrk_nummer              = '185600009012',
  ggd_regio               = 'GGD Zeeland',
  vergunning_geldig_tot   = '2026-12-31',
  cao                     = 'kinderopvang',
  noodcontact_naam        = 'Marianne de Groot',
  noodcontact_telefoon    = '06-23456789',
  iban                    = 'NL20INGB0009876543',
  kvk_nummer              = '22045680',
  buitenspeelruimte       = false,
  heeft_keuken            = false,
  rolstoeltoegankelijk    = true,
  parkeerplaatsen         = 2,
  notities                = 'Locatie in opbouw — verwachte opening januari 2027.'
WHERE id = '10000000-0000-0000-0000-000000000003';

-- ───────────────────────────────────────────
-- UPDATE groepen met nieuwe velden
-- ───────────────────────────────────────────

-- Boomhut Middelburg
UPDATE public.groepen SET status = 'actief', m2 = 45, bkr_ratio = '1:5',  ruimtenaam = 'Blauwe kamer'   WHERE id = '20000000-0000-0000-0000-000000000001';
UPDATE public.groepen SET status = 'actief', m2 = 36, bkr_ratio = '1:4',  ruimtenaam = 'Gele kamer'     WHERE id = '20000000-0000-0000-0000-000000000002';
UPDATE public.groepen SET status = 'actief', m2 = 28, bkr_ratio = '1:3',  ruimtenaam = 'Rode kamer'     WHERE id = '20000000-0000-0000-0000-000000000003';
UPDATE public.groepen SET status = 'actief', m2 = 80, bkr_ratio = '1:10', ruimtenaam = 'BSO-ruimte'     WHERE id = '20000000-0000-0000-0000-000000000004';

-- Zeester Vlissingen
UPDATE public.groepen SET status = 'actief', m2 = 26, bkr_ratio = '1:3',  ruimtenaam = 'Babykamer'      WHERE id = '20000000-0000-0000-0000-000000000005';
UPDATE public.groepen SET status = 'actief', m2 = 34, bkr_ratio = '1:4',  ruimtenaam = 'Dreumeskamer'   WHERE id = '20000000-0000-0000-0000-000000000006';
UPDATE public.groepen SET status = 'actief', m2 = 42, bkr_ratio = '1:5',  ruimtenaam = 'Peuterkamer'    WHERE id = '20000000-0000-0000-0000-000000000007';

-- ───────────────────────────────────────────
-- OPENINGSTIJDEN voor bestaande locaties
-- (trigger maak_standaard_openingstijden werkt alleen bij nieuwe INSERT)
-- ───────────────────────────────────────────

INSERT INTO public.locatie_openingstijden (locatie_id, dag_van_week, is_open, open_tijd, sluit_tijd) VALUES
  -- Boomhut Middelburg
  ('10000000-0000-0000-0000-000000000001', 'ma', true,  '07:00', '18:00'),
  ('10000000-0000-0000-0000-000000000001', 'di', true,  '07:00', '18:00'),
  ('10000000-0000-0000-0000-000000000001', 'wo', true,  '07:00', '18:00'),
  ('10000000-0000-0000-0000-000000000001', 'do', true,  '07:00', '18:00'),
  ('10000000-0000-0000-0000-000000000001', 'vr', true,  '07:00', '18:00'),
  ('10000000-0000-0000-0000-000000000001', 'za', false, NULL,    NULL),
  ('10000000-0000-0000-0000-000000000001', 'zo', false, NULL,    NULL),
  -- Zeester Vlissingen
  ('10000000-0000-0000-0000-000000000002', 'ma', true,  '07:30', '18:30'),
  ('10000000-0000-0000-0000-000000000002', 'di', true,  '07:30', '18:30'),
  ('10000000-0000-0000-0000-000000000002', 'wo', true,  '07:30', '18:30'),
  ('10000000-0000-0000-0000-000000000002', 'do', true,  '07:30', '18:30'),
  ('10000000-0000-0000-0000-000000000002', 'vr', true,  '07:30', '18:30'),
  ('10000000-0000-0000-0000-000000000002', 'za', false, NULL,    NULL),
  ('10000000-0000-0000-0000-000000000002', 'zo', false, NULL,    NULL),
  -- Zandkasteel Goes (in opbouw, nog geen vaste tijden)
  ('10000000-0000-0000-0000-000000000003', 'ma', false, NULL, NULL),
  ('10000000-0000-0000-0000-000000000003', 'di', false, NULL, NULL),
  ('10000000-0000-0000-0000-000000000003', 'wo', false, NULL, NULL),
  ('10000000-0000-0000-0000-000000000003', 'do', false, NULL, NULL),
  ('10000000-0000-0000-0000-000000000003', 'vr', false, NULL, NULL),
  ('10000000-0000-0000-0000-000000000003', 'za', false, NULL, NULL),
  ('10000000-0000-0000-0000-000000000003', 'zo', false, NULL, NULL)
ON CONFLICT (locatie_id, dag_van_week) DO NOTHING;

-- ───────────────────────────────────────────
-- OPENINGSTIJDEN UITZONDERINGEN (sluitingen)
-- ───────────────────────────────────────────

INSERT INTO public.locatie_openingstijden_uitzonderingen
  (locatie_id, start_datum, eind_datum, is_gesloten, omschrijving)
VALUES
  -- Boomhut Middelburg
  ('10000000-0000-0000-0000-000000000001', '2026-07-27', '2026-08-07', true, 'Zomersluiting 2026'),
  ('10000000-0000-0000-0000-000000000001', '2026-12-24', '2026-12-31', true, 'Kerstvakantie 2026'),
  -- Zeester Vlissingen
  ('10000000-0000-0000-0000-000000000002', '2026-07-27', '2026-08-14', true, 'Zomersluiting 2026'),
  ('10000000-0000-0000-0000-000000000002', '2026-12-24', '2026-12-31', true, 'Kerstvakantie 2026');
