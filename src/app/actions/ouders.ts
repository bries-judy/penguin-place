'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import type { OuderDetail, OuderLijstRij } from '@/types/ouders'

// ─── Ouders ──────────────────────────────────────────────────────────────────

/**
 * Maakt een ouder-account aan via Supabase Auth admin API
 * en koppelt de ouder aan een of meerdere kinderen.
 *
 * Vereist: SUPABASE_SERVICE_ROLE_KEY in .env.local
 */
export async function ouderUitnodigen(formData: FormData): Promise<{ error?: string; id?: string }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any

  // Auth check: alleen staff mag ouders uitnodigen
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Niet ingelogd' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('organisatie_id')
    .eq('id', user.id)
    .single()
  if (!profile?.organisatie_id) return { error: 'Geen organisatie gevonden' }

  const email = formData.get('email') as string
  const voornaam = formData.get('voornaam') as string
  const achternaam = formData.get('achternaam') as string
  const kind_ids = formData.getAll('kind_id') as string[]
  const relatie = (formData.get('relatie') as string) || 'ouder1'

  if (!email || !voornaam || !achternaam) {
    return { error: 'E-mail, voornaam en achternaam zijn verplicht' }
  }
  if (kind_ids.length === 0) {
    return { error: 'Selecteer minimaal één kind' }
  }

  // Admin client voor het aanmaken van auth users
  const admin = createAdminClient()

  // Maak ouder-account aan via auth.admin
  const { data: authUser, error: authError } = await admin.auth.admin.createUser({
    email,
    email_confirm: false, // ouder ontvangt bevestigingsmail
    app_metadata: {
      user_type: 'ouder',
      organisatie_id: profile.organisatie_id,
    },
    user_metadata: {
      voornaam,
      achternaam,
    },
  })

  if (authError || !authUser.user) {
    if (authError?.message?.includes('already been registered')) {
      return { error: 'Er bestaat al een account met dit e-mailadres' }
    }
    return { error: authError?.message ?? 'Fout bij het aanmaken van het ouder-account' }
  }

  // handle_new_user() trigger heeft automatisch een ouder_profielen rij aangemaakt.
  // Nu de ouder-kind koppelingen maken.
  for (const kind_id of kind_ids) {
    const { error: koppelingError } = await supabase
      .from('ouder_kind')
      .insert({
        ouder_id: authUser.user.id,
        kind_id,
        relatie,
      })

    if (koppelingError) {
      console.error('Koppeling fout:', koppelingError.message)
    }
  }

  // Stuur wachtwoord-reset mail zodat ouder een wachtwoord kan instellen
  await admin.auth.admin.generateLink({
    type: 'recovery',
    email,
  })

  revalidatePath('/dashboard/kinderen')
  return { id: authUser.user.id }
}

/**
 * Koppelt een bestaande ouder aan een extra kind.
 */
export async function ouderKindKoppelen(formData: FormData): Promise<{ error?: string }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Niet ingelogd' }

  const ouder_id = formData.get('ouder_id') as string
  const kind_id = formData.get('kind_id') as string
  const relatie = (formData.get('relatie') as string) || 'ouder1'

  if (!ouder_id || !kind_id) {
    return { error: 'Ouder en kind zijn verplicht' }
  }

  const { error } = await supabase
    .from('ouder_kind')
    .insert({ ouder_id, kind_id, relatie })

  if (error) {
    if (error.code === '23505') {
      return { error: 'Deze ouder is al gekoppeld aan dit kind' }
    }
    if (error.code === '42501' || error.message?.includes('row-level security')) {
      return { error: 'Je hebt geen rechten om ouder-kind koppelingen te beheren' }
    }
    return { error: error.message }
  }

  revalidatePath('/dashboard/kinderen')
  return {}
}

// ─── Ouder CRM — Fase 1 ──────────────────────────────────────────────────────

/**
 * Werkt het basisprofiel van een ouder bij (voornaam, achternaam, email,
 * telefoon_mobiel). Audit-trail wordt automatisch bijgewerkt via de trigger
 * op ouder_profielen (zie migratie 038).
 */
