'use client'

import { useState, useTransition, useMemo } from 'react'
import type { WachtlijstEntry, WachtlijstStatus, Opvangtype } from '@/lib/supabase/types'
import { aanbodDoen, aanbodVerwerken, wachtlijstAnnuleren } from '@/app/actions/wachtlijst'

// ─── Types ──────────────────────────────────────────────────────────────────

interface Locatie { id: string; naam: string }
interface Groep   { id: string; naam: string; locatie_id: string; leeftijdscategorie: string; max_capaciteit: number }

interface Props {
  wachtlijst: WachtlijstEntry[]
  locaties:   Locatie[]
  groepen:    Groep[]
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const DAG_LABELS = ['Ma', 'Di', 'Wo', 'Do', 'Vr']

const OPVANG_LABELS: Record<Opvangtype, string> = {
  kdv: 'KDV', bso: 'BSO', peuteropvang: 'Peuter', gastouder: 'GO',
}

const STATUS_CONFIG: Record<WachtlijstStatus, { label: string; bg: string; text: string; dot: string }> = {
  wachtend:    { label: 'Wachtend',    bg: 'bg-[#bee9ff]',     text: 'text-[#004d64]', dot: 'bg-[#006684]' },
  aangeboden:  { label: 'Aangeboden',  bg: 'bg-[#ffb783]/30',  text: 'text-[#703700]', dot: 'bg-[#703700]' },
  geplaatst:   { label: 'Geplaatst',   bg: 'bg-[#8df4ed]/40',  text: 'text-[#006a66]', dot: 'bg-[#006a66]' },
  vervallen:   { label: 'Vervallen',   bg: 'bg-slate-100',     text: 'text-slate-400', dot: 'bg-slate-300' },
  geannuleerd: { label: 'Geannuleerd', bg: 'bg-slate-100',     text: 'text-slate-400', dot: 'bg-slate-300' },
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

function StatusBadge({ status }: { status: WachtlijstStatus }) {
  const c = STATUS_CONFIG[status]
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${c.bg} ${c.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  )
}

// ─── Aanbod Modal ────────────────────────────────────────────────────────────

function AanbodModal({
  entry,
  locaties,
  groepen,
  onClose,
}: {
  entry: WachtlijstEntry
  locaties: Locatie[]
  groepen: Groep[]
  onClose: () => void
}) {
  const [isPending, startTransition] = useTransition()
  const [selectedLocatie, setSelectedLocatie] = useState(
    entry.locatievoorkeuren[0]?.locatie_id ?? locaties[0]?.id ?? ''
  )
  const [error, setError] = useState<string | null>(null)

  const locatieGroepen = groepen.filter(g => g.locatie_id === selectedLocatie)

  // Default verloopdatum: 14 dagen
  const defaultVerloopdatum = new Date()
  defaultVerloopdatum.setDate(defaultVerloopdatum.getDate() + 14)
  const defaultVerloopdatumStr = defaultVerloopdatum.toISOString().slice(0, 10)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = await aanbodDoen(fd)
      if (result?.error) {
        setError(result.error)
      } else {
        onClose()
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-black text-[#004d64]" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Aanbod doen
            </h3>
            <p className="text-sm text-slate-500 mt-0.5">
              {entry.kinderen.voornaam} {entry.kinderen.achternaam}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <input type="hidden" name="wachtlijst_id" value={entry.id} />

          {/* Locatie */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Locatie</label>
            <select
              name="locatie_id"
              value={selectedLocatie}
              onChange={e => setSelectedLocatie(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-[#181c1d] bg-white focus:outline-none focus:ring-2 focus:ring-[#006684]/30"
            >
              {locaties.map(l => (
                <option key={l.id} value={l.id}>
                  {l.naam}
                  {entry.locatievoorkeuren.find(lv => lv.locatie_id === l.id) ? ' ★ voorkeur' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Groep */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Groep (optioneel)</label>
            <select
              name="groep_id"
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-[#181c1d] bg-white focus:outline-none focus:ring-2 focus:ring-[#006684]/30"
            >
              <option value="">— Nog niet toegewezen —</option>
              {locatieGroepen.map(g => (
                <option key={g.id} value={g.id}>{g.naam}</option>
              ))}
            </select>
          </div>

          {/* Startdatum aanbod */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Verloopdatum reactie</label>
            <input
              type="date"
              name="verloopdatum"
              defaultValue={defaultVerloopdatumStr}
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-[#181c1d] bg-white focus:outline-none focus:ring-2 focus:ring-[#006684]/30"
            />
            <p className="text-[11px] text-slate-400">Ouder heeft tot deze datum om te reageren.</p>
          </div>

          {/* Notities */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Bericht aan ouder</label>
            <textarea
              name="notities"
              rows={3}
              placeholder="Optioneel — bijv. 'Er is een plek beschikbaar in groep Regenboog per 1 juni...'"
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-[#181c1d] bg-white resize-none focus:outline-none focus:ring-2 focus:ring-[#006684]/30 placeholder:text-slate-300"
            />
          </div>

          {error && (
            <p className="text-sm text-[#ba1a1a] bg-[#ba1a1a]/10 px-4 py-2 rounded-xl">{error}</p>
          )}

          {/* Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-500 hover:bg-slate-50 transition-colors"
            >
              Annuleren
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 py-2.5 rounded-xl text-white text-sm font-bold shadow-md transition-all hover:opacity-90 active:scale-95 disabled:opacity-60"
              style={{ background: 'linear-gradient(to right, #004d64, #006684)' }}
            >
              {isPending ? 'Versturen…' : 'Aanbod versturen'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Aanbieding Detail Strip ─────────────────────────────────────────────────

function AanbiedingStrip({
  entry,
  onVerwerken,
}: {
  entry: WachtlijstEntry
  onVerwerken: (fd: FormData) => void
}) {
  const openAanbieding = entry.aanbiedingen.find(a => a.status === 'openstaand')
  if (!openAanbieding) return null

  const verloopt = openAanbieding.verloopdatum
    ? new Date(openAanbieding.verloopdatum) < new Date()
    : false

  return (
    <div className="mt-2 mx-1 px-3 py-2 bg-[#ffb783]/15 rounded-xl border border-[#ffb783]/40 flex items-center justify-between gap-4 text-xs">
      <div className="flex items-center gap-2 text-[#703700]">
        <span className="material-symbols-outlined text-sm">schedule</span>
        <span>
          Aanbod gedaan {datumKort(openAanbieding.aangeboden_op)}
          {openAanbieding.verloopdatum && (
            <> &middot; <span className={verloopt ? 'text-[#ba1a1a] font-bold' : ''}>
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
          <button type="submit" className="px-2.5 py-1 rounded-lg bg-[#006a66] text-white text-[11px] font-bold hover:opacity-90 transition-opacity">
            Geaccepteerd
          </button>
        </form>
        <form action={onVerwerken}>
          <input type="hidden" name="aanbieding_id" value={openAanbieding.id} />
          <input type="hidden" name="wachtlijst_id" value={entry.id} />
          <input type="hidden" name="status" value="geweigerd" />
          <button type="submit" className="px-2.5 py-1 rounded-lg bg-slate-200 text-slate-600 text-[11px] font-bold hover:bg-slate-300 transition-colors">
            Geweigerd
          </button>
        </form>
      </div>
    </div>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function WachtlijstDashboard({ wachtlijst, locaties, groepen }: Props) {
  const [zoekterm, setZoekterm]           = useState('')
  const [filterLocatie, setFilterLocatie] = useState<string>('alle')
  const [filterStatus, setFilterStatus]   = useState<WachtlijstStatus | 'alle'>('alle')
  const [aanbodEntry, setAanbodEntry]     = useState<WachtlijstEntry | null>(null)
  const [, startTransition]              = useTransition()

  // Gefilterde + gesorteerde lijst
  const gefilterd = useMemo(() => {
    return wachtlijst.filter(w => {
      const naam = `${w.kinderen.voornaam} ${w.kinderen.achternaam}`.toLowerCase()
      if (zoekterm && !naam.includes(zoekterm.toLowerCase())) return false
      if (filterStatus !== 'alle' && w.status !== filterStatus) return false
      if (filterLocatie !== 'alle') {
        const heeftVoorkeur = w.locatievoorkeuren.some(lv => lv.locatie_id === filterLocatie)
        if (!heeftVoorkeur) return false
      }
      return true
    })
  }, [wachtlijst, zoekterm, filterStatus, filterLocatie])

  // Wachtpositie per entry (alleen 'wachtend', FIFO volgorde)
  const positieMap = useMemo(() => {
    const wachtend = wachtlijst
      .filter(w => w.status === 'wachtend')
      .sort((a, b) => b.prioriteit - a.prioriteit || new Date(a.aangemeld_op).getTime() - new Date(b.aangemeld_op).getTime())
    const map: Record<string, number> = {}
    wachtend.forEach((w, i) => { map[w.id] = i + 1 })
    return map
  }, [wachtlijst])

  // Statistieken
  const stats = useMemo(() => ({
    wachtend:   wachtlijst.filter(w => w.status === 'wachtend').length,
    aangeboden: wachtlijst.filter(w => w.status === 'aangeboden').length,
    geplaatst:  wachtlijst.filter(w => w.status === 'geplaatst').length,
    totaal:     wachtlijst.length,
  }), [wachtlijst])

  const handleVerwerken = (fd: FormData) => {
    startTransition(async () => { await aanbodVerwerken(fd) })
  }

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
      <header className="bg-white/70 backdrop-blur-md flex justify-between items-center px-8 py-4 border-b border-slate-100 sticky top-0 z-40">
        <div className="flex items-center gap-6">
          <h2 className="text-xl font-bold tracking-tight text-cyan-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Wachtlijstbeheer
          </h2>
          <div className="hidden md:flex items-center bg-slate-100 px-4 py-2 rounded-full gap-2">
            <span className="material-symbols-outlined text-slate-400 text-sm">search</span>
            <input
              className="bg-transparent border-none outline-none text-sm w-40 text-slate-600 placeholder:text-slate-400"
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
            style={{ background: 'linear-gradient(to right, #004d64, #006684)' }}
          >
            Kind aanmelden
          </button>
          <div className="w-9 h-9 rounded-full bg-[#bee9ff] flex items-center justify-center text-[#004d64] font-bold text-sm border-2 border-[#bee9ff]">
            J
          </div>
        </div>
      </header>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-8 py-8 space-y-6">

        {/* Paginatitel */}
        <div className="space-y-1">
          <span className="text-xs font-bold uppercase tracking-widest text-[#006684]/60" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Plaatsingsbeheer
          </span>
          <h1 className="text-3xl font-extrabold text-[#004d64] tracking-tight" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Wachtlijst
          </h1>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Totaal aangemeld', value: stats.totaal,     icon: 'list',           color: 'text-[#004d64]', bg: 'bg-[#bee9ff]/40' },
            { label: 'Wachtend',         value: stats.wachtend,   icon: 'hourglass_empty', color: 'text-[#004d64]', bg: 'bg-[#bee9ff]/40' },
            { label: 'Aangeboden',       value: stats.aangeboden, icon: 'send',            color: 'text-[#703700]', bg: 'bg-[#ffb783]/20' },
            { label: 'Geplaatst',        value: stats.geplaatst,  icon: 'check_circle',    color: 'text-[#006a66]', bg: 'bg-[#8df4ed]/30' },
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

        {/* Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          {/* Status tabs */}
          <div className="flex items-center gap-1 bg-[#e0e3e4] p-1 rounded-xl">
            {statusTabs.map(t => (
              <button
                key={t.value}
                onClick={() => setFilterStatus(t.value)}
                className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                  filterStatus === t.value
                    ? 'bg-white text-[#004d64] shadow-sm'
                    : 'text-slate-500 hover:text-[#004d64]'
                }`}
              >
                {t.label}
                {t.count !== undefined && (
                  <span className={`ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    filterStatus === t.value ? 'bg-[#bee9ff] text-[#004d64]' : 'bg-slate-200 text-slate-500'
                  }`}>
                    {t.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Locatie filter */}
          <select
            value={filterLocatie}
            onChange={e => setFilterLocatie(e.target.value)}
            className="border border-slate-200 rounded-xl px-4 py-2 text-sm font-semibold text-[#3f484d] bg-white focus:outline-none focus:ring-2 focus:ring-[#006684]/30"
          >
            <option value="alle">Alle locaties</option>
            {locaties.map(l => <option key={l.id} value={l.id}>{l.naam}</option>)}
          </select>
        </div>

        {/* Wachtlijst tabel */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          {/* Tabel header */}
          <div className="grid bg-slate-50/70 border-b border-slate-100 px-6 py-3"
            style={{ gridTemplateColumns: '3rem 1fr 5rem 6rem 9rem 8rem auto' }}>
            {['#', 'Kind', 'Type', 'Leeftijd', 'Gewenste start', 'Dagenwens', 'Status / Actie'].map(h => (
              <span key={h} className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{h}</span>
            ))}
          </div>

          {/* Rijen */}
          <div className="divide-y divide-slate-50">
            {gefilterd.length === 0 ? (
              <div className="py-16 text-center">
                <span className="material-symbols-outlined text-5xl text-slate-200 block mb-3">inbox</span>
                <p className="text-slate-400 font-semibold">Geen resultaten gevonden</p>
                <p className="text-slate-300 text-sm mt-1">Pas de filters aan of voeg een kind toe.</p>
              </div>
            ) : gefilterd.map(entry => {
              const positie = positieMap[entry.id]
              const heeftOpenAanbieding = entry.aanbiedingen.some(a => a.status === 'openstaand')
              const hoogstePrioriteit = entry.prioriteit > 0

              return (
                <div key={entry.id} className={`hover:bg-slate-50/50 transition-colors ${hoogstePrioriteit ? 'border-l-4 border-[#006684]' : ''}`}>
                  <div className="grid px-6 py-4 items-center gap-2"
                    style={{ gridTemplateColumns: '3rem 1fr 5rem 6rem 9rem 8rem auto' }}>

                    {/* Positie */}
                    <div>
                      {positie ? (
                        <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-black ${
                          positie === 1
                            ? 'bg-[#004d64] text-white'
                            : positie <= 3
                            ? 'bg-[#bee9ff] text-[#004d64]'
                            : 'bg-slate-100 text-slate-500'
                        }`}>
                          {positie}
                        </span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </div>

                    {/* Kind */}
                    <div>
                      <p className="font-bold text-[#181c1d] text-sm" style={{ fontFamily: 'Manrope, sans-serif' }}>
                        {entry.kinderen.voornaam} {entry.kinderen.achternaam}
                        {hoogstePrioriteit && (
                          <span className="ml-2 text-[10px] font-bold text-[#006a66] bg-[#8df4ed]/40 px-1.5 py-0.5 rounded-full">
                            Prioriteit
                          </span>
                        )}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {entry.locatievoorkeuren
                          .sort((a, b) => a.voorkeur_volgorde - b.voorkeur_volgorde)
                          .map(lv => lv.locaties?.naam ?? '?')
                          .join(' › ')}
                      </p>
                    </div>

                    {/* Opvangtype */}
                    <div>
                      <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                        {OPVANG_LABELS[entry.opvangtype]}
                      </span>
                    </div>

                    {/* Leeftijd */}
                    <div className="text-sm font-semibold text-[#3f484d]">
                      {leeftijdLabel(entry.kinderen.geboortedatum)}
                    </div>

                    {/* Gewenste startdatum */}
                    <div className="text-sm text-slate-600">
                      {entry.gewenste_startdatum
                        ? new Date(entry.gewenste_startdatum).toLocaleDateString('nl-NL', { month: 'short', year: 'numeric' })
                        : <span className="text-slate-300">nvt</span>
                      }
                    </div>

                    {/* Dagenwens */}
                    <div className="flex gap-0.5">
                      {DAG_LABELS.map((d, i) => (
                        <span
                          key={i}
                          className={`w-5 h-5 rounded text-[9px] font-bold flex items-center justify-center ${
                            entry.gewenste_dagen.includes(i)
                              ? 'bg-[#004d64] text-white'
                              : 'bg-slate-100 text-slate-300'
                          }`}
                        >
                          {d[0]}
                        </span>
                      ))}
                    </div>

                    {/* Status + Actie */}
                    <div className="flex items-center gap-2">
                      <StatusBadge status={entry.status} />

                      {entry.status === 'wachtend' && (
                        <button
                          onClick={() => setAanbodEntry(entry)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-xs font-bold shadow transition-all hover:opacity-90 active:scale-95"
                          style={{ background: 'linear-gradient(to right, #004d64, #006684)' }}
                        >
                          <span className="material-symbols-outlined text-sm">send</span>
                          Aanbod doen
                        </button>
                      )}

                      {entry.status === 'aangeboden' && heeftOpenAanbieding && (
                        <span className="text-[11px] text-[#703700] flex items-center gap-1">
                          <span className="material-symbols-outlined text-sm">pending</span>
                          Wacht op reactie
                        </span>
                      )}

                      {entry.status === 'wachtend' && (
                        <button
                          onClick={() => handleAnnuleren(entry.id)}
                          className="p-1 text-slate-300 hover:text-[#ba1a1a] transition-colors rounded"
                          title="Annuleren"
                        >
                          <span className="material-symbols-outlined text-base">cancel</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Aanbieding strip */}
                  {entry.status === 'aangeboden' && (
                    <div className="px-6 pb-3">
                      <AanbiedingStrip entry={entry} onVerwerken={handleVerwerken} />
                    </div>
                  )}

                  {/* Notities */}
                  {entry.notities && (
                    <div className="px-6 pb-3">
                      <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-sm">info</span>
                        {entry.notities}
                      </p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Legenda */}
        <div className="flex flex-wrap items-center gap-6 py-3 px-4 border-t border-slate-100 text-xs text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-[#004d64]" />
            Prioriteit 1 — eerste op de lijst
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-[#006684]" />
            Blauwe rand = prioriteitsoverride
          </span>
          <span className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-sm">arrow_upward</span>
            Volgorde: hogere prio → daarna FIFO (aanmelddatum)
          </span>
        </div>

      </div>

      {/* Aanbod Modal */}
      {aanbodEntry && (
        <AanbodModal
          entry={aanbodEntry}
          locaties={locaties}
          groepen={groepen}
          onClose={() => setAanbodEntry(null)}
        />
      )}
    </div>
  )
}
