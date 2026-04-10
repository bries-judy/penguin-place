'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import type { Opvangtype, ContractStatus } from '@/lib/supabase/types'

// ─── Types ────────────────────────────────────────────────────────────────────

interface KindRij {
  id: string
  voornaam: string
  tussenvoegsel: string | null
  achternaam: string
  geboortedatum: string | null
  verwachte_geboortedatum: string | null
  geslacht: string | null
  actief: boolean
  aangemeld_op: string
  contracten: {
    id: string
    status: ContractStatus
    opvangtype: Opvangtype
    startdatum: string
    locatie_id: string
    locaties: { naam: string } | null
  }[]
}

interface Props {
  kinderen: KindRij[]
  locaties: { id: string; naam: string }[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function volledigeNaam(k: KindRij) {
  return [k.voornaam, k.tussenvoegsel, k.achternaam].filter(Boolean).join(' ')
}

function kindStatus(k: KindRij): 'actief' | 'wachtlijst' | 'concept' | 'gearchiveerd' {
  if (!k.actief) return 'gearchiveerd'
  const actief = k.contracten.find(c => c.status === 'actief')
  if (actief) return 'actief'
  const wacht = k.contracten.find(c => c.status === 'wachtlijst')
  if (wacht) return 'wachtlijst'
  const concept = k.contracten.find(c => c.status === 'concept')
  if (concept) return 'concept'
  return 'wachtlijst'
}

function leeftijd(geboortedatum: string | null, verwacht: string | null): string {
  const datum = geboortedatum ?? verwacht
  if (!datum) return '?'
  const geb = new Date(datum)
  const nu  = new Date()
  const mnd = (nu.getFullYear() - geb.getFullYear()) * 12 + (nu.getMonth() - geb.getMonth())
  if (!geboortedatum) return `~${mnd}m (verwacht)`
  if (mnd < 12) return `${mnd}m`
  const jr = Math.floor(mnd / 12)
  return `${jr}j ${mnd % 12}m`
}

const STATUS_CONFIG = {
  actief:       { label: 'Actief',      bg: 'bg-[#8df4ed]/40', text: 'text-[#006a66]', dot: 'bg-[#006a66]' },
  wachtlijst:   { label: 'Wachtlijst',  bg: 'bg-[#bee9ff]/60', text: 'text-[#004d64]', dot: 'bg-[#006684]' },
  concept:      { label: 'Concept',     bg: 'bg-slate-100',    text: 'text-slate-500', dot: 'bg-slate-400' },
  gearchiveerd: { label: 'Gearchiveerd',bg: 'bg-slate-50',     text: 'text-slate-400', dot: 'bg-slate-300' },
}

const OPVANG_LABEL: Record<Opvangtype, string> = {
  kdv: 'KDV', bso: 'BSO', peuteropvang: 'Peuter', gastouder: 'GO',
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function KinderenLijst({ kinderen, locaties }: Props) {
  const [zoek, setZoek]               = useState('')
  const [filterStatus, setStatus]     = useState<'alle' | 'actief' | 'wachtlijst' | 'concept' | 'gearchiveerd'>('actief')
  const [filterLocatie, setLocatie]   = useState('alle')

  const gefilterd = useMemo(() => {
    return kinderen.filter(k => {
      const naam = volledigeNaam(k).toLowerCase()
      if (zoek && !naam.includes(zoek.toLowerCase())) return false

      const status = kindStatus(k)
      if (filterStatus !== 'alle' && status !== filterStatus) return false

      if (filterLocatie !== 'alle') {
        const opLocatie = k.contracten.some(c => c.locatie_id === filterLocatie && c.status === 'actief')
        if (!opLocatie) return false
      }
      return true
    })
  }, [kinderen, zoek, filterStatus, filterLocatie])

  const counts = useMemo(() => ({
    actief:       kinderen.filter(k => kindStatus(k) === 'actief').length,
    wachtlijst:   kinderen.filter(k => kindStatus(k) === 'wachtlijst').length,
    concept:      kinderen.filter(k => kindStatus(k) === 'concept').length,
    gearchiveerd: kinderen.filter(k => kindStatus(k) === 'gearchiveerd').length,
  }), [kinderen])

  const tabs = [
    { value: 'actief' as const,       label: 'Actief',      count: counts.actief },
    { value: 'wachtlijst' as const,   label: 'Wachtlijst',  count: counts.wachtlijst },
    { value: 'concept' as const,      label: 'Concept',     count: counts.concept },
    { value: 'gearchiveerd' as const, label: 'Archief',     count: counts.gearchiveerd },
    { value: 'alle' as const,         label: 'Alle',        count: kinderen.length },
  ]

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Top bar */}
      <header className="bg-white/70 backdrop-blur-md flex justify-between items-center px-8 py-4 border-b border-slate-100 sticky top-0 z-40">
        <div className="flex items-center gap-6">
          <h2 className="text-xl font-bold tracking-tight text-cyan-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Kinderen
          </h2>
          <div className="hidden md:flex items-center bg-slate-100 px-4 py-2 rounded-full gap-2">
            <span className="material-symbols-outlined text-slate-400 text-sm">search</span>
            <input
              className="bg-transparent border-none outline-none text-sm w-44 text-slate-600 placeholder:text-slate-400"
              placeholder="Zoek op naam..."
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
        <div className="flex items-center gap-3">
          <select
            value={filterLocatie}
            onChange={e => setLocatie(e.target.value)}
            className="border border-slate-200 rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 bg-white focus:outline-none focus:ring-2 focus:ring-[#006684]/30"
          >
            <option value="alle">Alle locaties</option>
            {locaties.map(l => <option key={l.id} value={l.id}>{l.naam}</option>)}
          </select>
          <Link
            href="/dashboard/kinderen/nieuw"
            className="text-white px-5 py-2 rounded-xl text-sm font-bold shadow-lg transition-all hover:opacity-90 active:scale-95 flex items-center gap-2"
            style={{ background: 'linear-gradient(to right, #004d64, #006684)' }}
          >
            <span className="material-symbols-outlined text-lg">add</span>
            Kind aanmelden
          </Link>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-8 py-8 space-y-6">
        {/* Paginatitel */}
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-[#006684]/60">Kindregistratie</span>
          <h1 className="text-3xl font-extrabold text-[#004d64] tracking-tight" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Alle kinderen
          </h1>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Actief geplaatst', value: counts.actief,     icon: 'check_circle',   color: 'text-[#006a66]', bg: 'bg-[#8df4ed]/30' },
            { label: 'Op wachtlijst',    value: counts.wachtlijst, icon: 'pending_actions', color: 'text-[#004d64]', bg: 'bg-[#bee9ff]/40' },
            { label: 'Concept',          value: counts.concept,    icon: 'edit_note',       color: 'text-slate-500', bg: 'bg-slate-100' },
            { label: 'Gearchiveerd',     value: counts.gearchiveerd, icon: 'archive',       color: 'text-slate-400', bg: 'bg-slate-50' },
          ].map(s => (
            <div key={s.label} className={`${s.bg} rounded-2xl p-5 flex items-center gap-4`}>
              <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center">
                <span className={`material-symbols-outlined ${s.color}`}>{s.icon}</span>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{s.label}</p>
                <h4 className={`text-2xl font-black ${s.color}`} style={{ fontFamily: 'Manrope, sans-serif' }}>{s.value}</h4>
              </div>
            </div>
          ))}
        </div>

        {/* Status tabs */}
        <div className="flex items-center gap-1 bg-[#e0e3e4] p-1 rounded-xl w-fit">
          {tabs.map(t => (
            <button
              key={t.value}
              onClick={() => setStatus(t.value)}
              className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                filterStatus === t.value
                  ? 'bg-white text-[#004d64] shadow-sm'
                  : 'text-slate-500 hover:text-[#004d64]'
              }`}
            >
              {t.label}
              <span className={`ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                filterStatus === t.value ? 'bg-[#bee9ff] text-[#004d64]' : 'bg-slate-200 text-slate-500'
              }`}>
                {t.count}
              </span>
            </button>
          ))}
        </div>

        {/* Kinderenlijst */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          {/* Tabel header */}
          <div className="grid bg-slate-50/70 border-b border-slate-100 px-6 py-3"
            style={{ gridTemplateColumns: '1fr 6rem 5rem 10rem 8rem auto' }}>
            {['Naam', 'Leeftijd', 'Type', 'Locatie', 'Status', ''].map(h => (
              <span key={h} className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{h}</span>
            ))}
          </div>

          <div className="divide-y divide-slate-50">
            {gefilterd.length === 0 ? (
              <div className="py-16 text-center">
                <span className="material-symbols-outlined text-5xl text-slate-200 block mb-3">
                  {zoek ? 'search_off' : 'child_care'}
                </span>
                <p className="text-slate-400 font-semibold">
                  {zoek ? `Geen resultaten voor "${zoek}"` : 'Geen kinderen gevonden'}
                </p>
              </div>
            ) : gefilterd.map(k => {
              const status = kindStatus(k)
              const cfg    = STATUS_CONFIG[status]
              const actief = k.contracten.find(c => c.status === 'actief')
              const locNaam = actief?.locaties?.naam ?? k.contracten[0]?.locaties?.naam ?? '—'
              const opvang  = actief?.opvangtype ?? k.contracten[0]?.opvangtype

              return (
                <Link
                  key={k.id}
                  href={`/dashboard/kinderen/${k.id}`}
                  className="grid px-6 py-4 items-center gap-2 hover:bg-slate-50/60 transition-colors"
                  style={{ gridTemplateColumns: '1fr 6rem 5rem 10rem 8rem auto' }}
                >
                  {/* Naam */}
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-[#bee9ff]/60 flex items-center justify-center text-[#004d64] font-black text-sm shrink-0">
                      {k.voornaam[0]}{k.achternaam[0]}
                    </div>
                    <div>
                      <p className="font-bold text-[#181c1d] text-sm" style={{ fontFamily: 'Manrope, sans-serif' }}>
                        {volledigeNaam(k)}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {k.geboortedatum
                          ? new Date(k.geboortedatum).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })
                          : k.verwachte_geboortedatum
                          ? `Verwacht ${new Date(k.verwachte_geboortedatum).toLocaleDateString('nl-NL', { month: 'long', year: 'numeric' })}`
                          : 'Geboortedatum onbekend'}
                      </p>
                    </div>
                  </div>

                  {/* Leeftijd */}
                  <span className="text-sm font-semibold text-slate-600">
                    {leeftijd(k.geboortedatum, k.verwachte_geboortedatum)}
                  </span>

                  {/* Opvangtype */}
                  <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full w-fit">
                    {opvang ? OPVANG_LABEL[opvang] : '—'}
                  </span>

                  {/* Locatie */}
                  <span className="text-sm text-slate-600 truncate">{locNaam}</span>

                  {/* Status */}
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold w-fit ${cfg.bg} ${cfg.text}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                    {cfg.label}
                  </span>

                  {/* Chevron */}
                  <span className="material-symbols-outlined text-slate-300 text-lg">chevron_right</span>
                </Link>
              )
            })}
          </div>
        </div>

        {gefilterd.length > 0 && (
          <p className="text-xs text-slate-400 text-center">{gefilterd.length} van {kinderen.length} kinderen weergegeven</p>
        )}
      </div>
    </div>
  )
}
