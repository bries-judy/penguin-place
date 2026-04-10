'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function aanbodDoen(formData: FormData) {
  const supabase = await createClient()

  const wachtlijst_id = formData.get('wachtlijst_id') as string
  const locatie_id    = formData.get('locatie_id') as string
  const groep_id      = formData.get('groep_id') as string | null
  const verloopdatum  = formData.get('verloopdatum') as string | null
  const notities      = formData.get('notities') as string | null

  const { data: { user } } = await supabase.auth.getUser()

  // Aanbieding aanmaken
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: aanbiedingError } = await (supabase as any)
    .from('aanbiedingen')
    .insert({
      wachtlijst_id,
      locatie_id,
      groep_id:        groep_id || null,
      verloopdatum:    verloopdatum ? new Date(verloopdatum).toISOString() : null,
      notities:        notities || null,
      aangemaakt_door: user?.id ?? null,
    })

  if (aanbiedingError) {
    return { error: (aanbiedingError as { message: string }).message }
  }

  // Wachtlijststatus naar 'aangeboden'
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: updateError } = await (supabase as any)
    .from('wachtlijst')
    .update({ status: 'aangeboden' })
    .eq('id', wachtlijst_id)

  if (updateError) {
    return { error: (updateError as { message: string }).message }
  }

  revalidatePath('/dashboard/wachtlijst')
  return { success: true }
}

export async function aanbodVerwerken(formData: FormData) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = await createClient() as any

  const aanbieding_id   = formData.get('aanbieding_id') as string
  const wachtlijst_id   = formData.get('wachtlijst_id') as string
  const nieuweStatus    = formData.get('status') as 'geaccepteerd' | 'geweigerd'

  // Aanbieding updaten
  await supabase
    .from('aanbiedingen')
    .update({ status: nieuweStatus })
    .eq('id', aanbieding_id)

  // Wachtlijststatus bijwerken
  const wachtlijstStatus = nieuweStatus === 'geaccepteerd' ? 'geplaatst' : 'wachtend'
  await supabase
    .from('wachtlijst')
    .update({ status: wachtlijstStatus })
    .eq('id', wachtlijst_id)

  revalidatePath('/dashboard/wachtlijst')
  return { success: true }
}

export async function wachtlijstAnnuleren(wachtlijst_id: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = await createClient() as any

  await supabase
    .from('wachtlijst')
    .update({ status: 'geannuleerd' })
    .eq('id', wachtlijst_id)

  revalidatePath('/dashboard/wachtlijst')
  return { success: true }
}
