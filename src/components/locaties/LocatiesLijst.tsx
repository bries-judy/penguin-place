'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import Link from 'next/link'
import { locatieDeactiveren } from '@/app/actions/locaties'
import type { LocatieType, LocatieStatus } from '@/types/locaties'
import { LOCATIE_TYPE_LABELS } from '@/types/locaties'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Manager {
  id: string
  profiles: { voornaam: string; achternaam: string } | null
}

interface LocatieRij {
  id: string
  naam: string
  code: string | null
  type: LocatieType | null
  status: LocatieStatus
  plaats: string
  telefoon: string
  email: string
  locatiemanager: Manager | null
  groepen: { id: string }[]
}

interface Props {
  locaties: LocatieRij[]
}

// ─── Helpers / constanten ─────────────────────────────────────────────────────

const LOCATIE_STATUS_CONFIG: Record<LocatieStatus, { label: string; bg: string; text: string; dot: string }> = {
  actief:    { label: 'Actief',    bg: 'bg-[#8df4ed]/40', text: 'text-[#006a66]', dot: 'bg-[#006a66]' },
  inactief:  { label: 'Inactief',  bg: 'bg-slate-100',    text: 'text-slate-500', dot: 'bg-slate-400' },
  in_opbouw: { label: 'In opbouw', bg: 'bg-amber-50',     text: 'text-amber-700', dot: 'bg-amber-500' },
}

const ALLE_TYPES: LocatieType[] = ['kdv', 'bso', 'peuterspeelzaal', 'gastouder', 'combinatie']
const ALLE_STATUSSEN: LocatieStatus[] = ['actief', 'in_opbouw', 'inactief']

