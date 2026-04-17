import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import LocatieDetail from '@/components/locaties/LocatieDetail'

export const dynamic = 'force-dynamic'

export default async function LocatieDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: locatie, error } = await supabase
    .from('locaties')
    .select(`
      *,
      groepen ( * ),
      locatie_openingstijden ( * ),
      locatie_openingstijden_uitzonderingen ( * )
    `)
    .eq('id', id)
    .is('deleted_at', null)
    .single()

  if (error) console.error('[Locatie detail error]', error.message)
  if (!locatie) redirect('/dashboard/locaties')

  // Manager-namen ophalen via profiles (cross-schema FK werkt niet in PostgREST)
  const managerIds = [locatie.locatiemanager_id, locatie.plaatsvervangend_manager_id].filter(Boolean) as string[]
  let managerMap: Record<string, string> = {}
  if (managerIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, naam')
      .in('id', managerIds)
    if (profiles) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      managerMap = Object.fromEntries(profiles.map((p: any) => [p.id, p.naam]))
    }
  }

  const locatieMetRelaties = {
    ...locatie,
    locatiemanager: locatie.locatiemanager_id
      ? { id: locatie.locatiemanager_id, profiles: { naam: managerMap[locatie.locatiemanager_id] ?? '' } }
      : null,
    plaatsvervangend_manager: locatie.plaatsvervangend_manager_id
      ? { id: locatie.plaatsvervangend_manager_id, profiles: { naam: managerMap[locatie.plaatsvervangend_manager_id] ?? '' } }
      : null,
  }

  return <LocatieDetail locatie={locatieMetRelaties} />
}
