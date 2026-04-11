'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type {
  Invoice,
  InvoiceLine,
  FactuurStatus,
  GenerateMaandFacturenRow,
  FactuurIntegriteitRij,
} from '@/lib/supabase/types'

// ─── Genereer maandfacturen ───────────────────────────────────────────────────
//
// Roept de Postgres SECURITY DEFINER functie aan. Die functie:
//   1. Vindt alle actieve contracten voor de opgegeven maand
//   2. Groepeert per factuurontvanger (ontvangt_factuur = true)
//   3. Maakt één factuur + regels per ontvanger
//   4. Slaat duplicaten over (idempotent)
//
// Vereiste rol: klantadviseur of hoger (afgedwongen via RLS op invoices)

export async function genereerMaandFacturen(
  jaar: number,
  maand: number
): Promise<{ data: GenerateMaandFacturenRow[] } | { error: string }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any

  // Haal organisatie_id op uit het sessie-profiel
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) return { error: 'Niet ingelogd' }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('organisatie_id')
    .eq('id', user.id)
    .single()

  if (profileError || !profile?.organisatie_id) {
    return { error: 'Organisatie niet gevonden' }
  }

  const { data, error } = await supabase.rpc('generate_maand_facturen', {
    p_organisatie_id: profile.organisatie_id,
    p_jaar:           jaar,
    p_maand:          maand,
  })

  if (error) return { error: error.message }

  revalidatePath('/dashboard/facturen')
  return { data: data as GenerateMaandFacturenRow[] }
}

// ─── Haal facturen op ─────────────────────────────────────────────────────────

export async function getFacturen(filters?: {
  status?: FactuurStatus
  jaar?: number
  maand?: number
}): Promise<{ data: FactuurMetParent[] } | { error: string }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any

  let query = supabase
    .from('invoices')
    .select(`
      *,
      contactpersonen (
        voornaam,
        achternaam,
        email
      )
    `)
    .order('created_at', { ascending: false })

  if (filters?.status) {
    query = query.eq('status', filters.status)
  }

  if (filters?.jaar) {
    const start = `${filters.jaar}-01-01`
    const end   = `${filters.jaar}-12-31`
    query = query.gte('periode_start', start).lte('periode_eind', end)
  }

  if (filters?.maand && filters?.jaar) {
    const periodeStart = new Date(filters.jaar, filters.maand - 1, 1)
      .toISOString()
      .slice(0, 10)
    query = query.eq('periode_start', periodeStart)
  }

  const { data, error } = await query

  if (error) return { error: error.message }
  return { data: data as FactuurMetParent[] }
}

// ─── Haal factuurregels op voor één factuur ───────────────────────────────────

export async function getFactuurRegels(
  invoiceId: string
): Promise<{ data: InvoiceLine[] } | { error: string }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any

  const { data, error } = await supabase
    .from('invoice_lines')
    .select('*')
    .eq('invoice_id', invoiceId)
    .order('created_at')

  if (error) return { error: error.message }
  return { data: data as InvoiceLine[] }
}

// ─── Update factuurnummer (draft → sent / paid / overdue) ────────────────────

export async function updateFactuurStatus(
  invoiceId: string,
  status: FactuurStatus
): Promise<{ error?: string }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any

  const { error } = await supabase
    .from('invoices')
    .update({ status })
    .eq('id', invoiceId)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/facturen')
  return {}
}

// ─── Verwijder een draft-factuur ─────────────────────────────────────────────
//
// Alleen draft-facturen mogen worden verwijderd.
// Regels worden automatisch via ON DELETE CASCADE verwijderd.

export async function verwijderFactuur(
  invoiceId: string
): Promise<{ error?: string }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any

  // Controleer dat het een draft is (extra veiligheidslaag naast RLS)
  const { data: invoice, error: fetchError } = await supabase
    .from('invoices')
    .select('status')
    .eq('id', invoiceId)
    .single()

  if (fetchError) return { error: fetchError.message }
  if (invoice?.status !== 'draft') {
    return { error: 'Alleen draft-facturen kunnen worden verwijderd' }
  }

  const { error } = await supabase
    .from('invoices')
    .delete()
    .eq('id', invoiceId)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/facturen')
  return {}
}

// ─── Integriteitscheck ───────────────────────────────────────────────────────

export async function checkFactuurIntegriteit(): Promise<
  { data: FactuurIntegriteitRij[] } | { error: string }
> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any

  const { data: profile } = await supabase
    .from('profiles')
    .select('organisatie_id')
    .eq('id', (await supabase.auth.getUser()).data.user?.id)
    .single()

  const { data, error } = await supabase.rpc('check_factuur_integriteit', {
    p_organisatie_id: profile?.organisatie_id ?? null,
  })

  if (error) return { error: error.message }
  return { data: data as FactuurIntegriteitRij[] }
}

// ─── Lokale types voor UI ─────────────────────────────────────────────────────

export interface FactuurMetParent extends Invoice {
  contactpersonen: {
    voornaam: string
    achternaam: string
    email: string | null
  } | null
}