function managerNaam(m: Manager | null): string {
  if (!m?.profiles) return '—'
  return [m.profiles.voornaam, m.profiles.achternaam].filter(Boolean).join(' ')
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function LocatiesLijst({ locaties }: Props) {
  const [zoek, setZoek]               = useState('')
  const [zoekDebounced, setDebounced] = useState('')
  const [filterTypes, setTypes]       = useState<LocatieType[]>([])
  const [filterStatussen, setStatussen] = useState<LocatieStatus[]>([])
  const [confirmId, setConfirmId]     = useState<string | null>(null)
  const [bezig, setBezig]             = useState(false)
  const [fout, setFout]               = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setDebounced(zoek), 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [zoek])

  const gefilterd = useMemo(() => {
    return locaties.filter(l => {
      const q = zoekDebounced.toLowerCase()
      if (q && !l.naam.toLowerCase().includes(q) && !l.code?.toLowerCase().includes(q) && !l.plaats.toLowerCase().includes(q)) return false
      if (filterTypes.length > 0 && (!l.type || !filterTypes.includes(l.type))) return false
      if (filterStatussen.length > 0 && !filterStatussen.includes(l.status)) return false
      return true
    })
  }, [locaties, zoekDebounced, filterTypes, filterStatussen])

  function toggleType(t: LocatieType) {
    setTypes(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])
  }

  function toggleStatus(s: LocatieStatus) {
    setStatussen(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])
  }

  async function handleDeactiveren(id: string) {
    setBezig(true)
    setFout(null)
    const res = await locatieDeactiveren(id)
    setBezig(false)
    if (res.error) {
      setFout(res.error)
    } else {
      setConfirmId(null)
    }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Top bar */}
      <header className="bg-white/70 backdrop-blur-md flex justify-between items-center px-8 py-4 border-b border-slate-100 sticky top-0 z-40">
        <div className="flex items-center gap-6">
          <h2 className="text-xl font-bold tracking-tight text-cyan-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Locaties
          </h2>
          <div className="hidden md:flex items-center bg-slate-100 px-4 py-2 rounded-full gap-2">
            <span className="material-symbols-outlined text-slate-400 text-sm">search</span>
            <input
              className="bg-transparent border-none outline-none text-sm w-44 text-slate-600 placeholder:text-slate-400"
              placeholder="Zoek op naam, code, plaats..."
              value={zoek}
              onChange={e => setZoek(e.target.value)}
            />
            {zoek && (
              <button onClick={() => setZoek('')} className="text-slate-400 hover:text-slate-600">
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            )}
          </div>
        </div>
        <Link
          href="/dashboard/locaties/nieuw"
          className="text-white px-5 py-2 rounded-xl text-sm font-bold shadow-lg transition-all hover:opacity-90 active:scale-95 flex items-center gap-2"
          style={{ background: 'linear-gradient(to right, #004d64, #006684)' }}
        >
          <span className="material-symbols-outlined text-lg">add</span>
          Nieuwe locatie toevoegen
        </Link>
      </header>

      <div className="flex-1 overflow-y-auto px-8 py-8 space-y-6">
        {/* Paginatitel */}
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-[#006684]/60">Locatiebeheer</span>
          <h1 className="text-3xl font-extrabold text-[#004d64] tracking-tight" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Alle locaties
          </h1>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center">
          {/* Type filter */}
          <div className="flex items-center gap-1 bg-[#e0e3e4] p-1 rounded-xl">
            <span className="px-2 text-xs font-bold text-slate-500 uppercase tracking-wider">Type</span>
            {ALLE_TYPES.map(t => (
              <button
                key={t}
                onClick={() => toggleType(t)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  filterTypes.includes(t)
                    ? 'bg-white text-[#004d64] shadow-sm'
                    : 'text-slate-500 hover:text-[#004d64]'
                }`}
              >
                {LOCATIE_TYPE_LABELS[t].split(' ')[0]}
              </button>
            ))}
          </div>

          {/* Status filter */}
          <div className="flex items-center gap-1 bg-[#e0e3e4] p-1 rounded-xl">
            <span className="px-2 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</span>
            {ALLE_STATUSSEN.map(s => (
              <button
                key={s}
                onClick={() => toggleStatus(s)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  filterStatussen.includes(s)
                    ? 'bg-white text-[#004d64] shadow-sm'
                    : 'text-slate-500 hover:text-[#004d64]'
                }`}
              >
                {LOCATIE_STATUS_CONFIG[s].label}
              </button>
            ))}
          </div>

          {(filterTypes.length > 0 || filterStatussen.length > 0) && (
            <button
              onClick={() => { setTypes([]); setStatussen([]) }}
              className="text-xs text-slate-400 hover:text-slate-600 underline"
            >
              Filters wissen
            </button>
          )}
        </div>

        {fout && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
            {fout}
          </div>
        )}

        {/* Tabel */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[800px]">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-100">
                  {['Naam', 'Code', 'Type', 'Plaats', 'Status', 'Manager', 'Groepen', 'Acties'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {gefilterd.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-16 text-center">
                      <span className="material-symbols-outlined text-5xl text-slate-200 block mb-3">location_city</span>
                      <p className="text-slate-400 font-semibold">
                        {locaties.length === 0
                          ? 'Nog geen locaties aangemaakt'
                          : `Geen resultaten voor "${zoekDebounced}"`}
                      </p>
                    </td>
                  </tr>
                ) : gefilterd.map(l => {
                  const cfg = LOCATIE_STATUS_CONFIG[l.status]
                  const isConfirming = confirmId === l.id

                  return (
                    <tr key={l.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Naam */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-[#bee9ff]/60 flex items-center justify-center text-[#004d64] font-black text-xs shrink-0">
                            {l.naam[0]}
                          </div>
                          <span className="font-bold text-[#181c1d]" style={{ fontFamily: 'Manrope, sans-serif' }}>
                            {l.naam}
                          </span>
                        </div>
                      </td>

                      {/* Code */}
                      <td className="px-4 py-3">
                        {l.code ? (
                          <span className="text-xs font-mono font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded">
                            {l.code}
                          </span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>

                      {/* Type */}
                      <td className="px-4 py-3 text-slate-600">
                        {l.type ? LOCATIE_TYPE_LABELS[l.type] : '—'}
                      </td>

                      {/* Plaats */}
                      <td className="px-4 py-3 text-slate-600">{l.plaats}</td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${cfg.bg} ${cfg.text}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                          {cfg.label}
                        </span>
                      </td>

                      {/* Manager */}
                      <td className="px-4 py-3 text-slate-600 text-sm">
                        {managerNaam(l.locatiemanager)}
                      </td>

                      {/* Groepen */}
                      <td className="px-4 py-3">
                        <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                          {l.groepen.length}
                        </span>
                      </td>

                      {/* Acties */}
                      <td className="px-4 py-3">
                        {isConfirming ? (
                          <div className="flex items-center gap-2 text-sm">
                            <span className="text-slate-500">Deactiveren?</span>
                            <button
                              onClick={() => handleDeactiveren(l.id)}
                              disabled={bezig}
                              className="text-red-600 font-bold hover:text-red-800 disabled:opacity-50"
                            >
                              Ja
                            </button>
                            <span className="text-slate-300">/</span>
                            <button
                              onClick={() => setConfirmId(null)}
                              className="text-slate-500 font-bold hover:text-slate-700"
                            >
                              Nee
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/dashboard/locaties/${l.id}`}
                              className="text-xs font-semibold text-[#006684] hover:text-[#004d64] flex items-center gap-1"
                            >
                              <span className="material-symbols-outlined text-sm">open_in_new</span>
                              Detail
                            </Link>
                            <span className="text-slate-200">|</span>
                            <button
                              onClick={() => setConfirmId(l.id)}
                              className="text-xs font-semibold text-slate-400 hover:text-red-500"
                            >
                              Deactiveren
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {gefilterd.length > 0 && (
          <p className="text-xs text-slate-400 text-center">
            {gefilterd.length} van {locaties.length} locaties weergegeven
          </p>
        )}
      </div>
    </div>
  )
}
