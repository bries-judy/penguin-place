import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import FacturenDashboard from '@/components/facturen/FacturenDashboard'
import type { FactuurMetParent } from '@/app/actions/facturen'

export const dynamic = 'force-dynamic'

export default async function FacturenPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const vandaag = new Date()
  const eersteVanMaand = new Date(vandaag.getFullYear(), vandaag.getMonth(), 1)
    .toISOString()
    .slice(0, 10)

  const { data: facturen } = await supabase
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
    .limit(100)

  return (
    <FacturenDashboard
      initieleFacturen={(facturen ?? []) as FactuurMetParent[]}
      huidigJaar={vandaag.getFullYear()}
      huidigMaand={vandaag.getMonth() + 1}
    />
  )
}
