'use client'

import { useState, useMemo, useTransition } from 'react'
import { beoordeelFlexAanvraag, capaciteitOverrideAanmaken, capaciteitOverrideVerwijderen } from '@/app/actions/kindplanning'
import { groepsoverdrachtPlannen, groepsoverdrachtUitvoeren } from '@/app/actions/groepsoverdrachten'

// ─── Types ────────────────────────────────────────────────────────────────────

type Locatie = { id: string; naam: string }

type Groep = {
  id: string
  naam: string
  locatie_id: string
  opvangtype: string
  leeftijdscategorie: string
  max_capaciteit: number
}

type Contract = {
  id: string
  groep_id: string
  zorgdagen: number[]
  startdatum: string
  einddatum: string | null
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FlexAanvraag = Record<string, any>

type CapaciteitOverride = {
  id: string
  groep_id: string
  max_capaciteit: number
  start_datum: string
  eind_datum: string
  reden: string | null
}

type Overdracht = {
  id: string
  kind_id: string
  van_groep_id: string
  naar_groep_id: string
  overdrachtsdatum: string
  uitgevoerd: boolean
  kinderen: { voornaam: string; achternaam: string } | null
  van_groep: { naam: string } | null
  naar_groep: { naam: string } | null
}

type KindKort = {
  id: string
  voornaam: string
  tussenvoegsel: string | null
  achternaam: string
}

interface Props {
  locaties: Locatie[]
  groepen: Groep[]
  contracten: Contract[]
  flexAanvragen: FlexAanvraag[]
  overdrachten: Overdracht[]
  kinderenLijst: KindKort[]
  overrides: CapaciteitOverride[]
}

// ─── Constanten ───────────────────────────────────────────────────────────────

const DAGCODES = ['Ma', 'Di', 'Wo', 'Do', 'Vr']
const HORIZON_WEKEN = [2, 4, 6, 8, 12]

const LEEFTIJD_LABEL: Record<string, string> = {
  baby: '0–12m', dreumes: '12–24m', peuter: '24–48m', bso: '4–12j',
}
const OPVANGTYPE_LABEL: Record<string, string> = {
  kdv: 'KDV', bso: 'BSO', peuteropvang: 'Peuter', gastouder: 'Gastouder',
}
const NL_MAAND = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec']
const NL_MAAND_LANG = ['januari', 'februari', 'maart', 'april', 'mei', 'juni',
  'juli', 'augustus', 'september', 'oktober', 'november', 'december']
const NL_DAG_LANG = ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag']

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getMondayOfWeek(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1))
  d.setHours(0, 0, 0, 0)
  return d
}

function getISOWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}

/** Returns all Mon–Fri dates starting from startMonday for N weeks */
function getWorkdays(startMonday: Date, aantalWeken: number): Date[] {
  const days: Date[] = []
  const current = new Date(startMonday)
  for (let w = 0; w < aantalWeken; w++) {
    for (let d = 0; d < 5; d++) {
      days.push(new Date(current))
      current.setDate(current.getDate() + 1)
    }
    current.setDate(current.getDate() + 2) // skip weekend
  }
  return days
}

type WeekGroep = { weekNr: number; maand: string; jaar: number; dagen: Date[] }

/** Groups workdays by ISO week for the two-row header */
function groeperPerWeek(days: Date[]): WeekGroep[] {
  const groups: WeekGroep[] = []
  let current: WeekGroep | null = null
  for (const d of days) {
    const wk = getISOWeekNumber(d)
    if (!current || current.weekNr !== wk) {
      current = { weekNr: wk, maand: NL_MAAND[d.getMonth()], jaar: d.getFullYear(), dagen: [] }
      groups.push(current)
    }
    current.dagen.push(d)
  }
  return groups
}

function parseDateUTC(s: string): number {
  const [y, m, d] = s.split('-').map(Number)
  return Date.UTC(y, m - 1, d)
}

