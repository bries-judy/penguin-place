/**
 * Centrale constants voor alle demo-seed-scripts.
 *
 * Eén bron van waarheid voor: organisatie-id, locaties, groepen, Judy's
 * staff-id, demo-ouder, demo-kinderen. Alle seed-scripts importeren
 * hieruit, zodat niemand per ongeluk nog een tweede organisatie seedt.
 *
 * Er is maar één demo/echte organisatie: Penguin Place Kinderopvang.
 * Kibeo (oude legacy-org) is verwijderd via migratie 041.
 */

// ─── Organisatie ─────────────────────────────────────────────────────────────

export const DEMO_ORG_ID   = 'a1b2c3d4-0000-0000-0000-000000000001'
export const DEMO_ORG_NAAM = 'Penguin Place Kinderopvang'

// ─── Judy's staff-user (uit migratie 018_seed_locaties) ──────────────────────

export const STAFF_JUDY_ID    = '568bee0d-8713-426d-8049-abe34b16e320'
export const STAFF_JUDY_EMAIL = 'judy.arina@gmail.com'

// ─── Locaties in Penguin Place (uit migratie 018) ────────────────────────────

export const LOC_PINGUINPOORT   = '10c00001-0000-0000-0000-000000000001' // KDV, Amsterdam
export const LOC_IJSBERENPALEIS = '10c00002-0000-0000-0000-000000000002' // BSO, Amsterdam
export const LOC_SNEEUWVLOK     = '10c00003-0000-0000-0000-000000000003' // combinatie, Amsterdam

// ─── Groepen ─────────────────────────────────────────────────────────────────

// Pinguïnpoort (kdv)
export const GROEP_BABYPINGUINS     = 'a0000001-0000-0000-0000-000000000001' // baby
export const GROEP_DREUMESPINGUINS  = 'a0000002-0000-0000-0000-000000000002' // dreumes
export const GROEP_PEUTERPINGUINS   = 'a0000003-0000-0000-0000-000000000003' // peuter

// IJsberenpaleis (bso)
export const GROEP_ONDERBOUW_IJSBEREN = 'a0000004-0000-0000-0000-000000000004' // bso
export const GROEP_BOVENBOUW_IJSBEREN = 'a0000005-0000-0000-0000-000000000005' // bso

// Sneeuwvlok
export const GROEP_SNEEUWVLOKJES    = 'a0000006-0000-0000-0000-000000000006' // peuter

// ─── Demo-ouder Sanne Bakker ─────────────────────────────────────────────────

export const OUDER_EMAIL     = 'sanne.bakker@test.nl'
export const OUDER_WACHTWOORD = 'TestPengu1n!'
export const OUDER_VOORNAAM  = 'Sanne'
export const OUDER_ACHTERNAAM = 'Bakker'
export const OUDER_TELEFOON  = '06-12345678'

// ─── Demo-kinderen ───────────────────────────────────────────────────────────

export const KIND_TESS = {
  id:          '30000000-0000-0000-0000-000000000010',
  voornaam:    'Tess',
  achternaam:  'Bakker',
  geslacht:    'vrouw',
  geboortedatum: '2023-05-10',
  locatie_id:  LOC_SNEEUWVLOK,
  groep_id:    GROEP_SNEEUWVLOKJES,
  contract_id: 'c0000010-0000-0000-0000-000000000001',
  contactpersoon_id: 'cc000010-0000-0000-0000-000000000001',
  conversation_id:   '99000010-0000-0000-0000-000000000001',
}

export const KIND_BRAM = {
  id:          '30000000-0000-0000-0000-000000000011',
  voornaam:    'Bram',
  achternaam:  'Bakker',
  geslacht:    'man',
  geboortedatum: '2024-02-15',
  locatie_id:  LOC_PINGUINPOORT,
  groep_id:    GROEP_DREUMESPINGUINS,
  contract_id: 'c0000011-0000-0000-0000-000000000001',
  contactpersoon_id: 'cc000011-0000-0000-0000-000000000001',
  conversation_id:   '99000011-0000-0000-0000-000000000001',
}

// ─── Storage buckets ─────────────────────────────────────────────────────────

export const BUCKET_MEDIA               = 'media'
export const BUCKET_OUDER_EMAIL_BIJLAGEN = 'ouder_email_bijlagen'

// ─── Placeholder bestanden ───────────────────────────────────────────────────

// Minimale geldige PDF (~500 bytes) — gebruikt voor e-mailbijlagen.
export const MINIMAL_PDF_BYTES = Uint8Array.from([
  0x25, 0x50, 0x44, 0x46, 0x2D, 0x31, 0x2E, 0x34, 0x0A,
  0x25, 0xC7, 0xEC, 0x8F, 0xA2, 0x0A,
  ...new TextEncoder().encode(
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n' +
    '2 0 obj\n<< /Type /Pages /Count 1 /Kids [3 0 R] >>\nendobj\n' +
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] ' +
      '/Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n' +
    '4 0 obj\n<< /Length 44 >>\nstream\n' +
      'BT /F1 18 Tf 50 750 Td (Penguin Place) Tj ET\n' +
      'endstream\nendobj\n' +
    '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n' +
    'xref\n0 6\n' +
      '0000000000 65535 f \n' +
      '0000000015 00000 n \n' +
      '0000000066 00000 n \n' +
      '0000000119 00000 n \n' +
      '0000000227 00000 n \n' +
      '0000000321 00000 n \n' +
    'trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n390\n%%EOF\n'
  ),
])

// ─── Guard: check of we tegen de juiste org draaien ─────────────────────────

/**
 * Gooit een error als het script per ongeluk een tweede organisatie zou
 * aanmaken. Elke seed-script moet deze check aan het begin aanroepen.
 */
export async function guardEnigeOrganisatie(supabaseAdmin) {
  const { data: orgs } = await supabaseAdmin.from('organisaties').select('id, naam')
  const andere = (orgs ?? []).filter((o) => o.id !== DEMO_ORG_ID)
  if (andere.length > 0) {
    console.warn(`⚠️  Meerdere organisaties gevonden. Dit script seedt uitsluitend naar ${DEMO_ORG_NAAM}:`)
    for (const o of andere) console.warn(`     - ${o.naam} (${o.id}) — OVERBODIG, moet weg`)
    console.warn(`    Draai eventueel: I_AM_SURE=yes node scripts/wipe-kibeo.mjs`)
  }
  const bestaat = (orgs ?? []).some((o) => o.id === DEMO_ORG_ID)
  if (!bestaat) {
    throw new Error(
      `Penguin Place (${DEMO_ORG_ID}) bestaat niet in de database. ` +
      `Zorg dat migratie 018_seed_locaties.sql is toegepast.`
    )
  }
}
