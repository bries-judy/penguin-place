'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type {
  OuderMemoType,
  OuderMemoZichtbaar,
  FollowUpStatus,
  OuderMemo,
} from '@/types/ouders'

// ─── Memo aanmaken ────────────────────────────────────────────────────────────

export async function memoAanmaken(
  formData: FormData,
): Promise<{ error?: string; id?: string }> {
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

  const ouder_id        = formData.get('ouder_id')       as string
  const type            = ((formData.get('type') as string) || 'notitie') as OuderMemoType
  const onderwerp       = formData.get('onderwerp')      as string
  const inhoud          = (formData.get('inhoud') as string) || ''
  const datumRaw        = formData.get('datum') as string | null
  const datum           = datumRaw && datumRaw.length > 0 ? datumRaw : new Date().toISOString()
  const kind_id         = (formData.get('kind_id') as string) || null
  const zichtbaar_voor  = ((formData.get('zichtbaar_voor') as string) || 'alle_staff') as OuderMemoZichtbaar
  const follow_up_datum = (formData.get('follow_up_datum') as string) || null
  const follow_up_status: FollowUpStatus | null = type === 'taak' ? 'open' : null

  if (!ouder_id || !onderwerp) {
    return { error: 'Ouder en onderwerp zijn verplicht' }
  }

  const { data, error } = await supabase
    .from('ouder_memos')
    .insert({
      ouder_id,
      auteur_id: user.id,
      organisatie_id: profile.organisatie_id,
      type,
      onderwerp,
      inhoud,
      datum,
      kind_id,
      zichtbaar_voor,
      follow_up_datum,
      follow_up_status,
    })
    .select('id')
    .single()

  if (error) return { error: error.message }

  revalidatePath(`/dashboard/ouders/${ouder_id}`)
  return { id: data.id }
}

// ─── Taak afvinken (follow_up_status → afgerond) ──────────────────────────────

export async function memoAfvinken(
  memoId: string,
  ouder_id: string,
): Promise<{ error?: string }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Niet ingelogd' }

  const { error } = await supabase
    .from('ouder_memos')
    .update({ follow_up_status: 'afgerond' })
    .eq('id', memoId)

  if (error) return { error: error.message }

  revalidatePath(`/dashboard/ouders/${ouder_id}`)
  return {}
}

// ─── Memo soft-deleten ────────────────────────────────────────────────────────

export async function memoVerwijderen(
  memoId: string,
  ouder_id: string,
): Promise<{ error?: string }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Niet ingelogd' }

  const { error } = await supabase
    .from('ouder_memos')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', memoId)

  if (error) return { error: error.message }

  revalidatePath(`/dashboard/ouders/${ouder_id}`)
  return {}
}

// ─── Memo's ophalen voor één ouder ────────────────────────────────────────────

export async function memosOphalen(ouder_id: string): Promise<OuderMemo[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('ouder_memos')
    .select(`
      id, ouder_id, auteur_id, type, onderwerp, inhoud, datum, kind_id,
      follow_up_datum, follow_up_status, zichtbaar_voor,
      created_at, updated_at, deleted_at,
      kind:kinderen!kind_id(voornaam, achternaam)
    `)
    .eq('ouder_id', ouder_id)
    .is('deleted_at', null)
    .order('datum', { ascending: false })

  if (error || !data) return []

  // Auteur-namen via aparte profiles-lookup (PostgREST kan cross-schema FK's
  // naar profiles niet altijd resolven — zelfde patroon als in locaties-pagina).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const auteurIds = Array.from(new Set(data.map((m: any) => m.auteur_id).filter(Boolean))) as string[]
  let auteurMap: Record<string, string> = {}
  if (auteurIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, naam')
      .in('id', auteurIds)
    if (profiles) {
      auteurMap = Object.fromEntries(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        profiles.map((p: any) => [p.id, p.naam]),
      )
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return data.map((m: any) => ({
    id: m.id,
    ouder_id: m.ouder_id,
    auteur_id: m.auteur_id,
    type: m.type,
    onderwerp: m.onderwerp,
    inhoud: m.inhoud,
    datum: m.datum,
    kind_id: m.kind_id,
    follow_up_datum: m.follow_up_datum,
    follow_up_status: m.follow_up_status,
    zichtbaar_voor: m.zichtbaar_voor,
    created_at: m.created_at,
    updated_at: m.updated_at,
    deleted_at: m.deleted_at,
    auteur: { naam: auteurMap[m.auteur_id] ?? '—' },
    kind: m.kind
      ? { voornaam: m.kind.voornaam, achternaam: m.kind.achternaam }
      : null,
  }))
}
