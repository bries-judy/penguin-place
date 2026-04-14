'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { genereerPlanning } from './plannedAttendance'
import { getTariefVoorContract } from './tarieven'
import { getDagdeelConfiguraties } from './dagdelen'
import { berekenKorting } from './kortingen'

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Resolve merk_id via locaties.merk_id direct FK */
export async function getMerkVoorLocatie(locatieId: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any

  const { data, error } = await supabase
    .from('locaties')
    .select('merk_id, merken(id, naam)')
    .eq('id', locatieId)
    .single()

  if (error || !data || !data.merk_id) return { error: 'Geen merk gevonden voor deze locatie. Koppel eerst een merk aan deze locatie via Instellingen.' }
  return { data: { merkId: data.merk_id, merkNaam: data.merken?.naam ?? '' } }
}

/** Haal actieve contracttypen op gefilterd op merk */
export async function getContractTypenVoorMerk(merkId: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any

  const { data, error } = await supabase
    .from('contracttypen')
    .select('*')
    .eq('merk_id', merkId)
    .eq('actief', true)
    .is('deleted_at', null)
    .order('naam')

  if (error) return { error: error.message }
  return { data: data ?? [] }
}

/**
 * Bereken maandprijs_bruto op basis van dagdelen, uren en uurtarief.
 * Formule: SOM(uren_per_dag per zorgdag) × uurtarief × 52/12
 */
function berekenMaandprijsBruto(
  dagdelen: Record<string, string>,
  dagdeelConfigs: { dagdeel_enum: string; uren: number }[],
  uurtarief: number
): number {
  let totalUrenPerWeek = 0

  for (const [, dagdeel] of Object.entries(dagdelen)) {
    const config = dagdeelConfigs.find(c => c.dagdeel_enum === dagdeel)
    const uren = config?.uren ?? 8 // fallback
    totalUrenPerWeek += uren
  }

  const maandprijs = totalUrenPerWeek * uurtarief * (52 / 12)
  return Math.round(maandprijs * 100) / 100
}

// ─── Nieuw contract aanmaken (refactored) ────────────────────────────────────

export async function contractAanmaken(kindId: string, formData: FormData) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any

  const locatieId      = formData.get('locatie_id') as string
  const contractTypeId = formData.get('contract_type_id') as string
  const groepId        = (formData.get('groep_id') as string) || null
  const zorgdagen      = formData.getAll('zorgdagen').map(Number)
  const startdatum     = formData.get('startdatum') as string
  const einddatum      = (formData.get('einddatum') as string) || null
  const notities       = (formData.get('notities') as string) || null
  const kortingIds     = formData.getAll('korting_ids') as string[]

  // Parse dagdelen: form sends dagdeel_0, dagdeel_2, etc.
  const dagdelen: Record<string, string> = {}
  for (const dag of zorgdagen) {
    const dagdeel = formData.get(`dagdeel_${dag}`) as string
    if (dagdeel) dagdelen[String(dag)] = dagdeel
  }

  // 1. Resolve merk via locatie
  const merkResult = await getMerkVoorLocatie(locatieId)
  if (merkResult.error) return { error: merkResult.error }
  const { merkId } = merkResult.data!

  // 2. Haal contracttype op, valideer dat het bij het merk hoort
  const { data: contractType, error: ctError } = await supabase
    .from('contracttypen')
    .select('id, merk_id, naam, opvangtype')
    .eq('id', contractTypeId)
    .single()

  if (ctError || !contractType) return { error: 'Contracttype niet gevonden' }
  if (contractType.merk_id !== merkId) return { error: 'Contracttype hoort niet bij het merk van deze locatie' }

  // 3. Haal actief tarief op
  const tariefResult = await getTariefVoorContract(contractTypeId, merkId, startdatum)
  if (tariefResult.error) return { error: `Tarief niet gevonden: ${tariefResult.error}` }
  const uurtarief = tariefResult.data!.uurtarief as number

  // 4. Haal dagdeel-uren op
  const dagdeelResult = await getDagdeelConfiguraties(locatieId, groepId ?? undefined)
  const dagdeelConfigs = dagdeelResult.data ?? []

  // 5. Bereken maandprijs_bruto
  const maandprijsBruto = berekenMaandprijsBruto(dagdelen, dagdeelConfigs, uurtarief)

  // 6. Bereken kortingen en maandprijs_netto
  let totaalKorting = 0
  const kortingBedragen: { kortingsTypeId: string; bedrag: number }[] = []

  for (const kortingId of kortingIds) {
    const result = await berekenKorting(kortingId, maandprijsBruto)
    if (result.bedrag !== undefined) {
      totaalKorting += result.bedrag
      kortingBedragen.push({ kortingsTypeId: kortingId, bedrag: result.bedrag })
    }
  }

  const maandprijsNetto = Math.round((maandprijsBruto - totaalKorting) * 100) / 100

  // 7. Bereken gemiddelde uren per dag voor backward compat
  const urenPerDag = zorgdagen.length > 0
    ? Math.round((maandprijsBruto / uurtarief / (52 / 12)) / zorgdagen.length * 100) / 100
    : 8

  // 8. Insert contract
  const { data: nieuwContract, error } = await supabase
    .from('contracten')
    .insert({
      kind_id:          kindId,
      locatie_id:       locatieId,
      contract_type_id: contractTypeId,
      opvangtype:       contractType.opvangtype,
      contracttype:     'vast', // backward compat default
      status:           'concept',
      zorgdagen,
      dagdelen,
      uren_per_dag:     urenPerDag,
      uurtarief,
      maandprijs:       maandprijsBruto, // backward compat
      maandprijs_bruto: maandprijsBruto,
      maandprijs_netto: maandprijsNetto,
      startdatum,
      einddatum,
      notities,
      flexpool:         false,
    })
    .select('id')
    .single()

  if (error) return { error: error.message }

  // 9. Insert kind_contract_kortingen
  if (kortingBedragen.length > 0 && nieuwContract) {
    for (const kb of kortingBedragen) {
      await supabase.from('kind_contract_kortingen').insert({
        kind_contract_id: nieuwContract.id,
        kortings_type_id: kb.kortingsTypeId,
        startdatum,
        berekend_bedrag:  kb.bedrag,
      })
    }
  }

  // 10. Placement aanmaken als groep geselecteerd
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

