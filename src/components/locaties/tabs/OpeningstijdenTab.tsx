'use client'

import { useState, useEffect } from 'react'
import {
  openingstijdenBijwerken,
  uitzonderingToevoegen,
  uitzonderingVerwijderen,
} from '@/app/actions/locaties'
import type { OpeningstijdenRegel, OpeningstijdenUitzondering, DagVanDeWeek } from '@/types/locaties'
import { DAG_LABELS } from '@/types/locaties'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  locatieId: string
  openingstijden: OpeningstijdenRegel[]
  uitzonderingen: OpeningstijdenUitzondering[]
}

interface DagRij {
  dag: DagVanDeWeek
  label: string
  is_open: boolean
  open_tijd: string
  sluit_tijd: string
}

// ─── Helpers / constanten ─────────────────────────────────────────────────────

const DAG_VOLGORDE: DagVanDeWeek[] = ['ma', 'di', 'wo', 'do', 'vr', 'za', 'zo']

function formatTijd(rij: OpeningstijdenRegel): string {
  if (!rij.is_open) return 'Gesloten'
  return `${rij.open_tijd ?? '?'} – ${rij.sluit_tijd ?? '?'}`
}

function formatDatum(iso: string): string {
  return new Date(iso).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function OpeningstijdenTab({ locatieId, openingstijden, uitzonderingen }: Props) {
  // ── Openingstijden state ──────────────────────────────────────────────────
  const [bewerkTijden, setBewerkTijden] = useState(false)
  const [tijdenBezig, setTijdenBezig]   = useState(false)
  const [tijdenFouten, setTijdenFouten] = useState<Record<string, string>>({})

  const initDagen = (): DagRij[] =>
    DAG_VOLGORDE.map(dag => {
      const rij = openingstijden.find(o => o.dag_van_week === dag)
      return {
        dag,
        label: DAG_LABELS[dag],
        is_open:    rij?.is_open   ?? (dag !== 'za' && dag !== 'zo'),
        open_tijd:  rij?.open_tijd  ?? '07:00',
        sluit_tijd: rij?.sluit_tijd ?? '18:00',
      }
    })

  const [dagen, setDagen] = useState<DagRij[]>(initDagen)

  function updateDag(dag: DagVanDeWeek, veld: keyof DagRij, waarde: string | boolean) {
    setDagen(prev => prev.map(d => d.dag === dag ? { ...d, [veld]: waarde } : d))
  }

  async function slaOpeningstijdenOp() {
    const fouten: Record<string, string> = {}
    dagen.forEach(d => {
      if (d.is_open && d.open_tijd >= d.sluit_tijd)
        fouten[d.dag] = 'Sluitingstijd moet na openingstijd liggen'
    })
    if (Object.keys(fouten).length > 0) { setTijdenFouten(fouten); return }
    setTijdenFouten({})
    setTijdenBezig(true)
    const res = await openingstijdenBijwerken(locatieId, dagen.map(d => ({
      dag: d.dag, is_open: d.is_open, open_tijd: d.open_tijd, sluit_tijd: d.sluit_tijd,
    })))
    setTijdenBezig(false)
    if (!res.error) { setBewerkTijden(false); toonToast('success', 'Openingstijden opgeslagen ✓') }
    else toonToast('error', res.error)
  }

  // ── Uitzonderingen state ──────────────────────────────────────────────────
  const [toonForm, setToonForm]         = useState(false)
  const [confirmVerwijderId, setDelId]  = useState<string | null>(null)
  const [uitBezig, setUitBezig]         = useState(false)

  const [omschrijving, setOmschrijving] = useState('')
  const [startDatum, setStartDatum]     = useState('')
  const [eindDatum, setEindDatum]       = useState('')
  const [isGesloten, setIsGesloten]     = useState(true)
  const [openTijd, setOpenTijd]         = useState('07:00')
  const [sluitTijd, setSluitTijd]       = useState('18:00')
  const [uitFouten, setUitFouten]       = useState<Record<string, string>>({})

  // Toast
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  function toonToast(type: 'success' | 'error', message: string) { setToast({ type, message }) }
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3500)
    return () => clearTimeout(t)
  }, [toast])

  function resetUitzonderingForm() {
    setOmschrijving(''); setStartDatum(''); setEindDatum('')
    setIsGesloten(true); setOpenTijd('07:00'); setSluitTijd('18:00')
    setUitFouten({})
  }

  async function voegUitzonderingToe() {
    const f: Record<string, string> = {}
    if (!omschrijving.trim()) f.omschrijving = 'Omschrijving is verplicht'
    if (!startDatum) f.startDatum = 'Startdatum is verplicht'
    if (!eindDatum) f.eindDatum = 'Einddatum is verplicht'
    if (!isGesloten && openTijd >= sluitTijd) f.openTijd = 'Sluitingstijd moet na openingstijd liggen'
    if (Object.keys(f).length > 0) { setUitFouten(f); return }

    setUitBezig(true)
    const fd = new FormData()
    fd.append('omschrijving', omschrijving)
    fd.append('start_datum', startDatum)
    fd.append('eind_datum', eindDatum)
    fd.append('is_gesloten', isGesloten ? 'true' : 'false')
    if (!isGesloten) { fd.append('open_tijd', openTijd); fd.append('sluit_tijd', sluitTijd) }

    const res = await uitzonderingToevoegen(locatieId, fd)
    setUitBezig(false)
    if (!res.error) {
      resetUitzonderingForm()
      setToonForm(false)
      toonToast('success', 'Uitzondering toegevoegd ✓')
    } else {
      toonToast('error', res.error)
    }
  }

  async function verwijderUitzondering(id: string) {
    setUitBezig(true)
    const res = await uitzonderingVerwijderen(id)
    setUitBezig(false)
    if (!res.error) { setDelId(null); toonToast('success', 'Uitzondering verwijderd ✓') }
    else toonToast('error', res.error)
  }

  const inputKlasse = (fout?: string) =>
    `w-full border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#006684]/30 ${fout ? 'border-red-300 bg-red-50' : 'border-slate-200'}`

  return (
    <div className="space-y-8 max-w-2xl">
      {/* ── Reguliere openingstijden ─── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <div className="flex items-center justify-between mb-5">
          <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Reguliere openingstijden</h4>
          {bewerkTijden ? (
            <div className="flex gap-2">
              <button
                onClick={slaOpeningstijdenOp}
                disabled={tijdenBezig}
                className="text-xs font-bold text-white bg-[#006a66] px-3 py-1 rounded-lg hover:bg-[#005a57] disabled:opacity-50"
              >
                {tijdenBezig ? 'Opslaan...' : 'Opslaan'}
              </button>
              <button
                onClick={() => { setDagen(initDagen()); setBewerkTijden(false); setTijdenFouten({}) }}
                className="text-xs font-semibold text-slate-400 hover:text-slate-600 px-3 py-1"
              >
                Annuleren
              </button>
            </div>
          ) : (
            <button
              onClick={() => setBewerkTijden(true)}
              className="text-xs font-semibold text-[#006684] hover:text-[#004d64] flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-sm">edit</span>
              Bewerken
            </button>
          )}
        </div>

        <div className="space-y-2">
          {bewerkTijden ? (
            dagen.map(d => (
              <div key={d.dag} className="flex items-center gap-4">
                <div className="w-24 shrink-0 text-sm font-semibold text-slate-600">{d.label}</div>
                <label className="flex items-center gap-2 cursor-pointer w-24 shrink-0">
                  <input
                    type="checkbox"
                    checked={d.is_open}
                    onChange={e => updateDag(d.dag, 'is_open', e.target.checked)}
                    className="w-4 h-4 accent-[#006a66]"
                  />
                  <span className="text-sm text-slate-500">{d.is_open ? 'Open' : 'Gesloten'}</span>
                </label>
                {d.is_open && (
                  <div className="flex items-center gap-2 flex-1">
                    <input
                      type="time"
                      step="900"
                      value={d.open_tijd}
                      onChange={e => updateDag(d.dag, 'open_tijd', e.target.value)}
                      className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-[#006684]/30"
                    />
                    <span className="text-slate-400">—</span>
                    <input
                      type="time"
                      step="900"
                      value={d.sluit_tijd}
                      onChange={e => updateDag(d.dag, 'sluit_tijd', e.target.value)}
                      className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-[#006684]/30"
                    />
                    {tijdenFouten[d.dag] && (
                      <span className="text-xs text-red-600">{tijdenFouten[d.dag]}</span>
                    )}
                  </div>
                )}
              </div>
            ))
          ) : (
            <table className="w-full text-sm">
              <tbody>
                {DAG_VOLGORDE.map(dag => {
                  const rij = openingstijden.find(o => o.dag_van_week === dag)
                  return (
                    <tr key={dag} className="border-b border-slate-50 last:border-0">
                      <td className="py-2 w-28 font-semibold text-slate-600">{DAG_LABELS[dag]}</td>
                      <td className={`py-2 ${!rij?.is_open ? 'text-slate-400 italic' : 'text-slate-700'}`}>
                        {rij ? formatTijd(rij) : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── Uitzonderingen ─── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <div className="flex items-center justify-between mb-5">
          <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Uitzonderingen</h4>
          <button
            onClick={() => { setToonForm(!toonForm); resetUitzonderingForm() }}
            className="text-xs font-semibold text-[#006684] hover:text-[#004d64] flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-sm">{toonForm ? 'remove' : 'add'}</span>
            Uitzondering toevoegen
          </button>
        </div>

        {/* Tabel */}
        {uitzonderingen.length > 0 ? (
          <div className="overflow-x-auto mb-4">
            <table className="w-full text-sm min-w-[500px]">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left py-2 px-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Omschrijving</th>
                  <th className="text-left py-2 px-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Van</th>
                  <th className="text-left py-2 px-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tot</th>
                  <th className="text-left py-2 px-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Type</th>
                  <th className="py-2 px-2" />
                </tr>
              </thead>
              <tbody>
                {uitzonderingen.map(u => (
                  <tr key={u.id} className="border-b border-slate-50 last:border-0">
                    <td className="py-2 px-2 font-medium text-slate-700">{u.omschrijving}</td>
                    <td className="py-2 px-2 text-slate-500">{formatDatum(u.start_datum)}</td>
                    <td className="py-2 px-2 text-slate-500">{formatDatum(u.eind_datum)}</td>
                    <td className="py-2 px-2">
                      {u.is_gesloten ? (
                        <span className="text-xs font-semibold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">Gesloten</span>
                      ) : (
                        <span className="text-xs font-semibold bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full">
                          {u.open_tijd} – {u.sluit_tijd}
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-2 text-right">
                      {confirmVerwijderId === u.id ? (
                        <div className="flex items-center gap-2 justify-end text-xs">
                          <span className="text-slate-500">Verwijderen?</span>
                          <button
                            onClick={() => verwijderUitzondering(u.id)}
                            disabled={uitBezig}
                            className="text-red-600 font-bold hover:text-red-800 disabled:opacity-50"
                          >
                            Ja
                          </button>
                          <span className="text-slate-300">/</span>
                          <button onClick={() => setDelId(null)} className="text-slate-500 font-bold hover:text-slate-700">
                            Nee
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDelId(u.id)}
                          className="text-xs text-slate-400 hover:text-red-500"
                        >
                          <span className="material-symbols-outlined text-sm">delete</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : !toonForm && (
          <p className="text-sm text-slate-400 italic mb-4">Geen uitzonderingen ingesteld</p>
        )}

        {/* Uitklapbaar formulier */}
        {toonForm && (
          <div className="border-t border-slate-100 pt-5 mt-4 space-y-4">
            <h5 className="text-sm font-bold text-slate-600">Nieuwe uitzondering</h5>
            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1">
                Omschrijving <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={omschrijving}
                onChange={e => setOmschrijving(e.target.value)}
                className={inputKlasse(uitFouten.omschrijving)}
                placeholder="Bijv. Kerstvakantie"
              />
              {uitFouten.omschrijving && <p className="text-xs text-red-600 mt-1">{uitFouten.omschrijving}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1">
                  Startdatum <span className="text-red-400">*</span>
                </label>
                <input
                  type="date"
                  value={startDatum}
                  onChange={e => setStartDatum(e.target.value)}
                  className={inputKlasse(uitFouten.startDatum)}
                />
                {uitFouten.startDatum && <p className="text-xs text-red-600 mt-1">{uitFouten.startDatum}</p>}
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1">
                  Einddatum <span className="text-red-400">*</span>
                </label>
                <input
                  type="date"
                  value={eindDatum}
                  onChange={e => setEindDatum(e.target.value)}
                  className={inputKlasse(uitFouten.eindDatum)}
                />
                {uitFouten.eindDatum && <p className="text-xs text-red-600 mt-1">{uitFouten.eindDatum}</p>}
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-2">Type</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" checked={isGesloten} onChange={() => setIsGesloten(true)} className="accent-[#006a66]" />
                  <span className="text-sm text-slate-600">Gesloten</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" checked={!isGesloten} onChange={() => setIsGesloten(false)} className="accent-[#006a66]" />
                  <span className="text-sm text-slate-600">Aangepaste tijden</span>
                </label>
              </div>
            </div>
            {!isGesloten && (
              <div className="flex items-center gap-3">
                <input
                  type="time"
                  step="900"
                  value={openTijd}
                  onChange={e => setOpenTijd(e.target.value)}
                  className="border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#006684]/30"
                />
                <span className="text-slate-400">—</span>
                <input
                  type="time"
                  step="900"
                  value={sluitTijd}
                  onChange={e => setSluitTijd(e.target.value)}
                  className="border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#006684]/30"
                />
                {uitFouten.openTijd && <p className="text-xs text-red-600">{uitFouten.openTijd}</p>}
              </div>
            )}
            <div className="flex gap-3">
              <button
                onClick={voegUitzonderingToe}
                disabled={uitBezig}
                className="px-4 py-2 text-sm font-bold text-white bg-[#006a66] rounded-xl hover:bg-[#005a57] disabled:opacity-50"
              >
                {uitBezig ? 'Toevoegen...' : 'Toevoegen'}
              </button>
              <button
                onClick={() => { setToonForm(false); resetUitzonderingForm() }}
                className="px-4 py-2 text-sm font-semibold text-slate-500 hover:text-slate-700"
              >
                Annuleren
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl shadow-lg text-sm font-semibold flex items-center gap-2 ${
          toast.type === 'success' ? 'bg-[#8df4ed]/90 text-[#006a66]' : 'bg-red-50 border border-red-200 text-red-700'
        }`}>
          <span className="material-symbols-outlined text-sm">
            {toast.type === 'success' ? 'check_circle' : 'error'}
          </span>
          {toast.message}
        </div>
      )}
    </div>
  )
}
