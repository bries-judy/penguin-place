-- ═══════════════════════════════════════════════════════════════
-- PENGUIN PLACE — Migratie 005: Wachtlijst uitgebreide demo data
-- ═══════════════════════════════════════════════════════════════
-- Dekt de volgende use cases:
--   • FIFO volgorde (eerste aangemeld = hoogste positie)
--   • Prioriteit-overrides (broer/zus, medewerker)
--   • Alle statussen: wachtend / aangeboden / geplaatst / vervallen / geannuleerd
--   • Aanbieding-flows: open, geaccepteerd, geweigerd, verlopen
--   • Meerdere aanbiedingen per kind (eerste geweigerd → nieuwe kans)
--   • Enkelvoudige en meervoudige locatievoorkeuren
--   • Deeltijd, volledig en specifieke dagenwens
--   • KDV baby / dreumes / peuter, BSO en peuteropvang
--   • Gezin met twee kinderen op wachtlijst tegelijk
--   • Inschrijving waarbij verloopdatum aanbieding al verstreken is
-- ═══════════════════════════════════════════════════════════════

-- ──────────────────────────────────────────────
-- Extra kinderen (bovenop de 10 uit seed 003)
-- ──────────────────────────────────────────────
INSERT INTO public.kinderen (id, organisatie_id, voornaam, achternaam, geboortedatum) VALUES
  -- Babyleeftijd (0–12 mnd)
  ('30000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000001', 'Mila',     'van Dijk',     '2025-10-08'),
  ('30000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000001', 'Daan',     'Hendriks',     '2025-11-22'),
  ('30000000-0000-0000-0000-000000000013', '00000000-0000-0000-0000-000000000001', 'Fleur',    'Vermeulen',    '2025-08-30'),

  -- Dreumesleeftijd (12–24 mnd)
  ('30000000-0000-0000-0000-000000000014', '00000000-0000-0000-0000-000000000001', 'Bo',       'Smeets',       '2024-12-15'),
  ('30000000-0000-0000-0000-000000000015', '00000000-0000-0000-0000-000000000001', 'Roos',     'van der Berg', '2025-01-04'),
  ('30000000-0000-0000-0000-000000000016', '00000000-0000-0000-0000-000000000001', 'Luuk',     'Pieters',      '2024-11-09'),

  -- Peuterleeftijd (24–48 mnd)
  ('30000000-0000-0000-0000-000000000017', '00000000-0000-0000-0000-000000000001', 'Tessa',    'de Groot',     '2023-05-17'),
  ('30000000-0000-0000-0000-000000000018', '00000000-0000-0000-0000-000000000001', 'Oliver',   'Willems',      '2023-08-03'),
  ('30000000-0000-0000-0000-000000000019', '00000000-0000-0000-0000-000000000001', 'Hannah',   'Jacobs',       '2022-12-20'),
  ('30000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000001', 'Jesse',    'Peeters',      '2023-03-11'),

  -- BSO-leeftijd (4–12 jr)
  ('30000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000001', 'Amber',    'Kuijpers',     '2019-06-25'),
  ('30000000-0000-0000-0000-000000000022', '00000000-0000-0000-0000-000000000001', 'Sem',      'van Leeuwen',  '2018-09-14'),

  -- Peuteropvang (2–4 jr)
  ('30000000-0000-0000-0000-000000000023', '00000000-0000-0000-0000-000000000001', 'Noor',     'Hoekstra',     '2023-01-28'),
  ('30000000-0000-0000-0000-000000000024', '00000000-0000-0000-0000-000000000001', 'Finn',     'van Os',       '2023-06-12'),

  -- Gezin Martens — twee kinderen tegelijk op wachtlijst
  ('30000000-0000-0000-0000-000000000025', '00000000-0000-0000-0000-000000000001', 'Lotte',    'Martens',      '2024-02-19'),
  ('30000000-0000-0000-0000-000000000026', '00000000-0000-0000-0000-000000000001', 'Pieter',   'Martens',      '2022-07-05');


-- ──────────────────────────────────────────────
-- WACHTLIJST INSCHRIJVINGEN
-- ──────────────────────────────────────────────

INSERT INTO public.wachtlijst
  (id, organisatie_id, kind_id, opvangtype, gewenste_startdatum, gewenste_dagen, prioriteit, status, notities, aangemeld_op)
