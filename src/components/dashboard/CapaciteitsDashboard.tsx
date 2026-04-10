'use client'

import Link from 'next/link'

interface Props {
  voornaam: string | null
  bezettingPct: number
  totaalCapaciteit: number
  actieveContracten: number
  nieuweAanmeldingen: number
  contractWijzigingen: number
  opzeggingen: number
  wachtlijstTotaal: number
  wachtlijstActief: number
}

function BezettingRing({ pct }: { pct: number }) {
  const r = 36
  const omtrek = 2 * Math.PI * r
  const fill = omtrek - (omtrek * Math.min(pct, 100)) / 100
  const kleur = pct >= 95 ? '#ba1a1a' : pct >= 80 ? '#e07b00' : '#22A77E'

  return (
    <div className="relative w-24 h-24 flex items-center justify-center">
      <svg width="96" height="96" viewBox="0 0 96 96" className="-rotate-90">
        <circle cx="48" cy="48" r={r} fill="none" stroke="#EAE8FD" strokeWidth="8" />
        <circle
          cx="48" cy="48" r={r}
          fill="none"
          stroke={kleur}
          strokeWidth="8"
          strokeDasharray={omtrek}
          strokeDashoffset={fill}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
      </svg>
      <span
        className="absolute text-xl font-black"
        style={{ color: '#1E1A4B', fontFamily: 'Manrope, sans-serif' }}
      >
        {pct}%
      </span>
    </div>
  )
}

function InsightTegel({
  icon, label, waarde, sub, kleur = 'slate',
}: {
  icon: string
  label: string
  waarde: React.ReactNode
  sub: string
  kleur?: 'purple' | 'slate'
}) {
  const bg    = kleur === 'purple' ? '#5B52D4' : 'white'
  const tekst = kleur === 'purple' ? 'text-white' : ''
  const subTx = kleur === 'purple' ? 'text-white/60' : 'text-slate-400'
  const iconBg = kleur === 'purple' ? 'rgba(255,255,255,0.15)' : '#F3F2FE'
  const iconTx = kleur === 'purple' ? 'white' : '#5B52D4'

  return (
    <div
      className="rounded-2xl p-6 border border-slate-100 flex items-center gap-5 shadow-sm"
      style={{ background: bg }}
    >
      <div
        className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: iconBg }}
      >
        <span className="material-symbols-outlined text-2xl" style={{ color: iconTx }}>{icon}</span>
      </div>
      <div className="min-w-0">
        <p className={`text-[10px] font-bold uppercase tracking-widest ${subTx}`}>{label}</p>
        <div
          className={`text-2xl font-black mt-0.5 ${tekst}`}
          style={{ fontFamily: 'Manrope, sans-serif', color: kleur === 'slate' ? '#1E1A4B' : undefined }}
        >
          {waarde}
        </div>
        <p className={`text-xs mt-0.5 ${subTx}`}>{sub}</p>
      </div>
    </div>
  )
}

