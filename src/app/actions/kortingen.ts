'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// ─── Kortingstypes ophalen ──────────────────────────────────────────────────

export async function getKortingsTypes() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any

  const { data, error } = await supabase
    .from('kortings_typen')
    .select('*')
    .is('deleted_at', null)
    .order('naam')

  if (error) return { error: error.message }
  return { data }
}

// ─── Kortingstype aanmaken ──────────────────────────────────────────────────

export async function kortingsTypeAanmaken(formData: FormData) {
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
  const type_enum = formData.get('type_enum') as string
  const waarde = parseFloat(formData.get('waarde') as string)
  const grondslag_enum = formData.get('grondslag_enum') as string

  if (!code || !naam) return { error: 'Code en naam zijn verplicht' }
  if (!type_enum || !grondslag_enum) return { error: 'Type en grondslag zijn verplicht' }
  if (isNaN(waarde) || waarde <= 0) return { error: 'Waarde moet een positief getal zijn' }

  const maxKorting = formData.get('max_kortingsbedrag') as string
  const max_kortingsbedrag = maxKorting ? parseFloat(maxKorting) : null

  const { data, error } = await supabase
    .from('kortings_typen')
    .insert({
      organisatie_id: profile.organisatie_id,
      code,
      naam,
      type_enum,
      waarde,
      grondslag_enum,
      max_kortingsbedrag,
      stapelbaar: formData.get('stapelbaar') !== 'false',
      vereist_documentatie: formData.get('vereist_documentatie') === 'true',
    })
    .select('id')
    .single()

  if (error) return { error: error.message }

  revalidatePath('/dashboard/contracten')
  return { success: true, id: data.id }
}

// ─── Kortingstype bijwerken ─────────────────────────────────────────────────
// Let op: code is IMMUTABLE na aanmaken

export async function kortingsTypeBijwerken(id: string, formData: FormData) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any

  const naam = (formData.get('naam') as string)?.trim()
  if (!naam) return { error: 'Naam is verplicht' }

  const waarde = parseFloat(formData.get('waarde') as string)
  if (isNaN(waarde) || waarde <= 0) return { error: 'Waarde moet een positief getal zijn' }

  const maxKorting = formData.get('max_kortingsbedrag') as string
  const max_kortingsbedrag = maxKorting ? parseFloat(maxKorting) : null

  const { error } = await supabase
    .from('kortings_typen')
    .update({
      naam,
      type_enum: formData.get('type_enum') as string,
      waarde,
      grondslag_enum: formData.get('grondslag_enum') as string,
      max_kortingsbedrag,
      stapelbaar: formData.get('stapelbaar') !== 'false',
      vereist_documentatie: formData.get('vereist_documentatie') === 'true',
      actief: formData.get('actief') !== 'false',
    })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/contracten')
  return { success: true }
}

// ─── Kortingstype deactiveren ───────────────────────────────────────────────

export async function kortingsTypeDeactiveren(id: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any

  // Check of er actieve koppelingen zijn
  const { count } = await supabase
    .from('kind_contract_kortingen')
    .select('id', { count: 'exact', head: true })
    .eq('kortings_type_id', id)

  if (count && count > 0) {
    return { error: `Er zijn nog ${count} actieve koppelingen met kindcontracten. Bestaande koppelingen blijven actief, maar dit type kan niet meer worden toegewezen.` }
  }

  const { error } = await supabase
    .from('kortings_typen')
    .update({ actief: false })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/contracten')
  return { success: true }
}

// ─── Korting berekenen ──────────────────────────────────────────────────────

export async function berekenKorting(kortingsTypeId: string, grondslag: number) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any

  const { data: kt, error } = await supabase
    .from('kortings_typen')
    .select('type_enum, waarde, max_kortingsbedrag')
    .eq('id', kortingsTypeId)
    .single()

  if (error || !kt) return { error: 'Kortingstype niet gevonden' }

  let bedrag: number

  if (kt.type_enum === 'percentage') {
    bedrag = grondslag * (kt.waarde / 100)
    if (kt.max_kortingsbedrag && bedrag > kt.max_kortingsbedrag) {
      bedrag = kt.max_kortingsbedrag
    }
  } else {
    // vast_bedrag
    bedrag = kt.waarde
  }

  return { bedrag: Math.round(bedrag * 100) / 100 }
}

// ─── Korting toevoegen aan contract ─────────────────────────────────────────

export async function voegKortingToeAanContract(
  contractId: string,
  kortingsTypeId: string,
  startdatum: string
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any

  // Haal kortingstype op
  const { data: kt, error: ktError } = await supabase
    .from('kortings_typen')
    .select('stapelbaar, actief')
    .eq('id', kortingsTypeId)
    .single()

  if (ktError || !kt) return { error: 'Kortingstype niet gevonden' }
  if (!kt.actief) return { error: 'Dit kortingstype is niet meer actief' }

  // Valideer stapelbaarheid
  if (!kt.stapelbaar) {
    const { count } = await supabase
      .from('kind_contract_kortingen')
      .select('id', { count: 'exact', head: true })
      .eq('kind_contract_id', contractId)

    if (count && count > 0) {
      return { error: 'Dit is een niet-stapelbare korting en er zijn al kortingen gekoppeld aan dit contract.' }
    }
  }

  // Bereken bedrag (voorlopig 0, wordt herberekend bij contractwijziging)
  const { data, error } = await supabase
    .from('kind_contract_kortingen')
    .insert({
      kind_contract_id: contractId,
      kortings_type_id: kortingsTypeId,
      startdatum,
      berekend_bedrag: 0,
    })
    .select('id')
    .single()

  if (error) return { error: error.message }

  revalidatePath('/dashboard/contracten')
  return { success: true, id: data.id }
}

// ─── Korting verwijderen van contract ───────────────────────────────────────

export async function verwijderKortingVanContract(kindContractKortingId: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any

  const { error } = await supabase
    .from('kind_contract_kortingen')
    .delete()
    .eq('id', kindContractKortingId)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/contracten')
  return { success: true }
}
