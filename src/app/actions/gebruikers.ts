'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { Rol, RolNaam, ProfielMetRollenEnLocaties } from '@/types/rollen'

// ─── Helper: auth + organisatie ──────────────────────────────────────────────

async function getAuthContext() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Niet ingelogd' as const, supabase: null, user: null, organisatieId: null }

  const { data: profiel } = await supabase
    .from('profiles')
    .select('organisatie_id')
    .eq('id', user.id)
    .single()

  if (!profiel?.organisatie_id) return { error: 'Geen organisatie gevonden' as const, supabase: null, user: null, organisatieId: null }

  return { error: null, supabase, user, organisatieId: profiel.organisatie_id as string }
}

async function heeftRol(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  rollen: string[]
): Promise<boolean> {
  const { data } = await supabase
    .from('user_roles')
    .select('id')
    .in('role', rollen)
    .maybeSingle()
  return !!data
}

// ─── getGebruikers ────────────────────────────────────────────────────────────

export async function getGebruikers(): Promise<ProfielMetRollenEnLocaties[]> {
  const { error, supabase, organisatieId } = await getAuthContext()
  if (error || !supabase) return []

  if (!(await heeftRol(supabase, ['beheerder', 'directie']))) return []

  // Profielen voor deze organisatie
  const { data: profielen } = await supabase
    .from('profiles')
    .select('id, naam, email')
    .eq('organisatie_id', organisatieId)
    .eq('actief', true)
    .order('naam')

  if (!profielen?.length) return []

  const profielIds = profielen.map((p: { id: string }) => p.id)

  // Rollen en locaties parallel ophalen
  const [{ data: profielRollen }, { data: profielLocaties }] = await Promise.all([
    supabase
      .from('profiel_rollen')
      .select('profiel_id, rol_naam')
      .in('profiel_id', profielIds)
      .eq('organisatie_id', organisatieId)
      .is('deleted_at', null),
    supabase
      .from('profiel_locaties')
      .select('profiel_id, locatie_id, locaties(naam)')
      .in('profiel_id', profielIds)
      .eq('organisatie_id', organisatieId)
      .is('deleted_at', null),
  ])

  return profielen.map((p: { id: string; naam: string; email: string }) => {
    const rollen = (profielRollen ?? [])
      .filter((r: { profiel_id: string }) => r.profiel_id === p.id)
      .map((r: { rol_naam: RolNaam }) => r.rol_naam)

    const locaties = (profielLocaties ?? [])
      .filter((l: { profiel_id: string }) => l.profiel_id === p.id)

    return {
      id:            p.id,
      naam:          p.naam,
      email:         p.email,
      rol_namen:     rollen as RolNaam[],
      locatie_ids:   locaties.map((l: { locatie_id: string }) => l.locatie_id),
      locatie_namen: locaties.map((l: { locaties: { naam: string } | null }) => l.locaties?.naam ?? ''),
    }
  })
}

// ─── getGebruiker ─────────────────────────────────────────────────────────────

export async function getGebruiker(profielId: string): Promise<
  (ProfielMetRollenEnLocaties & { alle_rollen: Rol[]; alle_locaties: { id: string; naam: string }[] }) | { error: string }
> {
  const { error, supabase, organisatieId } = await getAuthContext()
  if (error || !supabase) return { error: error ?? 'Onbekende fout' }

  if (!(await heeftRol(supabase, ['beheerder', 'directie']))) return { error: 'Onvoldoende rechten' }

  const [
    { data: profiel, error: profielError },
    { data: profielRollen },
    { data: profielLocaties },
    { data: alleRollen },
    { data: alleLocaties },
  ] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, naam, email')
      .eq('id', profielId)
      .eq('organisatie_id', organisatieId)
      .single(),
    supabase
      .from('profiel_rollen')
      .select('rol_naam')
      .eq('profiel_id', profielId)
      .eq('organisatie_id', organisatieId)
      .is('deleted_at', null),
    supabase
      .from('profiel_locaties')
      .select('locatie_id, locaties(naam)')
      .eq('profiel_id', profielId)
      .eq('organisatie_id', organisatieId)
      .is('deleted_at', null),
    supabase
      .from('rollen')
      .select('*')
      .eq('organisatie_id', organisatieId)
      .is('deleted_at', null)
      .order('naam'),
    supabase
      .from('locaties')
      .select('id, naam')
      .eq('organisatie_id', organisatieId)
      .is('deleted_at', null)
      .order('naam'),
  ])

  if (profielError || !profiel) return { error: 'Gebruiker niet gevonden' }

  const locaties = (profielLocaties ?? [])

  return {
    id:            profiel.id,
    naam:          profiel.naam,
    email:         profiel.email,
    rol_namen:     (profielRollen ?? []).map((r: { rol_naam: RolNaam }) => r.rol_naam),
    locatie_ids:   locaties.map((l: { locatie_id: string }) => l.locatie_id),
    locatie_namen: locaties.map((l: { locaties: { naam: string } | null }) => l.locaties?.naam ?? ''),
    alle_rollen:   (alleRollen ?? []) as Rol[],
    alle_locaties: (alleLocaties ?? []) as { id: string; naam: string }[],
  }
}

