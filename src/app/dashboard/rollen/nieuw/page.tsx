import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { RolForm } from '@/components/rollen/RolForm'

export const dynamic = 'force-dynamic'

export default async function NieuweRolPage() {
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

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Header */}
      <div
        className="sticky top-0 z-40 flex items-center gap-4 px-8 py-4 border-b"
        style={{ background: 'white', borderColor: '#E8E4DF' }}
      >
        <Link
          href="/dashboard/rollen"
          className="flex items-center gap-1 text-sm font-semibold transition-colors"
          style={{ color: '#9B8FCE' }}
        >
          <span className="material-symbols-outlined text-base">arrow_back</span>
          Terug
        </Link>
        <div className="w-px h-5" style={{ background: '#E8E4DF' }} />
        <div>
          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: '#9B8FCE' }}>
            Nieuwe rol
          </p>
        </div>
      </div>

      {/* Inhoud */}
      <div className="px-8 py-6 max-w-2xl">
        <div className="rounded-2xl p-6" style={{ background: 'white' }}>
          <h2 className="text-lg font-black mb-6" style={{ fontFamily: 'Manrope, sans-serif', color: '#2D2540' }}>
            Rol aanmaken
          </h2>
          <RolForm />
        </div>
      </div>
    </div>
  )
}
