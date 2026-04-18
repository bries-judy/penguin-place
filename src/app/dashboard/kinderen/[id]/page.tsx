import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import KindProfiel from '@/components/kinderen/KindProfiel'

export const dynamic = 'force-dynamic'

export default async function KindProfielPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [
    kindResult,
    adresResult,
    contactenResult,
    medischResult,
    contractenResult,
    notitiesResult,
    siblingsAResult,
    siblingsBResult,
    dagverslagenResult,
    locatiesResult,
    groepenResult,
  ] = await Promise.all([
    supabase.from('kinderen').select('*').eq('id', id).single(),

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any).from('adressen').select('*').eq('kind_id', id).maybeSingle(),

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any).from('contactpersonen').select('*').eq('kind_id', id).order('rol'),

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any).from('medisch_gegevens').select('*').eq('kind_id', id).maybeSingle(),

    supabase.from('contracten')
      .select('*, locaties(naam), groepen(naam), contracttypen(naam, merken(naam))')
      .eq('kind_id', id)
      .order('startdatum', { ascending: false }),

    supabase.from('kind_notities')
      .select('id, tekst, created_at, user_id')
      .eq('kind_id', id)
      .order('created_at', { ascending: false }),

    // Siblings waarbij dit kind kind_id_a is
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any).from('siblings')
      .select('id, kind_id_b, kinderen!siblings_kind_id_b_fkey(id, voornaam, tussenvoegsel, achternaam, geboortedatum)')
      .eq('kind_id_a', id),

    // Siblings waarbij dit kind kind_id_b is
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any).from('siblings')
      .select('id, kind_id_a, kinderen!siblings_kind_id_a_fkey(id, voornaam, tussenvoegsel, achternaam, geboortedatum)')
      .eq('kind_id_b', id),

    supabase.from('dagverslagen')
      .select('id, datum, activiteiten, eten_drinken, slaaptijden, stemming, bijzonderheden, gepubliceerd, gepubliceerd_op, auteur_id, created_at, dagverslag_media(id, bestandsnaam)')
      .eq('kind_id', id)
      .is('deleted_at', null)
      .order('datum', { ascending: false }),

    supabase.from('locaties').select('id, naam').eq('actief', true).order('naam'),
    supabase.from('groepen').select('id, naam, locatie_id').eq('actief', true).order('naam'),
  ])

  if (!kindResult.data) notFound()

  // Dagverslagen media mapping
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dagverslagen = (dagverslagenResult.data ?? []).map((dv: any) => ({
    ...dv,
    media: dv.dagverslag_media ?? [],
  }))

  // Actieve groep_id ophalen (eerste actieve contract met groep)
  const actieveGroepId = (contractenResult.data ?? [])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .find((c: any) => c.status === 'actief' && c.groep_id)?.groep_id ?? null

  // Siblings samenvoegen
  const siblings = [
    ...(siblingsAResult.data ?? []).map((s: { id: string; kinderen: unknown }) => ({ siblingId: s.id, kind: s.kinderen })),
    ...(siblingsBResult.data ?? []).map((s: { id: string; kinderen: unknown }) => ({ siblingId: s.id, kind: s.kinderen })),
  ]

  return (
    <KindProfiel
      kind={kindResult.data}
      adres={adresResult.data ?? null}
      contactpersonen={contactenResult.data ?? []}
      medisch={medischResult.data ?? null}
      contracten={contractenResult.data ?? []}
      notities={notitiesResult.data ?? []}
      dagverslagen={dagverslagen}
      actieveGroepId={actieveGroepId}
      siblings={siblings}
      locaties={locatiesResult.data ?? []}
      groepen={groepenResult.data ?? []}
    />
  )
}
