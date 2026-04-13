'use client'

import { useState, useMemo } from 'react'
import { contractTypeAanmaken, contractTypeBijwerken, contractTypeDeactiveren } from '@/app/actions/contracttypen'

// ─── Types ────────────────────────────────────────────────────────────────────

type Opvangtype = 'kdv' | 'bso' | 'peuteropvang' | 'gastouder'
type Contractvorm = 'schoolweken' | 'standaard' | 'super_flexibel' | 'flexibel'

interface MerkOptie {
  id: string
  naam: string
  code: string
}

interface ContractTypeRij {
  id: string
  merk_id: string
  naam: string
  code: string
  opvangtype: Opvangtype
  contractvorm: Contractvorm
  beschrijving: string | null
  min_uren_maand: number | null
  min_dagdelen_week: number | null
  geldig_in_vakanties: boolean
  opvang_op_inschrijving: boolean
  annuleringstermijn_uren: number | null
  actief: boolean
  merk?: { naam: string; code: string } | null
}

interface Props {
  contracttypen: ContractTypeRij[]
  merken: MerkOptie[]
}

// ─── Helpers / constanten ─────────────────────────────────────────────────────

const OPVANGTYPE_LABELS: Record<Opvangtype, string> = {
  kdv: 'Kinderdagverblijf',
  bso: 'Buitenschoolse opvang',
  peuteropvang: 'Peuteropvang',
  gastouder: 'Gastouder',
}

const CONTRACTVORM_LABELS: Record<Contractvorm, string> = {
  standaard: 'Standaard',
  schoolweken: 'Schoolweken',
  flexibel: 'Flexibel',
  super_flexibel: 'Super flexibel',
}

const STATUS_CONFIG = {
  true:  { label: 'Actief',   bg: 'bg-[#8df4ed]/40', text: 'text-[#006a66]', dot: 'bg-[#006a66]' },
  false: { label: 'Inactief', bg: 'bg-slate-100',    text: 'text-slate-500', dot: 'bg-slate-400' },
} as const

const inputCls = 'w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-[#181c1d] bg-white focus:outline-none focus:ring-2 focus:ring-[#006684]/30 placeholder:text-slate-300'
const labelCls = 'text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5'

// ─── Component ────────────────────────────────────────────────────────────────

