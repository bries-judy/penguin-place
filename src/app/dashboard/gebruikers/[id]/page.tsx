import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getGebruiker } from '@/app/actions/gebruikers'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { GebruikerRollenBeheer } from '@/components/gebruikers/GebruikerRollenBeheer'
import { GebruikerLocatiesBeheer } from '@/components/gebruikers/GebruikerLocatiesBeheer'
import type { RolNaam } from '@/types/rollen'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ id: string }>
}

export default async function GebruikerDetailPage({ params }: Props) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Guard: eigen profiel of beheerder
  const isEigenProfiel = user.id === id
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rollen_check } = await (supabase as any)
    .from('user_roles')
    .select('role')
    .eq('role', 'beheerder')

  const isBeheerder = !!rollen_check?.length
  if (!isEigenProfiel && !isBeheerder) redirect('/dashboard')

  const resultaat = await getGebruiker(id)
  if ('error' in resultaat) redirect('/dashboard/gebruikers')

  const { naam, email, rol_namen, locatie_ids, alle_rollen, alle_locaties } = resultaat

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Header */}
      <div
        className="sticky top-0 z-40 flex items-center gap-4 px-8 py-4 border-b"
        style={{ background: 'white', borderColor: '#E8E4DF' }}
      >
        <Link
          href="/dashboard/gebruikers"
          className="flex items-center gap-1 text-sm font-semibold"
          style={{ color: '#9B8FCE' }}
        >
          <span className="material-symbols-outlined text-base">arrow_back</span>
          Terug
        </Link>
        <div className="w-px h-5" style={{ background: '#E8E4DF' }} />
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-black text-white"
            style={{ background: '#6B5B95' }}
          >
            {naam.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-lg font-black leading-tight" style={{ fontFamily: 'Manrope, sans-serif', color: '#2D2540' }}>
              {naam}
            </h1>
            <p className="text-xs" style={{ color: '#9B8FCE' }}>{email}</p>
          </div>
        </div>
      </div>

      {/* Tabbladen */}
      <div className="px-8 py-6">
        <Tabs defaultValue="profiel">
          <TabsList className="mb-6">
            <TabsTrigger value="profiel">Profiel</TabsTrigger>
            <TabsTrigger value="rollen">Rollen</TabsTrigger>
            <TabsTrigger value="locaties">Locaties</TabsTrigger>
          </TabsList>

          {/* Profiel tab */}
          <TabsContent value="profiel">
            <div className="rounded-2xl p-6 max-w-lg" style={{ background: 'white' }}>
              <h2 className="text-base font-black mb-5" style={{ fontFamily: 'Manrope, sans-serif', color: '#2D2540' }}>
                Profielgegevens
              </h2>
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider" style={{ color: '#9B8FCE' }}>Naam</label>
                  <div className="px-4 py-2.5 rounded-xl text-sm font-medium"
                    style={{ background: '#F5F3F0', color: '#2D2540' }}>
                    {naam}
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider" style={{ color: '#9B8FCE' }}>E-mail</label>
                  <div className="px-4 py-2.5 rounded-xl text-sm font-medium"
                    style={{ background: '#F5F3F0', color: '#2D2540' }}>
                    {email}
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Rollen tab */}
          <TabsContent value="rollen">
            <div className="rounded-2xl p-6 max-w-2xl" style={{ background: 'white' }}>
              <h2 className="text-base font-black mb-5" style={{ fontFamily: 'Manrope, sans-serif', color: '#2D2540' }}>
                Rolbeheer
              </h2>
              {isBeheerder ? (
                <GebruikerRollenBeheer
                  profielId={id}
                  beschikbareRollen={alle_rollen}
                  huidigeRolNamen={rol_namen as RolNaam[]}
                />
              ) : (
                <div className="flex flex-col gap-2">
                  {rol_namen.length === 0 ? (
                    <p className="text-sm" style={{ color: '#9B8FCE' }}>Geen rollen toegewezen.</p>
                  ) : (
                    rol_namen.map(naam => (
                      <div key={naam} className="px-4 py-2.5 rounded-xl text-sm font-medium"
                        style={{ background: '#F5F3F0', color: '#2D2540' }}>
                        {naam}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Locaties tab */}
          <TabsContent value="locaties">
            <div className="rounded-2xl p-6 max-w-2xl" style={{ background: 'white' }}>
              <h2 className="text-base font-black mb-5" style={{ fontFamily: 'Manrope, sans-serif', color: '#2D2540' }}>
                Locatietoegang
              </h2>
              {isBeheerder ? (
                <GebruikerLocatiesBeheer
                  profielId={id}
                  alleLocaties={alle_locaties}
                  toegewezenLocatieIds={locatie_ids}
                />
              ) : (
                <div className="flex flex-col gap-2">
                  {locatie_ids.length === 0 ? (
                    <p className="text-sm" style={{ color: '#9B8FCE' }}>Geen locaties toegewezen.</p>
                  ) : (
                    alle_locaties
                      .filter(l => locatie_ids.includes(l.id))
                      .map(l => (
                        <div key={l.id} className="px-4 py-2.5 rounded-xl text-sm font-medium"
                          style={{ background: '#F5F3F0', color: '#2D2540' }}>
                          {l.naam}
                        </div>
                      ))
                  )}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
