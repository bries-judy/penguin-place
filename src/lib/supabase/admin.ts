import { createClient } from '@supabase/supabase-js'

/**
 * Supabase Admin Client (service_role key).
 * Alleen gebruiken in server actions — NOOIT in client components.
 * Bypassed RLS — gebruik alleen voor admin-operaties zoals
 * het aanmaken van ouder-accounts via auth.admin.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY is niet geconfigureerd. ' +
      'Voeg deze toe aan .env.local (server-side only).'
    )
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