function computeBezettingOpDag(
  contracten: Contract[],
  groepId: string,
  date: Date,
  overrides: CapaciteitOverride[] = []
): { bezetting: number; effectiefMax: number | null } {
  const dateUTC = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  const dagIndex = date.getDay() - 1  // Mon=0 … Fri=4
  let count = 0
  for (const c of contracten) {
    if (c.groep_id !== groepId) continue
    if (!c.zorgdagen.includes(dagIndex)) continue
    if (parseDateUTC(c.startdatum) > dateUTC) continue
    if (c.einddatum && parseDateUTC(c.einddatum) < dateUTC) continue
    count++
  }
  // Zoek actieve override voor deze groep op deze datum
  const activeOverride = overrides.find(o => {
    if (o.groep_id !== groepId) return false
    return parseDateUTC(o.start_datum) <= dateUTC && parseDateUTC(o.eind_datum) >= dateUTC
  })
  return { bezetting: count, effectiefMax: activeOverride ? activeOverride.max_capaciteit : null }
}

function getBezettingStijl(bezetting: number, max: number): { bg: string; text: string } {
  if (bezetting === 0) return { bg: '#f1f5f9', text: '#cbd5e1' }
  const pct = bezetting / max
  if (pct >= 1)   return { bg: '#fce8e8', text: '#ba1a1a' }
  if (pct >= 0.8) return { bg: '#fff3e0', text: '#e07b00' }
  return { bg: '#e8f5f0', text: '#006a66' }
}

function formatDatum(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return `${d.getDate()} ${NL_MAAND_LANG[d.getMonth()]} ${d.getFullYear()}`
}

function getDagNaam(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return NL_DAG_LANG[d.getDay()]
}

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// ─── Sub-component: CapaciteitsGrid ──────────────────────────────────────────