VALUES

  -- ── 1. Wachtend — de allereerste op de lijst (lang gewacht) ──────────────
  ('50000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000001',
   '30000000-0000-0000-0000-000000000017',   -- Tessa de Groot (peuter)
   'kdv', '2026-06-01', '{0,2,4}', 0, 'wachtend',
   'Ouder werkt parttime ma/wo/vr. Flexibel in groep.',
   '2025-09-10 08:45:00+00'),

  -- ── 2. Wachtend — tweede op de lijst ─────────────────────────────────────
  ('50000000-0000-0000-0000-000000000002',
   '00000000-0000-0000-0000-000000000001',
   '30000000-0000-0000-0000-000000000014',   -- Bo Smeets (dreumes)
   'kdv', '2026-07-01', '{0,1,2,3,4}', 0, 'wachtend',
   'Voorkeur: volledige week. Beide ouders fulltime.',
   '2025-10-03 10:20:00+00'),

  -- ── 3. Wachtend — prioriteit broer/zus (Sofie, broer Max zit bij Zonnebloem) ──
  ('50000000-0000-0000-0000-000000000003',
   '00000000-0000-0000-0000-000000000001',
   '30000000-0000-0000-0000-000000000015',   -- Roos van der Berg (dreumes)
   'kdv', '2026-09-01', '{0,1,2}', 5, 'wachtend',
   'Broer Lars Dekker zit al bij Boomhut — broer/zus prioriteit.',
   '2025-10-18 14:30:00+00'),

  -- ── 4. Wachtend — prioriteit medewerker ─────────────────────────────────
  ('50000000-0000-0000-0000-000000000004',
   '00000000-0000-0000-0000-000000000001',
   '30000000-0000-0000-0000-000000000011',   -- Mila van Dijk (baby)
   'kdv', '2026-05-01', '{1,2,3}', 10, 'wachtend',
   'Medewerker kinderopvang — medewerkerstarief en -prioriteit van toepassing.',
   '2025-11-01 09:00:00+00'),

  -- ── 5. Wachtend — recent aangemeld, baby, voorkeur Zeester ──────────────
  ('50000000-0000-0000-0000-000000000005',
   '00000000-0000-0000-0000-000000000001',
   '30000000-0000-0000-0000-000000000012',   -- Daan Hendriks (baby)
   'kdv', '2026-08-01', '{0,1,2,3,4}', 0, 'wachtend',
   NULL,
   '2026-02-20 11:00:00+00'),

  -- ── 6. Wachtend — deeltijd, specifieke dag (alleen wo) ───────────────────
  ('50000000-0000-0000-0000-000000000006',
   '00000000-0000-0000-0000-000000000001',
   '30000000-0000-0000-0000-000000000016',   -- Luuk Pieters (dreumes)
   'kdv', '2026-06-01', '{2}', 0, 'wachtend',
   'Grootouders passen op ma/di/do/vr. Alleen woensdag nodig.',
   '2025-12-05 16:15:00+00'),

  -- ── 7. Wachtend — BSO aanvraag ────────────────────────────────────────────
  ('50000000-0000-0000-0000-000000000007',
   '00000000-0000-0000-0000-000000000001',
   '30000000-0000-0000-0000-000000000021',   -- Amber Kuijpers (6 jaar, BSO)
   'bso', '2026-08-25', '{0,1,2,3,4}', 0, 'wachtend',
   'Start groep 3 basisschool per augustus. Naschoolse opvang gewenst.',
   '2026-01-15 13:45:00+00'),

  -- ── 8. Wachtend — peuteropvang ────────────────────────────────────────────
  ('50000000-0000-0000-0000-000000000008',
   '00000000-0000-0000-0000-000000000001',
   '30000000-0000-0000-0000-000000000023',   -- Noor Hoekstra (peuter, peuteropvang)
   'peuteropvang', '2026-09-01', '{1,3}', 0, 'wachtend',
   'Voorkeur: dinsdagochtend en donderdagochtend.',
   '2026-01-28 10:10:00+00'),

  -- ── 9. Wachtend — gezin Martens, kind 1 ─────────────────────────────────
  ('50000000-0000-0000-0000-000000000009',
   '00000000-0000-0000-0000-000000000001',
   '30000000-0000-0000-0000-000000000025',   -- Lotte Martens (dreumes)
   'kdv', '2026-07-01', '{0,2,4}', 0, 'wachtend',
   'Gezin Martens — twee kinderen tegelijk aangemeld (zie ook Pieter Martens).',
   '2026-02-01 09:30:00+00'),

  -- ── 10. Wachtend — gezin Martens, kind 2 ────────────────────────────────
  ('50000000-0000-0000-0000-000000000010',
   '00000000-0000-0000-0000-000000000001',
   '30000000-0000-0000-0000-000000000026',   -- Pieter Martens (peuter)
   'kdv', '2026-07-01', '{0,2,4}', 0, 'wachtend',
   'Gezin Martens — beide kinderen zo mogelijk dezelfde locatie.',
   '2026-02-01 09:32:00+00'),

  -- ── 11. Aangeboden — aanbod open, verloopt over 10 dagen ─────────────────
  ('50000000-0000-0000-0000-000000000011',
   '00000000-0000-0000-0000-000000000001',
   '30000000-0000-0000-0000-000000000018',   -- Oliver Willems (peuter)
   'kdv', '2026-06-01', '{0,1,2,3,4}', 0, 'aangeboden',
   NULL,
   '2025-09-25 11:00:00+00'),

  -- ── 12. Aangeboden — aanbod net verstuurd (gisteren) ─────────────────────
  ('50000000-0000-0000-0000-000000000012',
   '00000000-0000-0000-0000-000000000001',
   '30000000-0000-0000-0000-000000000013',   -- Fleur Vermeulen (baby)
   'kdv', '2026-05-01', '{1,3,4}', 0, 'aangeboden',
   'Ouder telefonisch op de hoogte gesteld.',
   '2025-10-12 14:00:00+00'),

  -- ── 13. Aangeboden — eerder aanbod geweigerd, tweede kans aangeboden ─────
  ('50000000-0000-0000-0000-000000000013',
   '00000000-0000-0000-0000-000000000001',
   '30000000-0000-0000-0000-000000000020',   -- Jesse Peeters (peuter)
   'kdv', '2026-06-01', '{0,1}', 0, 'aangeboden',
   'Eerste aanbod geweigerd (startdatum te vroeg). Nieuw aanbod per 1 juni.',
   '2025-08-20 15:30:00+00'),

  -- ── 14. Geplaatst — succesvol geaccepteerd, recent ───────────────────────
  ('50000000-0000-0000-0000-000000000014',
   '00000000-0000-0000-0000-000000000001',
   '30000000-0000-0000-0000-000000000019',   -- Hannah Jacobs (peuter)
   'kdv', '2026-05-01', '{0,2,4}', 0, 'geplaatst',
   NULL,
   '2025-07-14 09:00:00+00'),

  -- ── 15. Geplaatst — BSO geaccepteerd ────────────────────────────────────
  ('50000000-0000-0000-0000-000000000015',
   '00000000-0000-0000-0000-000000000001',
   '30000000-0000-0000-0000-000000000022',   -- Sem van Leeuwen (BSO)
   'bso', '2026-08-25', '{0,1,2,3,4}', 0, 'geplaatst',
   NULL,
   '2025-11-30 10:45:00+00'),

  -- ── 16. Geplaatst — peuteropvang geaccepteerd ───────────────────────────
  ('50000000-0000-0000-0000-000000000016',
   '00000000-0000-0000-0000-000000000001',
   '30000000-0000-0000-0000-000000000024',   -- Finn van Os (peuteropvang)
   'peuteropvang', '2026-04-01', '{1,3}', 0, 'geplaatst',
   NULL,
   '2025-10-01 11:20:00+00'),

  -- ── 17. Vervallen — aanbieding verlopen, ouder heeft niet gereageerd ─────
  ('50000000-0000-0000-0000-000000000017',
   '00000000-0000-0000-0000-000000000001',
   '30000000-0000-0000-0000-000000000003',   -- Noa van den Berg
   'kdv', '2026-06-01', '{0,2,4}', 0, 'vervallen',
   'Aanbod op 10 jan verstuurd, verlopen op 24 jan. Ouder niet bereikbaar geweest.',
   '2025-06-15 08:30:00+00'),

  -- ── 18. Geannuleerd — ouder heeft zelf ingetrokken ───────────────────────
  ('50000000-0000-0000-0000-000000000018',
   '00000000-0000-0000-0000-000000000001',
   '30000000-0000-0000-0000-000000000004',   -- Finn Bakker
   'kdv', '2026-10-01', '{0,4}', 0, 'geannuleerd',
   'Ouder heeft per mail laten weten opvang elders geregeld te hebben.',
   '2025-12-01 14:00:00+00');


