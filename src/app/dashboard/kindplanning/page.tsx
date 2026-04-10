import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import KindplanningView from '@/components/kindplanning/KindplanningView'

export const dynamic = 'force-dynamic'

export default async function KindplanningPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [locatiesResult, groepenResult, contractenResult, flexAanvragenResult] = await Promise.all([
    supabase
      .from('locaties')
      .select('id, naam')
      .eq('actief', true)
      .order('naam'),

    supabase
      .from('groepen')
      .select('id, naam, locatie_id, opvangtype, leeftijdscategorie, max_capaciteit')
      .eq('actief', true)
      .order('naam'),

    supabase
      .from('contracten')
      .select('id, groep_id, zorgdagen, startdatum, einddatum')
      .eq('status', 'actief')
      .not('groep_id', 'is', null),

    supabase
      .from('flex_dagen')
      .select(`
        id, datum, status, created_at,
        contracten (
          kind_id,
          kinderen ( voornaam, achternaam ),
          locaties ( naam )
        ),
        groepen ( naam, locatie_id )
      `)
      .eq('status', 'aangevraagd')
      .order('datum', { ascending: true }),
  ])

  return (
    <KindplanningView
      locaties={locatiesResult.data ?? []}
      groepen={groepenResult.data ?? []}
      contracten={contractenResult.data ?? []}
      flexAanvragen={flexAanvragenResult.data ?? []}
    />
  )
}
