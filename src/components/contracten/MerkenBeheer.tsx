'use client'

import { useState, useMemo } from 'react'
import { merkAanmaken, merkBijwerken, merkDeactiveren, koppelLocatiesAanMerk } from '@/app/actions/merken'

// ─── Types ────────────────────────────────────────────────────────────────────

interface MerkRij {
  id: string
  code: string
  naam: string
  beschrijving: string | null
  actief: boolean
  locaties: { count: number }[]
}

interface LocatieOptie {
  id: string
  naam: string
  merk_id: string | null
}

interface Props {
  merken: MerkRij[]
  locaties: LocatieOptie[]
}

// ─── Helpers / constanten ─────────────────────────────────────────────────────

const STATUS_CONFIG = {
  true:  { label: 'Actief',   bg: 'bg-[#8df4ed]/40', text: 'text-[#006a66]', dot: 'bg-[#006a66]' },
  false: { label: 'Inactief', bg: 'bg-slate-100',    text: 'text-slate-500', dot: 'bg-slate-400' },
} as const

const inputCls = 'w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-[#181c1d] bg-white focus:outline-none focus:ring-2 focus:ring-[#006684]/30 placeholder:text-slate-300'
const labelCls = 'text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5'

// ─── Component ────────────────────────────────────────────────────────────────

