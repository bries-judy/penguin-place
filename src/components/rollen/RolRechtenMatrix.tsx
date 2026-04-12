'use client'

import { useState, useTransition } from 'react'
import {
  Baby, MapPin, Users, UserCheck, Calendar,
  Receipt, BarChart2, Settings, ShieldCheck, type LucideIcon,
} from 'lucide-react'
import { upsertRolRechten } from '@/app/actions/rollen'
import type { Module, RolRecht, RolRechtInput } from '@/types/rollen'

const MODULE_ICONEN: Record<string, LucideIcon> = {
  Baby, MapPin, Users, UserCheck, Calendar,
  Receipt, BarChart2, Settings, ShieldCheck,
}

interface RolRechtenMatrixProps {
  rolId: string
  modules: Module[]
  rechten: RolRecht[]
}

type RechtVeld = 'kan_lezen' | 'kan_aanmaken' | 'kan_wijzigen' | 'kan_verwijderen'

const KOLOMMEN: { veld: RechtVeld; label: string }[] = [
  { veld: 'kan_lezen',       label: 'Lezen' },
  { veld: 'kan_aanmaken',    label: 'Aanmaken' },
  { veld: 'kan_wijzigen',    label: 'Wijzigen' },
  { veld: 'kan_verwijderen', label: 'Verwijderen' },
]

function initMatrix(modules: Module[], rechten: RolRecht[]): Record<string, RolRechtInput> {
  const map: Record<string, RolRechtInput> = {}
  for (const mod of modules) {
    const bestaand = rechten.find(r => r.module_sleutel === mod.sleutel)
    map[mod.sleutel] = {
      module_sleutel:  mod.sleutel,
      kan_lezen:       bestaand?.kan_lezen       ?? false,
      kan_aanmaken:    bestaand?.kan_aanmaken    ?? false,
      kan_wijzigen:    bestaand?.kan_wijzigen    ?? false,
      kan_verwijderen: bestaand?.kan_verwijderen ?? false,
    }
  }
  return map
}

export function RolRechtenMatrix({ rolId, modules, rechten }: RolRechtenMatrixProps) {
  const [matrix, setMatrix] = useState(() => initMatrix(modules, rechten))
  const [isPending, startTransition] = useTransition()
  const [fout, setFout] = useState<string | null>(null)
  const [succes, setSucces] = useState(false)

  function toggle(sleutel: string, veld: RechtVeld, waarde: boolean) {
    setMatrix(prev => {
      const rij = { ...prev[sleutel], [veld]: waarde }

      // Lezen uit → alles uit
      if (veld === 'kan_lezen' && !waarde) {
        rij.kan_aanmaken    = false
        rij.kan_wijzigen    = false
        rij.kan_verwijderen = false
      }
      // Aanmaken/Wijzigen/Verwijderen aan → lezen ook aan
      if (veld !== 'kan_lezen' && waarde) {
        rij.kan_lezen = true
      }

      return { ...prev, [sleutel]: rij }
    })
  }

  function toggleAlles(sleutel: string, alles: boolean) {
    setMatrix(prev => ({
      ...prev,
      [sleutel]: {
        module_sleutel:  sleutel,
        kan_lezen:       alles,
        kan_aanmaken:    alles,
        kan_wijzigen:    alles,
        kan_verwijderen: alles,
      },
    }))
  }

  function handleOpslaan() {
    setFout(null)
    setSucces(false)
    startTransition(async () => {
      const result = await upsertRolRechten(rolId, Object.values(matrix))
      if (!result.success) setFout(result.error ?? 'Opslaan mislukt')
      else setSucces(true)
    })
  }

  return (
    <div className="flex flex-col gap-4">

      {fout && (
        <div className="px-4 py-3 rounded-xl text-sm font-medium" style={{ background: '#FEE2E2', color: '#B91C1C' }}>
          {fout}
        </div>
      )}
      {succes && (
        <div className="px-4 py-3 rounded-xl text-sm font-medium" style={{ background: '#D1FAE5', color: '#065F46' }}>
          Rechten opgeslagen.
        </div>
      )}

      {/* Matrixtabel */}
      <div className="rounded-2xl overflow-hidden border" style={{ borderColor: '#E8E4DF' }}>

        {/* Header */}
        <div
          className="grid px-4 py-3 text-xs font-bold uppercase tracking-wider"
          style={{
            gridTemplateColumns: '1fr repeat(4, 100px) 80px',
            background: '#F0EDF8',
            color: '#9B8FCE',
          }}
        >
          <span>Module</span>
          {KOLOMMEN.map(k => <span key={k.veld} className="text-center">{k.label}</span>)}
          <span className="text-center">Alles</span>
        </div>

        {/* Rijen */}
        {modules.map((mod, idx) => {
          const rij = matrix[mod.sleutel]
          const Icoon = mod.icoon ? MODULE_ICONEN[mod.icoon] : null
          const alleAan = KOLOMMEN.every(k => rij[k.veld])

          return (
            <div
              key={mod.sleutel}
              className="grid px-4 py-3 items-center"
              style={{
                gridTemplateColumns: '1fr repeat(4, 100px) 80px',
                background: idx % 2 === 0 ? 'white' : '#FAFAF9',
                borderTop: idx > 0 ? '1px solid #F0EDF0' : undefined,
              }}
            >
              {/* Module naam + icoon */}
              <div className="flex items-center gap-2">
                {Icoon && <Icoon size={16} style={{ color: '#9B8FCE' }} />}
                <span className="text-sm font-semibold" style={{ color: '#2D2540' }}>{mod.naam}</span>
              </div>

              {/* Checkboxes per recht */}
              {KOLOMMEN.map(k => (
                <div key={k.veld} className="flex justify-center">
                  <input
                    type="checkbox"
                    checked={rij[k.veld]}
                    onChange={e => toggle(mod.sleutel, k.veld, e.target.checked)}
                    className="w-4 h-4 rounded cursor-pointer accent-[#6B5B95]"
                  />
                </div>
              ))}

              {/* Alles checkbox */}
              <div className="flex justify-center">
                <input
                  type="checkbox"
                  checked={alleAan}
                  onChange={e => toggleAlles(mod.sleutel, e.target.checked)}
                  className="w-4 h-4 rounded cursor-pointer accent-[#6B5B95]"
                />
              </div>
            </div>
          )
        })}
      </div>

      <div>
        <button
          onClick={handleOpslaan}
          disabled={isPending}
          className="px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-opacity"
          style={{ background: isPending ? '#9B8FCE' : '#6B5B95' }}
        >
          {isPending ? 'Opslaan...' : 'Rechten opslaan'}
        </button>
      </div>
    </div>
  )
}
