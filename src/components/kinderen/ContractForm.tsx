'use client'

import { useState, useEffect, useTransition, useCallback } from 'react'
import { contractAanmaken, contractWijzigen, getMerkVoorLocatie, getContractTypenVoorMerk } from '@/app/actions/contracten'
import { getTariefVoorContract } from '@/app/actions/tarieven'
import { getDagdeelConfiguraties } from '@/app/actions/dagdelen'
import KortingSelectie, { type SelectedKorting } from './KortingSelectie'
import type { DagdeelEnum } from '@/lib/supabase/types'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ContractMetRefs {
  id: string
  locatie_id: string
  groep_id: string | null
  contract_type_id: string | null
  opvangtype: string
  contracttype: string
  status: string
  zorgdagen: number[]
  dagdelen: Record<string, string>
  uren_per_dag: number
  uurtarief: number | null
  maandprijs: number | null
  maandprijs_bruto: number | null
  maandprijs_netto: number | null
  startdatum: string
  einddatum: string | null
  notities: string | null
  locaties: { naam: string } | null
  groepen: { naam: string } | null
}

interface ContractTypeOption {
  id: string
  naam: string
  opvangtype: string
  contractvorm: string
}

interface DagdeelConfig {
  dagdeel_enum: string
  uren: number
  starttijd: string
  eindtijd: string
}

interface Props {
  kindId: string
  locaties: { id: string; naam: string }[]
  groepen: { id: string; naam: string; locatie_id: string }[]
  bestaand?: ContractMetRefs
  onClose: () => void
}

// ─── Constants ───────────────────────────────────────────────────────────────

const DAG_LABELS = ['Ma', 'Di', 'Wo', 'Do', 'Vr']

const DAGDEEL_OPTIES: { value: DagdeelEnum; label: string }[] = [
  { value: 'hele_dag', label: 'Hele dag' },
  { value: 'ochtend', label: 'Ochtend' },
  { value: 'middag', label: 'Middag' },
  { value: 'na_school', label: 'Na school (BSO)' },
  { value: 'voor_school', label: 'Voor school' },
]

const inputCls = 'w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-[#181c1d] bg-white focus:outline-none focus:ring-2 focus:ring-[#006684]/30 placeholder:text-slate-300'
const labelCls = 'text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5'
const readonlyCls = 'w-full border border-slate-100 rounded-xl px-4 py-2.5 text-sm text-[#181c1d] bg-slate-50 cursor-not-allowed'

// ─── Component ───────────────────────────────────────────────────────────────

