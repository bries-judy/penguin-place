-- ═══════════════════════════════════════════════════════════════
-- PENGUIN PLACE — Migratie 007: Kindregistratie demo data
-- ═══════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────
-- Kinderen: extra velden invullen voor de 10 bestaande
-- ─────────────────────────────────────────────────────
UPDATE public.kinderen SET geslacht = 'vrouw', aangemeld_op = '2024-05-10 09:00:00+00' WHERE id = '30000000-0000-0000-0000-000000000001'; -- Emma de Vries
UPDATE public.kinderen SET geslacht = 'man',   aangemeld_op = '2024-03-22 10:15:00+00' WHERE id = '30000000-0000-0000-0000-000000000002'; -- Liam Jansen
UPDATE public.kinderen SET geslacht = 'vrouw', aangemeld_op = '2024-11-04 14:30:00+00' WHERE id = '30000000-0000-0000-0000-000000000003'; -- Noa van den Berg
UPDATE public.kinderen SET geslacht = 'man',   aangemeld_op = '2023-10-17 08:45:00+00' WHERE id = '30000000-0000-0000-0000-000000000004'; -- Finn Bakker
UPDATE public.kinderen SET geslacht = 'vrouw', aangemeld_op = '2024-01-08 11:00:00+00' WHERE id = '30000000-0000-0000-0000-000000000005'; -- Sara Visser
UPDATE public.kinderen SET geslacht = 'man',   aangemeld_op = '2025-07-12 09:30:00+00' WHERE id = '30000000-0000-0000-0000-000000000006'; -- Tim Smit
UPDATE public.kinderen SET tussenvoegsel = NULL, geslacht = 'vrouw', aangemeld_op = '2023-11-20 13:00:00+00' WHERE id = '30000000-0000-0000-0000-000000000007'; -- Julia Mulder
UPDATE public.kinderen SET geslacht = 'man',   aangemeld_op = '2023-09-05 10:00:00+00' WHERE id = '30000000-0000-0000-0000-000000000008'; -- Max de Boer
UPDATE public.kinderen SET geslacht = 'vrouw', aangemeld_op = '2025-04-18 15:45:00+00' WHERE id = '30000000-0000-0000-0000-000000000009'; -- Sofie Meijer
UPDATE public.kinderen SET geslacht = 'man',   aangemeld_op = '2024-12-02 09:00:00+00' WHERE id = '30000000-0000-0000-0000-000000000010'; -- Lars Dekker

-- ─────────────────────────────────────────────────────
-- Adressen
-- ─────────────────────────────────────────────────────
INSERT INTO public.adressen (kind_id, straat, huisnummer, postcode, woonplaats) VALUES
  ('30000000-0000-0000-0000-000000000001', 'Segeerssingel',      '14',    '4331 JH', 'Middelburg'),
  ('30000000-0000-0000-0000-000000000002', 'Kanaalweg',          '23b',   '4331 LP', 'Middelburg'),
  ('30000000-0000-0000-0000-000000000003', 'Vlissingsestraat',   '8',     '4382 CK', 'Vlissingen'),
  ('30000000-0000-0000-0000-000000000004', 'Bogardstraat',       '31',    '4331 BL', 'Middelburg'),
  ('30000000-0000-0000-0000-000000000005', 'Rozengracht',        '5',     '4382 HG', 'Vlissingen'),
  ('30000000-0000-0000-0000-000000000006', 'Herengracht',        '17',    '4461 XA', 'Goes'),
  ('30000000-0000-0000-0000-000000000007', 'Lange Delft',        '42',    '4331 AM', 'Middelburg'),
  ('30000000-0000-0000-0000-000000000008', 'Singelstraat',       '6',     '4331 SH', 'Middelburg'),
  ('30000000-0000-0000-0000-000000000009', 'Smallestraat',       '19',    '4461 BG', 'Goes'),
  ('30000000-0000-0000-0000-000000000010', 'Veerseweg',          '88',    '4332 BJ', 'Middelburg');

-- ─────────────────────────────────────────────────────
-- Contactpersonen (ouders)
-- ─────────────────────────────────────────────────────
INSERT INTO public.contactpersonen
  (kind_id, rol, voornaam, achternaam, telefoon_mobiel, email, relatie_tot_kind, machtigt_ophalen, ontvangt_factuur, ontvangt_correspondentie)
