'use client'

import { useState, useEffect, useRef } from 'react'
import { groepAanmaken, groepBijwerken, groepDeactiveren } from '@/app/actions/locaties'
import type { Groep, GroepStatus, Opvangtype, Leeftijdscategorie } from '@/types/locaties'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  locatieId: string
  groepen: Groep[]
}

type PanelModus = 'aanmaken' | 'bewerken'

// ─── Helpers / constanten ─────────────────────────────────────────────────────

const GROEP_STATUS_CONFIG: Record<GroepStatus, { label: string; bg: string; text: string }> = {
  actief:            { label: 'Actief',           bg: 'bg-[#8df4ed]/40', text: 'text-[#006a66]' },
  gesloten:          { label: 'Gesloten',          bg: 'bg-slate-100',    text: 'text-slate-500' },
  alleen_wachtlijst: { label: 'Alleen wachtlijst', bg: 'bg-[#bee9ff]/60', text: 'text-[#004d64]' },
}

const OPVANGTYPE_LABELS: Record<Opvangtype, string> = {
  kdv: 'KDV', bso: 'BSO', peuteropvang: 'Peuteropvang', gastouder: 'Gastouder',
}

const LEEFTIJD_LABELS: Record<Leeftijdscategorie, string> = {
  baby: 'Baby', dreumes: 'Dreumes', peuter: 'Peuter', bso: 'BSO',
}

