'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { Rol, Module, RolRecht, RolRechtInput } from '@/types/rollen'

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

async function isBeheerder(supabase: ReturnType<typeof createClient> extends Promise<infer T> ? T : never): Promise<boolean> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from('user_roles')
    .select('id')
    .eq('role', 'beheerder')
    .maybeSingle()
  return !!data
}

// ─── getRollen ────────────────────────────────────────────────────────────────

export async function getRollen(): Promise<Rol[]> {
  const { error, supabase, organisatieId } = await getAuthContext()
  if (error || !supabase) return []

  const { data } = await supabase
    .from('rollen')
    .select('*')
    .eq('organisatie_id', organisatieId)
    .is('deleted_at', null)
    .order('naam')

  return (data ?? []) as Rol[]
}

// ─── getModules ───────────────────────────────────────────────────────────────

export async function getModules(): Promise<Module[]> {
  const { error, supabase } = await getAuthContext()
  if (error || !supabase) return []

  const { data } = await supabase
    .from('modules')
    .select('*')
    .order('volgorde')

  return (data ?? []) as Module[]
}

// ─── getRolMetRechten ─────────────────────────────────────────────────────────

export async function getRolMetRechten(rolId: string): Promise<{
  rol: Rol
  rechten: RolRecht[]
  modules: Module[]
} | { error: string }> {
  const { error, supabase, organisatieId } = await getAuthContext()
  if (error || !supabase) return { error: error ?? 'Onbekende fout' }

  const [{ data: rol, error: rolError }, { data: rechten }, { data: modules }] = await Promise.all([
    supabase
      .from('rollen')
      .select('*')
      .eq('id', rolId)
      .eq('organisatie_id', organisatieId)
      .is('deleted_at', null)
      .single(),
    supabase
      .from('rol_rechten')
      .select('*')
      .eq('rol_id', rolId),
    supabase
      .from('modules')
      .select('*')
      .order('volgorde'),
  ])

  if (rolError || !rol) return { error: 'Rol niet gevonden' }

  return {
    rol: rol as Rol,
    rechten: (rechten ?? []) as RolRecht[],
    modules: (modules ?? []) as Module[],
  }
}

// ─── upsertRol ────────────────────────────────────────────────────────────────

export async function upsertRol(formData: FormData): Promise<{ success: boolean; rolId?: string; error?: string }> {
  const { error, supabase, organisatieId } = await getAuthContext()
  if (error || !supabase) return { success: false, error: error ?? 'Onbekende fout' }

  if (!(await isBeheerder(supabase))) return { success: false, error: 'Onvoldoende rechten' }

  const rolId      = (formData.get('rol_id') as string) || null
  const naam       = (formData.get('naam') as string)?.trim()
  const omschrijving = (formData.get('omschrijving') as string) || null
  const kleur      = (formData.get('kleur') as string) || '#6366F1'

  if (!naam) return { success: false, error: 'Naam is verplicht' }

  if (rolId) {
    // Update — nooit is_systeem_rol wijzigen
    const { error: updateError } = await supabase
      .from('rollen')
      .update({ naam, omschrijving, kleur })
      .eq('id', rolId)
      .eq('organisatie_id', organisatieId)

    if (updateError) return { success: false, error: updateError.message }
    revalidatePath('/dashboard/gebruikers')
    return { success: true, rolId }
  } else {
    const { data, error: insertError } = await supabase
      .from('rollen')
      .insert({ organisatie_id: organisatieId, naam, omschrijving, kleur, is_systeem_rol: false })
      .select('id')
      .single()

    if (insertError || !data) return { success: false, error: insertError?.message ?? 'Aanmaken mislukt' }
    revalidatePath('/dashboard/gebruikers')
    return { success: true, rolId: data.id }
  }
}

// ─── verwijderRol ─────────────────────────────────────────────────────────────

export async function verwijderRol(rolId: string): Promise<{ success: boolean; error?: string }> {
  const { error, supabase, organisatieId } = await getAuthContext()
  if (error || !supabase) return { success: false, error: error ?? 'Onbekende fout' }

  if (!(await isBeheerder(supabase))) return { success: false, error: 'Onvoldoende rechten' }

  // Controleer of het een systeemrol is
  const { data: rol } = await supabase
    .from('rollen')
    .select('is_systeem_rol')
    .eq('id', rolId)
    .eq('organisatie_id', organisatieId)
    .is('deleted_at', null)
    .single()

  if (!rol) return { success: false, error: 'Rol niet gevonden' }
  if (rol.is_systeem_rol) return { success: false, error: 'Systeemrollen kunnen niet worden verwijderd' }

  const { error: deleteError } = await supabase
    .from('rollen')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', rolId)
    .eq('organisatie_id', organisatieId)

  if (deleteError) return { success: false, error: deleteError.message }

  revalidatePath('/dashboard/gebruikers')
  return { success: true }
}

// ─── upsertRolRechten ─────────────────────────────────────────────────────────

export async function upsertRolRechten(
  rolId: string,
  rechten: RolRechtInput[]
): Promise<{ success: boolean; error?: string }> {
  const { error, supabase, organisatieId } = await getAuthContext()
  if (error || !supabase) return { success: false, error: error ?? 'Onbekende fout' }

  if (!(await isBeheerder(supabase))) return { success: false, error: 'Onvoldoende rechten' }

  // Verificeer dat de rol bij de organisatie hoort
  const { data: rol } = await supabase
    .from('rollen')
    .select('id')
    .eq('id', rolId)
    .eq('organisatie_id', organisatieId)
    .is('deleted_at', null)
    .single()

  if (!rol) return { success: false, error: 'Rol niet gevonden' }

  const rijen = rechten.map((r) => ({
    rol_id:          rolId,
    module_sleutel:  r.module_sleutel,
    kan_lezen:       r.kan_lezen,
    kan_aanmaken:    r.kan_aanmaken,
    kan_wijzigen:    r.kan_wijzigen,
    kan_verwijderen: r.kan_verwijderen,
    updated_at:      new Date().toISOString(),
  }))

  const { error: upsertError } = await supabase
    .from('rol_rechten')
    .upsert(rijen, { onConflict: 'rol_id,module_sleutel' })

  if (upsertError) return { success: false, error: upsertError.message }

  revalidatePath('/dashboard/gebruikers')
  return { success: true }
}