// ─── Legacy contract aanmaken (backward compat) ─────────────────────────────

export async function contractAanmakenLegacy(kindId: string, formData: FormData) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any

  const zorgdagen  = formData.getAll('zorgdagen').map(Number)
  const groepId    = (formData.get('groep_id') as string) || null
  const startdatum = formData.get('startdatum') as string
  const einddatum  = (formData.get('einddatum') as string) || null

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

  // Contract ophalen voor facturatie-event payload
  const { data: contract } = await supabase
    .from('contracten')
    .select('*, kinderen(organisatie_id)')
    .eq('id', contractId)
    .single()

  if (!contract) return { error: 'Contract niet gevonden' }

  // Status naar actief
  const { error: updateError } = await supabase.from('contracten')
    .update({ status: 'actief' })
    .eq('id', contractId)

  if (updateError) return { error: updateError.message }

  // Genereer planning
  await genereerPlanning(contractId)

  // Facturatie-event loggen
  const organisatieId = contract.kinderen?.organisatie_id
  if (organisatieId) {
    // Haal kortingen op
    const { data: kortingen } = await supabase
      .from('kind_contract_kortingen')
      .select('kortings_type_id, berekend_bedrag, kortings_typen(naam)')
      .eq('kind_contract_id', contractId)

    const payload = {
      kind_id:                kindId,
      contract_id:            contractId,
      contract_type_id:       contract.contract_type_id,
      merk_id:                null as string | null,
      startdatum:             contract.startdatum,
      einddatum:              contract.einddatum,
      zorgdagen:              contract.zorgdagen,
      dagdelen:               contract.dagdelen,
      uurtarief:              contract.uurtarief,
      uren_per_dag:           contract.uren_per_dag,
      maandprijs_bruto:       contract.maandprijs_bruto,
      maandprijs_netto:       contract.maandprijs_netto,
      kortingen:              kortingen ?? [],
    }

    // Resolve merk als contract_type_id beschikbaar is
    if (contract.contract_type_id) {
      const merkResult = await getMerkVoorLocatie(contract.locatie_id)
      if (merkResult.data) payload.merk_id = merkResult.data.merkId
    }

    const { error: eventError } = await supabase.from('contract_events').insert({
      organisatie_id: organisatieId,
      contract_id:    contractId,
      event_type:     'geactiveerd',
      payload,
    })

    if (eventError) {
      // Rollback: zet status naar facturatie_fout
      await supabase.from('contracten')
        .update({ status: 'facturatie_fout' })
        .eq('id', contractId)
      return { error: 'Facturatie-event mislukt: ' + eventError.message }
    }
  }

  revalidatePath(`/dashboard/kinderen/${kindId}`)
  return { success: true }
}

