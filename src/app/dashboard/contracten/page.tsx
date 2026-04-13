import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ContractenInhoud from '@/components/contracten/ContractenInhoud'

export const dynamic = 'force-dynamic'

export default async function ContractenPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Merken met locatie-count
  const { data: merken } = await supabase
    .from('merken')
    .select('id, naam, code, beschrijving, actief, locaties:locaties(count)')
    .is('deleted_at', null)
    .order('naam')

  // Contracttypen met merk-info
  const { data: contracttypen } = await supabase
    .from('contracttypen')
    .select('*, merk:merken(naam, code)')
    .is('deleted_at', null)
    .order('naam')

  // Locaties voor merk-koppeling
  const { data: locaties } = await supabase
    .from('locaties')
    .select('id, naam, merk_id')
    .is('deleted_at', null)
    .order('naam')

  return (
    <ContractenInhoud
      merken={merken ?? []}
      contracttypen={contracttypen ?? []}
      locaties={locaties ?? []}
    />
  )
}
