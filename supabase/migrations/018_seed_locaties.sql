-- ═══════════════════════════════════════════════════════════════
-- Migratie 018: Clean seed locaties + groepen voor user 568bee0d
-- ═══════════════════════════════════════════════════════════════

-- ─── CLEANUP: alles verwijderen voor deze organisatie ────────
DELETE FROM public.dagdeel_configuraties WHERE organisatie_id = 'a1b2c3d4-0000-0000-0000-000000000001';
DELETE FROM public.feestdagen WHERE organisatie_id = 'a1b2c3d4-0000-0000-0000-000000000001';
DELETE FROM public.locatie_openingstijden WHERE locatie_id IN (SELECT id FROM public.locaties WHERE organisatie_id = 'a1b2c3d4-0000-0000-0000-000000000001');
DELETE FROM public.locatie_openingstijden_uitzonderingen WHERE locatie_id IN (SELECT id FROM public.locaties WHERE organisatie_id = 'a1b2c3d4-0000-0000-0000-000000000001');
DELETE FROM public.groepen WHERE locatie_id IN (SELECT id FROM public.locaties WHERE organisatie_id = 'a1b2c3d4-0000-0000-0000-000000000001');
DELETE FROM public.locaties WHERE organisatie_id = 'a1b2c3d4-0000-0000-0000-000000000001';
DELETE FROM public.user_locatie_toegang WHERE user_id = '568bee0d-8713-426d-8049-abe34b16e320';

-- ─── Organisatie (idempotent) ────────────────────────────────
INSERT INTO public.organisaties (id, naam)
VALUES ('a1b2c3d4-0000-0000-0000-000000000001', 'Penguin Place Kinderopvang')
ON CONFLICT (id) DO NOTHING;

-- ─── Profiel koppelen ────────────────────────────────────────
INSERT INTO public.profiles (id, organisatie_id, naam, email)
VALUES (
  '568bee0d-8713-426d-8049-abe34b16e320',
  'a1b2c3d4-0000-0000-0000-000000000001',
  'Judy Dekker',
  'judy@penguinplace.nl'
)
ON CONFLICT (id) DO UPDATE SET
  organisatie_id = EXCLUDED.organisatie_id,
  naam = EXCLUDED.naam;

-- ─── Beheerder-rol ───────────────────────────────────────────
INSERT INTO public.user_roles (user_id, role)
VALUES ('568bee0d-8713-426d-8049-abe34b16e320', 'beheerder')
ON CONFLICT (user_id, role) DO NOTHING;

-- ─── Toegang: alle locaties ─────────────────────────────────
INSERT INTO public.user_locatie_toegang (user_id, locatie_id, alle_locaties)
VALUES ('568bee0d-8713-426d-8049-abe34b16e320', NULL, true);

-- ─── Locaties ────────────────────────────────────────────────
INSERT INTO public.locaties (id, organisatie_id, naam, code, type, status, adres, huisnummer, postcode, plaats, telefoon, email)
VALUES
  (
    '10c00001-0000-0000-0000-000000000001',
    'a1b2c3d4-0000-0000-0000-000000000001',
    'De Pinguïnpoort',
    'PP-001',
    'kdv',
    'actief',
    'Keizersgracht',
    '42',
    '1015 CS',
    'Amsterdam',
    '020-1234567',
    'pinguinpoort@penguinplace.nl'
  ),
  (
    '10c00002-0000-0000-0000-000000000002',
    'a1b2c3d4-0000-0000-0000-000000000001',
    'Het IJsberenpaleis',
    'PP-002',
    'bso',
    'actief',
    'Vondelstraat',
    '88',
    '1054 GN',
    'Amsterdam',
    '020-7654321',
    'ijsberenpaleis@penguinplace.nl'
  ),
  (
    '10c00003-0000-0000-0000-000000000003',
    'a1b2c3d4-0000-0000-0000-000000000001',
    'De Sneeuwvlok',
    'PP-003',
    'combinatie',
    'in_opbouw',
    'Herengracht',
    '15',
    '1015 BA',
    'Amsterdam',
    '020-9876543',
    'sneeuwvlok@penguinplace.nl'
  );

-- ─── Groepen ─────────────────────────────────────────────────
-- De Pinguïnpoort (KDV) — 3 groepen
INSERT INTO public.groepen (id, locatie_id, naam, opvangtype, leeftijdscategorie, min_leeftijd_maanden, max_leeftijd_maanden, max_capaciteit, status)
VALUES
  ('a0000001-0000-0000-0000-000000000001', '10c00001-0000-0000-0000-000000000001', 'Babypinguïns',    'kdv', 'baby',    0,  12, 9,  'actief'),
  ('a0000002-0000-0000-0000-000000000002', '10c00001-0000-0000-0000-000000000001', 'Dreumespinguïns',  'kdv', 'dreumes', 12, 24, 12, 'actief'),
  ('a0000003-0000-0000-0000-000000000003', '10c00001-0000-0000-0000-000000000001', 'Peuterpinguïns',   'kdv', 'peuter',  24, 48, 16, 'actief');

