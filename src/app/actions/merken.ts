'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// ─── Merken ophalen ──────────────────────────────────────────────────────────

export async function getMerken() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any

  const { data, error } = await supabase
    .from('merken')
    .select('*, locaties:locaties(count)')
    .is('deleted_at', null)
    .order('naam')

  if (error) return { error: error.message }
  return { data }
}

// ─── Merk aanmaken ───────────────────────────────────────────────────────────

export async function merkAanmaken(formData: FormData) {
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

  const code = (formData.get('code') as string)?.trim()
  const naam = (formData.get('naam') as string)?.trim()
  if (!code || !naam) return { error: 'Code en naam zijn verplicht' }

  const { data, error } = await supabase
    .from('merken')
    .insert({
      organisatie_id: profile.organisatie_id,
      code,
      naam,
      beschrijving: (formData.get('beschrijving') as string) || null,
    })
    .select('id')
    .single()

  if (error) return { error: error.message }

  revalidatePath('/dashboard/instellingen')
  return { success: true, id: data.id }
}

// ─── Merk bijwerken ──────────────────────────────────────────────────────────
// Let op: code is IMMUTABLE na aanmaken

export async function merkBijwerken(merkId: string, formData: FormData) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any

  const naam = (formData.get('naam') as string)?.trim()
  if (!naam) return { error: 'Naam is verplicht' }

  const { error } = await supabase
    .from('merken')
    .update({
      naam,
      beschrijving: (formData.get('beschrijving') as string) || null,
      actief: formData.get('actief') !== 'false',
    })
    .eq('id', merkId)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/instellingen')
  return { success: true }
}

// ─── Merk deactiveren ────────────────────────────────────────────────────────

export async function merkDeactiveren(merkId: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any

  // Check of er actieve contracttypen aan dit merk hangen
  const { count } = await supabase
    .from('contracttypen')
    .select('id', { count: 'exact', head: true })
    .eq('merk_id', merkId)
    .eq('actief', true)
    .is('deleted_at', null)

  if (count && count > 0) {
    return { error: `Er zijn nog ${count} actieve contracttypen gekoppeld aan dit merk. Deactiveer deze eerst.` }
  }

  const { error } = await supabase
    .from('merken')
    .update({ actief: false })
    .eq('id', merkId)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/instellingen')
  return { success: true }
}

// ─── Locaties koppelen aan merk ──────────────────────────────────────────────

export async function koppelLocatiesAanMerk(merkId: string, locatieIds: string[]): Promise<{ success?: boolean; error?: string }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any

  // Ontkoppel alle locaties die nu aan dit merk hangen maar niet in de nieuwe lijst staan
  const { error: ontkoppelError } = await supabase
    .from('locaties')
    .update({ merk_id: null })
    .eq('merk_id', merkId)
    .not('id', 'in', `(${locatieIds.join(',')})`)

  if (ontkoppelError) return { error: ontkoppelError.message }

  // Koppel de geselecteerde locaties aan het merk
  for (const locatieId of locatieIds) {
    const { error } = await supabase
      .from('locaties')
      .update({ merk_id: merkId })
      .eq('id', locatieId)

    if (error) return { error: error.message }
  }

  revalidatePath('/dashboard/instellingen')
  return { success: true }
}
