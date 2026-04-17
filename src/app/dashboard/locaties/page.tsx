import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import LocatiesLijst from '@/components/locaties/LocatiesLijst'

export const dynamic = 'force-dynamic'

export default async function LocatiesPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: locaties, error } = await supabase
    .from('locaties')
    .select(`
      id, naam, code, type, status, plaats,
      telefoon, email, locatiemanager_id,
      groepen ( id )
    `)
    .is('deleted_at', null)
    .order('naam')

  if (error) console.error('[Locaties page error]', error.message)

  // Haal manager-namen op via profiles (cross-schema FK werkt niet in PostgREST)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const managerIds = (locaties ?? []).map((l: any) => l.locatiemanager_id).filter(Boolean) as string[]
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const locatiesMetManager = (locaties ?? []).map((l: any) => ({
    ...l,
    locatiemanager: l.locatiemanager_id
      ? { id: l.locatiemanager_id, profiles: { naam: managerMap[l.locatiemanager_id] ?? '—' } }
      : null,
  }))

  return <LocatiesLijst locaties={locatiesMetManager} />
}
