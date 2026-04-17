import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { oudersOphalen } from '@/app/actions/ouders'
import OudersLijst from '@/components/ouders/OudersLijst'

export const dynamic = 'force-dynamic'

export default async function OudersPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const ouders = await oudersOphalen()

  return <OudersLijst ouders={ouders} />
}