-- Het IJsberenpaleis (BSO) — 2 groepen
INSERT INTO public.groepen (id, locatie_id, naam, opvangtype, leeftijdscategorie, min_leeftijd_maanden, max_leeftijd_maanden, max_capaciteit, status)
VALUES
  ('a0000004-0000-0000-0000-000000000004', '10c00002-0000-0000-0000-000000000002', 'Onderbouw IJsberen', 'bso', 'bso', 48, 96,  20, 'actief'),
  ('a0000005-0000-0000-0000-000000000005', '10c00002-0000-0000-0000-000000000002', 'Bovenbouw IJsberen', 'bso', 'bso', 96, 156, 20, 'actief');

-- De Sneeuwvlok (combinatie, in opbouw) — 1 groep
INSERT INTO public.groepen (id, locatie_id, naam, opvangtype, leeftijdscategorie, min_leeftijd_maanden, max_leeftijd_maanden, max_capaciteit, status)
VALUES
  ('a0000006-0000-0000-0000-000000000006', '10c00003-0000-0000-0000-000000000003', 'Sneeuwvlokjes', 'kdv', 'peuter', 24, 48, 14, 'actief');

-- ─── Dagdeel configuraties ──────────────────────────────────
INSERT INTO public.dagdeel_configuraties (organisatie_id, locatie_id, dagdeel_enum, starttijd, eindtijd, ingangsdatum)
VALUES
  ('a1b2c3d4-0000-0000-0000-000000000001', '10c00001-0000-0000-0000-000000000001', 'ochtend',     '07:30', '13:15', '2026-01-01'),
  ('a1b2c3d4-0000-0000-0000-000000000001', '10c00001-0000-0000-0000-000000000001', 'middag',      '12:30', '18:00', '2026-01-01'),
  ('a1b2c3d4-0000-0000-0000-000000000001', '10c00001-0000-0000-0000-000000000001', 'hele_dag',    '07:30', '18:00', '2026-01-01'),
  ('a1b2c3d4-0000-0000-0000-000000000001', '10c00001-0000-0000-0000-000000000001', 'na_school',   '15:00', '18:00', '2026-01-01'),
  ('a1b2c3d4-0000-0000-0000-000000000001', '10c00001-0000-0000-0000-000000000001', 'voor_school', '07:30', '08:30', '2026-01-01'),
  ('a1b2c3d4-0000-0000-0000-000000000001', '10c00002-0000-0000-0000-000000000002', 'ochtend',     '07:30', '13:00', '2026-01-01'),
  ('a1b2c3d4-0000-0000-0000-000000000001', '10c00002-0000-0000-0000-000000000002', 'middag',      '13:00', '18:30', '2026-01-01'),
  ('a1b2c3d4-0000-0000-0000-000000000001', '10c00002-0000-0000-0000-000000000002', 'hele_dag',    '07:30', '18:30', '2026-01-01'),
  ('a1b2c3d4-0000-0000-0000-000000000001', '10c00002-0000-0000-0000-000000000002', 'na_school',   '14:30', '18:30', '2026-01-01'),
  ('a1b2c3d4-0000-0000-0000-000000000001', '10c00002-0000-0000-0000-000000000002', 'voor_school', '07:30', '08:30', '2026-01-01');

-- ─── Feestdagen 2026 ────────────────────────────────────────
INSERT INTO public.feestdagen (organisatie_id, datum, naam)
VALUES
  ('a1b2c3d4-0000-0000-0000-000000000001', '2026-01-01', 'Nieuwjaarsdag'),
  ('a1b2c3d4-0000-0000-0000-000000000001', '2026-04-03', 'Goede Vrijdag'),
  ('a1b2c3d4-0000-0000-0000-000000000001', '2026-04-06', 'Tweede Paasdag'),
  ('a1b2c3d4-0000-0000-0000-000000000001', '2026-04-27', 'Koningsdag'),
  ('a1b2c3d4-0000-0000-0000-000000000001', '2026-05-05', 'Bevrijdingsdag'),
  ('a1b2c3d4-0000-0000-0000-000000000001', '2026-05-14', 'Hemelvaartsdag'),
  ('a1b2c3d4-0000-0000-0000-000000000001', '2026-05-25', 'Tweede Pinksterdag'),
  ('a1b2c3d4-0000-0000-0000-000000000001', '2026-12-25', 'Eerste Kerstdag'),
  ('a1b2c3d4-0000-0000-0000-000000000001', '2026-12-26', 'Tweede Kerstdag');
