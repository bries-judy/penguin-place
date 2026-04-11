'use client'

import { useState, useTransition, useMemo } from 'react'
import type { WachtlijstEntry, WachtlijstStatus, Opvangtype } from '@/lib/supabase/types'
import { aanbodDoen, aanbodVerwerken, wachtlijstAnnuleren } from '@/app/actions/wachtlijst'

// ─── Types ──────────────────────────────────────────────────────────────────

interface Locatie { id: string; naam: string }
interface Groep   { id: string; naam: string; locatie_id: string; leeftijdscategorie: string; max_capaciteit: number }

interface ContractBezetting {
  id: string
  groep_id: string
  zorgdagen: number[]
  startdatum: string
  einddatum: string | null
}

interface Props {
  wachtlijst:  WachtlijstEntry[]
  locaties:    Locatie[]
  groepen:     Groep[]
  contracten:  ContractBezetting[]
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const DAG_LABELS = ['Ma', 'Di', 'Wo', 'Do', 'Vr']

const OPVANG_LABELS: Record<Opvangtype, string> = {
  kdv: 'KDV', bso: 'BSO', peuteropvang: 'Peuter', gastouder: 'GO',
}

const STATUS_CONFIG: Record<WachtlijstStatus, { label: string; bg: string; text: string; dot: string }> = {
  wachtend:    { label: 'Wachtend',    bg: 'bg-[#EDE9F8]',    text: 'text-[#6B5B95]', dot: 'bg-[#9B8FCE]' },
  aangeboden:  { label: 'Aangeboden',  bg: 'bg-[#FFB5A7]/40', text: 'text-[#7A3020]', dot: 'bg-[#FF8A70]' },
  geplaatst:   { label: 'Geplaatst',   bg: 'bg-[#A8D5BA]/40', text: 'text-[#1F5C35]', dot: 'bg-[#5BAF80]' },
  vervallen:   { label: 'Vervallen',   bg: 'bg-slate-100',    text: 'text-slate-500', dot: 'bg-slate-400' },
  geannuleerd: { label: 'Geannuleerd', bg: 'bg-slate-100',    text: 'text-slate-500', dot: 'bg-slate-400' },
}

function leeftijdLabel(geboortedatum: string) {
  const geb = new Date(geboortedatum)
  const nu  = new Date()
  const mnd = (nu.getFullYear() - geb.getFullYear()) * 12 + (nu.getMonth() - geb.getMonth())
  if (mnd < 12) return `${mnd}m`
  const jr = Math.floor(mnd / 12)
  const rm = mnd % 12
  return rm > 0 ? `${jr}j ${rm}m` : `${jr}j`
}

function datumKort(iso: string) {
  return new Date(iso).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })
}

function parseDateUTC(s: string): number {
  const [y, m, d] = s.split('-').map(Number)
  return Date.UTC(y, m - 1, d)
}

function computeBezettingOpDag(contracten: ContractBezetting[], groepId: string, dagIndex: number): number {
  const nu = Date.now()
  let count = 0
  for (const c of contracten) {
    if (c.groep_id !== groepId) continue
    if (!c.zorgdagen.includes(dagIndex)) continue
    if (parseDateUTC(c.startdatum) > nu) continue
    if (c.einddatum && parseDateUTC(c.einddatum) < nu) continue
    count++
  }
  return count
}

function groepBezettingInfo(
  contracten: ContractBezetting[],
  groep: Groep,
  gewensteDagen: number[]
): { kleur: 'groen' | 'oranje' | 'rood'; label: string } {
  if (gewensteDagen.length === 0) {
    return { kleur: 'groen', label: `max ${groep.max_capaciteit}` }
  }
  const vrijPerDag = gewensteDagen.map(d => {
    const bez = computeBezettingOpDag(contracten, groep.id, d)
    return { dag: d, vrij: groep.max_capaciteit - bez }
  })
  const minVrij = Math.min(...vrijPerDag.map(v => v.vrij))
  const pct = minVrij / groep.max_capaciteit
  const dagStr = vrijPerDag.map(v => `${DAG_LABELS[v.dag]}: ${Math.max(0, v.vrij)} vrij`).join(' · ')
  const kleur: 'groen' | 'oranje' | 'rood' = minVrij <= 0 ? 'rood' : pct <= 0.2 ? 'oranje' : 'groen'
  return { kleur, label: dagStr }
}