VALUES
  -- Emma de Vries
  ('30000000-0000-0000-0000-000000000001', 'ouder1', 'Margreet', 'de Vries',  '06-12345678', 'margreet.devries@gmail.com',  'moeder', true, true,  true),
  ('30000000-0000-0000-0000-000000000001', 'ouder2', 'Thomas',   'de Vries',  '06-23456789', 'thomas.devries@outlook.com',   'vader',  true, false, false),

  -- Liam Jansen
  ('30000000-0000-0000-0000-000000000002', 'ouder1', 'Sandra',   'Jansen',    '06-34567890', 'sandra.jansen@ziggo.nl',       'moeder', true, true,  true),
  ('30000000-0000-0000-0000-000000000002', 'ouder2', 'Pieter',   'Jansen',    '06-45678901', 'pieter.jansen@gmail.com',      'vader',  true, false, false),

  -- Noa van den Berg
  ('30000000-0000-0000-0000-000000000003', 'ouder1', 'Anita',    'van den Berg', '06-56789012', 'anita.vandenberg@gmail.com', 'moeder', true, true, true),

  -- Finn Bakker
  ('30000000-0000-0000-0000-000000000004', 'ouder1', 'Lisette',  'Bakker',    '06-67890123', 'lisette.bakker@hotmail.com',   'moeder', true, true,  true),
  ('30000000-0000-0000-0000-000000000004', 'ouder2', 'Gerben',   'Bakker',    '06-78901234', 'gerben.bakker@gmail.com',      'vader',  true, false, false),

  -- Sara Visser
  ('30000000-0000-0000-0000-000000000005', 'ouder1', 'Inge',     'Visser',    '06-89012345', 'inge.visser@gmail.com',        'moeder', true, true,  true),

  -- Tim Smit
  ('30000000-0000-0000-0000-000000000006', 'ouder1', 'Petra',    'Smit',      '06-90123456', 'petra.smit@gmail.com',         'moeder', true, true,  true),
  ('30000000-0000-0000-0000-000000000006', 'ouder2', 'Ronald',   'Smit',      '06-01234567', 'ronald.smit@company.nl',       'vader',  false, false, false),

  -- Julia Mulder
  ('30000000-0000-0000-0000-000000000007', 'ouder1', 'Wendy',    'Mulder',    '06-11223344', 'wendy.mulder@gmail.com',       'moeder', true, true,  true),

  -- Max de Boer
  ('30000000-0000-0000-0000-000000000008', 'ouder1', 'Christine','de Boer',   '06-22334455', 'christine.deboer@hotmail.com', 'moeder', true, true,  true),
  ('30000000-0000-0000-0000-000000000008', 'ouder2', 'Mark',     'de Boer',   '06-33445566', 'mark.deboer@gmail.com',        'vader',  true, false, false),

  -- Sofie Meijer
  ('30000000-0000-0000-0000-000000000009', 'ouder1', 'Bianca',   'Meijer',    '06-44556677', 'bianca.meijer@gmail.com',      'moeder', true, true,  true),

  -- Lars Dekker
  ('30000000-0000-0000-0000-000000000010', 'ouder1', 'Hanneke',  'Dekker',    '06-55667788', 'hanneke.dekker@gmail.com',     'moeder', true, true,  true),
  ('30000000-0000-0000-0000-000000000010', 'ouder2', 'Sjoerd',   'Dekker',    '06-66778899', 'sjoerd.dekker@gmail.com',      'vader',  true, false, false);

-- ─────────────────────────────────────────────────────
-- Medische gegevens (voor een selectie kinderen)
-- ─────────────────────────────────────────────────────
INSERT INTO public.medisch_gegevens
  (kind_id, allergieeen, medicatie, dieetwensen, zorgbehoeften, huisarts, foto_toestemming, bijzonderheden)
