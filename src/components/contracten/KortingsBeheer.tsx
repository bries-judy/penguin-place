'use client'

import { useState, useMemo } from 'react'
import { kortingsTypeAanmaken, kortingsTypeBijwerken, kortingsTypeDeactiveren } from '@/app/actions/kortingen'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface KortingsTypeRij {
  id: string
  code: string
  naam: string
  type_enum: 'percentage' | 'vast_bedrag'
  waarde: number
  grondslag_enum: 'op_uurtarief' | 'op_maandprijs' | 'op_uren_per_maand'
  max_kortingsbedrag: number | null
  stapelbaar: boolean
  vereist_documentatie: boolean
  actief: boolean
}

interface Props {
  kortingstypen: KortingsTypeRij[]
}

// ─── Helpers / constanten ─────────────────────────────────────────────────────

const STATUS_CONFIG = {
  true:  { label: 'Actief',   bg: 'bg-[#8df4ed]/40', text: 'text-[#006a66]', dot: 'bg-[#006a66]' },
  false: { label: 'Inactief', bg: 'bg-slate-100',    text: 'text-slate-500', dot: 'bg-slate-400' },
} as const

const TYPE_LABELS: Record<string, string> = {
  percentage: 'Percentage',
  vast_bedrag: 'Vast bedrag',
}

const GRONDSLAG_LABELS: Record<string, string> = {
  op_uurtarief: 'Op uurtarief',
  op_maandprijs: 'Op maandprijs',
  op_uren_per_maand: 'Op uren/maand',
}

const inputCls = 'w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-[#181c1d] bg-white focus:outline-none focus:ring-2 focus:ring-[#006684]/30 placeholder:text-slate-300'
const selectCls = 'w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-[#181c1d] bg-white focus:outline-none focus:ring-2 focus:ring-[#006684]/30'
const labelCls = 'text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5'

// ─── Component ────────────────────────────────────────────────────────────────

