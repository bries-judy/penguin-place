'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// ─── Helpers ──────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function genereerLocatiecode(supabase: any, organisatieId: string, plaats: string): Promise<string> {
  const prefix = plaats.substring(0, 3).toUpperCase()
  const { count } = await supabase
    .from('locaties')
    .select('id', { count: 'exact' })
    .eq('organisatie_id', organisatieId)
    .ilike('code', `${prefix}-%`)
  const volgnummer = String((count ?? 0) + 1).padStart(3, '0')
  return `${prefix}-${volgnummer}`
}

// ─── Locaties ─────────────────────────────────────────────────────────────────

export async function locatieAanmaken(formData: FormData): Promise<{ error?: string; id?: string }> {
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

  const lrk_nummer = (formData.get('lrk_nummer') as string) || null
  if (lrk_nummer && !/^\d{12}$/.test(lrk_nummer))
    return { error: 'LRK-nummer moet exact 12 cijfers bevatten' }

  const postcode = (formData.get('postcode') as string) || null
  if (postcode && !/^\d{4}\s?[A-Z]{2}$/i.test(postcode))
    return { error: 'Postcode moet het formaat 1234 AB hebben' }

  const plaats = (formData.get('plaats') as string) || ''
  const code = await genereerLocatiecode(supabase, profile.organisatie_id, plaats)

  const { data: locatie, error } = await supabase
    .from('locaties')
    .insert({
      organisatie_id:              profile.organisatie_id,
      naam:                        formData.get('naam') as string,
      code,
      type:                        (formData.get('type') as string) || null,
      status:                      (formData.get('status') as string) || 'actief',
      adres:                       (formData.get('adres') as string) || '',
      huisnummer:                  (formData.get('huisnummer') as string) || '',
      postcode:                    postcode ?? '',
      plaats,
      land:                        (formData.get('land') as string) || 'NL',
      label:                       (formData.get('label') as string) || '',
      telefoon:                    (formData.get('telefoon') as string) || '',
      email:                       (formData.get('email') as string) || '',
      website:                     (formData.get('website') as string) || null,
      lrk_nummer,
      ggd_regio:                   (formData.get('ggd_regio') as string) || null,
      laatste_inspectie_datum:     (formData.get('laatste_inspectie_datum') as string) || null,
      inspectie_oordeel:           (formData.get('inspectie_oordeel') as string) || null,
      volgende_inspectie_datum:    (formData.get('volgende_inspectie_datum') as string) || null,
      vergunning_geldig_tot:       (formData.get('vergunning_geldig_tot') as string) || null,
      cao:                         (formData.get('cao') as string) || null,
      locatiemanager_id:           (formData.get('locatiemanager_id') as string) || null,
      plaatsvervangend_manager_id: (formData.get('plaatsvervangend_manager_id') as string) || null,
      noodcontact_naam:            (formData.get('noodcontact_naam') as string) || null,
      noodcontact_telefoon:        (formData.get('noodcontact_telefoon') as string) || null,
      iban:                        (formData.get('iban') as string) || null,
      kvk_nummer:                  (formData.get('kvk_nummer') as string) || null,
      buitenspeelruimte:           formData.get('buitenspeelruimte') === 'on',
      buitenspeelruimte_m2:        formData.get('buitenspeelruimte_m2') ? Number(formData.get('buitenspeelruimte_m2')) : null,
      heeft_keuken:                formData.get('heeft_keuken') === 'on',
      rolstoeltoegankelijk:        formData.get('rolstoeltoegankelijk') === 'on',
      parkeerplaatsen:             formData.get('parkeerplaatsen') ? Number(formData.get('parkeerplaatsen')) : null,
      notities:                    (formData.get('notities') as string) || null,
      actief:                      true,
    })
    .select('id')
    .single()

  if (error || !locatie) return { error: error?.message ?? 'Onbekende fout' }

  revalidatePath('/dashboard/locaties')
  return { id: locatie.id }
}

