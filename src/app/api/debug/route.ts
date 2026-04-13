import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const checks: Record<string, string> = {}

  // 1. Check env vars
  checks.supabase_url = process.env.NEXT_PUBLIC_SUPABASE_URL ? 'set' : 'MISSING'
  checks.supabase_key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'set' : 'MISSING'
  checks.node_version = process.version

  // 2. Check Supabase connection
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = (await createClient()) as any
    checks.supabase_client = 'created'

    const { data, error } = await supabase.auth.getUser()
    checks.auth_getUser = error ? `error: ${error.message}` : data.user ? `user: ${data.user.id}` : 'no user'
  } catch (err) {
    checks.supabase_client = `threw: ${err instanceof Error ? err.message : String(err)}`
  }

  // 3. Check table access
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = (await createClient()) as any
    const { error } = await supabase.from('profiles').select('id').limit(1)
    checks.table_profiles = error ? `error: ${error.message}` : 'ok'
  } catch (err) {
    checks.table_profiles = `threw: ${err instanceof Error ? err.message : String(err)}`
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = (await createClient()) as any
    const { error } = await supabase.from('groepen').select('id').limit(1)
    checks.table_groepen = error ? `error: ${error.message}` : 'ok'
  } catch (err) {
    checks.table_groepen = `threw: ${err instanceof Error ? err.message : String(err)}`
  }

  return NextResponse.json(checks, { status: 200 })
}
