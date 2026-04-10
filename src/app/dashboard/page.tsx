import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DashboardOverzicht from '@/components/dashboard/CapaciteitsDashboard'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const vandaag = new Date().toISOString().split('T')[0]
  const dertigDagenGeleden = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const [
    actieveContractenResult,
    conceptContractenResult,
    groepenResult,
    opzeggingResult,
    wachtlijstResult,
    profileResult,
  ] = await Promise.all([
    supabase.from('contracten')
      .select('id')
      .eq('status', 'actief')
      .lte('startdatum', vandaag)
      .or(`einddatum.is.null,einddatum.gte.${vandaag}`),

    supabase.from('contracten')
      .select('id, vorige_contract_id')
      .eq('status', 'concept'),

    supabase.from('groepen')
      .select('max_capaciteit')
      .eq('actief', true),

    supabase.from('kinderen')
      .select('id')
      .eq('actief', false)
      .gte('datum_uitschrijving', dertigDagenGeleden),

    supabase.from('wachtlijst')
      .select('id, status')
      .neq('status', 'geannuleerd'),

    supabase.from('profiles')
      .select('voornaam')
      .eq('id', user.id)
      .maybeSingle(),
  ])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const totaalCapaciteit = (groepenResult.data ?? []).reduce((s: number, g: any) => s + g.max_capaciteit, 0)
  const actieveContracten = actieveContractenResult.data?.length ?? 0
  const bezettingPct = totaalCapaciteit > 0 ? Math.round((actieveContracten / totaalCapaciteit) * 100) : 0

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const concepten: any[] = conceptContractenResult.data ?? []
  const nieuweAanmeldingen = concepten.filter((c: any) => !c.vorige_contract_id).length
  const contractWijzigingen = concepten.filter((c: any) => !!c.vorige_contract_id).length

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const wachtlijst: any[] = wachtlijstResult.data ?? []
  const wachtlijstTotaal = wachtlijst.length
  const wachtlijstActief  = wachtlijst.filter((w: any) => w.status === 'wachtend').length

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const voornaam = (profileResult.data as any)?.voornaam ?? null

  return (
    <DashboardOverzicht
      voornaam={voornaam}
      bezettingPct={bezettingPct}
      totaalCapaciteit={totaalCapaciteit}
      actieveContracten={actieveContracten}
      nieuweAanmeldingen={nieuweAanmeldingen}
      contractWijzigingen={contractWijzigingen}
      opzeggingen={opzeggingResult.data?.length ?? 0}
      wachtlijstTotaal={wachtlijstTotaal}
      wachtlijstActief={wachtlijstActief}
    />
  )
}