// ─── updateProfielRollen ──────────────────────────────────────────────────────

export async function updateProfielRollen(
  profielId: string,
  rolNamen: RolNaam[]
): Promise<{ success: boolean; error?: string }> {
  const { error, supabase, organisatieId } = await getAuthContext()
  if (error || !supabase) return { success: false, error: error ?? 'Onbekende fout' }

  if (!(await heeftRol(supabase, ['beheerder']))) return { success: false, error: 'Onvoldoende rechten' }

  // Verificeer dat het profiel bij de organisatie hoort
  const { data: profiel } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', profielId)
    .eq('organisatie_id', organisatieId)
    .single()

  if (!profiel) return { success: false, error: 'Gebruiker niet gevonden' }

  // Soft delete huidige profiel_rollen
  const { error: deleteError } = await supabase
    .from('profiel_rollen')
    .update({ deleted_at: new Date().toISOString() })
    .eq('profiel_id', profielId)
    .eq('organisatie_id', organisatieId)
    .is('deleted_at', null)

  if (deleteError) return { success: false, error: deleteError.message }

  // Insert nieuwe profiel_rollen
  if (rolNamen.length > 0) {
    const nieuweRollen = rolNamen.map((naam) => ({
      profiel_id:     profielId,
      rol_naam:       naam,
      organisatie_id: organisatieId,
    }))

    const { error: insertError } = await supabase
      .from('profiel_rollen')
      .insert(nieuweRollen)

    if (insertError) return { success: false, error: insertError.message }
  }

  // Sync naar user_roles (bestaand systeem voor RLS has_role())
  await supabase
    .from('user_roles')
    .delete()
    .eq('user_id', profielId)

  if (rolNamen.length > 0) {
    // Filter op geldige app_role enum waarden
    const geldigeAppRollen: RolNaam[] = [
      'klantadviseur', 'vestigingsmanager', 'personeelsplanner',
      'regiomanager', 'directie', 'beheerder',
    ]
    const syncRollen = rolNamen
      .filter((naam) => geldigeAppRollen.includes(naam))
      .map((naam) => ({ user_id: profielId, role: naam }))

    if (syncRollen.length > 0) {
      await supabase.from('user_roles').insert(syncRollen)
    }
  }

  revalidatePath('/dashboard/gebruikers')
  return { success: true }
}

// ─── updateProfielLocaties ────────────────────────────────────────────────────

export async function updateProfielLocaties(
  profielId: string,
  locatieIds: string[]
): Promise<{ success: boolean; error?: string }> {
  const { error, supabase, organisatieId } = await getAuthContext()
  if (error || !supabase) return { success: false, error: error ?? 'Onbekende fout' }

  if (!(await heeftRol(supabase, ['beheerder']))) return { success: false, error: 'Onvoldoende rechten' }

  // Verificeer dat het profiel bij de organisatie hoort
  const { data: profiel } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', profielId)
    .eq('organisatie_id', organisatieId)
    .single()

  if (!profiel) return { success: false, error: 'Gebruiker niet gevonden' }

  // Soft delete huidige profiel_locaties
  const { error: deleteError } = await supabase
    .from('profiel_locaties')
    .update({ deleted_at: new Date().toISOString() })
    .eq('profiel_id', profielId)
    .eq('organisatie_id', organisatieId)
    .is('deleted_at', null)

  if (deleteError) return { success: false, error: deleteError.message }

  // Insert nieuwe profiel_locaties
  if (locatieIds.length > 0) {
    const nieuweLocaties = locatieIds.map((lid) => ({
      profiel_id:     profielId,
      locatie_id:     lid,
      organisatie_id: organisatieId,
    }))

    const { error: insertError } = await supabase
      .from('profiel_locaties')
      .insert(nieuweLocaties)

    if (insertError) return { success: false, error: insertError.message }
  }

  // Sync naar user_locatie_toegang (bestaand systeem voor RLS get_toegankelijke_locatie_ids())
  await supabase
    .from('user_locatie_toegang')
    .delete()
    .eq('user_id', profielId)

  if (locatieIds.length > 0) {
    const syncLocaties = locatieIds.map((lid) => ({
      user_id:    profielId,
      locatie_id: lid,
    }))
    await supabase.from('user_locatie_toegang').insert(syncLocaties)
  }

  revalidatePath('/dashboard/gebruikers')
  return { success: true }
}
