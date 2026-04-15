'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// ─── Dagverslagen ────────────────────────────────────────────────────────────

export async function dagverslagAanmaken(formData: FormData): Promise<{ error?: string; id?: string }> {
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

  const kind_id = formData.get('kind_id') as string
  const groep_id = formData.get('groep_id') as string
  const datum = formData.get('datum') as string

  if (!kind_id || !groep_id || !datum) {
    return { error: 'Kind, groep en datum zijn verplicht' }
  }

  const { data: dagverslag, error } = await supabase
    .from('dagverslagen')
    .insert({
      organisatie_id: profile.organisatie_id,
      kind_id,
      groep_id,
      datum,
      activiteiten:   (formData.get('activiteiten') as string) || null,
      eten_drinken:    (formData.get('eten_drinken') as string) || null,
      slaaptijden:     (formData.get('slaaptijden') as string) || null,
      stemming:        (formData.get('stemming') as string) || null,
      bijzonderheden:  (formData.get('bijzonderheden') as string) || null,
      auteur_id:       user.id,
      gepubliceerd:    false,
    })
    .select('id')
    .single()

  if (error || !dagverslag) {
    if (error?.code === '23505') {
      return { error: 'Er bestaat al een dagverslag voor dit kind op deze datum' }
    }
    if (error?.code === '42501' || error?.message?.includes('row-level security')) {
      return { error: 'Je hebt geen rechten om dagverslagen aan te maken' }
    }
    return { error: error?.message ?? 'Onbekende fout bij het aanmaken van het dagverslag' }
  }

  // Upload media-bestanden als die zijn meegegeven
  const bestanden = formData.getAll('bestanden') as File[]
  if (bestanden.length > 0) {
    for (let i = 0; i < bestanden.length; i++) {
      const bestand = bestanden[i]
      if (!bestand || bestand.size === 0) continue

      const ext = bestand.name.split('.').pop() || 'jpg'
      const uuid = crypto.randomUUID()
      const storagePath = `${profile.organisatie_id}/${kind_id}/${dagverslag.id}/${uuid}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('media')
        .upload(storagePath, bestand, {
          contentType: bestand.type,
          upsert: false,
        })

      if (uploadError) {
        console.error('Upload fout:', uploadError.message)
        continue
      }

      await supabase
        .from('dagverslag_media')
        .insert({
          dagverslag_id:   dagverslag.id,
          storage_path:    storagePath,
          bestandsnaam:    bestand.name,
          mime_type:       bestand.type,
          bestandsgrootte: bestand.size,
          volgorde:        i,
          uploaded_by:     user.id,
        })
    }
  }

  revalidatePath('/dashboard/kinderen')
  return { id: dagverslag.id }
}

export async function dagverslagBijwerken(
  id: string,
  formData: FormData
): Promise<{ error?: string }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Niet ingelogd' }

  const { error } = await supabase
    .from('dagverslagen')
    .update({
      activiteiten:   (formData.get('activiteiten') as string) || null,
      eten_drinken:    (formData.get('eten_drinken') as string) || null,
      slaaptijden:     (formData.get('slaaptijden') as string) || null,
      stemming:        (formData.get('stemming') as string) || null,
      bijzonderheden:  (formData.get('bijzonderheden') as string) || null,
    })
    .eq('id', id)

  if (error) {
    if (error.code === '42501' || error.message?.includes('row-level security')) {
      return { error: 'Je hebt geen rechten om dit dagverslag te bewerken' }
    }
    return { error: error.message }
  }

  revalidatePath('/dashboard/kinderen')
  return {}
}

export async function dagverslagPubliceren(id: string): Promise<{ error?: string }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Niet ingelogd' }

  const { error } = await supabase
    .from('dagverslagen')
    .update({
      gepubliceerd: true,
      gepubliceerd_op: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) {
    if (error.code === '42501' || error.message?.includes('row-level security')) {
      return { error: 'Je hebt geen rechten om dit dagverslag te publiceren' }
    }
    return { error: error.message }
  }

  revalidatePath('/dashboard/kinderen')
  return {}
}

export async function dagverslagVerwijderen(id: string): Promise<{ error?: string }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Niet ingelogd' }

  // Soft delete
  const { error } = await supabase
    .from('dagverslagen')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/dashboard/kinderen')
  return {}
}
