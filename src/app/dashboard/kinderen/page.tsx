import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import KinderenLijst from '@/components/kinderen/KinderenLijst'

export const dynamic = 'force-dynamic'

export default async function KinderenPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: kinderen } = await supabase
    .from('kinderen')
    .select(`
      id, voornaam, tussenvoegsel, achternaam, geboortedatum,
      verwachte_geboortedatum, geslacht, actief, aangemeld_op,
      contracten (id, status, opvangtype, startdatum, locatie_id,
        locaties (naam))
    `)
    .order('achternaam')
    .order('voornaam')

  const { data: locaties } = await supabase
    .from('locaties')
    .select('id, naam')
    .eq('actief', true)
    .order('naam')

  return (
    <KinderenLijst
      kinderen={kinderen ?? []}
      locaties={locaties ?? []}
    />
  )
}