export default function MerkenBeheer({ merken: initialMerken, locaties }: Props) {
  const [merken] = useState(initialMerken)
  const [zoekterm, setZoekterm] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [bewerkMerk, setBewerkMerk] = useState<MerkRij | null>(null)
  const [locatieModalMerk, setLocatieModalMerk] = useState<MerkRij | null>(null)
  const [selectedLocaties, setSelectedLocaties] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [foutmelding, setFoutmelding] = useState('')

  const gefilterd = useMemo(() =>
    merken.filter(m =>
      m.naam.toLowerCase().includes(zoekterm.toLowerCase()) ||
      m.code.toLowerCase().includes(zoekterm.toLowerCase())
    ), [merken, zoekterm])

  // ── Modal openen ───────────────────────────────────────────────────────────

  function openNieuw() {
    setBewerkMerk(null)
    setFoutmelding('')
    setModalOpen(true)
  }

  function openBewerk(merk: MerkRij) {
    setBewerkMerk(merk)
    setFoutmelding('')
    setModalOpen(true)
  }

  function openLocaties(merk: MerkRij) {
    const gekoppeld = locaties.filter(l => l.merk_id === merk.id).map(l => l.id)
    setSelectedLocaties(gekoppeld)
    setLocatieModalMerk(merk)
  }

  // ── Opslaan ────────────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    setFoutmelding('')

    const fd = new FormData(e.currentTarget)
    const result = bewerkMerk
      ? await merkBijwerken(bewerkMerk.id, fd)
      : await merkAanmaken(fd)

    setSaving(false)
    if (result.error) {
      setFoutmelding(result.error)
      return
    }
    setModalOpen(false)
  }

  async function handleDeactiveer(merk: MerkRij) {
    if (!confirm(`Weet je zeker dat je "${merk.naam}" wilt deactiveren?`)) return
    const result = await merkDeactiveren(merk.id)
    if (result.error) alert(result.error)
  }

  async function handleLocatiesOpslaan() {
    if (!locatieModalMerk) return
    setSaving(true)
    const result = await koppelLocatiesAanMerk(locatieModalMerk.id, selectedLocaties)
    setSaving(false)
    if (result.error) {
      alert(result.error)
      return
    }
    setLocatieModalMerk(null)
  }

  function toggleLocatie(locatieId: string) {
    setSelectedLocaties(prev =>
      prev.includes(locatieId) ? prev.filter(id => id !== locatieId) : [...prev, locatieId]
    )
  }

  // Beschikbare locaties: geen merk, of al gekoppeld aan dit merk
  const beschikbareLocaties = locatieModalMerk
    ? locaties.filter(l => l.merk_id === null || l.merk_id === locatieModalMerk.id)
    : []

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
          Nieuw merk
        </button>
      </div>

      {/* Tabel */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[600px]">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-100">
                {['Naam', 'Code', 'Locaties', 'Status', 'Acties'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {gefilterd.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center">
                    <span className="material-symbols-outlined text-5xl text-slate-200 block mb-3">label</span>
                    <p className="text-slate-400 font-semibold">Geen merken gevonden</p>
                  </td>
                </tr>
              ) : gefilterd.map(m => {
                const statusCfg = STATUS_CONFIG[`${m.actief}` as 'true' | 'false']
                const aantalLocaties = m.locaties?.[0]?.count ?? 0
                return (
                  <tr key={m.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3 font-semibold text-[#181c1d]">{m.naam}</td>
                    <td className="px-4 py-3 text-slate-500 font-mono text-xs">{m.code}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => openLocaties(m)}
                        className="text-[#006684] hover:underline text-sm"
                      >
                        {aantalLocaties} locatie{aantalLocaties !== 1 ? 's' : ''}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${statusCfg.bg} ${statusCfg.text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
                        {statusCfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => openBewerk(m)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-[#006684] transition-colors" title="Bewerken">
                          <span className="material-symbols-outlined text-[18px]">edit</span>
                        </button>
                        {m.actief && (
                          <button onClick={() => handleDeactiveer(m)} className="p-1.5 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-600 transition-colors" title="Deactiveren">
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

      {/* Modal: Merk aanmaken/bewerken */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white rounded-t-2xl">
              <h3 className="text-lg font-black text-[#004d64]" style={{ fontFamily: 'Manrope, sans-serif' }}>
                {bewerkMerk ? 'Merk bewerken' : 'Nieuw merk'}
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
                  defaultValue={bewerkMerk?.code ?? ''}
                  required
                  disabled={!!bewerkMerk}
                  placeholder="bijv. kinderrijk"
                  className={`${inputCls} ${bewerkMerk ? 'bg-slate-50 text-slate-400 cursor-not-allowed' : ''}`}
                />
                {bewerkMerk && <p className="text-[10px] text-slate-400 mt-1">Code kan niet gewijzigd worden</p>}
              </div>

              <div>
                <label className={labelCls}>Naam *</label>
                <input name="naam" defaultValue={bewerkMerk?.naam ?? ''} required placeholder="bijv. KinderRijk" className={inputCls} />
              </div>

              <div>
                <label className={labelCls}>Beschrijving</label>
                <textarea name="beschrijving" defaultValue={bewerkMerk?.beschrijving ?? ''} rows={3} placeholder="Optionele beschrijving…" className={inputCls} />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModalOpen(false)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-500 hover:bg-slate-50 transition-colors">
                  Annuleren
                </button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl text-white text-sm font-bold bg-[#006684] hover:bg-[#004d64] transition-colors disabled:opacity-50">
                  {saving ? 'Opslaan…' : bewerkMerk ? 'Bijwerken' : 'Aanmaken'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Locaties koppelen */}
      {locatieModalMerk && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white rounded-t-2xl">
              <h3 className="text-lg font-black text-[#004d64]" style={{ fontFamily: 'Manrope, sans-serif' }}>
                Locaties — {locatieModalMerk.naam}
              </h3>
              <button onClick={() => setLocatieModalMerk(null)} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-6 space-y-4">
              {beschikbareLocaties.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-8">Alle locaties zijn al aan andere merken gekoppeld.</p>
              ) : (
                <div className="space-y-2">
                  {beschikbareLocaties.map(l => (
                    <label key={l.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors">
                      <input
                        type="checkbox"
                        checked={selectedLocaties.includes(l.id)}
                        onChange={() => toggleLocatie(l.id)}
                        className="w-4 h-4 rounded border-slate-300 text-[#006684] focus:ring-[#006684]/30"
                      />
                      <span className="text-sm text-[#181c1d] font-medium">{l.naam}</span>
                    </label>
                  ))}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button onClick={() => setLocatieModalMerk(null)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-500 hover:bg-slate-50 transition-colors">
                  Annuleren
                </button>
                <button onClick={handleLocatiesOpslaan} disabled={saving} className="flex-1 py-2.5 rounded-xl text-white text-sm font-bold bg-[#006684] hover:bg-[#004d64] transition-colors disabled:opacity-50">
                  {saving ? 'Opslaan…' : 'Opslaan'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