export async function ouderBijwerken(
  ouderId: string,
  formData: FormData,
): Promise<{ error?: string }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Niet ingelogd' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('organisatie_id')
    .eq('id', user.id)
    .single()
  if (!profile?.organisatie_id) return { error: 'Geen organisatie gevonden' }

  const voornaam        = formData.get('voornaam') as string
  const achternaam      = formData.get('achternaam') as string
  const email           = formData.get('email') as string
  const telefoon_mobiel = (formData.get('telefoon_mobiel') as string) || null

  if (!voornaam || !achternaam || !email) {
    return { error: 'Voornaam, achternaam en e-mail zijn verplicht' }
  }

  const { error } = await supabase
    .from('ouder_profielen')
    .update({ voornaam, achternaam, email, telefoon_mobiel })
    .eq('id', ouderId)
    .eq('organisatie_id', profile.organisatie_id)

  if (error) return { error: error.message }

  revalidatePath(`/dashboard/ouders/${ouderId}`)
  revalidatePath('/dashboard/ouders')
  return {}
}

/**
 * Haalt portaalberichten op voor alle kinderen van een ouder.
 * Gebruikt voor de Communicatie-tab (unified timeline met memo's).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function portaalberichtenOphalen(ouderId: string): Promise<any[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  // 1. Kind-IDs ophalen via ouder_kind
  const { data: koppelingen } = await supabase
    .from('ouder_kind')
    .select('kind_id')
    .eq('ouder_id', ouderId)
    .eq('actief', true)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const kindIds = (koppelingen ?? []).map((k: any) => k.kind_id).filter(Boolean) as string[]
  if (kindIds.length === 0) return []

  // 2. Conversations voor deze kinderen
  const { data: conversations } = await supabase
    .from('conversations')
    .select('id, kind_id')
    .in('kind_id', kindIds)
    .is('deleted_at', null)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const conversationIds = (conversations ?? []).map((c: any) => c.id) as string[]
  if (conversationIds.length === 0) return []

  // 3. Berichten
  const { data: messages } = await supabase
    .from('conversation_messages')
    .select('id, conversation_id, afzender_id, afzender_type, inhoud, created_at')
    .in('conversation_id', conversationIds)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  return messages ?? []
}

/**
 * Haalt openstaande + historische facturen op voor een ouder via
 * ouder_kind.contactpersoon_id → invoices.parent_id.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function ouderFacturenOphalen(ouderId: string): Promise<any[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data: koppelingen } = await supabase
    .from('ouder_kind')
    .select('contactpersoon_id')
    .eq('ouder_id', ouderId)
    .eq('actief', true)

  const contactpersoonIds = (koppelingen ?? [])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((k: any) => k.contactpersoon_id)
    .filter(Boolean) as string[]
  if (contactpersoonIds.length === 0) return []

  const { data } = await supabase
    .from('invoices')
    .select('id, factuurnummer, periode_start, periode_eind, totaal_bedrag, status, created_at')
    .in('parent_id', contactpersoonIds)
    .order('periode_start', { ascending: false })
    .limit(50)

  return data ?? []
}


/**
 * Haalt het 360° ouder-detail op: basisprofiel, kinderen + contracten,
 * openstaand saldo, aantal open taken, aantal actieve contracten,
 * laatste contactmoment en auditlog (top 10).
 *
 * Auth + org-check: staff wordt via RLS-policies in eigen organisatie
 * gehouden. Ouders zijn niet relevant voor deze query (staff-route).
 */
