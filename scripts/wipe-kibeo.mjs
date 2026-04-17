#!/usr/bin/env node
/**
 * DESTRUCTIEF: verwijdert de volledige Kibeo-organisatie en alle bijbehorende
 * data (incl. auth-users en Storage-bestanden).
 *
 * Filtering gebeurt uitsluitend op organisatie_id = Kibeo (00000000-...-0001).
 * Penguin Place data (a1b2c3d4-...) wordt NIET aangeraakt.
 *
 * Draaien:
 *   I_AM_SURE=yes node scripts/wipe-kibeo.mjs
 *
 * Zonder I_AM_SURE=yes doet het script niks.
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
try {
  const raw = readFileSync(resolve(__dirname, '..', '.env.local'), 'utf8')
  for (const line of raw.split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '')
  }
} catch {}

if (process.env.I_AM_SURE !== 'yes') {
  console.error('❌ Veiligheidsblokkade. Zet I_AM_SURE=yes vóór de aanroep:')
  console.error('   I_AM_SURE=yes node scripts/wipe-kibeo.mjs')
  process.exit(1)
}

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
)

const ORG_KIBEO = '00000000-0000-0000-0000-000000000001'

console.log('💥 Wipe Kibeo-organisatie\n')
console.log(`   org_id = ${ORG_KIBEO}\n`)

async function bulk(tabel, filter) {
  // filter: {kolom, waarde} of {in: {kolom, waardes}}
  let q = admin.from(tabel).delete()
  if (filter.in) {
    if (filter.in.waardes.length === 0) {
      console.log(`   • ${tabel.padEnd(28)} (skip — lege ID-lijst)`)
      return 0
    }
    q = q.in(filter.in.kolom, filter.in.waardes)
  } else {
    q = q.eq(filter.kolom, filter.waarde)
  }
  const { error, count } = await q.select('*', { count: 'exact', head: true })
  if (error) {
    // 42P01 = undefined_table (bestaat niet) — negeer
    const msg = error.message ?? ''
    const tolerable = msg.includes('does not exist') || msg.includes('42P01') || msg.includes('relation')
    console.log(`   • ${tabel.padEnd(28)} ${tolerable ? '(skip — tabel bestaat niet)' : '❌ ' + msg}`)
    return 0
  }
  console.log(`   • ${tabel.padEnd(28)} ${count ?? 0} rijen`)
  return count ?? 0
}

// ─── 0. Vooraf: ID-lijsten ophalen (transitieve keys) ────────────────────────

console.log('→ ID-lijsten ophalen...')

const { data: kinderen } = await admin
  .from('kinderen').select('id').eq('organisatie_id', ORG_KIBEO)
const kindIds = (kinderen ?? []).map((k) => k.id)

const { data: locaties } = await admin
  .from('locaties').select('id').eq('organisatie_id', ORG_KIBEO)
const locatieIds = (locaties ?? []).map((l) => l.id)

const { data: ouders } = await admin
  .from('ouder_profielen').select('id').eq('organisatie_id', ORG_KIBEO)
const ouderIds = (ouders ?? []).map((o) => o.id)

const { data: staffProfiles } = await admin
  .from('profiles').select('id, email').eq('organisatie_id', ORG_KIBEO)
const staffIds = (staffProfiles ?? []).map((p) => p.id)

const { data: invoicesLijst } = await admin
  .from('invoices').select('id').eq('organisatie_id', ORG_KIBEO)
const invoiceIds = (invoicesLijst ?? []).map((i) => i.id)

const { data: dagverslagen } = await admin
  .from('dagverslagen').select('id').eq('organisatie_id', ORG_KIBEO)
const dagverslagIds = (dagverslagen ?? []).map((d) => d.id)

const { data: mededelingen } = await admin
  .from('mededelingen').select('id').eq('organisatie_id', ORG_KIBEO)
const mededelingIds = (mededelingen ?? []).map((m) => m.id)

// Contract-IDs die naar Kibeo-kinderen OF -locaties OF -groepen wijzen.
// Dit vangt ook orphans: contracten van niet-Kibeo-kinderen die per
// ongeluk naar Kibeo-locaties/-groepen verwijzen (seed-artifacts).
const { data: kibeoGroepenList } = await admin
  .from('groepen')
  .select('id')
  .in('locatie_id', locatieIds.length > 0 ? locatieIds : ['00000000-0000-0000-0000-000000000000'])
const groepIds = (kibeoGroepenList ?? []).map((g) => g.id)

const { data: alleContracten } = await admin
  .from('contracten')
  .select('id, kind_id, locatie_id, groep_id')
const contractIds = (alleContracten ?? [])
  .filter(
    (c) =>
      kindIds.includes(c.kind_id) ||
      locatieIds.includes(c.locatie_id) ||
      (c.groep_id && groepIds.includes(c.groep_id)),
  )
  .map((c) => c.id)

console.log(`   kinderen=${kindIds.length}, locaties=${locatieIds.length}, ouders=${ouderIds.length}, staff=${staffIds.length}, contracten=${contractIds.length}`)

// ─── 1. Transitieve / non-cascade tabellen eerst ─────────────────────────────

console.log('\n→ Transitieve deletes (non-cascade FKs):')
await bulk('invoice_lines',         { in: { kolom: 'invoice_id',   waardes: invoiceIds } })
await bulk('invoices',              { kolom: 'organisatie_id',     waarde: ORG_KIBEO })
await bulk('dagverslag_media',      { in: { kolom: 'dagverslag_id', waardes: dagverslagIds } })
await bulk('dagverslag_reacties',   { in: { kolom: 'dagverslag_id', waardes: dagverslagIds } })
await bulk('dagverslagen',          { kolom: 'organisatie_id',     waarde: ORG_KIBEO })
await bulk('mededelingen_bookmarks',{ in: { kolom: 'mededeling_id', waardes: mededelingIds } })
await bulk('mededeling_leesstatus', { in: { kolom: 'mededeling_id', waardes: mededelingIds } })
await bulk('mededelingen',          { kolom: 'organisatie_id',     waarde: ORG_KIBEO })
await bulk('extra_day_requests',    { kolom: 'organisatie_id',     waarde: ORG_KIBEO })
await bulk('contract_events',       { in: { kolom: 'contract_id',  waardes: contractIds } })
await bulk('ouder_email_bijlagen',  { in: { kolom: 'email_id',     waardes: [] } }) // CASCADE via ouder_emails
await bulk('ouder_emails',          { kolom: 'organisatie_id',     waarde: ORG_KIBEO })
await bulk('ouder_memos',           { kolom: 'organisatie_id',     waarde: ORG_KIBEO })
await bulk('ouder_audit',           { in: { kolom: 'ouder_id',     waardes: ouderIds } })
await bulk('absence_requests',      { in: { kolom: 'kind_id',      waardes: kindIds } })
await bulk('conversation_messages', { in: { kolom: 'conversation_id', waardes: [] } }) // CASCADE via conversations
await bulk('inbox_read_status',     { in: { kolom: 'conversation_id', waardes: [] } }) // idem
await bulk('conversations',         { kolom: 'organisatie_id',     waarde: ORG_KIBEO })
await bulk('push_notificaties',     { in: { kolom: 'ouder_id',     waardes: ouderIds } })
await bulk('media_permissies',      { in: { kolom: 'ouder_id',     waardes: ouderIds } })

// ─── 2. User-role / toegang tabellen (non-cascade op profiles.organisatie_id) ─

console.log('\n→ Rollen / toegang:')
await bulk('user_roles',                  { in: { kolom: 'user_id', waardes: staffIds } })
await bulk('user_locatie_toegang',        { in: { kolom: 'user_id', waardes: staffIds } })
await bulk('gebruikers_rollen',           { in: { kolom: 'user_id', waardes: staffIds } })
await bulk('rol_permissies',              { kolom: 'organisatie_id', waarde: ORG_KIBEO })
await bulk('rollen',                      { kolom: 'organisatie_id', waarde: ORG_KIBEO })

// ─── 3. Profiles (staff) + ouder_profielen ───────────────────────────────────

console.log('\n→ Profielen:')
await bulk('ouder_kind',       { in: { kolom: 'ouder_id', waardes: ouderIds } })
await bulk('ouder_profielen',  { kolom: 'organisatie_id', waarde: ORG_KIBEO })
await bulk('profiles',         { kolom: 'organisatie_id', waarde: ORG_KIBEO })

// ─── 4. Contracten, kinderen, locaties, tarieven, merken ─────────────────────

console.log('\n→ Kinderen / contracten / structuur:')
await bulk('contactpersonen',   { in: { kolom: 'kind_id',  waardes: kindIds } })
await bulk('medisch_gegevens',  { in: { kolom: 'kind_id',  waardes: kindIds } })
await bulk('adressen',          { in: { kolom: 'kind_id',  waardes: kindIds } })
await bulk('planned_attendance',{ kolom: 'organisatie_id', waarde: ORG_KIBEO })
await bulk('placements',        { kolom: 'organisatie_id', waarde: ORG_KIBEO })
// Self-FK: reset vorige_contract_id op NULL vóór de delete,
// anders faalt de delete op de self-reference binnen dezelfde batch.
if (contractIds.length > 0) {
  const { error: resetErr } = await admin
    .from('contracten')
    .update({ vorige_contract_id: null })
    .in('id', contractIds)
  if (resetErr) console.log(`   (self-FK reset: ${resetErr.message})`)
  else          console.log(`   (self-FK reset: ${contractIds.length} contracten)`)
}
await bulk('kind_contract_kortingen', { in: { kolom: 'kind_contract_id', waardes: contractIds } })
await bulk('flex_dagen',        { in: { kolom: 'contract_id', waardes: contractIds } })
// Delete via id (dekt ook orphans die niet aan Kibeo-kinderen hangen)
await bulk('contracten',        { in: { kolom: 'id',        waardes: contractIds } })
await bulk('wachtlijst',        { kolom: 'organisatie_id', waarde: ORG_KIBEO })
await bulk('kinderen',          { kolom: 'organisatie_id', waarde: ORG_KIBEO })
await bulk('dagdelen_configuraties', { kolom: 'organisatie_id', waarde: ORG_KIBEO })
await bulk('feestdagen',        { kolom: 'organisatie_id', waarde: ORG_KIBEO })
await bulk('groepen',           { in: { kolom: 'locatie_id', waardes: locatieIds } })
await bulk('locatie_openingstijden',              { in: { kolom: 'locatie_id', waardes: locatieIds } })
await bulk('locatie_openingstijden_uitzonderingen',{ in: { kolom: 'locatie_id', waardes: locatieIds } })
await bulk('locaties',          { kolom: 'organisatie_id', waarde: ORG_KIBEO })
await bulk('tariefsets',        { kolom: 'organisatie_id', waarde: ORG_KIBEO })
await bulk('tariefregels',      { kolom: 'organisatie_id', waarde: ORG_KIBEO })
await bulk('kortingen',         { kolom: 'organisatie_id', waarde: ORG_KIBEO })
await bulk('contracttypen',     { kolom: 'organisatie_id', waarde: ORG_KIBEO })
await bulk('merken',            { kolom: 'organisatie_id', waarde: ORG_KIBEO })

// ─── 5. Organisatie zelf ─────────────────────────────────────────────────────

console.log('\n→ De organisatie zelf:')
const { error: orgErr } = await admin
  .from('organisaties')
  .delete()
  .eq('id', ORG_KIBEO)
if (orgErr) {
  console.error(`   ❌ organisatie delete faalde: ${orgErr.message}`)
  console.error('   → waarschijnlijk nog FK-constraint. Fix handmatig en probeer opnieuw.')
  process.exit(1)
}
console.log('   ✅ organisaties: 1 rij')

// ─── 6. Auth-users ───────────────────────────────────────────────────────────

console.log('\n→ auth.users verwijderen:')
const { data: lijst } = await admin.auth.admin.listUsers({ page: 1, perPage: 500 })
const teVerwijderen = lijst.users.filter((u) => {
  const isKibeoOuder = ouderIds.includes(u.id)
  const isKibeoStaff = staffIds.includes(u.id)
  return isKibeoOuder || isKibeoStaff
})
for (const u of teVerwijderen) {
  const { error } = await admin.auth.admin.deleteUser(u.id)
  if (error) console.log(`   ❌ ${u.email}: ${error.message}`)
  else       console.log(`   ✅ ${u.email}`)
}

// ─── 7. Storage: oude bijlage-paden onder {kibeo_org}/... opruimen ───────────

console.log('\n→ Storage cleanup (bucket media + ouder_email_bijlagen):')
for (const bucket of ['media', 'ouder_email_bijlagen']) {
  const { data: top } = await admin.storage.from(bucket).list(ORG_KIBEO, { limit: 1000 })
  if (!top || top.length === 0) { console.log(`   ${bucket}: geen bestanden`); continue }

  // Flatten alle bestanden onder {ORG_KIBEO}/...
  const paden = []
  async function walk(prefix) {
    const { data } = await admin.storage.from(bucket).list(prefix, { limit: 1000 })
    for (const item of data ?? []) {
      if (item.id === null) { // map
        await walk(`${prefix}/${item.name}`)
      } else {
        paden.push(`${prefix}/${item.name}`)
      }
    }
  }
  await walk(ORG_KIBEO)
  if (paden.length > 0) {
    const { error } = await admin.storage.from(bucket).remove(paden)
    if (error) console.log(`   ❌ ${bucket}: ${error.message}`)
    else       console.log(`   ✅ ${bucket}: ${paden.length} bestanden`)
  } else {
    console.log(`   ${bucket}: geen bestanden`)
  }
}

console.log('\n✅ Klaar. Kibeo is weg.')
