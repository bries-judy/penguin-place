'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// ─── Groepsoverdracht plannen ─────────────────────────────────────────────────

export async function groepsoverdrachtPlannen(formData: FormData) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Niet ingelogd' }

  const { error } = await supabase.from('groepsoverdrachten').insert({
    kind_id:          formData.get('kind_id') as string,
    van_groep_id:     formData.get('van_groep_id') as string,
    naar_groep_id:    formData.get('naar_groep_id') as string,
    overdrachtsdatum: formData.get('overdrachtsdatum') as string,
    uitgevoerd:       false,
    aangemaakt_door:  user.id,
  })

  if (error) return { error: error.message }

  revalidatePath('/dashboard/kindplanning')
  return { success: true }
}

// ─── Groepsoverdracht uitvoeren ───────────────────────────────────────────────

export async function groepsoverdrachtUitvoeren(id: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any

  const { error } = await supabase
    .from('groepsoverdrachten')
    .update({ uitgevoerd: true })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/kindplanning')
  return { success: true }
}
