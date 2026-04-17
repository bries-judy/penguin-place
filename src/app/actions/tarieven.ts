'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// ─── Tariefsets ophalen ─────────────────────────────────────────────────────

export async function getTariefsets(merkId?: string, jaar?: number) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any

  let query = supabase
    .from('tariefsets')
    .select('*, contracttype:contracttypen(naam, code, opvangtype)')
    .is('deleted_at', null)
    .order('jaar', { ascending: false })

  if (merkId) query = query.eq('merk_id', merkId)
  if (jaar) query = query.eq('jaar', jaar)

  const { data, error } = await query

  if (error) return { error: error.message }
  return { data }
}

// ─── Tariefset aanmaken ─────────────────────────────────────────────────────

export async function tariefsetAanmaken(formData: FormData) {
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

  const merk_id = (formData.get('merk_id') as string)?.trim()
  const contract_type_id = (formData.get('contract_type_id') as string)?.trim()
  const jaar = parseInt(formData.get('jaar') as string)
  const opvangtype = (formData.get('opvangtype') as string)?.trim()
  const uurtarief = parseFloat(formData.get('uurtarief') as string)
  const max_overheidsuurprijs = formData.get('max_overheidsuurprijs') as string
  const ingangsdatum = (formData.get('ingangsdatum') as string)?.trim()

  if (!merk_id || !contract_type_id || !jaar || !opvangtype || isNaN(uurtarief) || !ingangsdatum) {
    return { error: 'Alle verplichte velden moeten ingevuld zijn' }
  }

  const { data, error } = await supabase
    .from('tariefsets')
    .insert({
      organisatie_id: profile.organisatie_id,
      merk_id,
      contract_type_id,
      jaar,
      opvangtype,
      uurtarief,
      max_overheidsuurprijs: max_overheidsuurprijs ? parseFloat(max_overheidsuurprijs) : null,
      ingangsdatum,
    })
    .select('id')
    .single()

  if (error) return { error: error.message }

  revalidatePath('/dashboard/contracten')
  return { success: true, id: data.id }
}

// ─── Tariefset bijwerken ────────────────────────────────────────────────────

export async function tariefsetBijwerken(id: string, formData: FormData) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any

  const uurtarief = parseFloat(formData.get('uurtarief') as string)
  const max_overheidsuurprijs = formData.get('max_overheidsuurprijs') as string
  const ingangsdatum = (formData.get('ingangsdatum') as string)?.trim()

  if (isNaN(uurtarief) || !ingangsdatum) {
    return { error: 'Uurtarief en ingangsdatum zijn verplicht' }
  }

  // Alleen concept-tariefsets mogen bewerkt worden
  const { data: bestaand } = await supabase
    .from('tariefsets')
    .select('status')
    .eq('id', id)
    .single()

  if (bestaand?.status !== 'concept') {
    return { error: 'Alleen tariefsets met status "concept" kunnen bewerkt worden' }
  }

  const { error } = await supabase
    .from('tariefsets')
    .update({
      uurtarief,
      max_overheidsuurprijs: max_overheidsuurprijs ? parseFloat(max_overheidsuurprijs) : null,
      ingangsdatum,
    })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/contracten')
  return { success: true }
}

// ─── Tariefset activeren ────────────────────────────────────────────────────

export async function tariefsetActiveren(id: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any

  const { error } = await supabase
    .from('tariefsets')
    .update({ status: 'actief' })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/contracten')
  return { success: true }
}

// ─── Tarief opzoeken voor contract ──────────────────────────────────────────

export async function getTariefVoorContract(contractTypeId: string, merkId: string, datum: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any

  const { data, error } = await supabase
    .from('tariefsets')
    .select('uurtarief, max_overheidsuurprijs')
    .eq('contract_type_id', contractTypeId)
    .eq('merk_id', merkId)
    .eq('status', 'actief')
    .lte('ingangsdatum', datum)
    .is('deleted_at', null)
    .order('ingangsdatum', { ascending: false })
    .limit(1)
    .single()

  if (error) return { error: error.message }
  return { data }
}

// ─── Tariefsets kopiëren naar nieuw jaar ────────────────────────────────────

export async function kopieerTariefsets(
  merkId: string,
  vanJaar: number,
  naarJaar: number,
  indexatiePercentage: number
) {
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

  // Haal alle actieve tariefsets voor het bronjaar op
  const { data: bronSets, error: fetchError } = await supabase
    .from('tariefsets')
    .select('*')
    .eq('merk_id', merkId)
    .eq('jaar', vanJaar)
    .eq('status', 'actief')
    .is('deleted_at', null)

  if (fetchError) return { error: fetchError.message }
  if (!bronSets || bronSets.length === 0) return { error: 'Geen actieve tariefsets gevonden voor het geselecteerde jaar' }

  // Maak kopieën met geïndexeerde tarieven
  const multiplier = 1 + indexatiePercentage / 100
  const nieuweSets = bronSets.map((ts: { organisatie_id: string; merk_id: string; contract_type_id: string; opvangtype: string; uurtarief: number; max_overheidsuurprijs: number | null; ingangsdatum: string }) => ({
    organisatie_id: ts.organisatie_id,
    merk_id: ts.merk_id,
    contract_type_id: ts.contract_type_id,
    jaar: naarJaar,
    opvangtype: ts.opvangtype,
    uurtarief: Math.round(ts.uurtarief * multiplier * 100) / 100,
    max_overheidsuurprijs: ts.max_overheidsuurprijs
      ? Math.round(ts.max_overheidsuurprijs * multiplier * 100) / 100
      : null,
    ingangsdatum: ts.ingangsdatum.replace(`${vanJaar}`, `${naarJaar}`),
    status: 'concept',
  }))

  const { error: insertError } = await supabase
    .from('tariefsets')
    .insert(nieuweSets)

  if (insertError) return { error: insertError.message }

  revalidatePath('/dashboard/contracten')
  return { success: true, aantal: nieuweSets.length }
}
