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

  // 3. Diep RLS-keten debug
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = (await createClient()) as any
    const userId = (await supabase.auth.getUser()).data?.user?.id

    // a) Profiel + organisatie_id
    const { data: profiel, error: profielErr } = await supabase
      .from('profiles')
      .select('id, organisatie_id, naam')
      .eq('id', userId)
      .maybeSingle()
    checks.profiel = profielErr ? `error: ${profielErr.message}` : JSON.stringify(profiel)

    // b) User roles
    const { data: roles, error: rolesErr } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
    checks.user_roles = rolesErr ? `error: ${rolesErr.message}` : JSON.stringify(roles)

    // c) Locatie toegang
    const { data: toegang, error: toegangErr } = await supabase
      .from('user_locatie_toegang')
      .select('*')
      .eq('user_id', userId)
    checks.locatie_toegang = toegangErr ? `error: ${toegangErr.message}` : JSON.stringify(toegang)

    // d) RPC: get_toegankelijke_locatie_ids
    const { data: rpcIds, error: rpcErr } = await supabase.rpc('get_toegankelijke_locatie_ids')
    checks.rpc_locatie_ids = rpcErr ? `error: ${rpcErr.message}` : JSON.stringify(rpcIds)

    // e) RPC: has_role('beheerder')
    const { data: isBeheerder, error: beheerderErr } = await supabase.rpc('has_role', { _role: 'beheerder' })
    checks.has_role_beheerder = beheerderErr ? `error: ${beheerderErr.message}` : String(isBeheerder)

    // f) RPC: get_organisatie_id
    const { data: orgId, error: orgErr } = await supabase.rpc('get_organisatie_id')
    checks.rpc_organisatie_id = orgErr ? `error: ${orgErr.message}` : JSON.stringify(orgId)

    // g) Locaties direct query
    const { data: locaties, error: locErr } = await supabase
      .from('locaties')
      .select('id, naam, status')
      .is('deleted_at', null)
    checks.locaties_query = locErr ? `error: ${locErr.message}` : `${(locaties ?? []).length} locaties: ${JSON.stringify((locaties ?? []).map((l: any) => l.naam))}`

  } catch (err) {
    checks.debug_error = `threw: ${err instanceof Error ? err.message : String(err)}`
  }

  return NextResponse.json(checks, { status: 200 })
}
