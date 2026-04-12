'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { RolBadge } from '@/components/rollen/RolBadge'
import type { ProfielMetRollenEnLocaties } from '@/types/rollen'

const ROL_KLEUREN: Record<string, string> = {
  klantadviseur:     '#3B82F6',
  vestigingsmanager: '#8B5CF6',
  personeelsplanner: '#10B981',
  regiomanager:      '#F59E0B',
  directie:          '#EF4444',
  beheerder:         '#1F2937',
}

interface GebruikersTableProps {
  gebruikers: ProfielMetRollenEnLocaties[]
}

export function GebruikersTable({ gebruikers }: GebruikersTableProps) {
  const [zoekterm, setZoekterm] = useState('')

  const gefilterd = useMemo(() => {
    const q = zoekterm.toLowerCase()
    if (!q) return gebruikers
    return gebruikers.filter(g =>
      g.naam.toLowerCase().includes(q) || g.email.toLowerCase().includes(q)
    )
  }, [gebruikers, zoekterm])

  return (
    <div className="flex flex-col gap-4">

      {/* Zoekbalk */}
      <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl border"
        style={{ background: 'white', borderColor: '#E8E4DF' }}>
        <span className="material-symbols-outlined text-xl" style={{ color: '#9B8FCE' }}>search</span>
        <input
          type="text"
          placeholder="Zoek op naam of e-mail..."
          value={zoekterm}
          onChange={e => setZoekterm(e.target.value)}
          className="flex-1 text-sm outline-none bg-transparent"
          style={{ color: '#2D2540' }}
        />
        {zoekterm && (
          <button onClick={() => setZoekterm('')} style={{ color: '#9B8FCE' }}>
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        )}
      </div>

      {/* Tabelkop */}
      <div
        className="grid gap-4 px-4 py-3 text-xs font-bold uppercase tracking-wider rounded-xl"
        style={{ gridTemplateColumns: '2fr 2fr 2fr 2fr 120px', color: '#9B8FCE', background: '#F0EDF8' }}
      >
        <span>Naam</span>
        <span>E-mail</span>
        <span>Rollen</span>
        <span>Locaties</span>
        <span className="text-right">Actie</span>
      </div>

      {/* Lege staat */}
      {gefilterd.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <span className="material-symbols-outlined text-5xl mb-3" style={{ color: '#C4BCDA' }}>manage_accounts</span>
          <p className="text-sm font-medium" style={{ color: '#8B82A8' }}>
            {zoekterm ? 'Geen gebruikers gevonden voor deze zoekterm.' : 'Nog geen gebruikers gevonden.'}
          </p>
        </div>
      )}

      {/* Rijen */}
      <div className="flex flex-col gap-1">
        {gefilterd.map(g => (
          <div
            key={g.id}
            className="grid gap-4 px-4 py-3 rounded-xl items-center"
            style={{ gridTemplateColumns: '2fr 2fr 2fr 2fr 120px', background: 'white' }}
          >
            {/* Naam */}
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                style={{ background: '#6B5B95' }}
              >
                {g.naam.charAt(0).toUpperCase()}
              </div>
              <span className="text-sm font-semibold truncate" style={{ color: '#2D2540' }}>{g.naam}</span>
            </div>

            {/* E-mail */}
            <span className="text-sm truncate" style={{ color: '#5C5470' }}>{g.email}</span>

            {/* Rollen */}
            <div className="flex items-center gap-1 flex-wrap">
              {g.rol_namen.slice(0, 2).map(naam => (
                <RolBadge key={naam} naam={naam} kleur={ROL_KLEUREN[naam]} size="sm" />
              ))}
              {g.rol_namen.length > 2 && (
                <span className="text-xs font-medium px-2 py-0.5 rounded-full"
                  style={{ background: '#F0EDF8', color: '#9B8FCE' }}>
                  +{g.rol_namen.length - 2} meer
                </span>
              )}
              {g.rol_namen.length === 0 && (
                <span className="text-xs" style={{ color: '#C4BCDA' }}>Geen rollen</span>
              )}
            </div>

            {/* Locaties */}
            <span className="text-sm truncate" style={{ color: '#5C5470' }}>
              {g.locatie_namen.length === 0
                ? <span style={{ color: '#C4BCDA' }}>Geen locaties</span>
                : g.locatie_namen.length <= 2
                  ? g.locatie_namen.join(', ')
                  : `${g.locatie_namen.slice(0, 2).join(', ')} +${g.locatie_namen.length - 2}`
              }
            </span>

            {/* Actie */}
            <div className="flex justify-end">
              <Link
                href={`/dashboard/gebruikers/${g.id}`}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                style={{ color: '#6B5B95', background: '#EDE9F8' }}
              >
                Bewerken
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
