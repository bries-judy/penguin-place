'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { genereerPlanning } from './plannedAttendance'

// ─── Nieuw contract aanmaken ──────────────────────────────────────────────────

export async function contractAanmaken(kindId: string, formData: FormData) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any

  const zorgdagen  = formData.getAll('zorgdagen').map(Number)
  const groepId    = (formData.get('groep_id') as string) || null
  const startdatum = formData.get('startdatum') as string
  const einddatum  = (formData.get('einddatum') as string) || null

  // Contract aanmaken (groep_id wordt niet meer op contracten gezet — zie placements)
  const { data: nieuwContract, error } = await supabase
    .from('contracten')
    .insert({
      kind_id:      kindId,
      locatie_id:   formData.get('locatie_id') as string,
      opvangtype:   formData.get('opvangtype') as 'kdv' | 'bso' | 'peuteropvang' | 'gastouder',
      contracttype: formData.get('contracttype') as 'vast' | 'flex' | 'tijdelijk',
      status:       'concept',
      zorgdagen,
      uren_per_dag: parseFloat(formData.get('uren_per_dag') as string) || 8,
      uurtarief:    parseFloat(formData.get('uurtarief') as string) || null,
      maandprijs:   parseFloat(formData.get('maandprijs') as string) || null,
      startdatum,
      einddatum,
      notities:     (formData.get('notities') as string) || null,
      flexpool:     false,
    })
    .select('id')
    .single()

  if (error) return { error: error.message }

  // Als een groep geselecteerd is: maak een placement aan
  if (groepId && nieuwContract) {
    const { data: kind } = await supabase
      .from('kinderen')
      .select('organisatie_id')
      .eq('id', kindId)
      .single()

    if (kind) {
      const { error: placementError } = await supabase.from('placements').insert({
        organisatie_id: kind.organisatie_id,
        kind_id:        kindId,
        contract_id:    nieuwContract.id,
        groep_id:       groepId,
        startdatum,
        einddatum,
      })
      if (placementError) return { error: placementError.message }
    }
  }

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

  // Genereer planning vanaf contractstart (inclusief eventueel verleden)
  await genereerPlanning(contractId)

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

  const groepId   = (formData.get('groep_id') as string) || null
  const einddatum = (formData.get('einddatum') as string) || null

  // Sluit openstaande placements van het oude contract af
  await supabase
    .from('placements')
    .update({ einddatum: einddatum_oud })
    .eq('contract_id', oudContractId)
    .is('einddatum', null)

  // Nieuw contract aanmaken (groep_id niet meer op contracten — zie placements)
  const { data: nieuwContract, error } = await supabase
    .from('contracten')
    .insert({
      kind_id:           kindId,
      locatie_id:        (formData.get('locatie_id') as string) || oud.locatie_id,
      opvangtype:        (formData.get('opvangtype') as 'kdv' | 'bso' | 'peuteropvang' | 'gastouder') || oud.opvangtype,
      contracttype:      (formData.get('contracttype') as 'vast' | 'flex' | 'tijdelijk') || oud.contracttype,
      status:            'concept',
      zorgdagen:         zorgdagen.length > 0 ? zorgdagen : oud.zorgdagen,
      uren_per_dag:      parseFloat(formData.get('uren_per_dag') as string) || oud.uren_per_dag,
      uurtarief:         parseFloat(formData.get('uurtarief') as string) || oud.uurtarief || null,
      maandprijs:        parseFloat(formData.get('maandprijs') as string) || oud.maandprijs || null,
      startdatum:        ingangsdatum,
      einddatum,
      notities:          (formData.get('notities') as string) || null,
      vorige_contract_id: oudContractId,
      flexpool:          oud.flexpool,
    })
    .select('id')
    .single()

  if (error) return { error: error.message }

  // Als een groep geselecteerd is: maak een nieuwe placement aan
  if (groepId && nieuwContract) {
    const { data: kind } = await supabase
      .from('kinderen')
      .select('organisatie_id')
      .eq('id', kindId)
      .single()

    if (kind) {
      const { error: placementError } = await supabase.from('placements').insert({
        organisatie_id: kind.organisatie_id,
        kind_id:        kindId,
        contract_id:    nieuwContract.id,
        groep_id:       groepId,
        startdatum:     ingangsdatum,
        einddatum,
      })
      if (placementError) return { error: placementError.message }
    }
  }

  // Genereer planning voor het nieuwe contract (alleen toekomst;
  // verleden van het oude contract blijft intact)
  if (nieuwContract) {
    await genereerPlanning(nieuwContract.id, { futureOnly: true })
  }

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

  // Sluit ook openstaande placements van dit contract af
  await supabase
    .from('placements')
    .update({ einddatum })
    .eq('contract_id', contractId)
    .is('einddatum', null)

  // Verwijder toekomstige planningsrijen na de einddatum.
  // Historische rijen blijven bewust bewaard voor auditing.
  // Flex/manual rijen worden niet aangeraakt.
  await supabase
    .from('planned_attendance')
    .delete()
    .eq('contract_id', contractId)
    .eq('bron', 'contract')
    .gt('datum', einddatum)

  revalidatePath(`/dashboard/kinderen/${kindId}`)
  return { success: true }
}
