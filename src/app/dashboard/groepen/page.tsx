import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function GroepenPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold" style={{ color: '#2D2540' }}>
        Groepen
      </h1>
      <p className="mt-2 text-sm" style={{ color: '#8B82A8' }}>
        Beheer hier de groepen per locatie.
      </p>
    </div>
  )
}
