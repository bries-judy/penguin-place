'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { OuderEmail } from '@/types/ouders'

// ─── E-mails ophalen voor één ouder (met bijlagen) ───────────────────────────

export async function emailsOphalen(ouderId: string): Promise<OuderEmail[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('ouder_emails')
    .select(`
      id, ouder_id, bron, richting, message_id,
      van_adres, aan_adressen, cc_adressen,
      onderwerp, body_plain, body_html,
      verzonden_op, staff_id, thread_id, heeft_bijlagen,
      created_at,
      bijlagen:ouder_email_bijlagen (
        id, email_id, bestandsnaam, mime_type, storage_path, grootte_bytes, volgorde
      )
    `)
    .eq('ouder_id', ouderId)
    .is('deleted_at', null)
    .order('verzonden_op', { ascending: false })

  if (error || !data) return []

  // Staff-namen via aparte lookup op profiles (zelfde patroon als memosOphalen).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const staffIds = Array.from(
    new Set(data.map((e: any) => e.staff_id).filter(Boolean)),
  ) as string[]

  let staffMap: Record<string, string> = {}
  if (staffIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, naam')
      .in('id', staffIds)
    if (profiles) {
      staffMap = Object.fromEntries(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        profiles.map((p: any) => [p.id, p.naam]),
      )
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return data.map((e: any) => ({
    id: e.id,
    ouder_id: e.ouder_id,
    bron: e.bron,
    richting: e.richting,
    message_id: e.message_id,
    van_adres: e.van_adres,
    aan_adressen: e.aan_adressen ?? [],
    cc_adressen: e.cc_adressen ?? [],
    onderwerp: e.onderwerp,
    body_plain: e.body_plain,
    body_html: e.body_html,
    verzonden_op: e.verzonden_op,
    staff_id: e.staff_id,
    thread_id: e.thread_id,
    heeft_bijlagen: e.heeft_bijlagen,
    created_at: e.created_at,
    staff: e.staff_id
      ? { naam: staffMap[e.staff_id] ?? '—' }
      : null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    bijlagen: (e.bijlagen ?? []).sort(
      (a: any, b: any) => (a.volgorde ?? 0) - (b.volgorde ?? 0),
    ),
  }))
}

// ─── E-mail herkoppelen aan andere ouder ─────────────────────────────────────

export async function emailHerkoppelen(
  emailId: string,
  nieuweOuderId: string,
): Promise<{ error?: string }> {
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

  // Haal bestaande e-mail op (RLS zorgt voor org-scope)
  const { data: email } = await supabase
    .from('ouder_emails')
    .select('id, ouder_id, onderwerp, organisatie_id')
    .eq('id', emailId)
    .maybeSingle()
  if (!email) return { error: 'E-mail niet gevonden' }

  // Controleer dat de doel-ouder in dezelfde organisatie zit
  const { data: doelOuder } = await supabase
    .from('ouder_profielen')
    .select('id, voornaam, achternaam, organisatie_id')
    .eq('id', nieuweOuderId)
    .eq('organisatie_id', profile.organisatie_id)
    .maybeSingle()
  if (!doelOuder) return { error: 'Doel-ouder niet gevonden in jouw organisatie' }

  if (email.ouder_id === nieuweOuderId) {
    return { error: 'E-mail hangt al bij deze ouder' }
  }

  const oudeOuderId: string = email.ouder_id

  // Update ouder_id op de e-mail
  const { error: updErr } = await supabase
    .from('ouder_emails')
    .update({ ouder_id: nieuweOuderId })
    .eq('id', emailId)
  if (updErr) return { error: updErr.message }

  // Audit-regel op de OUDE ouder (wie raakt een e-mail kwijt?)
  const { error: auditErr } = await supabase
    .from('ouder_audit')
    .insert({
      ouder_id: oudeOuderId,
      staff_id: user.id,
      veld: 'email_herkoppel',
      oude_waarde: email.onderwerp,
      nieuwe_waarde: `${doelOuder.voornaam} ${doelOuder.achternaam} (${nieuweOuderId})`,
    })
  // Audit mag niet hard falen — we loggen maar returnen geen error aan de user
  if (auditErr) {
    console.error('[emailHerkoppelen] audit-insert faalde:', auditErr.message)
  }

  revalidatePath(`/dashboard/ouders/${oudeOuderId}`)
  revalidatePath(`/dashboard/ouders/${nieuweOuderId}`)
  return {}
}

// ─── Signed URL voor bijlage-download ────────────────────────────────────────

export async function bijlageSignedUrl(
  bijlageId: string,
): Promise<{ url?: string; error?: string }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Niet ingelogd' }

  // RLS op ouder_email_bijlagen checkt via ouder_emails.organisatie_id
  const { data: bijlage } = await supabase
    .from('ouder_email_bijlagen')
    .select('id, storage_path, bestandsnaam')
    .eq('id', bijlageId)
    .maybeSingle()
  if (!bijlage) return { error: 'Bijlage niet gevonden' }

  const { data, error } = await supabase.storage
    .from('ouder_email_bijlagen')
    .createSignedUrl(bijlage.storage_path, 300, {
      download: bijlage.bestandsnaam,
    })
  if (error || !data) return { error: error?.message ?? 'Kon URL niet genereren' }

  return { url: data.signedUrl }
}