export async function locatieBijwerken(id: string, formData: FormData): Promise<{ error?: string }> {
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

  const lrk_nummer = (formData.get('lrk_nummer') as string) || null
  if (lrk_nummer && !/^\d{12}$/.test(lrk_nummer))
    return { error: 'LRK-nummer moet exact 12 cijfers bevatten' }

  const postcode = (formData.get('postcode') as string) || null
  if (postcode && !/^\d{4}\s?[A-Z]{2}$/i.test(postcode))
    return { error: 'Postcode moet het formaat 1234 AB hebben' }

  const { error } = await supabase
    .from('locaties')
    .update({
      naam:                        formData.get('naam') as string,
      type:                        (formData.get('type') as string) || null,
      status:                      (formData.get('status') as string) || 'actief',
      adres:                       (formData.get('adres') as string) || '',
      huisnummer:                  (formData.get('huisnummer') as string) || '',
      postcode:                    postcode ?? '',
      plaats:                      (formData.get('plaats') as string) || '',
      land:                        (formData.get('land') as string) || 'NL',
      label:                       (formData.get('label') as string) || '',
      telefoon:                    (formData.get('telefoon') as string) || '',
      email:                       (formData.get('email') as string) || '',
      website:                     (formData.get('website') as string) || null,
      lrk_nummer,
      ggd_regio:                   (formData.get('ggd_regio') as string) || null,
      laatste_inspectie_datum:     (formData.get('laatste_inspectie_datum') as string) || null,
      inspectie_oordeel:           (formData.get('inspectie_oordeel') as string) || null,
      volgende_inspectie_datum:    (formData.get('volgende_inspectie_datum') as string) || null,
      vergunning_geldig_tot:       (formData.get('vergunning_geldig_tot') as string) || null,
      cao:                         (formData.get('cao') as string) || null,
      locatiemanager_id:           (formData.get('locatiemanager_id') as string) || null,
      plaatsvervangend_manager_id: (formData.get('plaatsvervangend_manager_id') as string) || null,
      noodcontact_naam:            (formData.get('noodcontact_naam') as string) || null,
      noodcontact_telefoon:        (formData.get('noodcontact_telefoon') as string) || null,
      iban:                        (formData.get('iban') as string) || null,
      kvk_nummer:                  (formData.get('kvk_nummer') as string) || null,
      buitenspeelruimte:           formData.get('buitenspeelruimte') === 'on',
      buitenspeelruimte_m2:        formData.get('buitenspeelruimte_m2') ? Number(formData.get('buitenspeelruimte_m2')) : null,
      heeft_keuken:                formData.get('heeft_keuken') === 'on',
      rolstoeltoegankelijk:        formData.get('rolstoeltoegankelijk') === 'on',
      parkeerplaatsen:             formData.get('parkeerplaatsen') ? Number(formData.get('parkeerplaatsen')) : null,
      notities:                    (formData.get('notities') as string) || null,
    })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/locaties')
  return {}
}

export async function locatieDeactiveren(id: string): Promise<{ error?: string }> {
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

  const { error } = await supabase
    .from('locaties')
    .update({ deleted_at: new Date().toISOString(), actief: false })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/locaties')
  return {}
}

// ─── Openingstijden ───────────────────────────────────────────────────────────

export async function openingstijdenBijwerken(
  locatieId: string,
  tijden: Array<{ dag: string; is_open: boolean; open_tijd?: string; sluit_tijd?: string }>
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

  const rijen = tijden.map(t => ({
    locatie_id:  locatieId,
    dag_van_week: t.dag,
    is_open:     t.is_open,
    open_tijd:   t.is_open ? (t.open_tijd ?? null) : null,
    sluit_tijd:  t.is_open ? (t.sluit_tijd ?? null) : null,
  }))

  const { error } = await supabase
    .from('locatie_openingstijden')
    .upsert(rijen, { onConflict: 'locatie_id,dag_van_week' })

  if (error) return { error: error.message }

  revalidatePath('/dashboard/locaties')
  return {}
}

// ─── Openingstijden uitzonderingen ────────────────────────────────────────────

export async function uitzonderingToevoegen(locatieId: string, formData: FormData): Promise<{ error?: string }> {
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

  const is_gesloten = formData.get('is_gesloten') !== 'false'
  const open_tijd   = is_gesloten ? null : ((formData.get('open_tijd') as string) || null)
  const sluit_tijd  = is_gesloten ? null : ((formData.get('sluit_tijd') as string) || null)

  const { error } = await supabase
    .from('locatie_openingstijden_uitzonderingen')
    .insert({
      locatie_id:   locatieId,
      start_datum:  formData.get('start_datum') as string,
      eind_datum:   formData.get('eind_datum') as string,
      is_gesloten,
      open_tijd,
      sluit_tijd,
      omschrijving: formData.get('omschrijving') as string,
    })

  if (error) return { error: error.message }

  revalidatePath('/dashboard/locaties')
  return {}
}