export default function KortingsBeheer({ kortingstypen: initialData }: Props) {
  const [kortingstypen] = useState(initialData)
  const [zoekterm, setZoekterm] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [bewerkItem, setBewerkItem] = useState<KortingsTypeRij | null>(null)
  const [saving, setSaving] = useState(false)
  const [foutmelding, setFoutmelding] = useState('')

  const gefilterd = useMemo(() =>
    kortingstypen.filter(kt =>
      kt.naam.toLowerCase().includes(zoekterm.toLowerCase()) ||
      kt.code.toLowerCase().includes(zoekterm.toLowerCase())
    ), [kortingstypen, zoekterm])

  // ── Modal openen ───────────────────────────────────────────────────────────

  function openNieuw() {
    setBewerkItem(null)
    setFoutmelding('')
    setModalOpen(true)
  }

  function openBewerk(item: KortingsTypeRij) {
    setBewerkItem(item)
    setFoutmelding('')
    setModalOpen(true)
  }

  // ── Opslaan ────────────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    setFoutmelding('')

    const fd = new FormData(e.currentTarget)
    const result = bewerkItem
      ? await kortingsTypeBijwerken(bewerkItem.id, fd)
      : await kortingsTypeAanmaken(fd)

    setSaving(false)
    if (result.error) {
      setFoutmelding(result.error)
      return
    }
    setModalOpen(false)
  }

  async function handleDeactiveer(item: KortingsTypeRij) {
    if (!confirm(`Weet je zeker dat je "${item.naam}" wilt deactiveren?`)) return
    const result = await kortingsTypeDeactiveren(item.id)
    if (result.error) alert(result.error)
  }

  function formatWaarde(kt: KortingsTypeRij) {
    if (kt.type_enum === 'percentage') return `${kt.waarde}%`
    return `€ ${kt.waarde.toFixed(2)}`
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3">
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
        <button
          onClick={openNieuw}
          className="ml-auto flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-bold bg-[#006684] hover:bg-[#004d64] transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          Nieuw kortingstype
        </button>
      </div>

      {/* Tabel */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[800px]">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-100">
                {['Naam', 'Code', 'Type', 'Waarde', 'Grondslag', 'Stapelbaar', 'Status', 'Acties'].map(h => (
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
                    <span className="material-symbols-outlined text-5xl text-slate-200 block mb-3">percent</span>
                    <p className="text-slate-400 font-semibold">Geen kortingstypes gevonden</p>
                  </td>
                </tr>
              ) : gefilterd.map(kt => {
                const statusCfg = STATUS_CONFIG[`${kt.actief}` as 'true' | 'false']
                return (
                  <tr key={kt.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3 font-semibold text-[#181c1d]">
                      <div className="flex items-center gap-2">
                        {kt.naam}
                        {kt.vereist_documentatie && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-600">
                            <span className="material-symbols-outlined text-[12px]">description</span>
                            Doc vereist
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-500 font-mono text-xs">{kt.code}</td>
                    <td className="px-4 py-3 text-slate-600">{TYPE_LABELS[kt.type_enum]}</td>
                    <td className="px-4 py-3 text-slate-600 font-medium">
                      {formatWaarde(kt)}
                      {kt.max_kortingsbedrag && (
                        <span className="text-slate-400 text-xs ml-1">(max € {kt.max_kortingsbedrag.toFixed(2)})</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{GRONDSLAG_LABELS[kt.grondslag_enum]}</td>
                    <td className="px-4 py-3">
                      {kt.stapelbaar ? (
                        <span className="text-[#006a66] text-xs font-medium">Ja</span>
                      ) : (
                        <span className="text-red-500 text-xs font-medium">Nee</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${statusCfg.bg} ${statusCfg.text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
                        {statusCfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => openBewerk(kt)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-[#006684] transition-colors" title="Bewerken">
                          <span className="material-symbols-outlined text-[18px]">edit</span>
                        </button>
                        {kt.actief && (
                          <button onClick={() => handleDeactiveer(kt)} className="p-1.5 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-600 transition-colors" title="Deactiveren">
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

      {/* Modal: Kortingstype aanmaken/bewerken */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white rounded-t-2xl">
              <h3 className="text-lg font-black text-[#004d64]" style={{ fontFamily: 'Manrope, sans-serif' }}>
                {bewerkItem ? 'Kortingstype bewerken' : 'Nieuw kortingstype'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {foutmelding && (
                <div className="bg-red-50 text-red-700 text-sm rounded-xl px-4 py-3 font-medium">{foutmelding}</div>
              )}

              <div>
                <label className={labelCls}>Code *</label>
                <input
                  name="code"
                  defaultValue={bewerkItem?.code ?? ''}
                  required
                  disabled={!!bewerkItem}
                  placeholder="bijv. sibling_discount"
                  className={`${inputCls} ${bewerkItem ? 'bg-slate-50 text-slate-400 cursor-not-allowed' : ''}`}
                />
                {bewerkItem && <p className="text-[10px] text-slate-400 mt-1">Code kan niet gewijzigd worden</p>}
              </div>

              <div>
                <label className={labelCls}>Naam *</label>
                <input name="naam" defaultValue={bewerkItem?.naam ?? ''} required placeholder="bijv. Broertje/zusje korting" className={inputCls} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Type *</label>
                  <select name="type_enum" defaultValue={bewerkItem?.type_enum ?? 'percentage'} required className={selectCls}>
                    <option value="percentage">Percentage</option>
                    <option value="vast_bedrag">Vast bedrag</option>
                  </select>
                </div>

                <div>
                  <label className={labelCls}>Waarde *</label>
                  <input
                    name="waarde"
                    type="number"
                    step="0.01"
                    min="0.01"
                    defaultValue={bewerkItem?.waarde ?? ''}
                    required
                    placeholder="bijv. 10.00"
                    className={inputCls}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Grondslag *</label>
                  <select name="grondslag_enum" defaultValue={bewerkItem?.grondslag_enum ?? 'op_maandprijs'} required className={selectCls}>
                    <option value="op_uurtarief">Op uurtarief</option>
                    <option value="op_maandprijs">Op maandprijs</option>
                    <option value="op_uren_per_maand">Op uren per maand</option>
                  </select>
                </div>

                <div>
                  <label className={labelCls}>Max kortingsbedrag</label>
                  <input
                    name="max_kortingsbedrag"
                    type="number"
                    step="0.01"
                    min="0"
                    defaultValue={bewerkItem?.max_kortingsbedrag ?? ''}
                    placeholder="Optioneel"
                    className={inputCls}
                  />
                </div>
              </div>

              <div className="flex gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    name="stapelbaar"
                    value="true"
                    defaultChecked={bewerkItem?.stapelbaar ?? true}
                    onChange={e => {
                      // Hidden field trick: als unchecked, stuur 'false'
                      const hidden = e.target.parentElement?.querySelector('input[type=hidden]') as HTMLInputElement | null
                      if (hidden) hidden.disabled = e.target.checked
                    }}
                    className="w-4 h-4 rounded border-slate-300 text-[#006684] focus:ring-[#006684]/30"
                  />
                  <input type="hidden" name="stapelbaar" value="false" disabled={bewerkItem?.stapelbaar ?? true} />
                  <span className="text-sm text-[#181c1d]">Stapelbaar</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    name="vereist_documentatie"
                    value="true"
                    defaultChecked={bewerkItem?.vereist_documentatie ?? false}
                    onChange={e => {
                      const hidden = e.target.parentElement?.querySelector('input[type=hidden]') as HTMLInputElement | null
                      if (hidden) hidden.disabled = e.target.checked
                    }}
                    className="w-4 h-4 rounded border-slate-300 text-[#006684] focus:ring-[#006684]/30"
                  />
                  <input type="hidden" name="vereist_documentatie" value="false" disabled={bewerkItem?.vereist_documentatie ?? false} />
                  <span className="text-sm text-[#181c1d]">Vereist documentatie</span>
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