-- ──────────────────────────────────────────────
-- LOCATIEVOORKEUREN
-- ──────────────────────────────────────────────
-- Locatie-IDs:
--   Boomhut Middelburg  = 10000000-0000-0000-0000-000000000001
--   Zeester Vlissingen  = 10000000-0000-0000-0000-000000000002
--   Zandkasteel Goes    = 10000000-0000-0000-0000-000000000003

INSERT INTO public.locatievoorkeuren (wachtlijst_id, locatie_id, voorkeur_volgorde) VALUES
  -- 1  Tessa — voorkeur Boomhut (dichtst bij huis), daarna Zeester
  ('50000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 1),
  ('50000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 2),

  -- 2  Bo — alle drie locaties opgegeven (maakt niet uit)
  ('50000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 1),
  ('50000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 2),
  ('50000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000003', 3),

  -- 3  Roos — broer/zus bij Boomhut, dus alleen Boomhut
  ('50000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', 1),

  -- 4  Mila — medewerker, werkt bij Boomhut
  ('50000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000001', 1),

  -- 5  Daan — voorkeur Zeester
  ('50000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000002', 1),
  ('50000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000001', 2),

  -- 6  Luuk — alleen woensdag, dicht bij oma: Boomhut of Zandkasteel
  ('50000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000001', 1),
  ('50000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000003', 2),

  -- 7  Amber (BSO) — Boomhut (school staat in Middelburg)
  ('50000000-0000-0000-0000-000000000007', '10000000-0000-0000-0000-000000000001', 1),

  -- 8  Noor (peuteropvang) — Zeester
  ('50000000-0000-0000-0000-000000000008', '10000000-0000-0000-0000-000000000002', 1),
  ('50000000-0000-0000-0000-000000000008', '10000000-0000-0000-0000-000000000001', 2),

  -- 9  Lotte Martens — Boomhut
  ('50000000-0000-0000-0000-000000000009', '10000000-0000-0000-0000-000000000001', 1),

  -- 10 Pieter Martens — Boomhut (zelfde locatie als zusje)
  ('50000000-0000-0000-0000-000000000010', '10000000-0000-0000-0000-000000000001', 1),

  -- 11 Oliver — Boomhut
  ('50000000-0000-0000-0000-000000000011', '10000000-0000-0000-0000-000000000001', 1),

  -- 12 Fleur — Zeester
  ('50000000-0000-0000-0000-000000000012', '10000000-0000-0000-0000-000000000002', 1),
  ('50000000-0000-0000-0000-000000000012', '10000000-0000-0000-0000-000000000001', 2),

  -- 13 Jesse — Boomhut of Zandkasteel
  ('50000000-0000-0000-0000-000000000013', '10000000-0000-0000-0000-000000000001', 1),
  ('50000000-0000-0000-0000-000000000013', '10000000-0000-0000-0000-000000000003', 2),

  -- 14 Hannah (geplaatst) — Boomhut
  ('50000000-0000-0000-0000-000000000014', '10000000-0000-0000-0000-000000000001', 1),

  -- 15 Sem BSO (geplaatst) — Boomhut
  ('50000000-0000-0000-0000-000000000015', '10000000-0000-0000-0000-000000000001', 1),

  -- 16 Finn peuteropvang (geplaatst) — Zeester
  ('50000000-0000-0000-0000-000000000016', '10000000-0000-0000-0000-000000000002', 1),

  -- 17 Noa (vervallen) — Boomhut
  ('50000000-0000-0000-0000-000000000017', '10000000-0000-0000-0000-000000000001', 1),
  ('50000000-0000-0000-0000-000000000017', '10000000-0000-0000-0000-000000000002', 2),

  -- 18 Finn Bakker (geannuleerd) — Zeester, Zandkasteel
  ('50000000-0000-0000-0000-000000000018', '10000000-0000-0000-0000-000000000002', 1),
  ('50000000-0000-0000-0000-000000000018', '10000000-0000-0000-0000-000000000003', 2);


-- ──────────────────────────────────────────────
-- AANBIEDINGEN
-- ──────────────────────────────────────────────

INSERT INTO public.aanbiedingen
  (id, wachtlijst_id, locatie_id, groep_id, aangeboden_op, verloopdatum, status, notities)
VALUES

  -- 11 Oliver — open aanbod, verloopt over ~10 dagen
  ('60000000-0000-0000-0000-000000000001',
   '50000000-0000-0000-0000-000000000011',
   '10000000-0000-0000-0000-000000000001',  -- Boomhut
   '20000000-0000-0000-0000-000000000001',  -- Zonnebloem (peuter)
   '2026-03-27 10:00:00+00',
   '2026-04-20 23:59:00+00',
   'openstaand',
   'Plek vrijgekomen in Zonnebloem per 1 juni. Graag binnen 14 dagen reageren.'),

  -- 12 Fleur — open aanbod, net verstuurd (gisteren)
  ('60000000-0000-0000-0000-000000000002',
   '50000000-0000-0000-0000-000000000012',
   '10000000-0000-0000-0000-000000000002',  -- Zeester
   '20000000-0000-0000-0000-000000000005',  -- Dolfijn (baby)
   '2026-04-09 09:30:00+00',
   '2026-04-23 23:59:00+00',
   'openstaand',
   'Babyplek beschikbaar per 1 mei door vertrek Liam Jansen.'),

  -- 13 Jesse — eerste aanbod geweigerd (startdatum te vroeg)
  ('60000000-0000-0000-0000-000000000003',
   '50000000-0000-0000-0000-000000000013',
   '10000000-0000-0000-0000-000000000001',  -- Boomhut
   '20000000-0000-0000-0000-000000000001',  -- Zonnebloem
   '2026-01-15 11:00:00+00',
   '2026-01-29 23:59:00+00',
   'geweigerd',
   'Ouder: startdatum 1 april te vroeg, eerder terug uit verlof dan verwacht.'),

  -- 13 Jesse — tweede aanbod open (na weigering, nieuwe plek)
  ('60000000-0000-0000-0000-000000000004',
   '50000000-0000-0000-0000-000000000013',
   '10000000-0000-0000-0000-000000000001',  -- Boomhut
   '20000000-0000-0000-0000-000000000001',  -- Zonnebloem
   '2026-03-05 14:00:00+00',
   '2026-04-19 23:59:00+00',
   'openstaand',
   'Nieuw aanbod na weigering — plek per 1 juni, ruim op tijd.'),

  -- 14 Hannah — aanbod geaccepteerd
  ('60000000-0000-0000-0000-000000000005',
   '50000000-0000-0000-0000-000000000014',
   '10000000-0000-0000-0000-000000000001',  -- Boomhut
   '20000000-0000-0000-0000-000000000001',  -- Zonnebloem
   '2026-02-10 10:00:00+00',
   '2026-02-24 23:59:00+00',
   'geaccepteerd',
   NULL),

  -- 15 Sem BSO — aanbod geaccepteerd
  ('60000000-0000-0000-0000-000000000006',
   '50000000-0000-0000-0000-000000000015',
   '10000000-0000-0000-0000-000000000001',  -- Boomhut
   '20000000-0000-0000-0000-000000000004',  -- Vliegende Vis (BSO)
   '2026-03-01 09:00:00+00',
   '2026-03-15 23:59:00+00',
   'geaccepteerd',
   NULL),

  -- 16 Finn peuteropvang — aanbod geaccepteerd
  ('60000000-0000-0000-0000-000000000007',
   '50000000-0000-0000-0000-000000000016',
   '10000000-0000-0000-0000-000000000002',  -- Zeester
   '20000000-0000-0000-0000-000000000007',  -- Zeester groep (peuter)
   '2026-02-20 11:30:00+00',
   '2026-03-06 23:59:00+00',
   'geaccepteerd',
   'Plek beschikbaar per 1 april.'),

  -- 17 Noa — aanbod VERLOPEN (ouder niet gereageerd)
  ('60000000-0000-0000-0000-000000000008',
   '50000000-0000-0000-0000-000000000017',
   '10000000-0000-0000-0000-000000000001',  -- Boomhut
   '20000000-0000-0000-0000-000000000002',  -- Regenboog
   '2026-01-10 10:00:00+00',
   '2026-01-24 23:59:00+00',  -- verleden datum
   'verlopen',
   'Tweemaal gebeld, geen reactie. Status inschrijving op vervallen gezet.');