function CapaciteitsGrid({
  locaties,
  groepen,
  contracten,
  overrides,
}: {
  locaties: Locatie[]
  groepen: Groep[]
  contracten: Contract[]
  overrides: CapaciteitOverride[]
}) {
  const [locatieId, setLocatieId] = useState<string>(locaties[0]?.id ?? '')
  const [horizonWeken, setHorizonWeken] = useState(4)
  const [zoekStartdatum, setZoekStartdatum] = useState('')
  const [zoekDagen, setZoekDagen] = useState<number[]>([])

  const filterActief = zoekDagen.length > 0

  const vandaag = useMemo(() => new Date(), [])
  const vandaagKey = useMemo(() => dateKey(vandaag), [vandaag])

  const startMonday = useMemo(() => {
    if (zoekStartdatum) return getMondayOfWeek(new Date(zoekStartdatum + 'T00:00:00'))
    return getMondayOfWeek(vandaag)
  }, [zoekStartdatum, vandaag])

  const workdays = useMemo(() => getWorkdays(startMonday, horizonWeken), [startMonday, horizonWeken])
  const weekGroepen = useMemo(() => groeperPerWeek(workdays), [workdays])

  const gefilterdGroepen = useMemo(
    () => groepen.filter(g => g.locatie_id === locatieId),
    [groepen, locatieId]
  )

  function toggleDag(d: number) {
    setZoekDagen(prev =>
      prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d].sort()
    )
  }

  function wissen() {
    setZoekStartdatum('')
    setZoekDagen([])
  }

  const isDagGehighlight = (date: Date) =>
    filterActief && zoekDagen.includes(date.getDay() - 1)

  return (
    <div className="space-y-5">
      {/* Filter panel */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-6 py-4">
        <div className="flex flex-wrap items-center gap-5">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-slate-400 text-lg">search</span>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
              Beschikbaarheid
            </span>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-400 font-medium whitespace-nowrap">Vanaf</label>
            <input
              type="date"
              value={zoekStartdatum}
              onChange={e => setZoekStartdatum(e.target.value)}
              className="text-sm text-[#5B52D4] font-semibold border border-slate-200 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#EAE8FD]"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-medium">Dagen</span>
            <div className="flex gap-1">
              {DAGCODES.map((naam, i) => (
                <button
                  key={i}
                  onClick={() => toggleDag(i)}
                  className="w-9 h-9 rounded-xl text-xs font-bold transition-all"
                  style={
                    zoekDagen.includes(i)
                      ? { background: '#5B52D4', color: 'white' }
                      : { background: '#F3F2FE', color: '#64748b' }
                  }
                >
                  {naam}
                </button>
              ))}
            </div>
          </div>

          {(zoekStartdatum || zoekDagen.length > 0) && (
            <button
              onClick={wissen}
              className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1 transition-colors"
            >
              <span className="material-symbols-outlined text-sm">close</span>
              Wissen
            </button>
          )}

          {filterActief && (
            <div className="ml-auto flex items-center gap-1.5 text-xs font-semibold text-[#5B52D4] bg-[#EAE8FD] px-3 py-1.5 rounded-full">
              <span className="material-symbols-outlined text-sm">check_circle</span>
              {zoekDagen.map(d => DAGCODES[d]).join(' + ')}
              {zoekStartdatum && ` · vanaf ${formatDatum(zoekStartdatum)}`}
            </div>
          )}
        </div>
      </div>

      {/* Controls + legenda */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-5 text-xs text-slate-400">
          {filterActief ? (
            <>
              <div className="flex items-center gap-1.5">
                <span style={{ color: '#006a66' }} className="font-bold">✓</span> Vrij
              </div>
              <div className="flex items-center gap-1.5">
                <span style={{ color: '#ba1a1a' }} className="font-bold">✗</span> Vol
              </div>
              <span className="text-slate-300">·</span>
              <span>Gemarkeerde kolommen = gevraagde dagen</span>
            </>
          ) : (
            <>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded inline-block" style={{ background: '#e8f5f0' }} /> Vrij (&lt;80%)
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded inline-block" style={{ background: '#fff3e0' }} /> Bijna vol (≥80%)
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded inline-block" style={{ background: '#fce8e8' }} /> Vol (100%)
              </div>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          <select
            value={locatieId}
            onChange={e => setLocatieId(e.target.value)}
            className="text-sm font-semibold text-[#5B52D4] bg-white border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#EAE8FD]"
          >
            {locaties.map(l => <option key={l.id} value={l.id}>{l.naam}</option>)}
          </select>
          <select
            value={horizonWeken}
            onChange={e => setHorizonWeken(Number(e.target.value))}
            className="text-sm font-semibold text-[#5B52D4] bg-white border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#EAE8FD]"
          >
            {HORIZON_WEKEN.map(w => (
              <option key={w} value={w}>{w} weken</option>
            ))}
          </select>
        </div>
      </div>

      {/* Grid */}
      {gefilterdGroepen.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm text-center py-20">
          <span className="material-symbols-outlined text-4xl text-slate-300 block mb-2">group</span>
          <p className="text-sm text-slate-400">Geen groepen gevonden voor deze locatie</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="text-sm border-collapse" style={{ minWidth: 'max-content' }}>
              <thead>
                {/* Rij 1: week-labels */}
                <tr className="bg-slate-50/80 border-b border-slate-100">
                  <th className="sticky left-0 z-20 bg-slate-50/80 border-r border-slate-100 min-w-[200px]" />
                  {weekGroepen.map((wg, wi) => (
                    <th
                      key={wi}
                      colSpan={wg.dagen.length}
                      className="px-2 py-2 text-center border-r border-slate-100 last:border-0"
                    >
                      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                        Wk {wg.weekNr}
                      </span>
                      <span className="text-[10px] text-slate-300 ml-1">
                        {wg.maand} {wg.jaar !== new Date().getFullYear() ? wg.jaar : ''}
                      </span>
                    </th>
                  ))}
                </tr>
                {/* Rij 2: dag-labels */}
                <tr className="bg-slate-50/60 border-b border-slate-100">
                  <th className="sticky left-0 z-20 bg-slate-50/60 text-left px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400 border-r border-slate-100 min-w-[200px]">
                    Groep
                  </th>
                  {workdays.map((dag, di) => {
                    const key = dateKey(dag)
                    const isVandaag = key === vandaagKey
                    const isGefilterDag = filterActief && zoekDagen.includes(dag.getDay() - 1)
                    const isStartDag = zoekStartdatum && key === zoekStartdatum
                    // last day of each week gets a right border
                    const isWeekEnd = dag.getDay() === 5
                    return (
                      <th
                        key={di}
                        className={`px-0 py-2 text-center min-w-[52px] ${isWeekEnd ? 'border-r border-slate-200' : ''}`}
                        style={
                          isStartDag
                            ? { background: '#EAE8FD' }
                            : isVandaag
                            ? { background: '#EAE8FD' }
                            : isGefilterDag
                            ? { background: '#F3F2FE' }
                            : undefined
                        }
                      >
                        <div
                          className="text-[10px] font-bold"
                          style={{
                            color: isStartDag ? '#5B52D4'
                              : isVandaag ? '#5B52D4'
                              : isGefilterDag ? '#5B52D4'
                              : '#94a3b8',
                          }}
                        >
                          {DAGCODES[dag.getDay() - 1]}
                        </div>
                        <div className="text-[11px] text-slate-400">{dag.getDate()}</div>
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody>
                {gefilterdGroepen.map((groep, gi) => (
                  <tr
                    key={groep.id}
                    className="border-b border-slate-50 last:border-0"
                    style={{ background: gi % 2 === 1 ? '#fafbfc' : 'white' }}
                  >
                    {/* Groep label (sticky) */}
                    <td
                      className="sticky left-0 z-10 px-6 py-3 border-r border-slate-100"
                      style={{ background: gi % 2 === 1 ? '#fafbfc' : 'white' }}
                    >
                      <div className="font-semibold text-[#5B52D4] text-sm leading-tight">{groep.naam}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {OPVANGTYPE_LABEL[groep.opvangtype] ?? groep.opvangtype}
                        {' · '}{LEEFTIJD_LABEL[groep.leeftijdscategorie] ?? groep.leeftijdscategorie}
                        {' · max '}{groep.max_capaciteit}
                      </div>
                    </td>

                    {/* Dag cellen */}
                    {workdays.map((dag, di) => {
                      const key = dateKey(dag)
                      const isVandaag = key === vandaagKey
                      const isGefilterDag = isDagGehighlight(dag)
                      const isStartDag = zoekStartdatum && key === zoekStartdatum
                      const isWeekEnd = dag.getDay() === 5

                      const { bezetting: bez, effectiefMax } = computeBezettingOpDag(contracten, groep.id, dag, overrides)
                      const effectMax = effectiefMax ?? groep.max_capaciteit
                      const { bg, text } = getBezettingStijl(bez, effectMax)
                      const vrij = bez < effectMax

                      return (
                        <td
                          key={di}
                          className={`px-1 py-2 text-center align-middle ${isWeekEnd ? 'border-r border-slate-100' : ''}`}
                          style={
                            isStartDag
                              ? { background: '#e8f4ff' }
                              : isVandaag
                              ? { background: '#EAE8FD' }
                              : isGefilterDag
                              ? { background: '#f7fbff' }
                              : undefined
                          }
                        >
                          <div
                            className="rounded-lg mx-auto font-semibold text-xs py-1 tabular-nums"
                            style={{
                              background: bg,
                              color: text,
                              minWidth: '40px',
                              display: 'inline-block',
                            }}
                          >
                            {bez}/{effectMax}
                          </div>
                          {effectiefMax !== null && (
                            <div className="text-[9px] font-bold mt-0.5" style={{ color: '#e07b00' }} title="Capaciteit override actief">
                              ⚙
                            </div>
                          )}
                          {isGefilterDag && (
                            <div
                              className="text-[10px] font-black mt-0.5"
                              style={{ color: vrij ? '#006a66' : '#ba1a1a' }}
                            >
                              {vrij ? '✓' : '✗'}
                            </div>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Sub-component: FlexAanvragenTab ─────────────────────────────────────────

function FlexAanvragenTab({ aanvragen }: { aanvragen: FlexAanvraag[] }) {
  const [isPending, startTransition] = useTransition()
  const [bezig, setBezig] = useState<string | null>(null)
  const [fout, setFout] = useState<string | null>(null)

  async function handleBeoordeel(id: string, status: 'goedgekeurd' | 'geweigerd') {
    setBezig(id + status)
    setFout(null)
    startTransition(async () => {
      const result = await beoordeelFlexAanvraag(id, status)
      if (result?.error) setFout(result.error)
      setBezig(null)
    })
  }

  if (aanvragen.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm text-center py-20">
        <span className="material-symbols-outlined text-4xl text-slate-300 block mb-2">event_available</span>
        <p className="text-sm text-slate-400">Geen openstaande flex aanvragen</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {fout && (
        <div className="bg-red-50 text-red-700 rounded-xl px-4 py-3 text-sm flex items-center gap-2">
          <span className="material-symbols-outlined text-base">error</span>
          {fout}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black text-white"
            style={{ background: '#e07b00' }}
          >
            {aanvragen.length}
          </div>
          <span className="text-sm font-semibold text-[#5B52D4]">Openstaande flex aanvragen</span>
          <span className="text-xs text-slate-400">Wacht op beoordeling</span>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/50">
              <th className="text-left px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">Kind</th>
              <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">Datum</th>
              <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">Groep</th>
              <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">Aangevraagd</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {aanvragen.map((a, i) => {
              const kind = a.contracten?.kinderen
              const kindNaam = kind ? `${kind.voornaam} ${kind.achternaam}` : '—'
              const groepNaam = a.groepen?.naam ?? '—'
              const aangevraagdOp = a.created_at
                ? new Date(a.created_at).toLocaleDateString('nl-NL', {
                    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                  })
                : '—'
              const isBezigGoed = bezig === a.id + 'goedgekeurd'
              const isBezigWeiger = bezig === a.id + 'geweigerd'

              return (
                <tr
                  key={a.id}
                  className="border-b border-slate-50 last:border-0"
                  style={{ background: i % 2 === 1 ? '#fafbfc' : 'white' }}
                >
                  <td className="px-6 py-4">
                    <div className="font-semibold text-[#5B52D4]">{kindNaam}</div>
                    <div className="text-[11px] text-slate-400">Flexkind</div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="font-semibold text-slate-700 capitalize">{getDagNaam(a.datum)}</div>
                    <div className="text-[11px] text-slate-400">{formatDatum(a.datum)}</div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="text-slate-700 font-medium">{groepNaam}</div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="text-[11px] text-slate-400">{aangevraagdOp}</div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        onClick={() => handleBeoordeel(a.id, 'goedgekeurd')}
                        disabled={isPending}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                        style={{ background: '#006a66', color: 'white' }}
                      >
                        <span className="material-symbols-outlined text-sm">
                          {isBezigGoed ? 'hourglass_empty' : 'check'}
                        </span>
                        Goedkeuren
                      </button>
                      <button
                        onClick={() => handleBeoordeel(a.id, 'geweigerd')}
                        disabled={isPending}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                        style={{ background: '#fce8e8', color: '#ba1a1a' }}
                      >
                        <span className="material-symbols-outlined text-sm">
                          {isBezigWeiger ? 'hourglass_empty' : 'close'}
                        </span>
                        Weigeren
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-slate-400 px-1">
        Na goedkeuring telt de flex-dag mee in de bezettingsgraad van de groep op die dag.
      </p>
    </div>
  )
}

// ─── Sub-component: CapaciteitOverridesTab ───────────────────────────────────

const inputCls = 'w-full border border-slate-200 rounded-xl px-3 py-2 text-sm text-[#1E1A4B] bg-white focus:outline-none focus:ring-2 focus:ring-[#EAE8FD] placeholder:text-slate-300'

function CapaciteitOverridesTab({
  groepen,
  overrides,
}: {
  groepen: Groep[]
  overrides: CapaciteitOverride[]
}) {
  const [isPending, startTransition] = useTransition()
  const [fout, setFout] = useState<string | null>(null)
  const [formKey, setFormKey] = useState(0)

  function handleAanmaken(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    setFout(null)
    startTransition(async () => {
      const result = await capaciteitOverrideAanmaken(fd)
      if (result?.error) setFout(result.error)
      else setFormKey(k => k + 1)
    })
  }

  function handleVerwijderen(id: string) {
    startTransition(async () => {
      const result = await capaciteitOverrideVerwijderen(id)
      if (result?.error) setFout(result.error)
    })
  }

  const vandaag = new Date().toISOString().slice(0, 10)

  return (
    <div className="max-w-3xl space-y-6">
      {fout && (
        <div className="bg-red-50 text-red-700 rounded-xl px-4 py-3 text-sm flex items-center gap-2">
          <span className="material-symbols-outlined text-base">error</span>
          {fout}
        </div>
      )}

      {/* Actieve overrides lijst */}
      {overrides.length > 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h3 className="text-sm font-bold text-[#1E1A4B]" style={{ fontFamily: 'Manrope, sans-serif' }}>Actieve overrides</h3>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="text-left px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">Groep</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">Periode</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">Nieuwe max</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">Reden</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {overrides.map((o, i) => {
                const groep = groepen.find(g => g.id === o.groep_id)
                return (
                  <tr key={o.id} className="border-b border-slate-50 last:border-0"
                    style={{ background: i % 2 === 1 ? '#fafbfc' : 'white' }}>
                    <td className="px-6 py-4 font-semibold text-[#5B52D4]">{groep?.naam ?? '—'}</td>
                    <td className="px-4 py-4 text-slate-600 text-xs">
                      {new Date(o.start_datum).toLocaleDateString('nl-NL')} → {new Date(o.eind_datum).toLocaleDateString('nl-NL')}
                    </td>
                    <td className="px-4 py-4">
                      <span className="font-bold text-[#e07b00] bg-[#fff3e0] px-2 py-0.5 rounded-full text-xs">max {o.max_capaciteit}</span>
                    </td>
                    <td className="px-4 py-4 text-slate-500 text-xs">{o.reden ?? '—'}</td>
                    <td className="px-4 py-4">
                      <button
                        onClick={() => handleVerwijderen(o.id)}
                        disabled={isPending}
                        className="px-3 py-1.5 text-xs font-bold rounded-xl transition-all disabled:opacity-50"
                        style={{ background: '#fce8e8', color: '#ba1a1a' }}
                      >
                        Verwijderen
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm text-center py-10">
          <span className="material-symbols-outlined text-3xl text-slate-300 block mb-2">tune</span>
          <p className="text-sm text-slate-400">Geen actieve capaciteitsoverrides</p>
        </div>
      )}

      {/* Nieuw override formulier */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <h3 className="text-sm font-bold text-[#1E1A4B] mb-4" style={{ fontFamily: 'Manrope, sans-serif' }}>Nieuwe override aanmaken</h3>
        <form key={formKey} onSubmit={handleAanmaken} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Groep *</label>
              <select name="groep_id" required className={inputCls}>
                <option value="">— Kies groep —</option>
                {groepen.map(g => <option key={g.id} value={g.id}>{g.naam}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Nieuwe max capaciteit *</label>
              <input type="number" name="max_capaciteit" min="0" required className={inputCls} placeholder="bv. 8" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Startdatum *</label>
              <input type="date" name="start_datum" required className={inputCls} defaultValue={vandaag} />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Einddatum *</label>
              <input type="date" name="eind_datum" required className={inputCls} />
            </div>
          </div>
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Reden (optioneel)</label>
            <input name="reden" className={inputCls} placeholder="bv. verbouwing, ziekte leidster..." />
          </div>
          <button
            type="submit"
            disabled={isPending}
            className="px-6 py-2.5 rounded-xl text-white text-sm font-bold shadow hover:opacity-90 disabled:opacity-60"
            style={{ background: '#5B52D4' }}
          >
            {isPending ? 'Aanmaken…' : 'Override aanmaken'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ─── Sub-component: OverdrachtenTab ──────────────────────────────────────────

function OverdrachtenTab({
  groepen,
  overdrachten,
  kinderenLijst,
}: {
  groepen: Groep[]
  overdrachten: Overdracht[]
  kinderenLijst: KindKort[]
}) {
  const [isPending, startTransition] = useTransition()
  const [fout, setFout] = useState<string | null>(null)
  const [formKey, setFormKey] = useState(0)
  const [vanGroepId, setVanGroepId] = useState('')

  const vandaag = new Date().toISOString().slice(0, 10)

  function handlePlannen(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    setFout(null)
    startTransition(async () => {
      const result = await groepsoverdrachtPlannen(fd)
      if (result?.error) setFout(result.error)
      else { setFormKey(k => k + 1); setVanGroepId('') }
    })
  }

  function handleUitvoeren(id: string) {
    startTransition(async () => {
      const result = await groepsoverdrachtUitvoeren(id)
      if (result?.error) setFout(result.error)
    })
  }

  const naarGroepen = groepen.filter(g => g.id !== vanGroepId)

  return (
    <div className="max-w-3xl space-y-6">
      {fout && (
        <div className="bg-red-50 text-red-700 rounded-xl px-4 py-3 text-sm flex items-center gap-2">
          <span className="material-symbols-outlined text-base">error</span>
          {fout}
        </div>
      )}

      {/* Geplande overdrachten */}
      {overdrachten.length > 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
            <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black text-white" style={{ background: '#5B52D4' }}>
              {overdrachten.length}
            </div>
            <h3 className="text-sm font-bold text-[#1E1A4B]" style={{ fontFamily: 'Manrope, sans-serif' }}>Geplande overdrachten</h3>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="text-left px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">Kind</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">Van groep</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">Naar groep</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">Datum</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {overdrachten.map((o, i) => (
                <tr key={o.id} className="border-b border-slate-50 last:border-0"
                  style={{ background: i % 2 === 1 ? '#fafbfc' : 'white' }}>
                  <td className="px-6 py-4 font-semibold text-[#5B52D4]">
                    {o.kinderen ? `${o.kinderen.voornaam} ${o.kinderen.achternaam}` : '—'}
                  </td>
                  <td className="px-4 py-4 text-slate-600">{o.van_groep?.naam ?? '—'}</td>
                  <td className="px-4 py-4 text-slate-600">{o.naar_groep?.naam ?? '—'}</td>
                  <td className="px-4 py-4 text-slate-600 text-xs">
                    {new Date(o.overdrachtsdatum).toLocaleDateString('nl-NL')}
                  </td>
                  <td className="px-4 py-4">
                    <button
                      onClick={() => handleUitvoeren(o.id)}
                      disabled={isPending}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                      style={{ background: '#006a66', color: 'white' }}
                    >
                      <span className="material-symbols-outlined text-sm">check</span>
                      Uitvoeren
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm text-center py-10">
          <span className="material-symbols-outlined text-3xl text-slate-300 block mb-2">transfer_within_a_station</span>
          <p className="text-sm text-slate-400">Geen geplande overdrachten</p>
        </div>
      )}

      {/* Nieuwe overdracht plannen */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <h3 className="text-sm font-bold text-[#1E1A4B] mb-4" style={{ fontFamily: 'Manrope, sans-serif' }}>Overdracht plannen</h3>
        <form key={formKey} onSubmit={handlePlannen} className="space-y-4">
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Kind *</label>
            <select name="kind_id" required className={inputCls}>
              <option value="">— Kies kind —</option>
              {kinderenLijst.map(k => (
                <option key={k.id} value={k.id}>
                  {k.voornaam} {k.tussenvoegsel ? k.tussenvoegsel + ' ' : ''}{k.achternaam}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Van groep *</label>
              <select name="van_groep_id" required className={inputCls} value={vanGroepId} onChange={e => setVanGroepId(e.target.value)}>
                <option value="">— Kies groep —</option>
                {groepen.map(g => <option key={g.id} value={g.id}>{g.naam}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Naar groep *</label>
              <select name="naar_groep_id" required className={inputCls}>
                <option value="">— Kies groep —</option>
                {naarGroepen.map(g => <option key={g.id} value={g.id}>{g.naam}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Overdrachtsdatum *</label>
            <input type="date" name="overdrachtsdatum" required className={inputCls} min={vandaag} defaultValue={vandaag} />
          </div>
          <button
            type="submit"
            disabled={isPending}
            className="px-6 py-2.5 rounded-xl text-white text-sm font-bold shadow hover:opacity-90 disabled:opacity-60"
            style={{ background: '#5B52D4' }}
          >
            {isPending ? 'Plannen…' : 'Overdracht plannen'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ─── Hoofd component ─────────────────────────────────────────────────────────

export default function KindplanningView({
  locaties, groepen, contracten, flexAanvragen, overdrachten, kinderenLijst, overrides,
}: Props) {
  const [tab, setTab] = useState<'capaciteit' | 'flex' | 'overrides' | 'overdrachten'>('capaciteit')

  const tabs = [
    { key: 'capaciteit' as const, icon: 'calendar_month', label: 'Capaciteitsoverzicht' },
    { key: 'flex' as const, icon: 'event_note', label: 'Flex aanvragen', badge: flexAanvragen.length },
    { key: 'overrides' as const, icon: 'tune', label: 'Capaciteit' },
    { key: 'overdrachten' as const, icon: 'transfer_within_a_station', label: 'Overdrachten', badge: overdrachten.length },
  ]

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <header className="bg-white/70 backdrop-blur-md px-8 py-4 border-b border-slate-100">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-[#1E1A4B]" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Kindplanning
            </h2>
            <p className="text-xs text-slate-400">Dagcapaciteit per groep · beschikbaarheid controleren · flex aanvragen</p>
          </div>
        </div>
        <div className="flex gap-1 mt-4">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
              style={
                tab === t.key
                  ? { background: '#5B52D4', color: 'white' }
                  : { background: 'transparent', color: '#64748b' }
              }
            >
              <span className="material-symbols-outlined text-base">{t.icon}</span>
              {t.label}
              {'badge' in t && (t.badge ?? 0) > 0 && (
                <span
                  className="text-[10px] font-black px-1.5 py-0.5 rounded-full"
                  style={
                    tab === t.key
                      ? { background: 'rgba(255,255,255,0.25)', color: 'white' }
                      : { background: '#e07b00', color: 'white' }
                  }
                >
                  {t.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </header>

      <div className="flex-1 overflow-auto px-8 py-8">
        {tab === 'capaciteit' && (
          <CapaciteitsGrid locaties={locaties} groepen={groepen} contracten={contracten} overrides={overrides} />
        )}
        {tab === 'flex' && (
          <FlexAanvragenTab aanvragen={flexAanvragen} />
        )}
        {tab === 'overrides' && (
          <CapaciteitOverridesTab groepen={groepen} overrides={overrides} />
        )}
        {tab === 'overdrachten' && (
          <OverdrachtenTab groepen={groepen} overdrachten={overdrachten} kinderenLijst={kinderenLijst} />
        )}
      </div>
    </div>
  )
}
