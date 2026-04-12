import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { GebruikersTable } from '@/components/gebruikers/GebruikersTable'
import { getGebruikers } from '@/app/actions/gebruikers'

export const dynamic = 'force-dynamic'

export default async function GebruikersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Guard: alleen beheerder en directie
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rollen } = await (supabase as any)
    .from('user_roles')
    .select('role')
    .in('role', ['beheerder', 'directie'])

  if (!rollen?.length) redirect('/dashboard')

  const gebruikers = await getGebruikers()

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
            Gebruikersbeheer
          </h1>
        </div>

        {/* Uitnodigen — binnenkort beschikbaar */}
        <div className="relative group">
          <button
            disabled
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white opacity-50 cursor-not-allowed"
            style={{ background: '#6B5B95' }}
          >
            <span className="material-symbols-outlined text-base">person_add</span>
            Gebruiker uitnodigen
          </button>
          <div
            className="absolute right-0 top-full mt-2 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
            style={{ background: '#2D2540', color: 'white' }}
          >
            Binnenkort beschikbaar
          </div>
        </div>
      </div>

      {/* Inhoud */}
      <div className="px-8 py-6">
        <GebruikersTable gebruikers={gebruikers} />
      </div>
    </div>
  )
}
