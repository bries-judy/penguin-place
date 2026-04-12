import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import LocatiesLijst from '@/components/locaties/LocatiesLijst'

export const dynamic = 'force-dynamic'

export default async function LocatiesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: locaties } = await supabase
    .from('locaties')
    .select(`
      id, naam, code, type, status, plaats,
      telefoon, email,
      locatiemanager:locatiemanager_id ( id, profiles ( voornaam, achternaam ) ),
      groepen ( id )
    `)
    .is('deleted_at', null)
    .order('naam')

  return <LocatiesLijst locaties={locaties ?? []} />
}