export default function ContractTypenBeheer({ contracttypen: initialData, merken }: Props) {
  const [contracttypen] = useState(initialData)
  const [zoekterm, setZoekterm] = useState('')
  const [filterMerk, setFilterMerk] = useState<string>('alle')
  const [modalOpen, setModalOpen] = useState(false)
  const [bewerkItem, setBewerkItem] = useState<ContractTypeRij | null>(null)
  const [saving, setSaving] = useState(false)
  const [foutmelding, setFoutmelding] = useState('')

  const gefilterd = useMemo(() =>
    contracttypen.filter(ct => {
      const matchZoek = ct.naam.toLowerCase().includes(zoekterm.toLowerCase()) ||
        ct.code.toLowerCase().includes(zoekterm.toLowerCase())
      const matchMerk = filterMerk === 'alle' || ct.merk_id === filterMerk
      return matchZoek && matchMerk
    }), [contracttypen, zoekterm, filterMerk])

  // ── Modal ──────────────────────────────────────────────────────────────────

  function openNieuw() {
    setBewerkItem(null)
    setFoutmelding('')
    setModalOpen(true)
  }

  function openBewerk(ct: ContractTypeRij) {
    setBewerkItem(ct)
    setFoutmelding('')
    setModalOpen(true)
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    setFoutmelding('')

    const fd = new FormData(e.currentTarget)
    const result = bewerkItem
      ? await contractTypeBijwerken(bewerkItem.id, fd)
      : await contractTypeAanmaken(fd)

    setSaving(false)
    if (result.error) {
      setFoutmelding(result.error)
      return
    }
    setModalOpen(false)
  }

  async function handleDeactiveer(ct: ContractTypeRij) {
    if (!confirm(`Weet je zeker dat je "${ct.naam}" wilt deactiveren?`)) return
    const result = await contractTypeDeactiveren(ct.id)
    if (result.error) alert(result.error)
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 text-[18px]">search</span>
          <input
            type="text"
            placeholder="Zoek op naam of code…"
            value={zoekterm}
            onChange={e => setZoekterm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#006684]/30 placeholder:text-slate-300"
          />
        </div>

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

        <button
          onClick={openNieuw}
          className="ml-auto flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-bold bg-[#006684] hover:bg-[#004d64] transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          Nieuw contracttype
        </button>
      </div>

      {/* Tabel */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[900px]">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-100">
                {['Naam', 'Code', 'Merk', 'Opvangtype', 'Contractvorm', 'Status', 'Acties'].map(h => (
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
                    <span className="material-symbols-outlined text-5xl text-slate-200 block mb-3">description</span>
                    <p className="text-slate-400 font-semibold">Geen contracttypen gevonden</p>
                  </td>
                </tr>
              ) : gefilterd.map(ct => {
                const statusCfg = STATUS_CONFIG[`${ct.actief}` as 'true' | 'false']
                return (
                  <tr key={ct.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3 font-semibold text-[#181c1d]">{ct.naam}</td>
                    <td className="px-4 py-3 text-slate-500 font-mono text-xs">{ct.code}</td>
                    <td className="px-4 py-3 text-slate-600">{ct.merk?.naam ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{OPVANGTYPE_LABELS[ct.opvangtype]}</td>
                    <td className="px-4 py-3 text-slate-600">{CONTRACTVORM_LABELS[ct.contractvorm]}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${statusCfg.bg} ${statusCfg.text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
                        {statusCfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => openBewerk(ct)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-[#006684] transition-colors" title="Bewerken">
                          <span className="material-symbols-outlined text-[18px]">edit</span>
                        </button>
                        {ct.actief && (
                          <button onClick={() => handleDeactiveer(ct)} className="p-1.5 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-600 transition-colors" title="Deactiveren">
                            <span className="material-symbols-outlined text-[18px]">block</span>
                          </button>
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

      {/* Modal: ContractType aanmaken/bewerken */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white rounded-t-2xl">
              <h3 className="text-lg font-black text-[#004d64]" style={{ fontFamily: 'Manrope, sans-serif' }}>
                {bewerkItem ? 'Contracttype bewerken' : 'Nieuw contracttype'}
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
                  <label className={labelCls}>Naam *</label>
                  <input name="naam" defaultValue={bewerkItem?.naam ?? ''} required placeholder="bijv. KDV Standaard" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Code *</label>
                  <input
                    name="code"
                    defaultValue={bewerkItem?.code ?? ''}
                    required
                    disabled={!!bewerkItem}
                    placeholder="bijv. kdv-standaard"
                    className={`${inputCls} ${bewerkItem ? 'bg-slate-50 text-slate-400 cursor-not-allowed' : ''}`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Merk *</label>
                  <select name="merk_id" defaultValue={bewerkItem?.merk_id ?? ''} required disabled={!!bewerkItem} className={`${inputCls} ${bewerkItem ? 'bg-slate-50 text-slate-400 cursor-not-allowed' : ''}`}>
                    <option value="">Selecteer merk…</option>
                    {merken.map(m => <option key={m.id} value={m.id}>{m.naam}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Opvangtype *</label>
                  <select name="opvangtype" defaultValue={bewerkItem?.opvangtype ?? ''} required disabled={!!bewerkItem} className={`${inputCls} ${bewerkItem ? 'bg-slate-50 text-slate-400 cursor-not-allowed' : ''}`}>
                    <option value="">Selecteer…</option>
                    {(Object.entries(OPVANGTYPE_LABELS) as [Opvangtype, string][]).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className={labelCls}>Contractvorm *</label>
                <select name="contractvorm" defaultValue={bewerkItem?.contractvorm ?? ''} required disabled={!!bewerkItem} className={`${inputCls} ${bewerkItem ? 'bg-slate-50 text-slate-400 cursor-not-allowed' : ''}`}>
                  <option value="">Selecteer…</option>
                  {(Object.entries(CONTRACTVORM_LABELS) as [Contractvorm, string][]).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelCls}>Beschrijving</label>
                <textarea name="beschrijving" defaultValue={bewerkItem?.beschrijving ?? ''} rows={2} placeholder="Optionele beschrijving…" className={inputCls} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Min. uren/maand</label>
                  <input name="min_uren_maand" type="number" defaultValue={bewerkItem?.min_uren_maand ?? ''} placeholder="bijv. 80" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Min. dagdelen/week</label>
                  <input name="min_dagdelen_week" type="number" defaultValue={bewerkItem?.min_dagdelen_week ?? ''} placeholder="bijv. 2" className={inputCls} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Annuleringstermijn (uren)</label>
                  <input name="annuleringstermijn_uren" type="number" defaultValue={bewerkItem?.annuleringstermijn_uren ?? ''} placeholder="bijv. 24" className={inputCls} />
                </div>
              </div>

              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="hidden" name="geldig_in_vakanties" value="false" />
                  <input type="checkbox" name="geldig_in_vakanties" value="true" defaultChecked={bewerkItem?.geldig_in_vakanties ?? true} className="w-4 h-4 rounded border-slate-300 text-[#006684] focus:ring-[#006684]/30" />
                  <span className="text-sm text-[#181c1d]">Geldig in vakanties</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="hidden" name="opvang_op_inschrijving" value="false" />
                  <input type="checkbox" name="opvang_op_inschrijving" value="true" defaultChecked={bewerkItem?.opvang_op_inschrijving ?? false} className="w-4 h-4 rounded border-slate-300 text-[#006684] focus:ring-[#006684]/30" />
                  <span className="text-sm text-[#181c1d]">Opvang op inschrijving</span>
                </label>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModalOpen(false)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-500 hover:bg-slate-50 transition-colors">
                  Annuleren
                </button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl text-white text-sm font-bold bg-[#006684] hover:bg-[#004d64] transition-colors disabled:opacity-50">
                  {saving ? 'Opslaan…' : bewerkItem ? 'Bijwerken' : 'Aanmaken'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