function StatusBadge({ status }: { status: WachtlijstStatus }) {
  const c = STATUS_CONFIG[status]
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${c.bg} ${c.text}`}>
      <span className={`w-2 h-2 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  )
}

// ─── Aanbod Modal ────────────────────────────────────────────────────────────

function AanbodModal({
  entry, locaties, groepen, contracten, onClose,
}: {
  entry: WachtlijstEntry
  locaties: Locatie[]
  groepen: Groep[]
  contracten: ContractBezetting[]
  onClose: () => void
}) {
  const [isPending, startTransition] = useTransition()
  const [selectedLocatie, setSelectedLocatie] = useState(
    entry.locatievoorkeuren[0]?.locatie_id ?? locaties[0]?.id ?? ''
  )
  const [selectedGroepId, setSelectedGroepId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const locatieGroepen = groepen.filter(g => g.locatie_id === selectedLocatie)
  const defaultVerloopdatum = new Date()
  defaultVerloopdatum.setDate(defaultVerloopdatum.getDate() + 14)
  const defaultVerloopdatumStr = defaultVerloopdatum.toISOString().slice(0, 10)
  const gewensteDagen: number[] = entry.gewenste_dagen ?? []

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = await aanbodDoen(fd)
      if (result?.error) setError(result.error)
      else onClose()
    })
  }

  const geselecteerdeGroep = locatieGroepen.find(g => g.id === selectedGroepId)
  const bezInfo = geselecteerdeGroep ? groepBezettingInfo(contracten, geselecteerdeGroep, gewensteDagen) : null
  const bezKleurMap = { groen: '#006a66', oranje: '#e07b00', rood: '#ba1a1a' }
  const bezBgMap = { groen: '#e8f5f0', oranje: '#fff3e0', rood: '#fce8e8' }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-black text-[#2D2540]" style={{ fontFamily: 'Manrope, sans-serif' }}>Aanbod doen</h3>
            <p className="text-sm text-slate-500 mt-0.5">{entry.kinderen.voornaam} {entry.kinderen.achternaam}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <input type="hidden" name="wachtlijst_id" value={entry.id} />
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Locatie</label>
            <select name="locatie_id" value={selectedLocatie} onChange={e => { setSelectedLocatie(e.target.value); setSelectedGroepId('') }}
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-[#2D2540] bg-white focus:outline-none focus:ring-2 focus:ring-[#9B8FCE]/30">
              {locaties.map(l => (
                <option key={l.id} value={l.id}>
                  {l.naam}{entry.locatievoorkeuren.find(lv => lv.locatie_id === l.id) ? ' ★ voorkeur' : ''}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Groep (optioneel)</label>
            <select name="groep_id" value={selectedGroepId} onChange={e => setSelectedGroepId(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-[#2D2540] bg-white focus:outline-none focus:ring-2 focus:ring-[#9B8FCE]/30">
              <option value="">— Nog niet toegewezen —</option>
              {locatieGroepen.map(g => {
                const info = groepBezettingInfo(contracten, g, gewensteDagen)
                return (
                  <option key={g.id} value={g.id}>
                    {g.naam} — {info.label}
                  </option>
                )
              })}
            </select>
            {bezInfo && (
              <div
                className="mt-1.5 px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2"
                style={{ background: bezBgMap[bezInfo.kleur], color: bezKleurMap[bezInfo.kleur] }}
              >
                <span className="material-symbols-outlined text-sm">
                  {bezInfo.kleur === 'groen' ? 'check_circle' : bezInfo.kleur === 'oranje' ? 'warning' : 'cancel'}
                </span>
                {bezInfo.label}
              </div>
            )}
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Verloopdatum reactie</label>
            <input type="date" name="verloopdatum" defaultValue={defaultVerloopdatumStr}
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-[#2D2540] bg-white focus:outline-none focus:ring-2 focus:ring-[#9B8FCE]/30" />
            <p className="text-[11px] text-slate-400">Ouder heeft tot deze datum om te reageren.</p>
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Bericht aan ouder</label>
            <textarea name="notities" rows={3}
              placeholder="Optioneel — bijv. 'Er is een plek beschikbaar in groep Regenboog per 1 juni...'"
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-[#2D2540] bg-white resize-none focus:outline-none focus:ring-2 focus:ring-[#9B8FCE]/30 placeholder:text-slate-300" />
          </div>
          {error && <p className="text-sm text-[#ba1a1a] bg-[#ba1a1a]/10 px-4 py-2 rounded-xl">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-500 hover:bg-slate-50 transition-colors">
              Annuleren
            </button>
            <button type="submit" disabled={isPending}
              className="flex-1 py-2.5 rounded-xl text-white text-sm font-bold shadow-md transition-all hover:opacity-90 active:scale-95 disabled:opacity-60"
              style={{ background: 'linear-gradient(to right, #6B5B95, #9B8FCE)' }}>
              {isPending ? 'Versturen…' : 'Aanbod versturen'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Aanbieding Strip ────────────────────────────────────────────────────────

function AanbiedingStrip({ entry, onVerwerken }: { entry: WachtlijstEntry; onVerwerken: (fd: FormData) => void }) {
  const openAanbieding = entry.aanbiedingen.find(a => a.status === 'openstaand')
  if (!openAanbieding) return null
  const verloopt = openAanbieding.verloopdatum ? new Date(openAanbieding.verloopdatum) < new Date() : false

  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3 bg-[#FFF3F0] rounded-xl border border-[#FFB5A7]/50 text-sm">
      <div className="flex items-center gap-2 text-[#7A3020] font-medium">
        <span className="material-symbols-outlined text-base">schedule</span>
        <span>
          Aanbod gedaan {datumKort(openAanbieding.aangeboden_op)}
          {openAanbieding.verloopdatum && (
            <> · <span className={verloopt ? 'text-[#ba1a1a] font-bold' : ''}>
              verloopt {datumKort(openAanbieding.verloopdatum)}
            </span></>
          )}
        </span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <form action={onVerwerken}>
          <input type="hidden" name="aanbieding_id" value={openAanbieding.id} />
          <input type="hidden" name="wachtlijst_id" value={entry.id} />
          <input type="hidden" name="status" value="geaccepteerd" />
          <button type="submit" className="px-3 py-1.5 rounded-lg bg-[#A8D5BA] text-[#1F5C35] text-xs font-bold hover:opacity-90 transition-opacity">
            Geaccepteerd
          </button>
        </form>
        <form action={onVerwerken}>
          <input type="hidden" name="aanbieding_id" value={openAanbieding.id} />
          <input type="hidden" name="wachtlijst_id" value={entry.id} />
          <input type="hidden" name="status" value="geweigerd" />
          <button type="submit" className="px-3 py-1.5 rounded-lg bg-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-300 transition-colors">
            Geweigerd
          </button>
        </form>
      </div>
    </div>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function WachtlijstDashboard({ wachtlijst, locaties, groepen, contracten }: Props) {
  const [zoekterm, setZoekterm]           = useState('')
  const [filterLocatie, setFilterLocatie] = useState<string>('alle')
  const [filterStatus, setFilterStatus]   = useState<WachtlijstStatus | 'alle'>('alle')
  const [aanbodEntry, setAanbodEntry]     = useState<WachtlijstEntry | null>(null)
  const [, startTransition]              = useTransition()

  const [expandedIds, setExpandedIds] = useState<Set<string>>(() =>
    new Set(wachtlijst.filter(w => w.status === 'aangeboden').map(w => w.id))
  )
  const toggleExpand = (id: string) =>
    setExpandedIds(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s })

  const gefilterd = useMemo(() => wachtlijst.filter(w => {
    const naam = `${w.kinderen.voornaam} ${w.kinderen.achternaam}`.toLowerCase()
    if (zoekterm && !naam.includes(zoekterm.toLowerCase())) return false
    if (filterStatus !== 'alle' && w.status !== filterStatus) return false
    if (filterLocatie !== 'alle' && !w.locatievoorkeuren.some(lv => lv.locatie_id === filterLocatie)) return false
    return true
  }), [wachtlijst, zoekterm, filterStatus, filterLocatie])

  const positieMap = useMemo(() => {
    const wachtend = wachtlijst
      .filter(w => w.status === 'wachtend')
      .sort((a, b) => b.prioriteit - a.prioriteit || new Date(a.aangemeld_op).getTime() - new Date(b.aangemeld_op).getTime())
    const map: Record<string, number> = {}
    wachtend.forEach((w, i) => { map[w.id] = i + 1 })
    return map
  }, [wachtlijst])

  const stats = useMemo(() => ({
    wachtend:   wachtlijst.filter(w => w.status === 'wachtend').length,
    aangeboden: wachtlijst.filter(w => w.status === 'aangeboden').length,
    geplaatst:  wachtlijst.filter(w => w.status === 'geplaatst').length,
    totaal:     wachtlijst.length,
  }), [wachtlijst])

  const handleVerwerken = (fd: FormData) => startTransition(async () => { await aanbodVerwerken(fd) })
  const handleAnnuleren = (id: string) => {
    if (!confirm('Wachtlijstinschrijving annuleren?')) return
    startTransition(async () => { await wachtlijstAnnuleren(id) })
  }

  const statusTabs: { value: WachtlijstStatus | 'alle'; label: string; count?: number }[] = [
    { value: 'alle',       label: 'Alles',      count: stats.totaal },
    { value: 'wachtend',   label: 'Wachtend',   count: stats.wachtend },
    { value: 'aangeboden', label: 'Aangeboden', count: stats.aangeboden },
    { value: 'geplaatst',  label: 'Geplaatst',  count: stats.geplaatst },
  ]

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Top bar */}
      <header className="bg-white/80 backdrop-blur-md flex justify-between items-center px-8 py-4 border-b border-slate-100 sticky top-0 z-40">
        <div className="flex items-center gap-6">
          <h2 className="text-xl font-bold tracking-tight text-[#2D2540]" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Wachtlijstbeheer
          </h2>
          <div className="hidden md:flex items-center bg-slate-100 px-4 py-2 rounded-full gap-2">
            <span className="material-symbols-outlined text-slate-400 text-sm">search</span>
            <input
              className="bg-transparent border-none outline-none text-sm w-40 text-slate-700 placeholder:text-slate-400"
              placeholder="Zoek kinderen..."
              value={zoekterm}
              onChange={e => setZoekterm(e.target.value)}
            />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button className="p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors">
            <span className="material-symbols-outlined">notifications</span>
          </button>
          <button
            className="text-white px-5 py-2 rounded-lg text-sm font-bold shadow-lg transition-all hover:opacity-90 active:scale-95"
            style={{ background: 'linear-gradient(to right, #6B5B95, #9B8FCE)' }}
          >
            Kind aanmelden
          </button>
          <div className="w-9 h-9 rounded-full bg-[#EDE9F8] flex items-center justify-center text-[#6B5B95] font-bold text-sm">
            J
          </div>
        </div>
      </header>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-8 py-6 space-y-5">

        {/* Paginatitel */}
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-[#9B8FCE]" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Plaatsingsbeheer
          </span>
          <h1 className="text-2xl font-extrabold text-[#2D2540] tracking-tight mt-0.5" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Wachtlijst
          </h1>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Totaal aangemeld', value: stats.totaal,     icon: 'list',            textColor: 'text-[#2D2540]',  bg: 'bg-white',          iconBg: 'bg-[#EDE9F8]',    iconColor: 'text-[#6B5B95]' },
            { label: 'Wachtend',         value: stats.wachtend,   icon: 'hourglass_empty', textColor: 'text-[#6B5B95]',  bg: 'bg-[#EDE9F8]',      iconBg: 'bg-white',         iconColor: 'text-[#6B5B95]' },
            { label: 'Aangeboden',       value: stats.aangeboden, icon: 'send',            textColor: 'text-[#7A3020]',  bg: 'bg-[#FFF3F0]',      iconBg: 'bg-white',         iconColor: 'text-[#FF8A70]' },
            { label: 'Geplaatst',        value: stats.geplaatst,  icon: 'check_circle',    textColor: 'text-[#1F5C35]',  bg: 'bg-[#EDFAF4]',      iconBg: 'bg-white',         iconColor: 'text-[#5BAF80]' },
          ].map(s => (
            <div key={s.label} className={`${s.bg} rounded-2xl p-4 flex items-center gap-3 border border-[#E8E4DE]`}>
              <div className={`w-10 h-10 ${s.iconBg} rounded-xl flex items-center justify-center shrink-0`}>
                <span className={`material-symbols-outlined ${s.iconColor}`}>{s.icon}</span>
              </div>
              <div>
                <p className="text-[11px] font-semibold text-slate-500 leading-tight">{s.label}</p>
                <p className={`text-2xl font-black ${s.textColor} leading-tight`} style={{ fontFamily: 'Manrope, sans-serif' }}>{s.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-1 bg-[#EDE9E4] p-1 rounded-xl">
            {statusTabs.map(t => (
              <button
                key={t.value}
                onClick={() => setFilterStatus(t.value)}
                className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                  filterStatus === t.value
                    ? 'bg-white text-[#6B5B95] shadow-sm'
                    : 'text-[#5A5278] hover:text-[#6B5B95]'
                }`}
              >
                {t.label}
                {t.count !== undefined && (
                  <span className={`ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    filterStatus === t.value ? 'bg-[#EDE9F8] text-[#6B5B95]' : 'bg-white/60 text-slate-500'
                  }`}>
                    {t.count}
                  </span>
                )}
              </button>
            ))}
          </div>
          <select
            value={filterLocatie}
            onChange={e => setFilterLocatie(e.target.value)}
            className="border border-[#E8E4DE] rounded-xl px-4 py-2 text-sm font-semibold text-[#2D2540] bg-white focus:outline-none focus:ring-2 focus:ring-[#9B8FCE]/30"
          >
            <option value="alle">Alle locaties</option>
            {locaties.map(l => <option key={l.id} value={l.id}>{l.naam}</option>)}
          </select>
        </div>

        {/* Wachtlijst kaarten */}
        {gefilterd.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#E8E4DE] py-16 text-center">
            <span className="material-symbols-outlined text-5xl text-slate-200 block mb-3">inbox</span>
            <p className="text-slate-500 font-semibold">Geen resultaten gevonden</p>
            <p className="text-slate-400 text-sm mt-1">Pas de filters aan of voeg een kind toe.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {gefilterd.map(entry => {
              const positie = positieMap[entry.id]
              const hoogstePrioriteit = entry.prioriteit > 0
              const isExpanded = expandedIds.has(entry.id)

              return (
                <div
                  key={entry.id}
                  className={`bg-white rounded-xl border transition-all cursor-pointer ${
                    hoogstePrioriteit
                      ? 'border-[#9B8FCE] shadow-sm shadow-[#9B8FCE]/10'
                      : 'border-[#E8E4DE] hover:border-[#C8C2D8]'
                  }`}
                  onClick={() => toggleExpand(entry.id)}
                >
                  {/* Prioriteitsbalk bovenaan */}
                  {hoogstePrioriteit && (
                    <div className="h-0.5 rounded-t-xl bg-gradient-to-r from-[#6B5B95] to-[#9B8FCE]" />
                  )}

                  <div className="px-4 py-3.5">
                    {/* Hoofdrij */}
                    <div className="flex items-start justify-between gap-4">
                      {/* Links */}
                      <div className="flex items-start gap-3 min-w-0">
                        {/* Positie badge */}
                        <div className="shrink-0 pt-0.5">
                          {positie ? (
                            <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-black ${
                              positie === 1  ? 'bg-[#6B5B95] text-white' :
                              positie <= 3   ? 'bg-[#EDE9F8] text-[#6B5B95]' :
                                               'bg-slate-100 text-slate-500'
                            }`}>
                              {positie}
                            </span>
                          ) : (
                            <span className="inline-flex items-center justify-center w-7 h-7 text-slate-300 text-sm font-bold">—</span>
                          )}
                        </div>

                        {/* Naam, locatie, details */}
                        <div className="min-w-0 flex-1">
                          {/* Naam + prioriteit tag */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[15px] font-bold text-[#2D2540] leading-snug" style={{ fontFamily: 'Manrope, sans-serif' }}>
                              {entry.kinderen.voornaam} {entry.kinderen.achternaam}
                            </span>
                            {hoogstePrioriteit && (
                              <span className="text-[10px] font-bold text-[#6B5B95] bg-[#EDE9F8] px-2 py-0.5 rounded-full">
                                Prioriteit
                              </span>
                            )}
                          </div>

                          {/* Locatie */}
                          <p className="text-sm text-[#5A5278] mt-0.5 font-medium">
                            {entry.locatievoorkeuren
                              .sort((a, b) => a.voorkeur_volgorde - b.voorkeur_volgorde)
                              .map(lv => lv.locaties?.naam ?? '?')
                              .join(' › ')}
                          </p>

                          {/* Type · Leeftijd · Start · Dagen */}
                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            <span className="text-xs font-bold text-[#6B5B95] bg-[#EDE9F8] px-2 py-0.5 rounded-md">
                              {OPVANG_LABELS[entry.opvangtype]}
                            </span>
                            <span className="text-slate-300 text-xs">·</span>
                            <span className="text-xs font-semibold text-[#3D3458]">
                              {leeftijdLabel(entry.kinderen.geboortedatum)}
                            </span>
                            <span className="text-slate-300 text-xs">·</span>
                            <span className="text-xs font-semibold text-[#3D3458]">
                              {entry.gewenste_startdatum
                                ? new Date(entry.gewenste_startdatum).toLocaleDateString('nl-NL', { month: 'short', year: 'numeric' })
                                : 'nvt'}
                            </span>
                            <span className="text-slate-300 text-xs">·</span>
                            <span className="flex gap-0.5">
                              {DAG_LABELS.map((d, i) => (
                                <span
                                  key={i}
                                  className={`w-5 h-5 rounded text-[9px] font-bold flex items-center justify-center ${
                                    entry.gewenste_dagen.includes(i)
                                      ? 'bg-[#6B5B95] text-white'
                                      : 'bg-slate-100 text-slate-400'
                                  }`}
                                >
                                  {d[0]}
                                </span>
                              ))}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Rechts: status + actie + chevron */}
                      <div
                        className="flex items-center gap-2 shrink-0 pt-0.5"
                        onClick={e => e.stopPropagation()}
                      >
                        <StatusBadge status={entry.status} />

                        {entry.status === 'wachtend' && (
                          <button
                            onClick={() => setAanbodEntry(entry)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-xs font-bold shadow-sm transition-all hover:opacity-90 active:scale-95"
                            style={{ background: 'linear-gradient(to right, #6B5B95, #9B8FCE)' }}
                          >
                            <span className="material-symbols-outlined text-sm">send</span>
                            Aanbod doen
                          </button>
                        )}

                        {entry.status === 'aangeboden' && (
                          <span className="text-xs text-[#7A3020] font-medium flex items-center gap-1">
                            <span className="material-symbols-outlined text-sm">pending</span>
                            Wacht op reactie
                          </span>
                        )}

                        <button
                          onClick={e => { e.stopPropagation(); toggleExpand(entry.id) }}
                          className="p-1 text-slate-400 hover:text-[#6B5B95] transition-colors rounded-lg hover:bg-[#EDE9F8]"
                        >
                          <span className="material-symbols-outlined text-[18px]">
                            {isExpanded ? 'expand_less' : 'expand_more'}
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Expandable sectie */}
                  {isExpanded && (
                    <div
                      className="border-t border-[#F0EBF8] bg-[#FAF8FF] px-4 py-3 rounded-b-xl space-y-2.5"
                      onClick={e => e.stopPropagation()}
                    >
                      {entry.status === 'aangeboden' && (
                        <AanbiedingStrip entry={entry} onVerwerken={handleVerwerken} />
                      )}
                      {entry.notities && (
                        <div className="flex items-start gap-2 text-sm text-[#3D3458]">
                          <span className="material-symbols-outlined text-base text-[#9B8FCE] mt-0.5">info</span>
                          <span>{entry.notities}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-slate-400 flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-sm">calendar_today</span>
                          Aangemeld op {datumKort(entry.aangemeld_op)}
                        </p>
                        {entry.status === 'wachtend' && (
                          <button
                            onClick={() => handleAnnuleren(entry.id)}
                            className="text-xs text-slate-400 hover:text-[#ba1a1a] transition-colors flex items-center gap-1 font-medium"
                          >
                            <span className="material-symbols-outlined text-sm">cancel</span>
                            Inschrijving annuleren
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Aanbod Modal */}
      {aanbodEntry && (
        <AanbodModal
          entry={aanbodEntry}
          locaties={locaties}
          groepen={groepen}
          contracten={contracten}
          onClose={() => setAanbodEntry(null)}
        />
      )}
    </div>
  )
}
