'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { verwerkGoedgekeurdeFlexDag, verwijderFlexOverride } from './plannedAttendance'

export async function beoordeelFlexAanvraag(
  flexDagId: string,
  status: 'goedgekeurd' | 'geweigerd',
  redenWeiger?: string
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Niet ingelogd' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateData: Record<string, any> = {
    status,
    beoordeeld_door: user.id,
    beoordeeld_op: new Date().toISOString(),
  }
  if (status === 'geweigerd' && redenWeiger) {
    updateData.reden_weiger = redenWeiger
  }

  // Haal contract_id en datum op vóór de status update (nodig voor planned_attendance)
  const { data: flexDag, error: fetchErr } = await supabase
    .from('flex_dagen')
    .select('contract_id, datum')
    .eq('id', flexDagId)
    .single()

  if (fetchErr || !flexDag) return { error: fetchErr?.message ?? 'Flex dag niet gevonden' }

  const { error } = await supabase
    .from('flex_dagen')
    .update(updateData)
    .eq('id', flexDagId)

  if (error) return { error: error.message }

  // Synchroniseer planned_attendance op basis van het oordeel
  if (status === 'goedgekeurd') {
    // Voeg flex_override rij toe (of overschrijf bestaande contract rij)
    await verwerkGoedgekeurdeFlexDag(flexDagId)
  } else {
    // Verwijder eventuele flex_override rij; de generator herstelt
    // de vaste planningsrij bij de volgende aanroep indien van toepassing
    await verwijderFlexOverride(flexDag.contract_id, flexDag.datum)
  }

  revalidatePath('/dashboard/kindplanning')
  return { success: true }
}

// ─── Capaciteit override aanmaken ─────────────────────────────────────────────

export async function capaciteitOverrideAanmaken(formData: FormData) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Niet ingelogd' }

  const { error } = await supabase.from('capaciteit_overrides').insert({
    groep_id:       formData.get('groep_id') as string,
    max_capaciteit: parseInt(formData.get('max_capaciteit') as string),
    start_datum:    formData.get('start_datum') as string,
    eind_datum:     formData.get('eind_datum') as string,
    reden:          (formData.get('reden') as string) || null,
    aangemaakt_door: user.id,
  })

  if (error) return { error: error.message }

  revalidatePath('/dashboard/kindplanning')
  return { success: true }
}

// ─── Capaciteit override verwijderen ─────────────────────────────────────────

export async function capaciteitOverrideVerwijderen(id: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any

  const { error } = await supabase
    .from('capaciteit_overrides')
    .delete()
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/kindplanning')
  return { success: true }
}
