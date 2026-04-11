'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// ─── Tijdberekening ───────────────────────────────────────────────────────────
// Berekent eindtijd op basis van een starttijd (HH:MM) en uren per dag.
// Voorbeeld: berekenEindtijd('08:00', 8.5) → '16:30'

function berekenEindtijd(starttijd: string, urenPerDag: number): string {
  const [h, m]       = starttijd.split(':').map(Number)
  const totalMinuten = h * 60 + m + Math.round(urenPerDag * 60)
  const eindH        = Math.floor(totalMinuten / 60) % 24
  const eindM        = totalMinuten % 60
  return `${String(eindH).padStart(2, '0')}:${String(eindM).padStart(2, '0')}`
}

// ─── Generator aanroepen ──────────────────────────────────────────────────────
// Roept de SQL-functie generate_planned_attendance() aan voor één contract.
// Retourneert het aantal verwerkte rijen.
//
// futureOnly = true  → verleden niet overschrijven (gebruik bij contractwijziging)
// allowPast  = true  → volledig herberekenen inclusief verleden (backfill)

export async function genereerPlanning(
  contractId: string,
  opties?: { futureOnly?: boolean; allowPast?: boolean }
): Promise<{ aantalRijen?: number; error?: string }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any

  const { data, error } = await supabase.rpc('generate_planned_attendance', {
    p_contract_id: contractId,
    p_future_only: opties?.futureOnly ?? false,
    p_allow_past:  opties?.allowPast  ?? false,
  })

  if (error) return { error: error.message }

  revalidatePath('/dashboard/kindplanning')
  return { aantalRijen: data as number }
}

// ─── Goedgekeurde flex_dag verwerken ─────────────────────────────────────────
// Voegt een planned_attendance rij toe met bron 'flex_override' nadat een
// flex_dag is goedgekeurd.
//
// Strategie:
//   - UPSERT met bron 'flex_override' op (contract_id, datum)
//   - Overschrijft een eventuele bestaande 'contract' rij voor die dag —
//     goedgekeurde flex dag heeft prioriteit
//   - Groep_id afkomstig uit flex_dag (kan afwijken van vaste placement groep)
//   - Start/eindtijd berekend uit contracten.uren_per_dag met vaste start 08:00
//
// Opmerking: aanroepen vanuit beoordeelFlexAanvraag() in kindplanning.ts

export async function verwerkGoedgekeurdeFlexDag(
  flexDagId: string
): Promise<{ success?: boolean; error?: string }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any

  // Haal flex_dag op
  const { data: flexDag, error: flexErr } = await supabase
    .from('flex_dagen')
    .select('contract_id, groep_id, datum')
    .eq('id', flexDagId)
    .eq('status', 'goedgekeurd')
    .single()

  if (flexErr || !flexDag) {
    return { error: flexErr?.message ?? 'Flex dag niet gevonden of niet goedgekeurd' }
  }

  // Haal contractgegevens op voor uren_per_dag en kind_id
  const { data: contract, error: contractErr } = await supabase
    .from('contracten')
    .select('kind_id, uren_per_dag')
    .eq('id', flexDag.contract_id)
    .single()

  if (contractErr || !contract) {
    return { error: contractErr?.message ?? 'Contract niet gevonden' }
  }

  // Haal organisatie_id op via kind
  const { data: kind, error: kindErr } = await supabase
    .from('kinderen')
    .select('organisatie_id')
    .eq('id', contract.kind_id)
    .single()

  if (kindErr || !kind) {
    return { error: kindErr?.message ?? 'Kind niet gevonden' }
  }

  // Zoek actieve placement voor dit contract op de flex_dag datum
  const { data: placement, error: placementErr } = await supabase
    .from('placements')
    .select('id')
    .eq('contract_id', flexDag.contract_id)
    .lte('startdatum', flexDag.datum)
    .or(`einddatum.is.null,einddatum.gte.${flexDag.datum}`)
    .limit(1)
    .single()

  if (placementErr || !placement) {
    // Flex kinderen in de flexpool hebben mogelijk geen vaste placement.
    // In dat geval sla deze stap over — de flex_dag is zichtbaar via
    // flex_dagen.status maar leidt niet tot een planned_attendance rij.
    // Dit is acceptabel: zonder placement is er geen groep om aan te koppelen.
    return {
      error: `Geen actieve placement gevonden voor contract ${flexDag.contract_id} `
           + `op datum ${flexDag.datum}. Planned attendance niet aangemaakt.`,
    }
  }

  const starttijd = '08:00'
  const eindtijd  = berekenEindtijd(starttijd, contract.uren_per_dag)

  const { error: upsertErr } = await supabase
    .from('planned_attendance')
    .upsert(
      {
        organisatie_id: kind.organisatie_id,
        kind_id:        contract.kind_id,
        contract_id:    flexDag.contract_id,
        placement_id:   placement.id,
        groep_id:       flexDag.groep_id,
        datum:          flexDag.datum,
        starttijd,
        eindtijd,
        bron:           'flex_override',
      },
      { onConflict: 'contract_id,datum' }
    )

  if (upsertErr) return { error: upsertErr.message }

  revalidatePath('/dashboard/kindplanning')
  return { success: true }
}

// ─── Geannuleerde/geweigerde flex_dag terugdraaien ────────────────────────────
// Verwijdert de 'flex_override' planned_attendance rij wanneer een flex_dag
// wordt geweigerd of geannuleerd. De volgende generatorrun herstelt eventueel
// een 'contract' rij voor die dag (als het een vaste dag was).

export async function verwijderFlexOverride(
  contractId: string,
  datum: string
): Promise<{ success?: boolean; error?: string }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any

  const { error } = await supabase
    .from('planned_attendance')
    .delete()
    .eq('contract_id', contractId)
    .eq('datum', datum)
    .eq('bron', 'flex_override')

  if (error) return { error: error.message }

  revalidatePath('/dashboard/kindplanning')
  return { success: true }
}
