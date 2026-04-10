'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// ─── Nieuw contract aanmaken ──────────────────────────────────────────────────

export async function contractAanmaken(kindId: string, formData: FormData) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any

  const zorgdagen = formData.getAll('zorgdagen').map(Number)

  const { error } = await supabase.from('contracten').insert({
    kind_id:      kindId,
    locatie_id:   formData.get('locatie_id') as string,
    groep_id:     (formData.get('groep_id') as string) || null,
    opvangtype:   formData.get('opvangtype') as 'kdv' | 'bso' | 'peuteropvang' | 'gastouder',
    contracttype: formData.get('contracttype') as 'vast' | 'flex' | 'tijdelijk',
    status:       'concept',
    zorgdagen,
    uren_per_dag: parseFloat(formData.get('uren_per_dag') as string) || 8,
    startdatum:   formData.get('startdatum') as string,
    einddatum:    (formData.get('einddatum') as string) || null,
    notities:     (formData.get('notities') as string) || null,
    flexpool:     false,
  })

  if (error) return { error: error.message }

  revalidatePath(`/dashboard/kinderen/${kindId}`)
  return { success: true }
}

// ─── Contract activeren ───────────────────────────────────────────────────────

export async function contractActiveren(contractId: string, kindId: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any

  await supabase.from('contracten')
    .update({ status: 'actief' })
    .eq('id', contractId)

  revalidatePath(`/dashboard/kinderen/${kindId}`)
  return { success: true }
}

// ─── Contractwijziging doorvoeren ─────────────────────────────────────────────
// Maakt een nieuw concept aan, beëindigt het oude per ingangsdatum - 1 dag

export async function contractWijzigen(oudContractId: string, kindId: string, formData: FormData) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any

  // Oud contract ophalen
  const { data: oud } = await supabase
    .from('contracten')
    .select('*')
    .eq('id', oudContractId)
    .single()
  if (!oud) return { error: 'Contract niet gevonden' }

  const ingangsdatum = formData.get('startdatum') as string
  const zorgdagen    = formData.getAll('zorgdagen').map(Number)

  // Oud contract beëindigen per dag vóór ingangsdatum
  const dag_voor = new Date(ingangsdatum)
  dag_voor.setDate(dag_voor.getDate() - 1)
  const einddatum_oud = dag_voor.toISOString().slice(0, 10)

  await supabase.from('contracten')
    .update({ status: 'beëindigd', einddatum: einddatum_oud })
    .eq('id', oudContractId)

  // Nieuw contract aanmaken
  const { error } = await supabase.from('contracten').insert({
    kind_id:           kindId,
    locatie_id:        (formData.get('locatie_id') as string) || oud.locatie_id,
    groep_id:          (formData.get('groep_id') as string) || oud.groep_id,
    opvangtype:        (formData.get('opvangtype') as 'kdv' | 'bso' | 'peuteropvang' | 'gastouder') || oud.opvangtype,
    contracttype:      (formData.get('contracttype') as 'vast' | 'flex' | 'tijdelijk') || oud.contracttype,
    status:            'concept',
    zorgdagen:         zorgdagen.length > 0 ? zorgdagen : oud.zorgdagen,
    uren_per_dag:      parseFloat(formData.get('uren_per_dag') as string) || oud.uren_per_dag,
    startdatum:        ingangsdatum,
    einddatum:         (formData.get('einddatum') as string) || null,
    notities:          (formData.get('notities') as string) || null,
    vorige_contract_id: oudContractId,
    flexpool:          oud.flexpool,
  })

  if (error) return { error: error.message }

  revalidatePath(`/dashboard/kinderen/${kindId}`)
  return { success: true }
}

// ─── Contract beëindigen ──────────────────────────────────────────────────────

export async function contractBeeindigen(contractId: string, kindId: string, einddatum: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any

  await supabase.from('contracten')
    .update({ status: 'beëindigd', einddatum })
    .eq('id', contractId)

  revalidatePath(`/dashboard/kinderen/${kindId}`)
  return { success: true }
}
