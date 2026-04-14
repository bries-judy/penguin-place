'use client'

import { useState, useMemo } from 'react'
import { tariefsetAanmaken, tariefsetBijwerken, tariefsetActiveren, kopieerTariefsets } from '@/app/actions/tarieven'

// ─── Types ────────────────────────────────────────────────────────────────────

type Opvangtype = 'kdv' | 'bso' | 'peuteropvang' | 'gastouder'
type TariefStatus = 'concept' | 'actief' | 'vervallen'

interface MerkOptie {
  id: string
  naam: string
  code: string
}

interface ContractTypeOptie {
  id: string
  naam: string
  code: string
  merk_id: string
  opvangtype: Opvangtype
}

export interface TariefSetRij {
  id: string
  merk_id: string
  contract_type_id: string
  jaar: number
  opvangtype: Opvangtype
  uurtarief: number
  max_overheidsuurprijs: number | null
  ingangsdatum: string
  status: TariefStatus
  contracttype?: { naam: string; code: string; opvangtype: Opvangtype } | null
}

interface Props {
  tariefsets: TariefSetRij[]
  merken: MerkOptie[]
  contracttypen: ContractTypeOptie[]
}

// ─── Helpers / constanten ─────────────────────────────────────────────────────

const OPVANGTYPE_LABELS: Record<Opvangtype, string> = {
  kdv: 'Kinderdagverblijf',
  bso: 'Buitenschoolse opvang',
  peuteropvang: 'Peuteropvang',
  gastouder: 'Gastouder',
}

const STATUS_CONFIG: Record<TariefStatus, { label: string; bg: string; text: string; dot: string }> = {
  concept:   { label: 'Concept',   bg: 'bg-amber-50',       text: 'text-amber-700',  dot: 'bg-amber-500' },
  actief:    { label: 'Actief',    bg: 'bg-[#8df4ed]/40',   text: 'text-[#006a66]',  dot: 'bg-[#006a66]' },
  vervallen: { label: 'Vervallen', bg: 'bg-slate-100',      text: 'text-slate-500',  dot: 'bg-slate-400' },
}

const inputCls = 'w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-[#181c1d] bg-white focus:outline-none focus:ring-2 focus:ring-[#006684]/30 placeholder:text-slate-300'
const labelCls = 'text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5'

const huidigJaar = new Date().getFullYear()

// ─── Component ────────────────────────────────────────────────────────────────

