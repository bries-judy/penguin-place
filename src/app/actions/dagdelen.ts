'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// ─── Dagdeel configuraties ophalen ──────────────────────────────────────────

export async function getDagdeelConfiguraties(locatieId: string, groepId?: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any

  let query = supabase
    .from('dagdeel_configuraties')
    .select('*')
    .lte('ingangsdatum', new Date().toISOString().split('T')[0])
    .order('groep_id', { ascending: false, nullsFirst: false })
    .order('ingangsdatum', { ascending: false })

  if (groepId) {
    query = query.or(`groep_id.eq.${groepId},and(groep_id.is.null,locatie_id.eq.${locatieId})`)
  } else {
    query = query.eq('locatie_id', locatieId).is('groep_id', null)
  }

  const { data, error } = await query

  if (error) return { error: error.message }
  return { data }
}

// ─── Dagdeel configuratie bijwerken (upsert) ────────────────────────────────

export async function dagdeelConfigBijwerken(formData: FormData) {
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

  const locatieId = (formData.get('locatie_id') as string)?.trim()
  const groepId = (formData.get('groep_id') as string)?.trim() || null
  const dagdeel = (formData.get('dagdeel_enum') as string)?.trim()
  const starttijd = (formData.get('starttijd') as string)?.trim()
  const eindtijd = (formData.get('eindtijd') as string)?.trim()
  const ingangsdatum = (formData.get('ingangsdatum') as string)?.trim()

  if (!locatieId || !dagdeel || !starttijd || !eindtijd || !ingangsdatum) {
    return { error: 'Alle velden zijn verplicht' }
  }
  if (eindtijd <= starttijd) {
    return { error: 'Eindtijd moet na starttijd liggen' }
  }

  const row = {
    organisatie_id: profile.organisatie_id,
    locatie_id: locatieId,
    groep_id: groepId,
    dagdeel_enum: dagdeel,
    starttijd,
    eindtijd,
    ingangsdatum,
  }

  // Check of er al een configuratie bestaat voor deze combinatie
  let existing = supabase
    .from('dagdeel_configuraties')
    .select('id')
    .eq('locatie_id', locatieId)
    .eq('dagdeel_enum', dagdeel)
    .eq('ingangsdatum', ingangsdatum)

  if (groepId) {
    existing = existing.eq('groep_id', groepId)
  } else {
    existing = existing.is('groep_id', null)
  }

  const { data: bestaand } = await existing.maybeSingle()

  if (bestaand) {
    const { error } = await supabase
      .from('dagdeel_configuraties')
      .update({ starttijd, eindtijd })
      .eq('id', bestaand.id)

    if (error) return { error: error.message }
  } else {
    const { error } = await supabase
      .from('dagdeel_configuraties')
      .insert(row)

    if (error) return { error: error.message }
  }

  revalidatePath('/dashboard/locaties')
  return { success: true }
}

// ─── Feestdagen ophalen ─────────────────────────────────────────────────────

export async function getFeestdagen(jaar: number) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any

  const { data, error } = await supabase
    .from('feestdagen')
    .select('*')
    .gte('datum', `${jaar}-01-01`)
    .lte('datum', `${jaar}-12-31`)
    .order('datum')

  if (error) return { error: error.message }
  return { data }
}

// ─── Feestdag toevoegen ─────────────────────────────────────────────────────

export async function feestdagToevoegen(formData: FormData) {
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

  const datum = (formData.get('datum') as string)?.trim()
  const naam = (formData.get('naam') as string)?.trim()
  const locatieId = (formData.get('locatie_id') as string)?.trim() || null

  if (!datum || !naam) return { error: 'Datum en naam zijn verplicht' }

  const { data, error } = await supabase
    .from('feestdagen')
    .insert({
      organisatie_id: profile.organisatie_id,
      datum,
      naam,
      locatie_id: locatieId,
    })
    .select('id')
    .single()

  if (error) return { error: error.message }

  revalidatePath('/dashboard/locaties')
  return { success: true, id: data.id }
}

// ─── Feestdag verwijderen ───────────────────────────────────────────────────

export async function feestdagVerwijderen(id: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Niet ingelogd' }

  const { error } = await supabase
    .from('feestdagen')
    .delete()
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/locaties')
  return { success: true }
}
