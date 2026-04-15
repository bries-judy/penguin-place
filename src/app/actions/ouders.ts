'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

// ─── Ouders ──────────────────────────────────────────────────────────────────

/**
 * Maakt een ouder-account aan via Supabase Auth admin API
 * en koppelt de ouder aan een of meerdere kinderen.
 *
 * Vereist: SUPABASE_SERVICE_ROLE_KEY in .env.local
 */
export async function ouderUitnodigen(formData: FormData): Promise<{ error?: string; id?: string }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any

  // Auth check: alleen staff mag ouders uitnodigen
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Niet ingelogd' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('organisatie_id')
    .eq('id', user.id)
    .single()
  if (!profile?.organisatie_id) return { error: 'Geen organisatie gevonden' }

  const email = formData.get('email') as string
  const voornaam = formData.get('voornaam') as string
  const achternaam = formData.get('achternaam') as string
  const kind_ids = formData.getAll('kind_id') as string[]
  const relatie = (formData.get('relatie') as string) || 'ouder1'

  if (!email || !voornaam || !achternaam) {
    return { error: 'E-mail, voornaam en achternaam zijn verplicht' }
  }
  if (kind_ids.length === 0) {
    return { error: 'Selecteer minimaal één kind' }
  }

  // Admin client voor het aanmaken van auth users
  const admin = createAdminClient()

  // Maak ouder-account aan via auth.admin
  const { data: authUser, error: authError } = await admin.auth.admin.createUser({
    email,
    email_confirm: false, // ouder ontvangt bevestigingsmail
    app_metadata: {
      user_type: 'ouder',
      organisatie_id: profile.organisatie_id,
    },
    user_metadata: {
      voornaam,
      achternaam,
    },
  })

  if (authError || !authUser.user) {
    if (authError?.message?.includes('already been registered')) {
      return { error: 'Er bestaat al een account met dit e-mailadres' }
    }
    return { error: authError?.message ?? 'Fout bij het aanmaken van het ouder-account' }
  }

  // handle_new_user() trigger heeft automatisch een ouder_profielen rij aangemaakt.
  // Nu de ouder-kind koppelingen maken.
  for (const kind_id of kind_ids) {
    const { error: koppelingError } = await supabase
      .from('ouder_kind')
      .insert({
        ouder_id: authUser.user.id,
        kind_id,
        relatie,
      })

    if (koppelingError) {
      console.error('Koppeling fout:', koppelingError.message)
    }
  }

  // Stuur wachtwoord-reset mail zodat ouder een wachtwoord kan instellen
  await admin.auth.admin.generateLink({
    type: 'recovery',
    email,
  })

  revalidatePath('/dashboard/kinderen')
  return { id: authUser.user.id }
}

/**
 * Koppelt een bestaande ouder aan een extra kind.
 */
export async function ouderKindKoppelen(formData: FormData): Promise<{ error?: string }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Niet ingelogd' }

  const ouder_id = formData.get('ouder_id') as string
  const kind_id = formData.get('kind_id') as string
  const relatie = (formData.get('relatie') as string) || 'ouder1'

  if (!ouder_id || !kind_id) {
    return { error: 'Ouder en kind zijn verplicht' }
  }

  const { error } = await supabase
    .from('ouder_kind')
    .insert({ ouder_id, kind_id, relatie })

  if (error) {
    if (error.code === '23505') {
      return { error: 'Deze ouder is al gekoppeld aan dit kind' }
    }
    if (error.code === '42501' || error.message?.includes('row-level security')) {
      return { error: 'Je hebt geen rechten om ouder-kind koppelingen te beheren' }
    }
    return { error: error.message }
  }

  revalidatePath('/dashboard/kinderen')
  return {}
}
