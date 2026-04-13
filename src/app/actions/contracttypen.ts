'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// ─── ContractTypen ophalen ───────────────────────────────────────────────────

export async function getContractTypen(locatieId?: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any

  if (locatieId) {
    // Filter op merk van de locatie (voor kindcontractformulier)
    const { data: locatie } = await supabase
      .from('locaties')
      .select('merk_id')
      .eq('id', locatieId)
      .single()

    if (!locatie?.merk_id) return { data: [] }

    const { data, error } = await supabase
      .from('contracttypen')
      .select('*')
      .eq('merk_id', locatie.merk_id)
      .eq('actief', true)
      .is('deleted_at', null)
      .order('naam')

    if (error) return { error: error.message }
    return { data }
  }

  // Alle contracttypen voor de organisatie
  const { data, error } = await supabase
    .from('contracttypen')
    .select('*, merk:merken(naam, code)')
    .is('deleted_at', null)
    .order('naam')

  if (error) return { error: error.message }
  return { data }
}

// ─── Eén contracttype ophalen ────────────────────────────────────────────────

export async function getContractType(id: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any

  const { data, error } = await supabase
    .from('contracttypen')
    .select('*, merk:merken(naam, code)')
    .eq('id', id)
    .is('deleted_at', null)
    .single()

  if (error) return { error: error.message }
  return { data }
}

// ─── ContractType aanmaken ───────────────────────────────────────────────────

export async function contractTypeAanmaken(formData: FormData) {
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

  const naam = (formData.get('naam') as string)?.trim()
  const code = (formData.get('code') as string)?.trim()
  const merk_id = formData.get('merk_id') as string
  const opvangtype = formData.get('opvangtype') as string
  const contractvorm = formData.get('contractvorm') as string

  if (!naam || !code || !merk_id || !opvangtype || !contractvorm) {
    return { error: 'Naam, code, merk, opvangtype en contractvorm zijn verplicht' }
  }

  const { data, error } = await supabase
    .from('contracttypen')
    .insert({
      organisatie_id: profile.organisatie_id,
      merk_id,
      naam,
      code,
      opvangtype,
      contractvorm,
      beschrijving: (formData.get('beschrijving') as string) || null,
      min_uren_maand: formData.get('min_uren_maand') ? parseInt(formData.get('min_uren_maand') as string) : null,
      min_dagdelen_week: formData.get('min_dagdelen_week') ? parseInt(formData.get('min_dagdelen_week') as string) : null,
      geldig_in_vakanties: formData.get('geldig_in_vakanties') !== 'false',
      opvang_op_inschrijving: formData.get('opvang_op_inschrijving') === 'true',
      annuleringstermijn_uren: formData.get('annuleringstermijn_uren') ? parseInt(formData.get('annuleringstermijn_uren') as string) : null,
    })
    .select('id')
    .single()

  if (error) return { error: error.message }

  revalidatePath('/dashboard/instellingen')
  return { success: true, id: data.id }
}

// ─── ContractType bijwerken ──────────────────────────────────────────────────

export async function contractTypeBijwerken(id: string, formData: FormData) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any

  const naam = (formData.get('naam') as string)?.trim()
  if (!naam) return { error: 'Naam is verplicht' }

  const { error } = await supabase
    .from('contracttypen')
    .update({
      naam,
      beschrijving: (formData.get('beschrijving') as string) || null,
      min_uren_maand: formData.get('min_uren_maand') ? parseInt(formData.get('min_uren_maand') as string) : null,
      min_dagdelen_week: formData.get('min_dagdelen_week') ? parseInt(formData.get('min_dagdelen_week') as string) : null,
      geldig_in_vakanties: formData.get('geldig_in_vakanties') !== 'false',
      opvang_op_inschrijving: formData.get('opvang_op_inschrijving') === 'true',
      annuleringstermijn_uren: formData.get('annuleringstermijn_uren') ? parseInt(formData.get('annuleringstermijn_uren') as string) : null,
      actief: formData.get('actief') !== 'false',
    })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/instellingen')
  return { success: true }
}

// ─── ContractType deactiveren ────────────────────────────────────────────────

export async function contractTypeDeactiveren(id: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any

  // Check of er actieve kindcontracten aan dit contracttype hangen
  const { count } = await supabase
    .from('contracten')
    .select('id', { count: 'exact', head: true })
    .eq('contract_type_id', id)
    .in('status', ['actief', 'concept'])

  if (count && count > 0) {
    return { error: `Er zijn nog ${count} actieve/concept contracten van dit type. Beëindig deze eerst.` }
  }

  const { error } = await supabase
    .from('contracttypen')
    .update({ actief: false })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/instellingen')
  return { success: true }
}