// ─── Contractwijziging doorvoeren ─────────────────────────────────────────────

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

  const ingangsdatum   = formData.get('startdatum') as string
  const zorgdagen      = formData.getAll('zorgdagen').map(Number)
  const contractTypeId = (formData.get('contract_type_id') as string) || oud.contract_type_id
  const locatieId      = (formData.get('locatie_id') as string) || oud.locatie_id
  const groepId        = (formData.get('groep_id') as string) || null
  const einddatum      = (formData.get('einddatum') as string) || null
  const notities       = (formData.get('notities') as string) || null
  const kortingIds     = formData.getAll('korting_ids') as string[]

  // Parse dagdelen
  const dagdelen: Record<string, string> = {}
  for (const dag of zorgdagen.length > 0 ? zorgdagen : (oud.zorgdagen as number[])) {
    const dagdeel = formData.get(`dagdeel_${dag}`) as string
    if (dagdeel) dagdelen[String(dag)] = dagdeel
  }
  const effectieveDagdelen = Object.keys(dagdelen).length > 0 ? dagdelen : (oud.dagdelen ?? {})

  // Oud contract beëindigen per dag vóór ingangsdatum
  const dag_voor = new Date(ingangsdatum)
  dag_voor.setDate(dag_voor.getDate() - 1)
  const einddatum_oud = dag_voor.toISOString().slice(0, 10)

  await supabase.from('contracten')
    .update({ status: 'beëindigd', einddatum: einddatum_oud })
    .eq('id', oudContractId)

  // Sluit openstaande placements van het oude contract af
  await supabase
    .from('placements')
    .update({ einddatum: einddatum_oud })
    .eq('contract_id', oudContractId)
    .is('einddatum', null)

  // Sluit kind_contract_kortingen van oud contract af
  await supabase
    .from('kind_contract_kortingen')
    .update({ einddatum: einddatum_oud })
    .eq('kind_contract_id', oudContractId)
    .is('einddatum', null)

  // Tarieven opnieuw resolven
  let uurtarief = oud.uurtarief as number
  let maandprijsBruto = oud.maandprijs_bruto as number ?? oud.maandprijs as number ?? 0
  let maandprijsNetto = oud.maandprijs_netto as number ?? maandprijsBruto

  if (contractTypeId) {
    const merkResult = await getMerkVoorLocatie(locatieId)
    if (merkResult.data) {
      const tariefResult = await getTariefVoorContract(contractTypeId, merkResult.data.merkId, ingangsdatum)
      if (tariefResult.data) {
        uurtarief = tariefResult.data.uurtarief as number
      }

      // Dagdeel configs ophalen en herberekenen
      const dagdeelResult = await getDagdeelConfiguraties(locatieId, groepId ?? undefined)
      const dagdeelConfigs = dagdeelResult.data ?? []
      maandprijsBruto = berekenMaandprijsBruto(effectieveDagdelen, dagdeelConfigs, uurtarief)

      // Kortingen herberekenen
      let totaalKorting = 0
      const kortingBedragen: { kortingsTypeId: string; bedrag: number }[] = []

      for (const kortingId of kortingIds) {
        const result = await berekenKorting(kortingId, maandprijsBruto)
        if (result.bedrag !== undefined) {
          totaalKorting += result.bedrag
          kortingBedragen.push({ kortingsTypeId: kortingId, bedrag: result.bedrag })
        }
      }
      maandprijsNetto = Math.round((maandprijsBruto - totaalKorting) * 100) / 100

      // Nieuw contract aanmaken
      const effectieveZorgdagen = zorgdagen.length > 0 ? zorgdagen : oud.zorgdagen
      const urenPerDag = effectieveZorgdagen.length > 0
        ? Math.round((maandprijsBruto / uurtarief / (52 / 12)) / effectieveZorgdagen.length * 100) / 100
        : oud.uren_per_dag

      const { data: nieuwContract, error } = await supabase
        .from('contracten')
        .insert({
          kind_id:            kindId,
          locatie_id:         locatieId,
          contract_type_id:   contractTypeId,
          opvangtype:         oud.opvangtype,
          contracttype:       oud.contracttype,
          status:             'concept',
          zorgdagen:          effectieveZorgdagen,
          dagdelen:           effectieveDagdelen,
          uren_per_dag:       urenPerDag,
          uurtarief,
          maandprijs:         maandprijsBruto,
          maandprijs_bruto:   maandprijsBruto,
          maandprijs_netto:   maandprijsNetto,
          startdatum:         ingangsdatum,
          einddatum,
          notities,
          vorige_contract_id: oudContractId,
          flexpool:           oud.flexpool,
        })
        .select('id')
        .single()

      if (error) return { error: error.message }

      // Kortingen overnemen
      if (kortingBedragen.length > 0 && nieuwContract) {
        for (const kb of kortingBedragen) {
          await supabase.from('kind_contract_kortingen').insert({
            kind_contract_id: nieuwContract.id,
            kortings_type_id: kb.kortingsTypeId,
            startdatum:       ingangsdatum,
            berekend_bedrag:  kb.bedrag,
          })
        }
      }

      // Placement aanmaken
      if (groepId && nieuwContract) {
        const { data: kind } = await supabase
          .from('kinderen')
          .select('organisatie_id')
          .eq('id', kindId)
          .single()

        if (kind) {
          await supabase.from('placements').insert({
            organisatie_id: kind.organisatie_id,
            kind_id:        kindId,
            contract_id:    nieuwContract.id,
            groep_id:       groepId,
            startdatum:     ingangsdatum,
            einddatum,
          })
        }
      }

      if (nieuwContract) {
        await genereerPlanning(nieuwContract.id, { futureOnly: true })
      }

      revalidatePath(`/dashboard/kinderen/${kindId}`)
      return { success: true }
    }
  }

  // Fallback: legacy-achtige wijziging als geen contract_type_id
  const { data: nieuwContract, error } = await supabase
    .from('contracten')
    .insert({
      kind_id:            kindId,
      locatie_id:         locatieId,
      opvangtype:         (formData.get('opvangtype') as string) || oud.opvangtype,
      contracttype:       (formData.get('contracttype') as string) || oud.contracttype,
      status:             'concept',
      zorgdagen:          zorgdagen.length > 0 ? zorgdagen : oud.zorgdagen,
      uren_per_dag:       parseFloat(formData.get('uren_per_dag') as string) || oud.uren_per_dag,
      uurtarief:          parseFloat(formData.get('uurtarief') as string) || oud.uurtarief || null,
      maandprijs:         parseFloat(formData.get('maandprijs') as string) || oud.maandprijs || null,
      startdatum:         ingangsdatum,
      einddatum,
      notities,
      vorige_contract_id: oudContractId,
      flexpool:           oud.flexpool,
    })
    .select('id')
    .single()

  if (error) return { error: error.message }

  if (groepId && nieuwContract) {
    const { data: kind } = await supabase
      .from('kinderen')
      .select('organisatie_id')
      .eq('id', kindId)
      .single()

    if (kind) {
      await supabase.from('placements').insert({
        organisatie_id: kind.organisatie_id,
        kind_id:        kindId,
        contract_id:    nieuwContract.id,
        groep_id:       groepId,
        startdatum:     ingangsdatum,
        einddatum,
      })
    }
  }

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

  // Contract ophalen voor event
  const { data: contract } = await supabase
    .from('contracten')
    .select('*, kinderen(organisatie_id)')
    .eq('id', contractId)
    .single()

  await supabase.from('contracten')
    .update({ status: 'beëindigd', einddatum })
    .eq('id', contractId)

  // Sluit openstaande placements af
  await supabase
    .from('placements')
    .update({ einddatum })
    .eq('contract_id', contractId)
    .is('einddatum', null)

  // Sluit kind_contract_kortingen af
  await supabase
    .from('kind_contract_kortingen')
    .update({ einddatum })
    .eq('kind_contract_id', contractId)
    .is('einddatum', null)

  // Verwijder toekomstige planningsrijen na de einddatum
  await supabase
    .from('planned_attendance')
    .delete()
    .eq('contract_id', contractId)
    .eq('bron', 'contract')
    .gt('datum', einddatum)

  // Beëindiging-event loggen
  const organisatieId = contract?.kinderen?.organisatie_id
  if (organisatieId) {
    await supabase.from('contract_events').insert({
      organisatie_id: organisatieId,
      contract_id:    contractId,
      event_type:     'beeindigd',
      payload: {
        kind_id:    kindId,
        einddatum,
        reden:      'handmatig_beeindigd',
      },
    })
  }

  revalidatePath(`/dashboard/kinderen/${kindId}`)
  return { success: true }
}
