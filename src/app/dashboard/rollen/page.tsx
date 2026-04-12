import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getRollen } from '@/app/actions/rollen'
import { RollenTable } from '@/components/rollen/RollenTable'

export const dynamic = 'force-dynamic'

export default async function RollenPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Guard: alleen beheerder
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rollen_check } = await (supabase as any)
    .from('user_roles')
    .select('role')
    .eq('role', 'beheerder')

  if (!rollen_check?.length) redirect('/dashboard')

  const rollen = await getRollen()

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Header */}
      <div
        className="sticky top-0 z-40 flex items-center justify-between px-8 py-4 border-b"
        style={{ background: 'white', borderColor: '#E8E4DF' }}
      >
        <div>
          <p className="text-xs font-bold uppercase tracking-widest mb-0.5" style={{ color: '#9B8FCE' }}>
            Beheer
          </p>
          <h1 className="text-xl font-black" style={{ fontFamily: 'Manrope, sans-serif', color: '#2D2540' }}>
            Rollen &amp; Rechten
          </h1>
        </div>

        <Link
          href="/dashboard/rollen/nieuw"
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white"
          style={{ background: '#6B5B95' }}
        >
          <span className="material-symbols-outlined text-base">add</span>
          Nieuwe rol
        </Link>
      </div>

      {/* Inhoud */}
      <div className="px-8 py-6">
        <RollenTable rollen={rollen} />
      </div>
    </div>
  )
}
