import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import {
  ouderDetailOphalen,
  ouderFacturenOphalen,
  portaalberichtenOphalen,
} from '@/app/actions/ouders'
import { memosOphalen } from '@/app/actions/ouderMemos'
import OuderDetail, {
  type OuderFactuur,
  type PortaalBericht,
} from '@/components/ouders/OuderDetail'

export const dynamic = 'force-dynamic'

export default async function OuderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [ouder, memos, portaalberichtenRaw, facturenRaw] = await Promise.all([
    ouderDetailOphalen(id),
    memosOphalen(id),
    portaalberichtenOphalen(id),
    ouderFacturenOphalen(id),
  ])

  if (!ouder) redirect('/dashboard/ouders')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const portaalberichten: PortaalBericht[] = portaalberichtenRaw.map((p: any) => ({
    id: p.id,
    conversation_id: p.conversation_id,
    afzender_id: p.afzender_id,
    afzender_type: p.afzender_type,
    inhoud: p.inhoud,
    created_at: p.created_at,
  }))

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const facturen: OuderFactuur[] = facturenRaw.map((f: any) => ({
    id: f.id,
    factuurnummer: f.factuurnummer,
    periode_start: f.periode_start,
    periode_eind: f.periode_eind,
    totaal_bedrag: Number(f.totaal_bedrag),
    status: f.status,
    created_at: f.created_at,
  }))

  return (
    <OuderDetail
      ouder={ouder}
      memos={memos}
      portaalberichten={portaalberichten}
      facturen={facturen}
    />
  )
}