export default function ContractForm({ kindId, locaties, groepen, bestaand, onClose }: Props) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [selectedLocatie, setSelectedLocatie] = useState(bestaand?.locatie_id ?? locaties[0]?.id ?? '')
  const [selectedGroep, setSelectedGroep] = useState(bestaand?.groep_id ?? '')
  const [selectedContractType, setSelectedContractType] = useState(bestaand?.contract_type_id ?? '')
  const [zorgdagen, setZorgdagen] = useState<number[]>(bestaand?.zorgdagen ?? [])
  const [dagdelen, setDagdelen] = useState<Record<number, string>>(
    bestaand?.dagdelen
      ? Object.fromEntries(Object.entries(bestaand.dagdelen).map(([k, v]) => [Number(k), v]))
      : {}
  )
  const [startdatum, setStartdatum] = useState(bestaand?.startdatum ?? '')
  const [einddatum, setEinddatum] = useState(bestaand?.einddatum ?? '')
  const [notities, setNotities] = useState(bestaand?.notities ?? '')

  // Resolved data
  const [merkInfo, setMerkInfo] = useState<{ merkId: string; merkNaam: string } | null>(null)
  const [contractTypes, setContractTypes] = useState<ContractTypeOption[]>([])
  const [dagdeelConfigs, setDagdeelConfigs] = useState<DagdeelConfig[]>([])
  const [uurtarief, setUurtarief] = useState<number | null>(bestaand?.uurtarief ?? null)
  const [maandprijsBruto, setMaandprijsBruto] = useState<number | null>(bestaand?.maandprijs_bruto ?? null)
  const [selectedKortingen, setSelectedKortingen] = useState<SelectedKorting[]>([])
  const [loadingMerk, setLoadingMerk] = useState(false)
  const [loadingTarief, setLoadingTarief] = useState(false)

  const locGroepen = groepen.filter(g => g.locatie_id === selectedLocatie)

  // Bereken netto
  const totaalKorting = selectedKortingen.reduce((sum, k) => sum + k.berekendBedrag, 0)
  const maandprijsNetto = maandprijsBruto !== null ? Math.round((maandprijsBruto - totaalKorting) * 100) / 100 : null

  // ── Effect: Resolve merk bij locatie-wijziging ──
  useEffect(() => {
    if (!selectedLocatie) return
    setLoadingMerk(true)
    setContractTypes([])
    setSelectedContractType('')
    setUurtarief(null)
    setMaandprijsBruto(null)

    getMerkVoorLocatie(selectedLocatie).then(result => {
      if (result.data) {
        setMerkInfo(result.data)
      } else {
        setMerkInfo(null)
        setError(result.error ?? 'Geen merk gevonden')
      }
      setLoadingMerk(false)
    })
  }, [selectedLocatie])

  // ── Effect: Laad contracttypen bij merk-wijziging ──
  useEffect(() => {
    if (!merkInfo?.merkId) return
    getContractTypenVoorMerk(merkInfo.merkId).then(result => {
      if (result.data) {
        setContractTypes(result.data)
        // Als bestaand contract_type_id matcht, selecteer het
        if (bestaand?.contract_type_id && result.data.some((ct: ContractTypeOption) => ct.id === bestaand.contract_type_id)) {
          setSelectedContractType(bestaand.contract_type_id)
        }
      }
    })
  }, [merkInfo?.merkId, bestaand?.contract_type_id])

  // ── Effect: Laad dagdeel configs bij locatie/groep wijziging ──
  useEffect(() => {
    if (!selectedLocatie) return
    getDagdeelConfiguraties(selectedLocatie, selectedGroep || undefined).then(result => {
      if (result.data) setDagdeelConfigs(result.data)
    })
  }, [selectedLocatie, selectedGroep])

  // ── Effect: Resolve tarief bij contracttype/merk/startdatum wijziging ──
  useEffect(() => {
    if (!selectedContractType || !merkInfo?.merkId || !startdatum) {
      setUurtarief(null)
      return
    }
    setLoadingTarief(true)
    getTariefVoorContract(selectedContractType, merkInfo.merkId, startdatum).then(result => {
      if (result.data) {
        setUurtarief(result.data.uurtarief)
      } else {
        setUurtarief(null)
      }
      setLoadingTarief(false)
    })
  }, [selectedContractType, merkInfo?.merkId, startdatum])

  // ── Effect: Bereken maandprijs_bruto live ──
  useEffect(() => {
    if (uurtarief === null || zorgdagen.length === 0) {
      setMaandprijsBruto(null)
      return
    }

    let totalUrenPerWeek = 0
    for (const dag of zorgdagen) {
      const dagdeel = dagdelen[dag] ?? 'hele_dag'
      const config = dagdeelConfigs.find(c => c.dagdeel_enum === dagdeel)
      totalUrenPerWeek += config?.uren ?? 8
    }

    const bruto = totalUrenPerWeek * uurtarief * (52 / 12)
    setMaandprijsBruto(Math.round(bruto * 100) / 100)
  }, [uurtarief, zorgdagen, dagdelen, dagdeelConfigs])

  // ── Handlers ──
  function toggleZorgdag(dag: number) {
    setZorgdagen(prev => {
      if (prev.includes(dag)) {
        const next = prev.filter(d => d !== dag)
        // Verwijder dagdeel voor deze dag
        setDagdelen(dd => {
          const copy = { ...dd }
          delete copy[dag]
          return copy
        })
        return next
      }
      const next = [...prev, dag].sort()
      // Default dagdeel
      setDagdelen(dd => ({ ...dd, [dag]: 'hele_dag' }))
      return next
    })
  }

  function setDagdeelVoorDag(dag: number, value: string) {
    setDagdelen(dd => ({ ...dd, [dag]: value }))
  }

  const handleKortingenChange = useCallback((kortingen: SelectedKorting[]) => {
    setSelectedKortingen(kortingen)
  }, [])

  function getUrenVoorDagdeel(dagdeel: string): number | null {
    const config = dagdeelConfigs.find(c => c.dagdeel_enum === dagdeel)
    return config?.uren ?? null
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)

    // Voeg kortingen toe als hidden fields
    for (const k of selectedKortingen) {
      fd.append('korting_ids', k.kortingsTypeId)
    }

    // Voeg dagdelen toe
    for (const [dag, dagdeel] of Object.entries(dagdelen)) {
      fd.set(`dagdeel_${dag}`, dagdeel)
    }

    setError(null)
    startTransition(async () => {
      const result = bestaand
        ? await contractWijzigen(bestaand.id, kindId, fd)
        : await contractAanmaken(kindId, fd)
      if (result?.error) setError(result.error)
      else onClose()
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
          <h3 className="text-lg font-black text-[#004d64]" style={{ fontFamily: 'Manrope, sans-serif' }}>
            {bestaand ? 'Contractwijziging' : 'Nieuw contract'}
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {bestaand && (
            <div className="bg-[#ffb783]/15 border border-[#ffb783]/40 rounded-xl p-3 text-xs text-[#703700] flex items-start gap-2">
              <span className="material-symbols-outlined text-sm mt-0.5">info</span>
              Het bestaande contract wordt beëindigd per dag vóór de nieuwe ingangsdatum. Een nieuw concept wordt aangemaakt.
            </div>
          )}

          {/* Locatie */}
          <div className="space-y-1.5">
            <label className={labelCls}>Locatie *</label>
            <select
              name="locatie_id"
              value={selectedLocatie}
              onChange={e => setSelectedLocatie(e.target.value)}
              className={inputCls}
              required
            >
              {locaties.map(l => <option key={l.id} value={l.id}>{l.naam}</option>)}
            </select>
            {merkInfo && (
              <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#bee9ff]/60 text-[#004d64]">
                Merk: {merkInfo.merkNaam}
              </span>
            )}
            {loadingMerk && <span className="text-xs text-slate-400">Merk laden...</span>}
          </div>

          {/* Contracttype */}
          <div className="space-y-1.5">
            <label className={labelCls}>Contracttype *</label>
            <select
              name="contract_type_id"
              value={selectedContractType}
              onChange={e => setSelectedContractType(e.target.value)}
              className={inputCls}
              required
            >
              <option value="">— Selecteer contracttype —</option>
              {contractTypes.map(ct => (
                <option key={ct.id} value={ct.id}>
                  {ct.naam} ({ct.opvangtype.toUpperCase()})
                </option>
              ))}
            </select>
            {contractTypes.length === 0 && merkInfo && !loadingMerk && (
              <p className="text-xs text-amber-600">Geen contracttypen gevonden voor dit merk.</p>
            )}
          </div>

          {/* Groep */}
          <div className="space-y-1.5">
            <label className={labelCls}>Groep</label>
            <select
              name="groep_id"
              value={selectedGroep}
              onChange={e => setSelectedGroep(e.target.value)}
              className={inputCls}
            >
              <option value="">— Nog niet toegewezen —</option>
              {locGroepen.map(g => <option key={g.id} value={g.id}>{g.naam}</option>)}
            </select>
          </div>

          {/* Startdatum + Einddatum */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className={labelCls}>{bestaand ? 'Ingangsdatum *' : 'Startdatum *'}</label>
              <input
                type="date"
                name="startdatum"
                value={startdatum}
                onChange={e => setStartdatum(e.target.value)}
                className={inputCls}
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className={labelCls}>Einddatum (optioneel)</label>
              <input
                type="date"
                name="einddatum"
                value={einddatum}
                onChange={e => setEinddatum(e.target.value)}
                className={inputCls}
              />
            </div>
          </div>

          {/* Zorgdagen + Dagdelen */}
          <div className="space-y-3">
            <label className={labelCls}>Zorgdagen + Dagdelen *</label>
            <div className="space-y-2">
              {DAG_LABELS.map((d, i) => {
                const isChecked = zorgdagen.includes(i)
                const dagdeel = dagdelen[i] ?? 'hele_dag'
                const uren = isChecked ? getUrenVoorDagdeel(dagdeel) : null

                return (
                  <div key={i} className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border transition-colors ${
                    isChecked ? 'border-[#006684]/30 bg-[#006684]/5' : 'border-slate-100'
                  }`}>
                    <label className="flex items-center gap-2 cursor-pointer min-w-[60px]">
                      <input
                        type="checkbox"
                        name="zorgdagen"
                        value={i}
                        checked={isChecked}
                        onChange={() => toggleZorgdag(i)}
                        className="w-4 h-4 accent-[#004d64]"
                      />
                      <span className="text-sm font-bold text-slate-600">{d}</span>
                    </label>
                    {isChecked && (
                      <>
                        <select
                          value={dagdeel}
                          onChange={e => setDagdeelVoorDag(i, e.target.value)}
                          className="flex-1 border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#006684]/30"
                        >
                          {DAGDEEL_OPTIES.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                        {uren !== null && (
                          <span className="text-xs font-semibold text-slate-400 whitespace-nowrap">{uren} uur</span>
                        )}
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Tarief & Prijs overzicht */}
          <div className="bg-slate-50 rounded-xl p-4 space-y-3">
            <p className={labelCls}>Prijsberekening</p>

            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-500">Uurtarief</span>
              <span className="text-sm font-semibold">
                {loadingTarief ? '...' : uurtarief !== null ? `€ ${uurtarief.toFixed(2)} / uur` : '—'}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-500">Maandprijs bruto</span>
              <span className="text-sm font-bold text-[#181c1d]">
                {maandprijsBruto !== null ? `€ ${maandprijsBruto.toFixed(2)}` : '—'}
              </span>
            </div>

            {totaalKorting > 0 && (
              <div className="flex justify-between items-center text-[#006a66]">
                <span className="text-sm">Korting</span>
                <span className="text-sm font-bold">- € {totaalKorting.toFixed(2)}</span>
              </div>
            )}

            <div className="flex justify-between items-center pt-2 border-t border-slate-200">
              <span className="text-sm font-bold text-[#004d64]">Maandprijs netto</span>
              <span className="text-base font-black text-[#004d64]">
                {maandprijsNetto !== null ? `€ ${maandprijsNetto.toFixed(2)}` : '—'}
              </span>
            </div>
          </div>

          {/* Kortingen */}
          {maandprijsBruto !== null && maandprijsBruto > 0 && (
            <KortingSelectie grondslag={maandprijsBruto} onChange={handleKortingenChange} />
          )}

          {/* Notities */}
          <div className="space-y-1.5">
            <label className={labelCls}>Notities</label>
            <textarea
              name="notities"
              rows={2}
              value={notities}
              onChange={e => setNotities(e.target.value)}
              className={`${inputCls} resize-none`}
              placeholder="Interne opmerkingen..."
            />
          </div>

          {error && <p className="text-sm text-[#ba1a1a] bg-[#ba1a1a]/10 px-4 py-2 rounded-xl">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-500 hover:bg-slate-50">
              Annuleren
            </button>
            <button
              type="submit"
              disabled={isPending || !selectedContractType || zorgdagen.length === 0}
              className="flex-1 py-2.5 rounded-xl text-white text-sm font-bold shadow-md hover:opacity-90 disabled:opacity-60"
              style={{ background: 'linear-gradient(to right, #004d64, #006684)' }}
            >
              {isPending ? 'Opslaan...' : bestaand ? 'Wijziging doorvoeren' : 'Contract aanmaken'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
