import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import LocatieAanmakenWizard from '@/components/locaties/LocatieAanmakenWizard'

export const dynamic = 'force-dynamic'

export default async function NieuweLocatiePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return <LocatieAanmakenWizard />
}
