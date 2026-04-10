import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import NieuwKindForm from '@/components/kinderen/NieuwKindForm'

export const dynamic = 'force-dynamic'

export default async function NieuwKindPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: locaties } = await supabase
    .from('locaties')
    .select('id, naam')
    .eq('actief', true)
    .order('naam')

  return <NieuwKindForm locaties={locaties ?? []} />
}
