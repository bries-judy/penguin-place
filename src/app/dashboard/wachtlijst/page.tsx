import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import WachtlijstDashboard from '@/components/wachtlijst/WachtlijstDashboard'
import type { WachtlijstEntry } from '@/lib/supabase/types'

export const dynamic = 'force-dynamic'

export default async function WachtlijstPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [wachtlijstResult, locatiesResult, groepenResult, contractenResult] = await Promise.all([
    supabase
      .from('wachtlijst')
      .select(`
        id,
        kind_id,
        opvangtype,
        gewenste_startdatum,
        gewenste_dagen,
        prioriteit,
        status,
        notities,
        aangemeld_op,
        kinderen (voornaam, achternaam, geboortedatum),
        locatievoorkeuren (locatie_id, voorkeur_volgorde, locaties(naam)),
        aanbiedingen (id, status, aangeboden_op, verloopdatum, groep_id)
      `)
      .neq('status', 'geannuleerd')
      .order('prioriteit', { ascending: false })
      .order('aangemeld_op', { ascending: true }),

    supabase
      .from('locaties')
      .select('id, naam')
      .eq('actief', true)
      .order('naam'),

    supabase
      .from('groepen')
      .select('id, naam, locatie_id, leeftijdscategorie, max_capaciteit')
      .eq('actief', true)
      .order('naam'),

    // Actieve contracten voor bezettingsberekening in aanbodmodal
    supabase
      .from('contracten')
      .select('id, groep_id, zorgdagen, startdatum, einddatum')
      .eq('status', 'actief')
      .not('groep_id', 'is', null),
  ])

  if (wachtlijstResult.error) console.error('Wachtlijst error:', wachtlijstResult.error)
  if (locatiesResult.error)   console.error('Locaties error:',   locatiesResult.error)
  if (groepenResult.error)    console.error('Groepen error:',    groepenResult.error)

  return (
    <WachtlijstDashboard
      wachtlijst={(wachtlijstResult.data ?? []) as WachtlijstEntry[]}
      locaties={locatiesResult.data ?? []}
      groepen={groepenResult.data ?? []}
      contracten={contractenResult.data ?? []}
    />
  )
}