export async function ouderDetailOphalen(ouderId: string): Promise<OuderDetail | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Auth/org gate — RLS doet het werk, maar we falen snel bij ontbrekend profiel
  const { data: profile } = await supabase
    .from('profiles')
    .select('organisatie_id')
    .eq('id', user.id)
    .single()
  if (!profile?.organisatie_id) return null

  // 1. Basis-profiel
  const { data: ouder } = await supabase
    .from('ouder_profielen')
    .select('id, voornaam, achternaam, email, telefoon_mobiel, actief, created_at')
    .eq('id', ouderId)
    .eq('organisatie_id', profile.organisatie_id)
    .maybeSingle()
  if (!ouder) return null

  // 2. Kinderen + contracten via ouder_kind
  const { data: koppelingen } = await supabase
    .from('ouder_kind')
    .select(`
      kind_id, relatie, contactpersoon_id,
      kinderen (
        id, voornaam, achternaam, geboortedatum, geslacht,
        contracten (
          id, opvangtype, status, startdatum,
          locaties (naam),
          groepen (naam),
          dagdelen_configuraties (dag)
        )
      )
    `)
    .eq('ouder_id', ouderId)
    .eq('actief', true)

  // 3. Openstaand saldo via contactpersoon_id → invoices.parent_id
  const contactpersoonIds = (koppelingen ?? [])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((k: any) => k.contactpersoon_id)
    .filter(Boolean) as string[]

  let openstaand_bedrag = 0
  if (contactpersoonIds.length > 0) {
    const { data: facturen } = await supabase
      .from('invoices')
      .select('totaal_bedrag')
      .in('parent_id', contactpersoonIds)
      .in('status', ['sent', 'overdue'])

    openstaand_bedrag = (facturen ?? [])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .reduce((sum: number, f: any) => sum + Number(f.totaal_bedrag ?? 0), 0)
  }

  // 4. Aantal open taken
  const { count: open_taken } = await supabase
    .from('ouder_memos')
    .select('id', { count: 'exact', head: true })
    .eq('ouder_id', ouderId)
    .eq('type', 'taak')
    .eq('follow_up_status', 'open')
    .is('deleted_at', null)

  // 5. Actieve contracten
  const actieve_contracten_count = (koppelingen ?? [])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .flatMap((k: any) => (k.kinderen?.contracten ?? []))
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .filter((c: any) => c.status === 'actief').length

  // 6. Audit-log (top 10)
  const { data: audit } = await supabase
    .from('ouder_audit')
    .select('veld, oude_waarde, nieuwe_waarde, at')
    .eq('ouder_id', ouderId)
    .order('at', { ascending: false })
    .limit(10)

  // 7. Laatste contact (nu alleen memo's; portaalberichten-union komt in de UI-tab)
  const { data: laatste_memo } = await supabase
    .from('ouder_memos')
    .select('datum, type')
    .eq('ouder_id', ouderId)
    .is('deleted_at', null)
    .order('datum', { ascending: false })
    .limit(1)
    .maybeSingle()

  return {
    id: ouder.id,
    voornaam: ouder.voornaam,
    achternaam: ouder.achternaam,
    email: ouder.email,
    telefoon_mobiel: ouder.telefoon_mobiel,
    actief: ouder.actief,
    created_at: ouder.created_at,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    kinderen: (koppelingen ?? []).map((k: any) => ({
      kind_id: k.kind_id,
      relatie: k.relatie,
      contactpersoon_id: k.contactpersoon_id,
      voornaam:      k.kinderen?.voornaam      ?? '',
      achternaam:    k.kinderen?.achternaam    ?? '',
      geboortedatum: k.kinderen?.geboortedatum ?? null,
      geslacht:      k.kinderen?.geslacht      ?? null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      contracten: (k.kinderen?.contracten ?? []).map((c: any) => ({
        id: c.id,
        opvangtype: c.opvangtype,
        status: c.status,
        startdatum: c.startdatum,
        locatie_naam: c.locaties?.naam ?? null,
        groep_naam:   c.groepen?.naam  ?? null,
        dagen_per_week: Array.isArray(c.dagdelen_configuraties)
          ? c.dagdelen_configuraties.length
          : null,
      })),
      planned_days: [],
    })),
    openstaand_bedrag,
    aantal_open_taken: open_taken ?? 0,
    actieve_contracten_count,
    laatste_contact_datum: laatste_memo?.datum ?? null,
    laatste_contact_type:  laatste_memo?.type  ?? null,
    audit_log: audit ?? [],
  }
}

/**
 * Haalt alle actieve ouders van de organisatie op voor de lijstpagina.
 * Openstaand saldo wordt in deze fase niet per rij berekend — de join is
 * te zwaar voor een lijst. Zie spec: saldo-aggregate komt in fase 2b.
 */
export async function oudersOphalen(): Promise<OuderLijstRij[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data: profile } = await supabase
    .from('profiles')
    .select('organisatie_id')
    .eq('id', user.id)
    .single()
  if (!profile?.organisatie_id) return []

  const { data: ouders } = await supabase
    .from('ouder_profielen')
    .select(`
      id, voornaam, achternaam, email, telefoon_mobiel, actief,
      ouder_kind (kind_id, contactpersoon_id)
    `)
    .eq('organisatie_id', profile.organisatie_id)
    .eq('actief', true)
    .order('achternaam')
    .order('voornaam')

  if (!ouders) return []

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ouders.map((o: any) => ({
    id: o.id,
    voornaam: o.voornaam,
    achternaam: o.achternaam,
    email: o.email,
    telefoon_mobiel: o.telefoon_mobiel,
    actief: o.actief,
    aantal_kinderen: Array.isArray(o.ouder_kind) ? o.ouder_kind.length : 0,
    openstaand_bedrag: 0, // TODO: aggregeren in fase 2 (join te zwaar voor lijst)
  }))
}