export default function TariefBeheer({ tariefsets: initialData, merken, contracttypen }: Props) {
  const [tariefsets] = useState(initialData)
  const [filterMerk, setFilterMerk] = useState<string>('alle')
  const [filterJaar, setFilterJaar] = useState<number>(huidigJaar)
  const [modalOpen, setModalOpen] = useState(false)
  const [bewerkItem, setBewerkItem] = useState<TariefSetRij | null>(null)
  const [saving, setSaving] = useState(false)
  const [foutmelding, setFoutmelding] = useState('')

  // Kopieer modal state
  const [kopieerModalOpen, setKopieerModalOpen] = useState(false)
  const [kopieerNaarJaar, setKopieerNaarJaar] = useState(huidigJaar + 1)
  const [indexatiePercentage, setIndexatiePercentage] = useState(3.0)
  const [kopieerSaving, setKopieerSaving] = useState(false)
  const [kopieerFout, setKopieerFout] = useState('')

  // Beschikbare jaren uit data
  const beschikbareJaren = useMemo(() => {
    const jaren = new Set(tariefsets.map(ts => ts.jaar))
    jaren.add(huidigJaar)
    return Array.from(jaren).sort((a, b) => b - a)
  }, [tariefsets])

  // Gefilterde contracttypen op basis van geselecteerd merk
  const [modalMerkId, setModalMerkId] = useState<string>('')
  const gefilterdeContracttypen = useMemo(() => {
    if (!modalMerkId) return []
    return contracttypen.filter(ct => ct.merk_id === modalMerkId)
  }, [contracttypen, modalMerkId])

  // Gefilterde tariefsets
  const gefilterd = useMemo(() =>
    tariefsets.filter(ts => {
      const matchMerk = filterMerk === 'alle' || ts.merk_id === filterMerk
      const matchJaar = ts.jaar === filterJaar
      return matchMerk && matchJaar
    }), [tariefsets, filterMerk, filterJaar])

  // Actieve sets voor kopieer-knop
  const heeftActieveSets = useMemo(() =>
    gefilterd.some(ts => ts.status === 'actief'),
    [gefilterd])

  // Preview data voor kopieer modal
  const kopieerPreview = useMemo(() => {
    const multiplier = 1 + indexatiePercentage / 100
    return gefilterd
      .filter(ts => ts.status === 'actief')
      .map(ts => ({
        naam: ts.contracttype?.naam ?? '—',
        oudTarief: ts.uurtarief,
        nieuwTarief: Math.round(ts.uurtarief * multiplier * 100) / 100,
      }))
  }, [gefilterd, indexatiePercentage])

  // ── Modal handlers ────────────────────────────────────────────────────────

  function openNieuw() {
    setBewerkItem(null)
    setModalMerkId('')
    setFoutmelding('')
    setModalOpen(true)
  }

  function openBewerk(ts: TariefSetRij) {
    setBewerkItem(ts)
    setModalMerkId(ts.merk_id)
    setFoutmelding('')
    setModalOpen(true)
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    setFoutmelding('')

    const fd = new FormData(e.currentTarget)
    const result = bewerkItem
      ? await tariefsetBijwerken(bewerkItem.id, fd)
      : await tariefsetAanmaken(fd)

    setSaving(false)
    if (result.error) {
      setFoutmelding(result.error)
      return
    }
    setModalOpen(false)
  }

  async function handleActiveer(ts: TariefSetRij) {
    if (!confirm(`Weet je zeker dat je het tarief voor "${ts.contracttype?.naam}" wilt activeren?`)) return
    const result = await tariefsetActiveren(ts.id)
    if (result.error) alert(result.error)
  }

  // ── Kopieer handlers ──────────────────────────────────────────────────────

  function openKopieerModal() {
    setKopieerNaarJaar(filterJaar + 1)
    setIndexatiePercentage(3.0)
    setKopieerFout('')
    setKopieerModalOpen(true)
  }

  async function handleKopieer() {
    if (filterMerk === 'alle') {
      setKopieerFout('Selecteer eerst een specifiek merk om te kopiëren')
      return
    }
    setKopieerSaving(true)
    setKopieerFout('')

    const result = await kopieerTariefsets(filterMerk, filterJaar, kopieerNaarJaar, indexatiePercentage)

    setKopieerSaving(false)
    if (result.error) {
      setKopieerFout(result.error)
      return
    }
    setKopieerModalOpen(false)
    setFilterJaar(kopieerNaarJaar)
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <select
          value={filterMerk}
          onChange={e => setFilterMerk(e.target.value)}
          className="border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#006684]/30"
        >
          <option value="alle">Alle merken</option>
          {merken.map(m => (
            <option key={m.id} value={m.id}>{m.naam}</option>
          ))}
        </select>

        <select
          value={filterJaar}
          onChange={e => setFilterJaar(parseInt(e.target.value))}
          className="border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#006684]/30"
        >
          {beschikbareJaren.map(j => (
            <option key={j} value={j}>{j}</option>
          ))}
        </select>

        {heeftActieveSets && filterMerk !== 'alle' && (
          <button
            onClick={openKopieerModal}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">content_copy</span>
            Kopieer naar nieuw jaar
          </button>
        )}

        <button
          onClick={openNieuw}
          className="ml-auto flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-bold bg-[#006684] hover:bg-[#004d64] transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          Nieuw tarief
        </button>
      </div>

      {/* Tabel */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[900px]">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-100">
                {['Contracttype', 'Opvangtype', 'Uurtarief', 'Max uurprijs', 'Ingangsdatum', 'Status', 'Acties'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {gefilterd.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center">
                    <span className="material-symbols-outlined text-5xl text-slate-200 block mb-3">payments</span>
                    <p className="text-slate-400 font-semibold">Geen tariefsets gevonden voor {filterJaar}</p>
                  </td>
                </tr>
              ) : gefilterd.map(ts => {
                const statusCfg = STATUS_CONFIG[ts.status]
                const overschreden = ts.max_overheidsuurprijs !== null && ts.uurtarief > ts.max_overheidsuurprijs
                return (
                  <tr key={ts.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3 font-semibold text-[#181c1d]">{ts.contracttype?.naam ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{OPVANGTYPE_LABELS[ts.opvangtype]}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-semibold text-[#181c1d]">&euro; {ts.uurtarief.toFixed(2)}</span>
                        {overschreden && (
                          <span className="material-symbols-outlined text-amber-500 text-[18px]" title="Uurtarief overschrijdt max overheidsuurprijs">warning</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-500 font-mono text-xs">
                      {ts.max_overheidsuurprijs !== null ? `\u20AC ${ts.max_overheidsuurprijs.toFixed(2)}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{ts.ingangsdatum}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${statusCfg.bg} ${statusCfg.text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
                        {statusCfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {ts.status === 'concept' && (
                          <>
                            <button onClick={() => openBewerk(ts)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-[#006684] transition-colors" title="Bewerken">
                              <span className="material-symbols-outlined text-[18px]">edit</span>
                            </button>
                            <button onClick={() => handleActiveer(ts)} className="p-1.5 hover:bg-green-50 rounded-lg text-slate-400 hover:text-green-600 transition-colors" title="Activeren">
                              <span className="material-symbols-outlined text-[18px]">check_circle</span>
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Tariefset aanmaken/bewerken */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white rounded-t-2xl">
              <h3 className="text-lg font-black text-[#004d64]" style={{ fontFamily: 'Manrope, sans-serif' }}>
                {bewerkItem ? 'Tariefset bewerken' : 'Nieuw tarief'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {foutmelding && (
                <div className="bg-red-50 text-red-700 text-sm rounded-xl px-4 py-3 font-medium">{foutmelding}</div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Merk *</label>
                  <select
                    name="merk_id"
                    defaultValue={bewerkItem?.merk_id ?? ''}
                    required
                    disabled={!!bewerkItem}
                    onChange={e => setModalMerkId(e.target.value)}
                    className={`${inputCls} ${bewerkItem ? 'bg-slate-50 text-slate-400 cursor-not-allowed' : ''}`}
                  >
                    <option value="">Selecteer merk...</option>
                    {merken.map(m => <option key={m.id} value={m.id}>{m.naam}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Contracttype *</label>
                  <select
                    name="contract_type_id"
                    defaultValue={bewerkItem?.contract_type_id ?? ''}
                    required
                    disabled={!!bewerkItem}
                    className={`${inputCls} ${bewerkItem ? 'bg-slate-50 text-slate-400 cursor-not-allowed' : ''}`}
                  >
                    <option value="">Selecteer contracttype...</option>
                    {gefilterdeContracttypen.map(ct => (
                      <option key={ct.id} value={ct.id}>{ct.naam}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Jaar *</label>
                  <input
                    name="jaar"
                    type="number"
                    defaultValue={bewerkItem?.jaar ?? huidigJaar}
                    required
                    disabled={!!bewerkItem}
                    className={`${inputCls} ${bewerkItem ? 'bg-slate-50 text-slate-400 cursor-not-allowed' : ''}`}
                  />
                </div>
                <div>
                  <label className={labelCls}>Opvangtype *</label>
                  <select
                    name="opvangtype"
                    defaultValue={bewerkItem?.opvangtype ?? ''}
                    required
                    disabled={!!bewerkItem}
                    className={`${inputCls} ${bewerkItem ? 'bg-slate-50 text-slate-400 cursor-not-allowed' : ''}`}
                  >
                    <option value="">Selecteer...</option>
                    {(Object.entries(OPVANGTYPE_LABELS) as [Opvangtype, string][]).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Uurtarief (&euro;) *</label>
                  <input name="uurtarief" type="number" step="0.01" defaultValue={bewerkItem?.uurtarief ?? ''} required placeholder="bijv. 9.65" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Max overheidsuurprijs (&euro;)</label>
                  <input name="max_overheidsuurprijs" type="number" step="0.01" defaultValue={bewerkItem?.max_overheidsuurprijs ?? ''} placeholder="bijv. 10.25" className={inputCls} />
                </div>
              </div>

              <div>
                <label className={labelCls}>Ingangsdatum *</label>
                <input name="ingangsdatum" type="date" defaultValue={bewerkItem?.ingangsdatum ?? `${huidigJaar}-01-01`} required className={inputCls} />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModalOpen(false)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-500 hover:bg-slate-50 transition-colors">
                  Annuleren
                </button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl text-white text-sm font-bold bg-[#006684] hover:bg-[#004d64] transition-colors disabled:opacity-50">
                  {saving ? 'Opslaan...' : bewerkItem ? 'Bijwerken' : 'Aanmaken'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Kopieer naar nieuw jaar */}
      {kopieerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white rounded-t-2xl">
              <h3 className="text-lg font-black text-[#004d64]" style={{ fontFamily: 'Manrope, sans-serif' }}>
                Tarieven kopiëren naar {kopieerNaarJaar}
              </h3>
              <button onClick={() => setKopieerModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-6 space-y-5">
              {kopieerFout && (
                <div className="bg-red-50 text-red-700 text-sm rounded-xl px-4 py-3 font-medium">{kopieerFout}</div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Doeljaar</label>
                  <input
                    type="number"
                    value={kopieerNaarJaar}
                    onChange={e => setKopieerNaarJaar(parseInt(e.target.value))}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Indexatie (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={indexatiePercentage}
                    onChange={e => setIndexatiePercentage(parseFloat(e.target.value))}
                    className={inputCls}
                  />
                </div>
              </div>

              {/* Preview tabel */}
              {kopieerPreview.length > 0 && (
                <div className="bg-slate-50 rounded-xl border border-slate-100 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="text-left px-4 py-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Contracttype</th>
                        <th className="text-right px-4 py-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Huidig</th>
                        <th className="text-right px-4 py-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nieuw</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {kopieerPreview.map((rij, i) => (
                        <tr key={i}>
                          <td className="px-4 py-2 font-medium text-[#181c1d]">{rij.naam}</td>
                          <td className="px-4 py-2 text-right font-mono text-slate-500">&euro; {rij.oudTarief.toFixed(2)}</td>
                          <td className="px-4 py-2 text-right font-mono font-semibold text-[#006684]">&euro; {rij.nieuwTarief.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button onClick={() => setKopieerModalOpen(false)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-500 hover:bg-slate-50 transition-colors">
                  Annuleren
                </button>
                <button
                  onClick={handleKopieer}
                  disabled={kopieerSaving || kopieerPreview.length === 0}
                  className="flex-1 py-2.5 rounded-xl text-white text-sm font-bold bg-[#006684] hover:bg-[#004d64] transition-colors disabled:opacity-50"
                >
                  {kopieerSaving ? 'Kopiëren...' : `Kopieer ${kopieerPreview.length} tarieven`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
