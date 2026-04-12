import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getRolMetRechten } from '@/app/actions/rollen'
import { RolForm } from '@/components/rollen/RolForm'
import { RolRechtenMatrix } from '@/components/rollen/RolRechtenMatrix'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ id: string }>
}

export default async function RolDetailPage({ params }: Props) {
  const { id } = await params

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

  const resultaat = await getRolMetRechten(id)
  if ('error' in resultaat) redirect('/dashboard/rollen')

  const { rol, rechten, modules } = resultaat

  // Gebruikers met deze rol (profiel_rollen)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rolGebruikers } = await (supabase as any)
    .from('profiel_rollen')
    .select('profiel_id, profiles(naam, email)')
    .eq('rol_naam', rol.naam)
    .eq('organisatie_id', rol.organisatie_id)
    .is('deleted_at', null)

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Header */}
      <div
        className="sticky top-0 z-40 flex items-center gap-4 px-8 py-4 border-b"
        style={{ background: 'white', borderColor: '#E8E4DF' }}
      >
        <Link
          href="/dashboard/rollen"
          className="flex items-center gap-1 text-sm font-semibold"
          style={{ color: '#9B8FCE' }}
        >
          <span className="material-symbols-outlined text-base">arrow_back</span>
          Terug
        </Link>
        <div className="w-px h-5" style={{ background: '#E8E4DF' }} />
        <div>
          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: '#9B8FCE' }}>
            Rol bewerken
          </p>
          <h1 className="text-lg font-black leading-tight" style={{ fontFamily: 'Manrope, sans-serif', color: '#2D2540' }}>
            {rol.naam}
          </h1>
        </div>
      </div>

      <div className="px-8 py-6 flex flex-col gap-6 max-w-4xl">

        {/* Sectie 1: Rol details */}
        <div className="rounded-2xl p-6" style={{ background: 'white' }}>
          <h2 className="text-base font-black mb-5" style={{ fontFamily: 'Manrope, sans-serif', color: '#2D2540' }}>
            Rolgegevens
          </h2>
          <RolForm rol={rol} isReadonly={rol.is_systeem_rol} />
        </div>

        {/* Sectie 2: Rechtenmatrix */}
        <div className="rounded-2xl p-6" style={{ background: 'white' }}>
          <h2 className="text-base font-black mb-5" style={{ fontFamily: 'Manrope, sans-serif', color: '#2D2540' }}>
            Moduletoegang
          </h2>
          <RolRechtenMatrix rolId={rol.id} modules={modules} rechten={rechten} />
        </div>

        {/* Sectie 3: Gebruikers met deze rol */}
        <div className="rounded-2xl p-6" style={{ background: 'white' }}>
          <h2 className="text-base font-black mb-4" style={{ fontFamily: 'Manrope, sans-serif', color: '#2D2540' }}>
            Gebruikers met deze rol
          </h2>

          {!rolGebruikers?.length ? (
            <p className="text-sm" style={{ color: '#9B8FCE' }}>Geen gebruikers hebben deze rol.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {rolGebruikers.map((rg: { profiel_id: string; profiles: { naam: string; email: string } | null }) => (
                <div
                  key={rg.profiel_id}
                  className="flex items-center gap-3 px-4 py-2.5 rounded-xl"
                  style={{ background: '#F5F3F0' }}
                >
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                    style={{ background: '#9B8FCE' }}
                  >
                    {rg.profiles?.naam?.charAt(0).toUpperCase() ?? '?'}
                  </div>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: '#2D2540' }}>{rg.profiles?.naam ?? '—'}</p>
                    <p className="text-xs" style={{ color: '#9B8FCE' }}>{rg.profiles?.email ?? ''}</p>
                  </div>
                  <Link
                    href={`/dashboard/gebruikers/${rg.profiel_id}`}
                    className="ml-auto text-xs font-semibold px-3 py-1 rounded-lg"
                    style={{ color: '#6B5B95', background: '#EDE9F8' }}
                  >
                    Bekijken
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
