#!/usr/bin/env node
/**
 * Seed-script voor de complete Ouder CRM demo (Fase 1 + 2a).
 *
 * Alles gebeurt in de enige demo-organisatie: Penguin Place Kinderopvang.
 * Er wordt géén tweede organisatie aangemaakt of benaderd.
 *
 * Wat dit script maakt (idempotent, vaste UUIDs + upsert):
 *
 *   - Auth-user + ouder_profielen: Sanne Bakker
 *   - Kinderen Tess (Sneeuwvlok) en Bram (Pinguïnpoort)
 *   - Contactpersonen, contracten, ouder_kind-koppelingen
 *   - 4 facturen (€ 1.730 openstaand)
 *   - 6 ouder-memo's (incl. 1 open taak + 1 afgeronde taak)
 *   - 2 conversations + 6 portaalberichten
 *   - 20 e-mails + 3 PDF-bijlagen (Fase 2a)
 *   - 10 dagverslagen + ~10 afbeeldingen in Storage (mobiele app)
 *   - 5 mededelingen voor de locatie
 *
 * Jaaropgave wordt NIET geseed — Fase 2b feature.
 *
 * Draaien (vanuit penguin-place/):
 *   node scripts/seed-ouder-crm-demo.mjs
 *
 * Vereist .env.local met:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  DEMO_ORG_ID, DEMO_ORG_NAAM,
  STAFF_JUDY_EMAIL,
  OUDER_EMAIL, OUDER_WACHTWOORD, OUDER_VOORNAAM, OUDER_ACHTERNAAM, OUDER_TELEFOON,
  KIND_TESS, KIND_BRAM,
  BUCKET_MEDIA, BUCKET_OUDER_EMAIL_BIJLAGEN,
  MINIMAL_PDF_BYTES,
  guardEnigeOrganisatie,
} from './_demo-constants.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))

// ─── env laden ───────────────────────────────────────────────────────────────

function loadEnv() {
  const envPath = resolve(__dirname, '..', '.env.local')
  try {
    const raw = readFileSync(envPath, 'utf8')
    for (const line of raw.split('\n')) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
      if (m && !process.env[m[1]]) {
        process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '')
      }
    }
  } catch {}
}
loadEnv()

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_URL en SUPABASE_SERVICE_ROLE_KEY zijn vereist.')
  process.exit(1)
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// ─── helpers ─────────────────────────────────────────────────────────────────

function daysAgo(n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  d.setHours(10, 0, 0, 0)
  return d.toISOString()
}
function dateStrAgo(n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}
function dateStr(y, m, d) {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

async function getStaffId() {
  // Probeer Judy op login-email.
  const { data: viaAuth } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 })
  const judyAuth = viaAuth.users.find((u) => u.email === STAFF_JUDY_EMAIL)
  if (judyAuth) {
    const { data: p } = await admin.from('profiles').select('id').eq('id', judyAuth.id).maybeSingle()
    if (p) return p.id
  }
  // Fallback: eerste staff in Penguin Place
  const { data: any } = await admin
    .from('profiles').select('id, email')
    .eq('organisatie_id', DEMO_ORG_ID).limit(1)
  if (any && any.length > 0) {
    console.log(`  (fallback staff: ${any[0].email})`)
    return any[0].id
  }
  throw new Error(`Geen staff-profiel gevonden in ${DEMO_ORG_NAAM}.`)
}

async function ensureOuderAuth() {
  const { data: lijst } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 })
  const bestaand = lijst.users.find((u) => u.email === OUDER_EMAIL)

  let userId
  if (bestaand) {
    const { error } = await admin.auth.admin.updateUserById(bestaand.id, {
      password: OUDER_WACHTWOORD,
      email_confirm: true,
      app_metadata: { user_type: 'ouder', organisatie_id: DEMO_ORG_ID },
      user_metadata: { voornaam: OUDER_VOORNAAM, achternaam: OUDER_ACHTERNAAM },
    })
    if (error) throw error
    userId = bestaand.id
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email: OUDER_EMAIL,
      password: OUDER_WACHTWOORD,
      email_confirm: true,
      app_metadata: { user_type: 'ouder', organisatie_id: DEMO_ORG_ID },
      user_metadata: { voornaam: OUDER_VOORNAAM, achternaam: OUDER_ACHTERNAAM },
    })
    if (error) throw error
    userId = data.user.id
  }
  // Ruim eventueel per ongeluk aangemaakte staff-profile op
  await admin.from('profiles').delete().eq('id', userId)

  const { error: upsErr } = await admin.from('ouder_profielen').upsert(
    {
      id: userId,
      email: OUDER_EMAIL,
      voornaam: OUDER_VOORNAAM,
      achternaam: OUDER_ACHTERNAAM,
      telefoon_mobiel: OUDER_TELEFOON,
      organisatie_id: DEMO_ORG_ID,
      actief: true,
    },
    { onConflict: 'id' },
  )
  if (upsErr) throw upsErr
  return userId
}

// ─── Fase 1 seeds ────────────────────────────────────────────────────────────

async function seedKinderen() {
  const rows = [KIND_TESS, KIND_BRAM].map((k) => ({
    id: k.id, organisatie_id: DEMO_ORG_ID,
    voornaam: k.voornaam, achternaam: k.achternaam,
    geboortedatum: k.geboortedatum, geslacht: k.geslacht, actief: true,
  }))
  const { error } = await admin.from('kinderen').upsert(rows, { onConflict: 'id' })
  if (error) throw error
}

async function seedContactpersonen() {
  const rows = [KIND_TESS, KIND_BRAM].map((k) => ({
    id: k.contactpersoon_id, kind_id: k.id, rol: 'ouder1',
    voornaam: OUDER_VOORNAAM, achternaam: OUDER_ACHTERNAAM,
    email: OUDER_EMAIL, telefoon_mobiel: OUDER_TELEFOON,
    relatie_tot_kind: 'moeder',
    machtigt_ophalen: true, ontvangt_factuur: true, ontvangt_correspondentie: true,
  }))
  const { error } = await admin.from('contactpersonen').upsert(rows, { onConflict: 'id' })
  if (error) throw error
}

async function seedContracten() {
  const zesMaandenTerug = new Date()
  zesMaandenTerug.setMonth(zesMaandenTerug.getMonth() - 6)
  const rows = [KIND_TESS, KIND_BRAM].map((k) => ({
    id: k.contract_id, kind_id: k.id,
    locatie_id: k.locatie_id, groep_id: k.groep_id,
    opvangtype: 'kdv', contracttype: 'vast', status: 'actief',
    zorgdagen: [0, 1, 2], uren_per_dag: 8.5,
    startdatum: zesMaandenTerug.toISOString().slice(0, 10),
    einddatum: null, flexpool: false,
  }))
  const { error } = await admin.from('contracten').upsert(rows, { onConflict: 'id' })
  if (error) throw error
}

async function koppelOuderKind(ouderId) {
  const rows = [KIND_TESS, KIND_BRAM].map((k) => ({
    ouder_id: ouderId, kind_id: k.id,
    contactpersoon_id: k.contactpersoon_id, relatie: 'ouder1', actief: true,
  }))
  const { error } = await admin.from('ouder_kind').upsert(rows, { onConflict: 'ouder_id,kind_id' })
  if (error) throw error
}

async function seedFacturen() {
  const rows = [
    { id: 'fa000010-0000-0000-0000-000000000001', parent_id: KIND_TESS.contactpersoon_id,
      periode_start: dateStr(2026, 1, 1), periode_eind: dateStr(2026, 1, 31),
      totaal_bedrag: 820.00, status: 'paid',    factuurnummer: 'SB-2026-001' },
    { id: 'fa000010-0000-0000-0000-000000000002', parent_id: KIND_TESS.contactpersoon_id,
      periode_start: dateStr(2026, 2, 1), periode_eind: dateStr(2026, 2, 28),
      totaal_bedrag: 820.00, status: 'sent',    factuurnummer: 'SB-2026-002' },
    { id: 'fa000011-0000-0000-0000-000000000001', parent_id: KIND_BRAM.contactpersoon_id,
      periode_start: dateStr(2026, 1, 1), periode_eind: dateStr(2026, 1, 31),
      totaal_bedrag: 910.00, status: 'paid',    factuurnummer: 'SB-2026-003' },
    { id: 'fa000011-0000-0000-0000-000000000002', parent_id: KIND_BRAM.contactpersoon_id,
      periode_start: dateStr(2026, 2, 1), periode_eind: dateStr(2026, 2, 28),
      totaal_bedrag: 910.00, status: 'overdue', factuurnummer: 'SB-2026-004' },
  ].map((r) => ({ ...r, organisatie_id: DEMO_ORG_ID }))
  const { error } = await admin.from('invoices').upsert(rows, { onConflict: 'id' })
  if (error) throw error
  return rows.length
}

async function seedMemos(ouderId, staffId) {
  const rows = [
    { id: 'ab000010-0000-0000-0000-000000000001', type: 'telefoon',
      onderwerp: 'Vraag over vakantieweken in juli',
      inhoud: 'Sanne belde met de vraag of Tess een extra week op vakantie kan blijven. Afgesproken: planning nakijken en terugbellen.',
      datum: daysAgo(3), kind_id: KIND_TESS.id, follow_up_status: null },
    { id: 'ab000010-0000-0000-0000-000000000002', type: 'gesprek',
      onderwerp: 'Intake 10-minutengesprek Bram',
      inhoud: 'Gesprek met Sanne over Brams eerste weken op Dreumespinguïns. Hij went goed, eet goed. Extra knuffelmoment bij afscheid afgestemd.',
      datum: daysAgo(7), kind_id: KIND_BRAM.id, follow_up_status: null },
    { id: 'ab000010-0000-0000-0000-000000000003', type: 'notitie',
      onderwerp: 'Allergie-update: pinda toegevoegd',
      inhoud: 'Sanne doorgegeven dat Tess een lichte pinda-allergie heeft. Medische gegevens bijgewerkt en groep op de hoogte gebracht.',
      datum: daysAgo(14), kind_id: KIND_TESS.id, follow_up_status: null },
    { id: 'ab000010-0000-0000-0000-000000000004', type: 'taak',
      onderwerp: 'Contract Bram verlengen vóór einde maand',
      inhoud: 'Het proefcontract van Bram loopt af op 30 april. Bespreken met Sanne of we doorzetten naar vast contract en op welke dagen.',
      datum: daysAgo(5), kind_id: KIND_BRAM.id,
      follow_up_datum: dateStr(2026, 4, 28), follow_up_status: 'open' },
    { id: 'ab000010-0000-0000-0000-000000000005', type: 'taak',
      onderwerp: 'Vakantieaanvraag Tess bevestigen',
      inhoud: 'Sanne heeft vakantieweken doorgegeven (week 30 en 31). Bevestigingsmail gestuurd.',
      datum: daysAgo(3), kind_id: KIND_TESS.id,
      follow_up_datum: dateStr(2026, 4, 15), follow_up_status: 'afgerond' },
    { id: 'ab000010-0000-0000-0000-000000000006', type: 'notitie',
      onderwerp: 'Tess begint zich goed te settelen',
      inhoud: 'Na een paar wenweken speelt Tess nu zelfstandig mee met de andere peuters. Hele positieve ontwikkeling.',
      datum: daysAgo(21), kind_id: KIND_TESS.id, follow_up_status: null },
  ].map((r) => ({ ...r,
    organisatie_id: DEMO_ORG_ID, ouder_id: ouderId, auteur_id: staffId,
    zichtbaar_voor: 'alle_staff', deleted_at: null,
  }))
  const { error } = await admin.from('ouder_memos').upsert(rows, { onConflict: 'id' })
  if (error) throw error
  return rows.length
}

async function seedConversations() {
  const rows = [KIND_TESS, KIND_BRAM].map((k) => ({
    id: k.conversation_id, organisatie_id: DEMO_ORG_ID,
    kind_id: k.id, groep_id: k.groep_id,
  }))
  const { error } = await admin.from('conversations').upsert(rows, { onConflict: 'id' })
  if (error) throw error
}

async function seedConversationMessages(ouderId, staffId) {
  const rows = [
    { id: '88000010-0000-0000-0000-000000000001', conversation_id: KIND_TESS.conversation_id,
      afzender_id: ouderId, afzender_type: 'ouder',
      inhoud: 'Hoi! Tess heeft vanochtend lastig gegeten. Kun je een oogje in het zeil houden? 🥰',
      created_at: daysAgo(1) },
    { id: '88000010-0000-0000-0000-000000000002', conversation_id: KIND_TESS.conversation_id,
      afzender_id: staffId, afzender_type: 'medewerker',
      inhoud: 'Hoi Sanne! Ze eet hier goed mee. Appelmoes viel in de smaak.',
      created_at: daysAgo(1) },
    { id: '88000010-0000-0000-0000-000000000003', conversation_id: KIND_TESS.conversation_id,
      afzender_id: ouderId, afzender_type: 'ouder',
      inhoud: 'Fijn, bedankt!', created_at: daysAgo(1) },
    { id: '88000011-0000-0000-0000-000000000001', conversation_id: KIND_BRAM.conversation_id,
      afzender_id: staffId, afzender_type: 'medewerker',
      inhoud: 'Bram heeft vanmiddag zijn eerste stapjes gezet op de groep! Filmpje komt zo.',
      created_at: daysAgo(2) },
    { id: '88000011-0000-0000-0000-000000000002', conversation_id: KIND_BRAM.conversation_id,
      afzender_id: ouderId, afzender_type: 'ouder',
      inhoud: 'Oh wat geweldig! Kan niet wachten om te zien. Dank voor het delen! ❤️',
      created_at: daysAgo(2) },
    { id: '88000011-0000-0000-0000-000000000003', conversation_id: KIND_BRAM.conversation_id,
      afzender_id: ouderId, afzender_type: 'ouder',
      inhoud: 'Ik haal Bram vrijdag iets later op — rond 17:30 i.p.v. 17:00. Lukt dat?',
      created_at: daysAgo(4) },
  ]
  const { error } = await admin.from('conversation_messages').upsert(rows, { onConflict: 'id' })
  if (error) throw error
  return rows.length
}

// ─── Fase 2a: e-mails + bijlagen ─────────────────────────────────────────────

async function uploadPdfBijlage(pad) {
  const { error } = await admin.storage
    .from(BUCKET_OUDER_EMAIL_BIJLAGEN)
    .upload(pad, MINIMAL_PDF_BYTES, { contentType: 'application/pdf', upsert: true })
  if (error) { console.warn(`  ⚠ upload ${pad}: ${error.message}`); return false }
  return true
}

function buildEmails(ouderId, staffId) {
  const STAFF_ADRES = 'klantrelaties@penguinplace.nl'
  const T_FACT_FEB = 'th-factuur-feb-2026'
  const T_VAK_JUL  = 'th-vakantie-jul-2026'
  const T_INTAKE_BRAM = 'th-intake-bram-2026'
  const base = (r) => ({
    organisatie_id: DEMO_ORG_ID, ouder_id: ouderId,
    bron: 'seed', cc_adressen: [], body_html: null, ...r,
  })
  return [
    base({ id: 'ee000010-0000-0000-0000-000000000001', richting: 'outbound',
      van_adres: STAFF_ADRES, aan_adressen: [OUDER_EMAIL],
      onderwerp: 'Welkom bij Penguin Place — Tess Bakker',
      body_plain: 'Beste Sanne,\n\nWat leuk dat Tess bij ons komt! In de bijlage vind je het welkomstpakket.\n\nTot snel!\nJudy',
      verzonden_op: daysAgo(180), staff_id: staffId, thread_id: 'th-welkom-tess', heeft_bijlagen: true }),
    base({ id: 'ee000010-0000-0000-0000-000000000002', richting: 'inbound',
      van_adres: OUDER_EMAIL, aan_adressen: [STAFF_ADRES],
      onderwerp: 'Re: Welkom bij Penguin Place — Tess Bakker',
      body_plain: 'Hoi Judy,\n\nDankjewel! Tess is enthousiast. Mogen we op de eerste dag samen even de groep bekijken?\n\nSanne',
      verzonden_op: daysAgo(179), staff_id: null, thread_id: 'th-welkom-tess', heeft_bijlagen: false }),
    base({ id: 'ee000010-0000-0000-0000-000000000003', richting: 'outbound',
      van_adres: STAFF_ADRES, aan_adressen: [OUDER_EMAIL],
      onderwerp: 'Uitnodiging 10-minutengesprek Bram',
      body_plain: 'Hallo Sanne,\n\nPlannen voor een 10-minutengesprek over Brams wenperiode? Voorstel: dinsdag 16:30 of donderdag 8:30.\n\nJudy',
      verzonden_op: daysAgo(60), staff_id: staffId, thread_id: T_INTAKE_BRAM, heeft_bijlagen: false }),
    base({ id: 'ee000010-0000-0000-0000-000000000004', richting: 'inbound',
      van_adres: OUDER_EMAIL, aan_adressen: [STAFF_ADRES],
      onderwerp: 'Re: Uitnodiging 10-minutengesprek Bram',
      body_plain: 'Hoi Judy,\n\nDonderdag 8:30 werkt goed. Tot dan!\n\nSanne',
      verzonden_op: daysAgo(59), staff_id: null, thread_id: T_INTAKE_BRAM, heeft_bijlagen: false }),
    base({ id: 'ee000010-0000-0000-0000-000000000005', richting: 'outbound',
      van_adres: STAFF_ADRES, aan_adressen: [OUDER_EMAIL],
      onderwerp: 'Bevestiging 10-minutengesprek donderdag 8:30',
      body_plain: 'Top, staat. Bijgevoegd het intakeformulier.\n\nJudy',
      verzonden_op: daysAgo(58), staff_id: staffId, thread_id: T_INTAKE_BRAM, heeft_bijlagen: true }),
    base({ id: 'ee000010-0000-0000-0000-000000000006', richting: 'inbound',
      van_adres: OUDER_EMAIL, aan_adressen: [STAFF_ADRES],
      onderwerp: 'Ophaaltijden aanpassen komende week',
      body_plain: 'Ik haal Tess komende week telkens een half uur later op. Dank!\n\nSanne',
      verzonden_op: daysAgo(50), staff_id: null, heeft_bijlagen: false }),
    base({ id: 'ee000010-0000-0000-0000-000000000007', richting: 'outbound',
      van_adres: STAFF_ADRES, aan_adressen: [OUDER_EMAIL],
      onderwerp: 'Re: Ophaaltijden aanpassen komende week',
      body_plain: 'Geen probleem, doorgegeven aan de groep. Fijne week!',
      verzonden_op: daysAgo(50), staff_id: staffId, heeft_bijlagen: false }),
    base({ id: 'ee000010-0000-0000-0000-000000000008', richting: 'inbound',
      van_adres: OUDER_EMAIL, aan_adressen: [STAFF_ADRES],
      onderwerp: 'Tess had vandaag een valletje',
      body_plain: 'Ze vertelde thuis dat ze haar knie geschaafd had. Klein dingetje, maar wil het melden.\n\nSanne',
      verzonden_op: daysAgo(42), staff_id: null, heeft_bijlagen: false }),
    base({ id: 'ee000010-0000-0000-0000-000000000009', richting: 'outbound',
      van_adres: STAFF_ADRES, aan_adressen: [OUDER_EMAIL],
      onderwerp: 'Re: Tess had vandaag een valletje',
      body_plain: 'Bedankt! In het ongevallenlogboek gezet. Ze was verder nergens van in de war.',
      verzonden_op: daysAgo(42), staff_id: staffId, heeft_bijlagen: false }),
    base({ id: 'ee000010-0000-0000-0000-000000000010', richting: 'inbound',
      van_adres: OUDER_EMAIL, aan_adressen: [STAFF_ADRES],
      onderwerp: 'Allergie update Tess',
      body_plain: 'Arts bevestigde lichte pinda-allergie. Graag noteren in het dossier.\n\nSanne',
      verzonden_op: daysAgo(35), staff_id: null, heeft_bijlagen: false }),
    base({ id: 'ee000010-0000-0000-0000-000000000011', richting: 'outbound',
      van_adres: 'facturatie@penguinplace.nl', aan_adressen: [OUDER_EMAIL],
      onderwerp: 'Factuur SB-2026-002 — februari 2026',
      body_plain: 'Beste Sanne,\n\nDe factuur voor Tess over februari 2026 staat klaar (€ 820).\n\nFacturatie',
      verzonden_op: daysAgo(30), staff_id: staffId, thread_id: T_FACT_FEB, heeft_bijlagen: true }),
    base({ id: 'ee000010-0000-0000-0000-000000000012', richting: 'inbound',
      van_adres: OUDER_EMAIL, aan_adressen: ['facturatie@penguinplace.nl'],
      onderwerp: 'Re: Factuur SB-2026-002',
      body_plain: 'Klopt dat er dit jaar geen prijsaanpassing is geweest?',
      verzonden_op: daysAgo(29), staff_id: null, thread_id: T_FACT_FEB, heeft_bijlagen: false }),
    base({ id: 'ee000010-0000-0000-0000-000000000013', richting: 'outbound',
      van_adres: 'facturatie@penguinplace.nl', aan_adressen: [OUDER_EMAIL],
      onderwerp: 'Re: Factuur SB-2026-002 — prijsopbouw',
      body_plain: 'Het tarief is per 1 jan geïndexeerd met 3.8%. Specificatie in bijlage.',
      verzonden_op: daysAgo(28), staff_id: staffId, thread_id: T_FACT_FEB, heeft_bijlagen: false }),
    base({ id: 'ee000010-0000-0000-0000-000000000014', richting: 'inbound',
      van_adres: OUDER_EMAIL, aan_adressen: [STAFF_ADRES],
      onderwerp: 'Vakantieweken juli — Tess & Bram',
      body_plain: 'Wij zijn op vakantie week 30 en 31. Kunnen jullie beide kinderen afmelden?',
      verzonden_op: daysAgo(25), staff_id: null, thread_id: T_VAK_JUL, heeft_bijlagen: false }),
    base({ id: 'ee000010-0000-0000-0000-000000000015', richting: 'outbound',
      van_adres: STAFF_ADRES, aan_adressen: [OUDER_EMAIL],
      onderwerp: 'Re: Vakantieweken juli — Tess & Bram',
      body_plain: 'Genoteerd voor week 30 en 31. Fijne vakantie!',
      verzonden_op: daysAgo(25), staff_id: staffId, thread_id: T_VAK_JUL, heeft_bijlagen: false }),
    base({ id: 'ee000010-0000-0000-0000-000000000016', richting: 'outbound',
      van_adres: 'nieuwsbrief@penguinplace.nl', aan_adressen: [OUDER_EMAIL],
      onderwerp: 'Nieuwsbrief april',
      body_plain: 'In deze editie: Paasactiviteiten, nieuwe pedagogisch medewerker Sophie, en de agenda voor mei.',
      verzonden_op: daysAgo(18), staff_id: staffId, heeft_bijlagen: false }),
    base({ id: 'ee000010-0000-0000-0000-000000000017', richting: 'inbound',
      van_adres: OUDER_EMAIL, aan_adressen: [STAFF_ADRES],
      onderwerp: 'Kan Bram een dagje ruilen?',
      body_plain: 'Volgende week Brams woensdag ruilen met donderdag?',
      verzonden_op: daysAgo(12), staff_id: null, heeft_bijlagen: false }),
    base({ id: 'ee000010-0000-0000-0000-000000000018', richting: 'outbound',
      van_adres: STAFF_ADRES, aan_adressen: [OUDER_EMAIL],
      onderwerp: 'Re: Kan Bram een dagje ruilen?',
      body_plain: 'Ruil is mogelijk. Planning aangepast. Donderdag wordt zijn dag.\n\nJudy',
      verzonden_op: daysAgo(12), staff_id: staffId, heeft_bijlagen: false }),
    base({ id: 'ee000010-0000-0000-0000-000000000019', richting: 'inbound',
      van_adres: OUDER_EMAIL, aan_adressen: ['facturatie@penguinplace.nl'],
      onderwerp: 'Betaling februari gedaan — bevestiging?',
      body_plain: 'Vanochtend de factuur van februari overgemaakt. Kan ik een bevestiging krijgen?',
      verzonden_op: daysAgo(5), staff_id: null, heeft_bijlagen: false }),
    base({ id: 'ee000010-0000-0000-0000-000000000020', richting: 'outbound',
      van_adres: STAFF_ADRES, aan_adressen: [OUDER_EMAIL],
      onderwerp: 'Uitnodiging ouderavond 12 mei',
      body_plain: 'Ouderavond op 12 mei om 19:30. Agenda en aanmeldlink in de nieuwsbrief.\n\nJudy',
      verzonden_op: daysAgo(2), staff_id: staffId, heeft_bijlagen: false }),
  ]
}

async function seedEmails(ouderId, staffId) {
  const rows = buildEmails(ouderId, staffId)
  const { error } = await admin.from('ouder_emails').upsert(rows, { onConflict: 'id' })
  if (error) throw error

  const BIJLAGE_PLAN = [
    { email_id: 'ee000010-0000-0000-0000-000000000001', bijlage_id: 'bb000010-0000-0000-0000-000000000001', bestandsnaam: 'Welkomstpakket-Penguin-Place.pdf' },
    { email_id: 'ee000010-0000-0000-0000-000000000005', bijlage_id: 'bb000010-0000-0000-0000-000000000002', bestandsnaam: 'Intakeformulier-Bram.pdf' },
    { email_id: 'ee000010-0000-0000-0000-000000000011', bijlage_id: 'bb000010-0000-0000-0000-000000000003', bestandsnaam: 'Factuur-SB-2026-002.pdf' },
  ]
  let uploads = 0
  const bijlageRijen = []
  for (const b of BIJLAGE_PLAN) {
    const pad = `${DEMO_ORG_ID}/${ouderId}/${b.email_id}/${b.bijlage_id}.pdf`
    if (await uploadPdfBijlage(pad)) uploads++
    bijlageRijen.push({
      id: b.bijlage_id, email_id: b.email_id, bestandsnaam: b.bestandsnaam,
      mime_type: 'application/pdf', storage_path: pad,
      grootte_bytes: MINIMAL_PDF_BYTES.length, volgorde: 0,
    })
  }
  const { error: bErr } = await admin.from('ouder_email_bijlagen').upsert(bijlageRijen, { onConflict: 'id' })
  if (bErr) throw bErr
  return { emails: rows.length, bijlagen: bijlageRijen.length, uploads }
}

// ─── Mobiele app: dagverslagen + mededelingen (was seed-ouderportaal) ───────

async function uploadPicsum(seed, pad) {
  // idempotent: check of bestand er al staat
  const slash = pad.lastIndexOf('/')
  const { data: eerder } = await admin.storage
    .from(BUCKET_MEDIA).list(pad.slice(0, slash), { limit: 100 })
  if (eerder?.some((f) => f.name === pad.slice(slash + 1))) return true

  try {
    const res = await fetch(`https://picsum.photos/seed/${seed}/1200/900.jpg`)
    if (!res.ok) return false
    const bytes = new Uint8Array(await (await res.blob()).arrayBuffer())
    const { error } = await admin.storage.from(BUCKET_MEDIA).upload(pad, bytes, {
      contentType: 'image/jpeg', upsert: true,
    })
    if (error) return false
    return true
  } catch { return false }
}

function buildDagverslagen(auteurId) {
  // 10 verslagen verdeeld over Tess en Bram, laatste 2 weken
  const ruw = [
    ['Tess', KIND_TESS, 0,  { a: 'Vandaag veel buiten gespeeld. Tess bouwde een kasteel van zand.', e: 'Goed gegeten: boterham met kaas.', s: '12:30 – 14:00', st: 'Vrolijk' }],
    ['Bram', KIND_BRAM, 0,  { a: 'Blokken gebouwd — eerste toren van 8 stuks!', e: 'Alles op.', s: '12:45 – 14:15', st: 'Energiek' }],
    ['Tess', KIND_TESS, 1,  { a: 'Knutselen met crêpepapier. Tess maakte een bloem.', e: 'Heeft de appel laten liggen.', s: '12:30 – 13:45', st: 'Rustig' }],
    ['Bram', KIND_BRAM, 2,  { a: 'Voorlezen in de kring. Bram koos het boek over de brandweer.', e: 'Normaal gegeten.', s: '12:30 – 14:00', st: 'Vrolijk' }],
    ['Tess', KIND_TESS, 2,  { a: 'Dansen op muziek. Tess deed dapper mee.', e: 'Goed gegeten.', s: '12:45 – 13:50', st: 'Enthousiast', b: 'Beetje verkouden' }],
    ['Bram', KIND_BRAM, 3,  { a: 'Buiten gefietst op de driewieler.', e: 'Dronk extra water.', s: '13:00 – 14:30', st: 'Sociaal' }],
    ['Tess', KIND_TESS, 4,  { a: 'Fruit sorteren op kleur.', e: 'Normaal.', s: '12:30 – 13:45', st: 'Geconcentreerd' }],
    ['Bram', KIND_BRAM, 5,  { a: 'Waterspeeltafel — spetteren en gieten.', e: 'Alles op.', s: '12:30 – 14:00', st: 'Vrolijk' }],
    ['Tess', KIND_TESS, 7,  { a: 'Samen koekjes gebakken.', e: 'Koekje geproefd!', s: '13:00 – 14:15', st: 'Trots' }],
    ['Bram', KIND_BRAM, 9,  { a: 'Pleinverzameling; ballen gegooid.', e: 'Goed gegeten.', s: '12:45 – 14:00', st: 'Actief' }],
  ]
  return ruw.map(([naam, kind, dagen, v], i) => ({
    id: `d0000010-0000-0000-0000-${String(100 + i).padStart(12, '0')}`,
    organisatie_id: DEMO_ORG_ID, kind_id: kind.id, groep_id: kind.groep_id,
    datum: dateStrAgo(dagen),
    activiteiten: v.a, eten_drinken: v.e, slaaptijden: v.s,
    stemming: v.st, bijzonderheden: v.b ?? null,
    auteur_id: auteurId, gepubliceerd: true, gepubliceerd_op: daysAgo(dagen),
  }))
}

async function seedDagverslagen(staffId) {
  // Wipe bestaande dagverslagen van onze 2 kinderen om date-conflicten te vermijden
  await admin.from('dagverslagen').delete().in('kind_id', [KIND_TESS.id, KIND_BRAM.id])
  const verslagen = buildDagverslagen(staffId)
  const { error } = await admin.from('dagverslagen').insert(verslagen)
  if (error) throw error

  // Media: 1-2 afbeeldingen per verslag via picsum placeholders
  const MEDIA_PLAN = {
    0: ['pp-demo-01', 'pp-demo-02'],
    1: ['pp-demo-03'],
    2: ['pp-demo-04', 'pp-demo-05'],
    4: ['pp-demo-06'],
    5: ['pp-demo-07'],
    8: ['pp-demo-08', 'pp-demo-09'],
  }
  let uploads = 0
  const mediaRijen = []
  for (const [idxStr, seeds] of Object.entries(MEDIA_PLAN)) {
    const v = verslagen[Number(idxStr)]
    if (!v) continue
    for (let i = 0; i < seeds.length; i++) {
      const seed = seeds[i]
      const mediaId = `fa000010-1000-0000-0000-${String(Number(idxStr) * 10 + i + 1).padStart(12, '0')}`
      const pad = `${v.organisatie_id}/${v.kind_id}/${v.id}/${mediaId}.jpg`
      if (await uploadPicsum(seed, pad)) uploads++
      mediaRijen.push({
        id: mediaId, dagverslag_id: v.id, storage_path: pad,
        bestandsnaam: `${seed}.jpg`, mime_type: 'image/jpeg',
        bestandsgrootte: null, volgorde: i, uploaded_by: staffId,
      })
    }
  }
  if (mediaRijen.length > 0) {
    const { error: mErr } = await admin.from('dagverslag_media').upsert(mediaRijen, { onConflict: 'id' })
    if (mErr) throw mErr
  }
  return { verslagen: verslagen.length, media: mediaRijen.length, uploads }
}

async function seedReacties(staffId, ouderId) {
  const EMOJIS = ['❤️', '👍', '😊', '🎉', '😍']
  const { data: verslagen } = await admin
    .from('dagverslagen').select('id, organisatie_id')
    .in('kind_id', [KIND_TESS.id, KIND_BRAM.id])
  const rows = (verslagen ?? []).filter((_, i) => i % 2 === 0).map((v, i) => ({
    dagverslag_id: v.id, ouder_id: ouderId,
    organisatie_id: v.organisatie_id, emoji: EMOJIS[i % EMOJIS.length],
  }))
  if (rows.length === 0) return 0
  const { error } = await admin
    .from('dagverslag_reacties')
    .upsert(rows, { onConflict: 'dagverslag_id,ouder_id' })
  if (error) { console.warn(`  (reacties skip: ${error.message})`); return 0 }
  return rows.length
}

async function seedMededelingen(staffId) {
  const rows = [
    { id: 'e0000010-0000-0000-0000-000000000001', locatie_id: null,
      type: 'organisatie', titel: 'Nieuwe AVG-verklaring beschikbaar',
      inhoud: 'We hebben onze privacyverklaring bijgewerkt. Je vindt de nieuwe versie bij je contract in het ouderportaal.',
      gepubliceerd_op: daysAgo(0) },
    { id: 'e0000010-0000-0000-0000-000000000002', locatie_id: KIND_TESS.locatie_id,
      type: 'locatie', titel: 'Paaseieren zoeken vrijdag',
      inhoud: 'Aanstaande vrijdag gaan we met alle groepen paaseieren zoeken in de tuin. Trek je kind kleding aan die vies mag worden!',
      gepubliceerd_op: daysAgo(2) },
    { id: 'e0000010-0000-0000-0000-000000000003', locatie_id: KIND_TESS.locatie_id,
      type: 'nieuwsbrief', titel: 'Nieuwsbrief april',
      inhoud: 'In deze editie: terugblik op het lentefeest, voorstellen nieuwe pedagogisch medewerker Sophie.',
      gepubliceerd_op: daysAgo(5) },
    { id: 'e0000010-0000-0000-0000-000000000004', locatie_id: KIND_BRAM.locatie_id,
      type: 'locatie', titel: 'Studiemiddag: locatie gesloten op 22 mei',
      inhoud: 'Op donderdag 22 mei is de locatie vanaf 13:00 gesloten voor een studiemiddag.',
      gepubliceerd_op: daysAgo(8) },
    { id: 'e0000010-0000-0000-0000-000000000005', locatie_id: null,
      type: 'organisatie', titel: 'Jaarlijkse tevredenheidsenquête',
      inhoud: 'We zijn benieuwd hoe je onze opvang ervaart. Je ontvangt deze week een korte enquête per e-mail.',
      gepubliceerd_op: daysAgo(11) },
  ].map((r) => ({ ...r, organisatie_id: DEMO_ORG_ID, auteur_id: staffId }))
  const { error } = await admin.from('mededelingen').upsert(rows, { onConflict: 'id' })
  if (error) { console.warn(`  (mededelingen skip: ${error.message})`); return 0 }
  return rows.length
}

// ─── main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`🐧 Seed demo (Fase 1 + 2a) in ${DEMO_ORG_NAAM}\n`)

  console.log('→ Guard: check enige organisatie...')
  await guardEnigeOrganisatie(admin)

  console.log('→ Staff auteur opzoeken...')
  const staffId = await getStaffId()
  console.log(`  staff_id = ${staffId}`)

  console.log('→ Ouder-account (Sanne Bakker)...')
  const ouderId = await ensureOuderAuth()
  console.log(`  ouder_id = ${ouderId}`)

  console.log('→ Kinderen, contactpersonen, contracten, ouder-kind koppelingen...')
  await seedKinderen()
  await seedContactpersonen()
  await seedContracten()
  await koppelOuderKind(ouderId)

  console.log('→ Facturen...')
  const nFact = await seedFacturen()
  console.log(`  ${nFact} facturen`)

  console.log('→ Memo\'s...')
  const nMemos = await seedMemos(ouderId, staffId)
  console.log(`  ${nMemos} memo's`)

  console.log('→ Conversations + portaalberichten...')
  await seedConversations()
  const nPortaal = await seedConversationMessages(ouderId, staffId)
  console.log(`  ${nPortaal} portaalberichten`)

  console.log('→ E-mails + bijlagen (Fase 2a)...')
  const emRes = await seedEmails(ouderId, staffId)
  console.log(`  ${emRes.emails} e-mails · ${emRes.bijlagen} bijlagen (${emRes.uploads} uploads OK)`)

  console.log('→ Dagverslagen + media (mobiele app)...')
  const dvRes = await seedDagverslagen(staffId)
  console.log(`  ${dvRes.verslagen} verslagen · ${dvRes.media} media (${dvRes.uploads} picsum-uploads)`)

  console.log('→ Reacties...')
  const nReacties = await seedReacties(staffId, ouderId)
  console.log(`  ${nReacties} reacties`)

  console.log('→ Mededelingen...')
  const nMed = await seedMededelingen(staffId)
  console.log(`  ${nMed} mededelingen`)

  console.log(`\n✅ Klaar. Demo-ouder staat klaar:`)
  console.log(`   Naam:       ${OUDER_VOORNAAM} ${OUDER_ACHTERNAAM}`)
  console.log(`   Login:      ${OUDER_EMAIL}  /  ${OUDER_WACHTWOORD}`)
  console.log(`   Staff-URL:  /dashboard/ouders/${ouderId}`)
  console.log(`   Kinderen:   Tess (Sneeuwvlok) · Bram (Pinguïnpoort)`)
  console.log(`   Saldo:      € 1.730 openstaand\n`)
  console.log(`⚠️  Jaaropgave niet geseed — Fase 2b feature.`)
}

main().catch((e) => {
  console.error('❌ Seed mislukt:', e.message ?? e)
  if (e.details) console.error('   details:', e.details)
  if (e.hint)    console.error('   hint:',    e.hint)
  process.exit(1)
})