export async function uitzonderingBijwerken(id: string, formData: FormData): Promise<{ error?: string }> {
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

  const is_gesloten = formData.get('is_gesloten') !== 'false'
  const open_tijd   = is_gesloten ? null : ((formData.get('open_tijd') as string) || null)
  const sluit_tijd  = is_gesloten ? null : ((formData.get('sluit_tijd') as string) || null)

  const { error } = await supabase
    .from('locatie_openingstijden_uitzonderingen')
    .update({
      start_datum:  formData.get('start_datum') as string,
      eind_datum:   formData.get('eind_datum') as string,
      is_gesloten,
      open_tijd,
      sluit_tijd,
      omschrijving: formData.get('omschrijving') as string,
    })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/locaties')
  return {}
}

export async function uitzonderingVerwijderen(id: string): Promise<{ error?: string }> {
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

  const { error } = await supabase
    .from('locatie_openingstijden_uitzonderingen')
    .delete()
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/locaties')
  return {}
}

// ─── Groepen ──────────────────────────────────────────────────────────────────

export async function groepAanmaken(locatieId: string, formData: FormData): Promise<{ error?: string; id?: string }> {
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

  const min_leeftijd_maanden = Number(formData.get('min_leeftijd_maanden'))
  const max_leeftijd_maanden = Number(formData.get('max_leeftijd_maanden'))
  if (min_leeftijd_maanden >= max_leeftijd_maanden)
    return { error: 'Minimumleeftijd moet kleiner zijn dan maximumleeftijd' }

  const m2Raw = formData.get('m2')
  const m2 = m2Raw ? Number(m2Raw) : null
  if (m2 !== null && m2 <= 0)
    return { error: 'Oppervlakte moet groter zijn dan 0' }

  const { data: groep, error } = await supabase
    .from('groepen')
    .insert({
      locatie_id:           locatieId,
      naam:                 formData.get('naam') as string,
      opvangtype:           formData.get('opvangtype') as string,
      leeftijdscategorie:   formData.get('leeftijdscategorie') as string,
      min_leeftijd_maanden,
      max_leeftijd_maanden,
      max_capaciteit:       Number(formData.get('max_capaciteit')),
      status:               (formData.get('status') as string) || 'actief',
      m2,
      bkr_ratio:            (formData.get('bkr_ratio') as string) || null,
      ruimtenaam:           (formData.get('ruimtenaam') as string) || null,
      notities:             (formData.get('notities') as string) || null,
      actief:               true,
    })
    .select('id')
    .single()

  if (error || !groep) return { error: error?.message ?? 'Onbekende fout' }

  revalidatePath('/dashboard/locaties')
  return { id: groep.id }
}

export async function groepBijwerken(id: string, formData: FormData): Promise<{ error?: string }> {
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

  const min_leeftijd_maanden = Number(formData.get('min_leeftijd_maanden'))
  const max_leeftijd_maanden = Number(formData.get('max_leeftijd_maanden'))
  if (min_leeftijd_maanden >= max_leeftijd_maanden)
    return { error: 'Minimumleeftijd moet kleiner zijn dan maximumleeftijd' }

  const m2Raw = formData.get('m2')
  const m2 = m2Raw ? Number(m2Raw) : null
  if (m2 !== null && m2 <= 0)
    return { error: 'Oppervlakte moet groter zijn dan 0' }

  const { error } = await supabase
    .from('groepen')
    .update({
      naam:                 formData.get('naam') as string,
      opvangtype:           formData.get('opvangtype') as string,
      leeftijdscategorie:   formData.get('leeftijdscategorie') as string,
      min_leeftijd_maanden,
      max_leeftijd_maanden,
      max_capaciteit:       Number(formData.get('max_capaciteit')),
      status:               (formData.get('status') as string) || 'actief',
      m2,
      bkr_ratio:            (formData.get('bkr_ratio') as string) || null,
      ruimtenaam:           (formData.get('ruimtenaam') as string) || null,
      notities:             (formData.get('notities') as string) || null,
    })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/locaties')
  return {}
}

export async function groepDeactiveren(id: string): Promise<{ error?: string }> {
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

  const { error } = await supabase
    .from('groepen')
    .update({ deleted_at: new Date().toISOString(), actief: false, status: 'gesloten' })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/locaties')
  return {}
}

// ─── Gebruikers zoeken (voor user picker) ────────────────────────────────────

export async function zoekGebruikers(query: string): Promise<{ id: string; voornaam: string; achternaam: string }[]> {
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

  if (!query.trim()) return []

  const { data } = await supabase
    .from('profiles')
    .select('id, voornaam, achternaam')
    .eq('organisatie_id', profile.organisatie_id)
    .or(`voornaam.ilike.%${query}%,achternaam.ilike.%${query}%`)
    .limit(8)

  return data ?? []
}
