'use client'

import { useState, useEffect, useCallback } from 'react'
import { getKortingsTypes, berekenKorting } from '@/app/actions/kortingen'

// ─── Types ────────────────────────────────────────────────────────────────────

interface KortingsType {
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

export interface SelectedKorting {
  kortingsTypeId: string
  naam: string
  berekendBedrag: number
  vereistDocumentatie: boolean
}

interface Props {
  grondslag: number
  onChange: (kortingen: SelectedKorting[]) => void
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function KortingSelectie({ grondslag, onChange }: Props) {
  const [kortingsTypes, setKortingsTypes] = useState<KortingsType[]>([])
  const [geselecteerd, setGeselecteerd] = useState<Map<string, number>>(new Map())
  const [loading, setLoading] = useState(true)
  const [foutmelding, setFoutmelding] = useState('')

  // Laad beschikbare kortingstypes
  useEffect(() => {
    async function laden() {
      const result = await getKortingsTypes()
      if (result.error) {
        setFoutmelding(result.error)
      } else if (result.data) {
        setKortingsTypes(result.data.filter((kt: KortingsType) => kt.actief !== false))
      }
      setLoading(false)
    }
    laden()
  }, [])

  // Herbereken bedragen wanneer grondslag verandert
  useEffect(() => {
    if (geselecteerd.size === 0) return

    async function herbereken() {
      const nieuwMap = new Map<string, number>()
      for (const [id] of geselecteerd) {
        const result = await berekenKorting(id, grondslag)
        if (result.bedrag !== undefined) {
          nieuwMap.set(id, result.bedrag)
        }
      }
      setGeselecteerd(nieuwMap)
    }
    herbereken()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grondslag])

  // Notify parent bij wijzigingen
  const notifyParent = useCallback((selectie: Map<string, number>) => {
    const kortingen: SelectedKorting[] = []
    for (const [id, bedrag] of selectie) {
      const kt = kortingsTypes.find(k => k.id === id)
      if (kt) {
        kortingen.push({
          kortingsTypeId: id,
          naam: kt.naam,
          berekendBedrag: bedrag,
          vereistDocumentatie: kt.vereist_documentatie,
        })
      }
    }
    onChange(kortingen)
  }, [kortingsTypes, onChange])

  // Toggle een korting aan/uit
  async function toggleKorting(kt: KortingsType) {
    const nieuwMap = new Map(geselecteerd)

    if (nieuwMap.has(kt.id)) {
      nieuwMap.delete(kt.id)
    } else {
      // Valideer stapelbaarheid
      if (!kt.stapelbaar) {
        // Niet-stapelbaar: verwijder alle bestaande selecties
        if (nieuwMap.size > 0) {
          setFoutmelding('Deze korting is niet stapelbaar. Bestaande selecties worden vervangen.')
          nieuwMap.clear()
          setTimeout(() => setFoutmelding(''), 3000)
        }
      } else {
        // Stapelbaar: check of er al een niet-stapelbare korting is
        for (const [existingId] of nieuwMap) {
          const existing = kortingsTypes.find(k => k.id === existingId)
          if (existing && !existing.stapelbaar) {
            setFoutmelding('Er is al een niet-stapelbare korting geselecteerd. Verwijder deze eerst.')
            return
          }
        }
      }

      // Bereken bedrag
      const result = await berekenKorting(kt.id, grondslag)
      if (result.error) {
        setFoutmelding(result.error)
        return
      }
      nieuwMap.set(kt.id, result.bedrag!)
    }

    setGeselecteerd(nieuwMap)
    notifyParent(nieuwMap)
  }

  // Bereken totaal
  let totaal = 0
  for (const [, bedrag] of geselecteerd) {
    totaal += bedrag
  }

  if (loading) {
    return <p className="text-sm text-slate-400">Kortingen laden…</p>
  }

  if (kortingsTypes.length === 0) {
    return <p className="text-sm text-slate-400">Geen kortingstypes beschikbaar.</p>
  }

  return (
    <div className="space-y-3">
      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
        Kortingen
      </label>

      {foutmelding && (
        <div className="bg-red-50 text-red-700 text-sm rounded-xl px-4 py-2.5 font-medium">{foutmelding}</div>
      )}

      <div className="space-y-2">
        {kortingsTypes.map(kt => {
          const isSelected = geselecteerd.has(kt.id)
          const bedrag = geselecteerd.get(kt.id)

          return (
            <label
              key={kt.id}
              className={`flex items-center justify-between px-4 py-3 rounded-xl border cursor-pointer transition-colors ${
                isSelected
                  ? 'border-[#006684] bg-[#006684]/5'
                  : 'border-slate-200 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleKorting(kt)}
                  className="w-4 h-4 rounded border-slate-300 text-[#006684] focus:ring-[#006684]/30"
                />
                <div>
                  <span className="text-sm font-medium text-[#181c1d]">{kt.naam}</span>
                  <span className="text-xs text-slate-400 ml-2">
                    {kt.type_enum === 'percentage' ? `${kt.waarde}%` : `€ ${kt.waarde.toFixed(2)}`}
                  </span>
                  {kt.vereist_documentatie && (
                    <span className="inline-flex items-center gap-1 ml-2 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-600">
                      Doc vereist
                    </span>
                  )}
                </div>
              </div>
              {isSelected && bedrag !== undefined && (
                <span className="text-sm font-bold text-[#006a66]">
                  - € {bedrag.toFixed(2)}
                </span>
              )}
            </label>
          )
        })}
      </div>

      {geselecteerd.size > 0 && (
        <div className="flex justify-between items-center px-4 py-2.5 bg-slate-50 rounded-xl">
          <span className="text-sm font-semibold text-slate-600">Totaal korting</span>
          <span className="text-sm font-bold text-[#006a66]">- € {totaal.toFixed(2)}</span>
        </div>
      )}
    </div>
  )
}
