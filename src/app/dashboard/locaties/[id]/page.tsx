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

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: locatie } = await supabase
    .from('locaties')
    .select(`
      *,
      locatiemanager:locatiemanager_id ( id, profiles ( voornaam, achternaam ) ),
      plaatsvervangend_manager:plaatsvervangend_manager_id ( id, profiles ( voornaam, achternaam ) ),
      groepen ( * ),
      locatie_openingstijden ( * ),
      locatie_openingstijden_uitzonderingen ( * )
    `)
    .eq('id', id)
    .is('deleted_at', null)
    .single()

  if (!locatie) redirect('/dashboard/locaties')

  return <LocatieDetail locatie={locatie} />
}
