'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Search, Plus, ArrowUp, ArrowDown } from 'lucide-react'
import type { OuderLijstRij } from '@/types/ouders'

interface Props {
  ouders: OuderLijstRij[]
}

type SortKey = 'naam' | 'saldo'
type SortDir = 'asc' | 'desc'

function initialen(voornaam: string, achternaam: string) {
  return (voornaam.charAt(0) + achternaam.charAt(0)).toUpperCase() || '–'
}

function formatEuro(bedrag: number): string {
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(bedrag)
}

export default function OudersLijst({ ouders }: Props) {
  const [zoek, setZoek]         = useState('')
  const [toonInactief, setToon] = useState(false)
  // Default: alfabetisch op naam oplopend.
  const [sortKey, setSortKey]   = useState<SortKey>('naam')
  const [sortDir, setSortDir]   = useState<SortDir>('asc')

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      // Sensible defaults per kolom
      setSortDir(key === 'saldo' ? 'desc' : 'asc')
    }
  }

  const gefilterd = useMemo(() => {
    const q = zoek.trim().toLowerCase()
    const basis = ouders.filter(o => {
      if (!toonInactief && !o.actief) return false
      if (!q) return true
      const naam = `${o.voornaam} ${o.achternaam}`.toLowerCase()
      return naam.includes(q) || o.email.toLowerCase().includes(q)
    })

    const dir = sortDir === 'asc' ? 1 : -1
    return [...basis].sort((a, b) => {
      if (sortKey === 'saldo') {
        return (a.openstaand_bedrag - b.openstaand_bedrag) * dir
      }
      // naam: eerst achternaam, dan voornaam (case-insensitive nl-locale)
      const aKey = `${a.achternaam} ${a.voornaam}`.toLowerCase()
      const bKey = `${b.achternaam} ${b.voornaam}`.toLowerCase()
      return aKey.localeCompare(bKey, 'nl') * dir
    })
  }, [ouders, zoek, toonInactief, sortKey, sortDir])

  function SortIcon({ k }: { k: SortKey }) {
    if (k !== sortKey) return null
    return sortDir === 'asc'
      ? <ArrowUp className="inline w-3 h-3 ml-1" />
      : <ArrowDown className="inline w-3 h-3 ml-1" />
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <header
        className="bg-white/80 backdrop-blur-md flex items-center justify-between px-8 py-4 border-b sticky top-0 z-40"
        style={{ borderColor: '#E8E4DF' }}
      >
        <h1
          className="text-xl font-extrabold tracking-tight"
          style={{ fontFamily: 'Manrope, sans-serif', color: '#2D2540' }}
        >
          Ouders
        </h1>
        <div className="text-sm" style={{ color: '#5A5278' }}>
          {gefilterd.length} {gefilterd.length === 1 ? 'ouder' : 'ouders'}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-8 py-6">
        {/* Zoekbalk + filter */}
        <div className="flex items-center gap-3 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
              style={{ color: '#8B82A8' }}
            />
            <input
              type="text"
              value={zoek}
              onChange={e => setZoek(e.target.value)}
              placeholder="Zoek op naam of e-mail…"
              className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl border outline-none transition"
              style={{
                borderColor: '#C8C2D8',
                background: '#FFFFFF',
                color: '#2D2540',
              }}
            />
          </div>
          <label
            className="flex items-center gap-2 text-sm cursor-pointer select-none"
            style={{ color: '#5A5278' }}
          >
            <input
              type="checkbox"
              checked={toonInactief}
              onChange={e => setToon(e.target.checked)}
              className="w-4 h-4"
              style={{ accentColor: '#6B5B95' }}
            />
            Toon inactieve ouders
          </label>

          <button
            disabled
            title="Ouder uitnodigen — beschikbaar via kind-detail (Fase 1 heeft nog geen apart uitnodig-scherm)"
            className="ml-auto inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold rounded-xl opacity-50 cursor-not-allowed"
            style={{ background: '#6B5B95', color: '#FFFFFF' }}
          >
            <Plus className="w-4 h-4" />
            Nieuwe ouder
          </button>
        </div>

        {/* Tabel */}
        <div
          className="bg-white rounded-xl border overflow-hidden"
          style={{ borderColor: '#E8E4DF' }}
        >
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: '#F5F3F0' }}>
                <th className="text-left px-4 py-3 font-semibold" style={{ color: '#5A5278' }}>
                  <button
                    type="button"
                    onClick={() => toggleSort('naam')}
                    className="inline-flex items-center hover:text-[#2D2540]"
                  >
                    Naam <SortIcon k="naam" />
                  </button>
                </th>
                <th className="text-left px-4 py-3 font-semibold" style={{ color: '#5A5278' }}>E-mail</th>
                <th className="text-left px-4 py-3 font-semibold" style={{ color: '#5A5278' }}>Telefoon</th>
                <th className="text-left px-4 py-3 font-semibold" style={{ color: '#5A5278' }}>Kinderen</th>
                <th className="text-right px-4 py-3 font-semibold" style={{ color: '#5A5278' }}>
                  <button
                    type="button"
                    onClick={() => toggleSort('saldo')}
                    className="inline-flex items-center hover:text-[#2D2540]"
                  >
                    Openstaand <SortIcon k="saldo" />
                  </button>
                </th>
                <th className="text-left px-4 py-3 font-semibold" style={{ color: '#5A5278' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {gefilterd.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center" style={{ color: '#8B82A8' }}>
                    Geen ouders gevonden.
                  </td>
                </tr>
              ) : (
                gefilterd.map(o => (
                  <tr
                    key={o.id}
                    className="border-t transition hover:bg-[#EDE9F8]/50"
                    style={{ borderColor: '#EDEAE4' }}
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/dashboard/ouders/${o.id}`}
                        className="flex items-center gap-3 font-semibold"
                        style={{ color: '#2D2540' }}
                      >
                        <span
                          className="inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold"
                          style={{ background: '#EDE9F8', color: '#6B5B95' }}
                        >
                          {initialen(o.voornaam, o.achternaam)}
                        </span>
                        {o.voornaam} {o.achternaam}
                      </Link>
                    </td>
                    <td className="px-4 py-3" style={{ color: '#5A5278' }}>
                      <a href={`mailto:${o.email}`} className="hover:underline">
                        {o.email}
                      </a>
                    </td>
                    <td className="px-4 py-3" style={{ color: '#5A5278' }}>
                      {o.telefoon_mobiel ? (
                        <a href={`tel:${o.telefoon_mobiel}`} className="hover:underline">
                          {o.telefoon_mobiel}
                        </a>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-4 py-3" style={{ color: '#5A5278' }}>
                      {o.aantal_kinderen}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {o.openstaand_bedrag > 0 ? (
                        <span
                          className="font-bold"
                          style={{ color: '#ba1a1a' }}
                          title={o.aantal_openstaand === 1
                            ? '1 openstaande factuur'
                            : `${o.aantal_openstaand} openstaande facturen`}
                        >
                          {formatEuro(o.openstaand_bedrag)}
                        </span>
                      ) : (
                        <span style={{ color: '#C8C2D8' }}>—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold"
                        style={
                          o.actief
                            ? { background: '#D8F0E4', color: '#1a6b40' }
                            : { background: '#F0EDFF', color: '#6B5B95' }
                        }
                      >
                        {o.actief ? 'Actief' : 'Inactief'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