VALUES
  -- Emma de Vries: lactose-intolerant
  ('30000000-0000-0000-0000-000000000001',
   'Lactose-intolerantie',
   NULL,
   'Geen koemelk of producten met lactose. Plantaardige alternatieven zijn OK.',
   NULL,
   'Huisartsenpraktijk Middelburg, 0118-612345',
   true,
   NULL),

  -- Liam Jansen: seizoensallergie, geen bijzonderheden voor opvang
  ('30000000-0000-0000-0000-000000000002',
   'Hooikoorts (seizoensgebonden, april–juli)',
   'Cetirizine 5mg — 1x per dag ''s ochtends bij klachten. Pil zit in bakje met naam.',
   NULL,
   NULL,
   'Huisarts J. van Rijn, 0118-654321',
   true,
   'Buiten spelen bij hoog pollenniveau graag aandacht voor oogklachten.'),

  -- Finn Bakker: pinda-allergie (ernstig)
  ('30000000-0000-0000-0000-000000000004',
   'PINDA-ALLERGIE — ERNSTIG (anafylaxie mogelijk)',
   'EpiPen aanwezig in tas — zie rode etui. Volg altijd het noodprotocol bij contact.',
   'Absoluut geen producten met pinda''s of pindaolie. Let op: ook kruisbesmetting vermijden.',
   'Heeft een zorgplan — zie bijlage. Personeel is geïnstrueerd.',
   'Kinderarts ADRZ Goes, 0113-234567',
   true,
   'EpiPen altijd binnen handbereik. Noodprotocol hangt in de groep. Ouders zijn altijd direct bereikbaar.'),

  -- Max de Boer: autismespectrumstoornis
  ('30000000-0000-0000-0000-000000000008',
   NULL,
   NULL,
   'Voorkeur voor vaste eetmomenten en vertrouwde producten. Onverwachte textuurveranderingen zijn lastig.',
   'Autismespectrumstoornis (gediagnosticeerd). Houdt van vaste routines. Bij overprikkeling: stille hoek bieden. Visueel rooster helpt.',
   'Huisartsenpraktijk Middelburg Zuid, 0118-789012',
   false,
   'Vooraf aankondigen van wijzigingen in de dagstructuur. Overdrachtsdocument bij ouders opvragen voor specifieke tips.'),

  -- Sofie Meijer: astma
  ('30000000-0000-0000-0000-000000000009',
   NULL,
   'Ventolin (salbutamol) inhalator — alleen bij acute benauwdheid. Inhalator zit in roze etui.',
   NULL,
   'Astma — mild. Bij zware inspanning of kou extra alert. Inhalator altijd meenemen bij uitstapjes.',
   'Huisarts C. de Wit, 0113-456789',
   true,
   NULL);

-- ─────────────────────────────────────────────────────
-- Siblings: Max de Boer (008) en Emma de Vries (001)
-- zijn geen siblings. Koppel Finn Bakker (004) en
-- Lars Dekker (010) als broers (zelfde gezin Bakker-Dekker).
-- En Julia Mulder (007) aan Sara Visser (005) (zus via hertrouwen).
-- ─────────────────────────────────────────────────────
INSERT INTO public.siblings (kind_id_a, kind_id_b, organisatie_id) VALUES
  ('30000000-0000-0000-0000-000000000004',
   '30000000-0000-0000-0000-000000000010',
   '00000000-0000-0000-0000-000000000001'),
  ('30000000-0000-0000-0000-000000000007',
   '30000000-0000-0000-0000-000000000005',
   '00000000-0000-0000-0000-000000000001');

-- ─────────────────────────────────────────────────────
-- Notities bij kinderen (kind_notities — tabel bestaat al)
-- ─────────────────────────────────────────────────────
INSERT INTO public.kind_notities (kind_id, tekst, user_id) VALUES
  ('30000000-0000-0000-0000-000000000004',
   'Ouders gebeld over pinda-protocol — moeder Lisette heeft bevestigd dat EpiPen elke dag in de tas zit. Nieuwe EpiPen nodig in september.',
   '568bee0d-8713-426d-8049-abe34b16e320'),
  ('30000000-0000-0000-0000-000000000008',
   'Intake gesprek gehad met ouders (Christine en Mark). Overdrachtsmap ontvangen. Eerste dag: rustig laten wennen, geen groepsactiviteit.',
   '568bee0d-8713-426d-8049-abe34b16e320'),
  ('30000000-0000-0000-0000-000000000001',
   'Lactosevrije producten zijn aanwezig op de groep. Margreet heeft een lijst meegegeven van merken die Emma gewend is.',
   '568bee0d-8713-426d-8049-abe34b16e320');