function ActieTegel({
  icon, label, count, sub, href, urgentie = 'normaal',
}: {
  icon: string
  label: string
  count: number
  sub: string
  href: string
  urgentie?: 'normaal' | 'attentie' | 'leeg'
}) {
  const kleurenMap = {
    normaal:  { badge: 'bg-[#EAE8FD] text-[#5B52D4]', ring: 'ring-[#EAE8FD]/50' },
    attentie: { badge: 'bg-[#ffdcbb] text-[#703700]',  ring: 'ring-[#ffdcbb]/50' },
    leeg:     { badge: 'bg-slate-100 text-slate-400',   ring: 'ring-slate-100' },
  }
  const k = kleurenMap[count === 0 ? 'leeg' : urgentie]

  return (
    <Link
      href={href}
      className="group bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all flex items-center gap-4"
    >
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors"
        style={{ background: '#F3F2FE' }}
        onMouseEnter={e => (e.currentTarget.style.background = '#EAE8FD')}
        onMouseLeave={e => (e.currentTarget.style.background = '#F3F2FE')}
      >
        <span className="material-symbols-outlined text-xl" style={{ color: '#5B52D4' }}>{icon}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{label}</p>
        <div className="flex items-baseline gap-2 mt-0.5">
          <span
            className="text-2xl font-black"
            style={{ color: '#1E1A4B', fontFamily: 'Manrope, sans-serif' }}
          >
            {count}
          </span>
          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${k.badge}`}>
            {count === 0 ? 'geen' : 'nieuw'}
          </span>
        </div>
        <p className="text-xs text-slate-400 mt-0.5 truncate">{sub}</p>
      </div>
      <span
        className="material-symbols-outlined text-slate-300 transition-colors group-hover:text-[#5B52D4]"
      >
        chevron_right
      </span>
    </Link>
  )
}

export default function DashboardOverzicht({
  voornaam,
  bezettingPct,
  totaalCapaciteit,
  actieveContracten,
  nieuweAanmeldingen,
  contractWijzigingen,
  opzeggingen,
  wachtlijstTotaal,
  wachtlijstActief,
}: Props) {
  const nu = new Date()
  const dagNaam = nu.toLocaleDateString('nl-NL', { weekday: 'long' })
  const datum = nu.toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })
  const greeting = voornaam ? `Goedemorgen, ${voornaam}` : 'Goedemorgen'

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Top bar */}
      <header className="bg-white/80 backdrop-blur-md flex justify-between items-center px-8 py-4 border-b border-slate-100">
        <div>
          <h2
            className="text-xl font-bold tracking-tight"
            style={{ fontFamily: 'Manrope, sans-serif', color: '#1E1A4B' }}
          >
            {greeting}
          </h2>
          <p className="text-xs text-slate-400 capitalize">{dagNaam} {datum}</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="p-2 text-slate-400 hover:bg-slate-100 rounded-xl transition-colors relative">
            <span className="material-symbols-outlined">notifications</span>
            {(nieuweAanmeldingen + contractWijzigingen + opzeggingen) > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#ba1a1a] rounded-full" />
            )}
          </button>
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center font-black text-sm"
            style={{ background: '#EAE8FD', color: '#5B52D4' }}
          >
            {voornaam?.[0]?.toUpperCase() ?? 'U'}
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-8 py-8 space-y-8">

        {/* ── Insights ─────────────────────────────────────── */}
        <section className="space-y-3">
          <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Inzichten</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* Bezetting met ring */}
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex items-center gap-6">
              <BezettingRing pct={bezettingPct} />
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Bezettingsgraad</p>
                <p className="text-sm font-semibold mt-0.5" style={{ color: '#1E1A4B' }}>
                  {actieveContracten} van {totaalCapaciteit} plekken bezet
                </p>
                <p className="text-xs text-slate-400 mt-1">over alle locaties en groepen</p>
              </div>
            </div>

            <InsightTegel
              icon="group_add"
              label="Wachtlijst totaal"
              waarde={wachtlijstTotaal}
              sub={`${wachtlijstActief} actief wachtend`}
              kleur="purple"
            />
          </div>
        </section>

        {/* ── Acties ───────────────────────────────────────── */}
        <section className="space-y-3">
          <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Vereist aandacht</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            <ActieTegel
              icon="assignment_add"
              label="Nieuwe aanmeldingen"
              count={nieuweAanmeldingen}
              sub="Conceptcontracten zonder eerdere plaatsing"
              href="/dashboard/wachtlijst"
              urgentie="normaal"
            />

            <ActieTegel
              icon="assignment_return"
              label="Nieuwe opzeggingen"
              count={opzeggingen}
              sub="Uitschrijvingen in de afgelopen 30 dagen"
              href="/dashboard/kinderen"
              urgentie="attentie"
            />

            <ActieTegel
              icon="edit_document"
              label="Contractwijzigingen"
              count={contractWijzigingen}
              sub="Concepten ter vervanging van een bestaand contract"
              href="/dashboard/kinderen"
              urgentie="normaal"
            />

            <ActieTegel
              icon="transfer_within_a_station"
              label="Wachtlijst — ruimte beschikbaar"
              count={wachtlijstActief}
              sub="Kinderen die geplaatst kunnen worden"
              href="/dashboard/wachtlijst"
              urgentie="normaal"
            />

          </div>
        </section>

      </div>
    </div>
  )
}
