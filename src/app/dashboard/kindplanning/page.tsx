import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import KindplanningView from '@/components/kindplanning/KindplanningView'

export const dynamic = 'force-dynamic'

export default async function KindplanningPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [
    locatiesResult,
    groepenResult,
    contractenResult,
    flexAanvragenResult,
    overdrachtenResult,
    kinderenResult,
    overridesResult,
  ] = await Promise.all([
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

    // Groepsoverdrachten (nog niet uitgevoerd)
    supabase
      .from('groepsoverdrachten')
      .select(`
        id, kind_id, van_groep_id, naar_groep_id, overdrachtsdatum, uitgevoerd,
        kinderen ( voornaam, achternaam ),
        van_groep:groepen!van_groep_id ( naam ),
        naar_groep:groepen!naar_groep_id ( naam )
      `)
      .eq('uitgevoerd', false)
      .order('overdrachtsdatum', { ascending: true }),

    // Actieve kinderen voor kind-selector
    supabase
      .from('kinderen')
      .select('id, voornaam, tussenvoegsel, achternaam')
      .eq('actief', true)
      .order('achternaam'),

    // Capaciteit overrides
    supabase
      .from('capaciteit_overrides')
      .select('id, groep_id, max_capaciteit, start_datum, eind_datum, reden')
      .order('start_datum', { ascending: true }),
  ])

  return (
    <KindplanningView
      locaties={locatiesResult.data ?? []}
      groepen={groepenResult.data ?? []}
      contracten={contractenResult.data ?? []}
      flexAanvragen={flexAanvragenResult.data ?? []}
      overdrachten={overdrachtenResult.data ?? []}
      kinderenLijst={kinderenResult.data ?? []}
      overrides={overridesResult.data ?? []}
    />
  )
}