function leeftijdLabel(min: number, max: number): string {
  function fmt(m: number): string {
    if (m < 12) return `${m}m`
    const j = Math.floor(m / 12)
    const rest = m % 12
    return rest ? `${j}j ${rest}m` : `${j}j`
  }
  return `${fmt(min)} – ${fmt(max)}`
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function GroepenTab({ locatieId, groepen }: Props) {
  const [panelOpen, setPanelOpen]     = useState(false)
  const [panelModus, setPanelModus]   = useState<PanelModus>('aanmaken')
  const [actieveGroep, setActief]     = useState<Groep | null>(null)
  const [bezig, setBezig]             = useState(false)
  const [confirmId, setConfirmId]     = useState<string | null>(null)
  const [toast, setToast]             = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  // Formuliervelden
  const [naam, setNaam]                   = useState('')
  const [opvangtype, setOpvangtype]       = useState<Opvangtype | ''>('')
  const [leeftijdsCat, setLeeftijdsCat]   = useState<Leeftijdscategorie | ''>('')
  const [minLeeftijd, setMinLeeftijd]     = useState('')
  const [maxLeeftijd, setMaxLeeftijd]     = useState('')
  const [maxCapaciteit, setMaxCapaciteit] = useState('')
  const [m2, setM2]                       = useState('')
  const [bkrRatio, setBkrRatio]           = useState('')
  const [ruimtenaam, setRuimtenaam]       = useState('')
  const [status, setStatus]               = useState<GroepStatus>('actief')
  const [fouten, setFouten]               = useState<Record<string, string>>({})

  const m2PerKind = m2 && maxCapaciteit && Number(maxCapaciteit) > 0
    ? (Number(m2) / Number(maxCapaciteit)).toFixed(1)
    : null

  // Toast auto-dismiss
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3500)
    return () => clearTimeout(t)
  }, [toast])

  // Sluiten op buiten klikken of Escape
  useEffect(() => {
    if (!panelOpen) return
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        sluitPanel()
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') sluitPanel()
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [panelOpen])

  function openAanmaken() {
    setNaam(''); setOpvangtype(''); setLeeftijdsCat(''); setMinLeeftijd('')
    setMaxLeeftijd(''); setMaxCapaciteit(''); setM2(''); setBkrRatio('')
    setRuimtenaam(''); setStatus('actief'); setFouten({})
    setPanelModus('aanmaken')
    setActief(null)
    setPanelOpen(true)
  }

  function openBewerken(g: Groep) {
    setNaam(g.naam)
    setOpvangtype(g.opvangtype)
    setLeeftijdsCat(g.leeftijdscategorie)
    setMinLeeftijd(String(g.min_leeftijd_maanden))
    setMaxLeeftijd(String(g.max_leeftijd_maanden))
    setMaxCapaciteit(String(g.max_capaciteit))
    setM2(g.m2 ? String(g.m2) : '')
    setBkrRatio(g.bkr_ratio ?? '')
    setRuimtenaam(g.ruimtenaam ?? '')
    setStatus(g.status)
    setFouten({})
    setPanelModus('bewerken')
    setActief(g)
    setPanelOpen(true)
  }

  function sluitPanel() {
    setPanelOpen(false)
    setActief(null)
    setFouten({})
  }

  function valideer(): boolean {
    const f: Record<string, string> = {}
    if (!naam.trim()) f.naam = 'Naam is verplicht'
    if (!opvangtype) f.opvangtype = 'Opvangtype is verplicht'
    if (!leeftijdsCat) f.leeftijdsCat = 'Leeftijdscategorie is verplicht'
    if (!minLeeftijd) f.minLeeftijd = 'Minimumleeftijd is verplicht'
    if (!maxLeeftijd) f.maxLeeftijd = 'Maximumleeftijd is verplicht'
    if (minLeeftijd && maxLeeftijd && Number(minLeeftijd) >= Number(maxLeeftijd))
      f.minLeeftijd = 'Minimumleeftijd moet kleiner zijn dan maximumleeftijd'
    if (!maxCapaciteit) f.maxCapaciteit = 'Capaciteit is verplicht'
    else if (!Number.isInteger(Number(maxCapaciteit)) || Number(maxCapaciteit) <= 0)
      f.maxCapaciteit = 'Capaciteit moet een positief geheel getal zijn'
    if (m2 && Number(m2) <= 0) f.m2 = 'Oppervlakte moet groter zijn dan 0'
    setFouten(f)
    return Object.keys(f).length === 0
  }

  function buildFormData(): FormData {
    const fd = new FormData()
    fd.append('naam', naam)
    fd.append('opvangtype', opvangtype)
    fd.append('leeftijdscategorie', leeftijdsCat)
    fd.append('min_leeftijd_maanden', minLeeftijd)
    fd.append('max_leeftijd_maanden', maxLeeftijd)
    fd.append('max_capaciteit', maxCapaciteit)
    fd.append('status', status)
    if (m2) fd.append('m2', m2)
    if (bkrRatio) fd.append('bkr_ratio', bkrRatio)
    if (ruimtenaam) fd.append('ruimtenaam', ruimtenaam)
    return fd
  }

  async function handleSubmit() {
    if (!valideer()) return
    setBezig(true)
    let res: { error?: string }
    if (panelModus === 'aanmaken') {
      res = await groepAanmaken(locatieId, buildFormData())
    } else {
      res = await groepBijwerken(actieveGroep!.id, buildFormData())
    }
    setBezig(false)
    if (res.error) {
      setToast({ type: 'error', message: res.error })
    } else {
      setToast({ type: 'success', message: panelModus === 'aanmaken' ? 'Groep aangemaakt ✓' : 'Groep opgeslagen ✓' })
      sluitPanel()
    }
  }

  async function handleDeactiveren(id: string) {
    setBezig(true)
    const res = await groepDeactiveren(id)
    setBezig(false)
    if (res.error) {
      setToast({ type: 'error', message: res.error })
    } else {
      setConfirmId(null)
      setToast({ type: 'success', message: 'Groep gedeactiveerd ✓' })
    }
  }

  const actieveGroepen = groepen.filter(g => g.deleted_at === null)

  const inputKlasse = (fout?: string) =>
    `w-full border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#006684]/30 ${fout ? 'border-red-300 bg-red-50' : 'border-slate-200'}`

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-slate-500">{actieveGroepen.length} groep{actieveGroepen.length !== 1 ? 'en' : ''}</span>
        <button
          onClick={openAanmaken}
          className="text-sm font-bold text-white px-4 py-2 rounded-xl flex items-center gap-1 shadow-sm hover:opacity-90 active:scale-95"
          style={{ background: 'linear-gradient(to right, #004d64, #006684)' }}
        >
          <span className="material-symbols-outlined text-sm">add</span>
          Groep toevoegen
        </button>
      </div>

      {/* Tabel */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-100">
                {['Naam', 'Type', 'Leeftijd', 'Capaciteit', 'm²', 'm²/kind', 'BKR', 'Status', 'Acties'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {actieveGroepen.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center">
                    <span className="material-symbols-outlined text-4xl text-slate-200 block mb-2">groups</span>
                    <p className="text-slate-400 font-semibold text-sm">Nog geen groepen aangemaakt</p>
                  </td>
                </tr>
              ) : actieveGroepen.map(g => {
                const cfg = GROEP_STATUS_CONFIG[g.status]
                const m2pk = g.m2 && g.max_capaciteit > 0 ? g.m2 / g.max_capaciteit : null
                const m2pkStr = m2pk !== null ? m2pk.toFixed(1) : '—'
                const m2pkRood = m2pk !== null && m2pk < 3.5
                const isConfirming = confirmId === g.id

                return (
                  <tr key={g.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3 font-semibold text-[#181c1d]">{g.naam}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs font-semibold">
                      {OPVANGTYPE_LABELS[g.opvangtype]}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {leeftijdLabel(g.min_leeftijd_maanden, g.max_leeftijd_maanden)}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{g.max_capaciteit}</td>
                    <td className="px-4 py-3 text-slate-600">{g.m2 ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`font-bold ${m2pkRood ? 'text-red-600' : 'text-slate-600'}`}>
                        {m2pkStr}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-xs">{g.bkr_ratio ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold ${cfg.bg} ${cfg.text}`}>
                        {cfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {isConfirming ? (
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-slate-500">Deactiveren?</span>
                          <button
                            onClick={() => handleDeactiveren(g.id)}
                            disabled={bezig}
                            className="text-red-600 font-bold hover:text-red-800 disabled:opacity-50"
                          >
                            Ja
                          </button>
                          <span className="text-slate-300">/</span>
                          <button onClick={() => setConfirmId(null)} className="text-slate-500 font-bold hover:text-slate-700">
                            Nee
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openBewerken(g)}
                            className="text-xs font-semibold text-[#006684] hover:text-[#004d64]"
                          >
                            Bewerken
                          </button>
                          <span className="text-slate-200">|</span>
                          <button
                            onClick={() => setConfirmId(g.id)}
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

      {/* Aside panel */}
      {panelOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/20" />
          <div
            ref={panelRef}
            className="relative bg-white w-full max-w-md h-full shadow-2xl overflow-y-auto flex flex-col"
          >
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
              <h3 className="text-lg font-bold text-[#004d64]" style={{ fontFamily: 'Manrope, sans-serif' }}>
                {panelModus === 'aanmaken' ? 'Groep toevoegen' : 'Groep bewerken'}
              </h3>
              <button onClick={sluitPanel} className="text-slate-400 hover:text-slate-600">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1">
                  Naam <span className="text-red-400">*</span>
                </label>
                <input type="text" value={naam} onChange={e => setNaam(e.target.value)} className={inputKlasse(fouten.naam)} />
                {fouten.naam && <p className="text-xs text-red-600 mt-1">{fouten.naam}</p>}
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1">
                  Opvangtype <span className="text-red-400">*</span>
                </label>
                <select
                  value={opvangtype}
                  onChange={e => setOpvangtype(e.target.value as Opvangtype)}
                  className={`${inputKlasse(fouten.opvangtype)} bg-white`}
                >
                  <option value="">Selecteer opvangtype</option>
                  {(Object.entries(OPVANGTYPE_LABELS) as [Opvangtype, string][]).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
                {fouten.opvangtype && <p className="text-xs text-red-600 mt-1">{fouten.opvangtype}</p>}
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1">
                  Leeftijdscategorie <span className="text-red-400">*</span>
                </label>
                <select
                  value={leeftijdsCat}
                  onChange={e => setLeeftijdsCat(e.target.value as Leeftijdscategorie)}
                  className={`${inputKlasse(fouten.leeftijdsCat)} bg-white`}
                >
                  <option value="">Selecteer categorie</option>
                  {(Object.entries(LEEFTIJD_LABELS) as [Leeftijdscategorie, string][]).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
                {fouten.leeftijdsCat && <p className="text-xs text-red-600 mt-1">{fouten.leeftijdsCat}</p>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-slate-600 mb-1">
                    Min leeftijd (mnd) <span className="text-red-400">*</span>
                  </label>
                  <input type="number" min="0" value={minLeeftijd} onChange={e => setMinLeeftijd(e.target.value)} className={inputKlasse(fouten.minLeeftijd)} />
                  {fouten.minLeeftijd && <p className="text-xs text-red-600 mt-1">{fouten.minLeeftijd}</p>}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-600 mb-1">
                    Max leeftijd (mnd) <span className="text-red-400">*</span>
                  </label>
                  <input type="number" min="0" value={maxLeeftijd} onChange={e => setMaxLeeftijd(e.target.value)} className={inputKlasse(fouten.maxLeeftijd)} />
                  {fouten.maxLeeftijd && <p className="text-xs text-red-600 mt-1">{fouten.maxLeeftijd}</p>}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1">
                  Max capaciteit <span className="text-red-400">*</span>
                </label>
                <input type="number" min="1" value={maxCapaciteit} onChange={e => setMaxCapaciteit(e.target.value)} className={inputKlasse(fouten.maxCapaciteit)} />
                {fouten.maxCapaciteit && <p className="text-xs text-red-600 mt-1">{fouten.maxCapaciteit}</p>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-slate-600 mb-1">Oppervlakte (m²)</label>
                  <input type="number" min="0" step="0.1" value={m2} onChange={e => setM2(e.target.value)} className={inputKlasse(fouten.m2)} />
                  {fouten.m2 && <p className="text-xs text-red-600 mt-1">{fouten.m2}</p>}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-600 mb-1">m²/kind</label>
                  <div className={`w-full border rounded-xl px-4 py-2.5 text-sm font-bold ${
                    m2PerKind && Number(m2PerKind) < 3.5
                      ? 'border-red-200 bg-red-50 text-red-600'
                      : 'border-slate-100 bg-slate-50 text-slate-500'
                  }`}>
                    {m2PerKind ?? '—'}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1">BKR-verhouding</label>
                <input type="text" value={bkrRatio} onChange={e => setBkrRatio(e.target.value)} className={inputKlasse()} placeholder="Bijv. 1:3" />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1">Ruimtenaam</label>
                <input type="text" value={ruimtenaam} onChange={e => setRuimtenaam(e.target.value)} className={inputKlasse()} placeholder="Bijv. Rode Kamer" />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1">Status</label>
                <select
                  value={status}
                  onChange={e => setStatus(e.target.value as GroepStatus)}
                  className={`${inputKlasse()} bg-white`}
                >
                  <option value="actief">Actief</option>
                  <option value="alleen_wachtlijst">Alleen wachtlijst</option>
                  <option value="gesloten">Gesloten</option>
                </select>
              </div>
            </div>

            <div className="border-t border-slate-100 px-6 py-4 flex gap-3">
              <button
                onClick={handleSubmit}
                disabled={bezig}
                className="flex-1 py-2.5 text-sm font-bold text-white rounded-xl shadow-sm hover:opacity-90 disabled:opacity-50"
                style={{ background: 'linear-gradient(to right, #004d64, #006684)' }}
              >
                {bezig ? 'Opslaan...' : panelModus === 'aanmaken' ? 'Groep aanmaken' : 'Opslaan'}
              </button>
              <button onClick={sluitPanel} className="px-4 py-2.5 text-sm font-semibold text-slate-500 hover:text-slate-700 border border-slate-200 rounded-xl">
                Annuleren
              </button>
            </div>
          </div>
        </div>
      )}

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
