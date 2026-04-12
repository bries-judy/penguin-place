'use client'

import { useState, useTransition } from 'react'
import { updateProfielRollen } from '@/app/actions/gebruikers'
import { RolBadge } from '@/components/rollen/RolBadge'
import type { Rol, RolNaam } from '@/types/rollen'

interface GebruikerRollenBeheerProps {
  profielId: string
  beschikbareRollen: Rol[]
  huidigeRolNamen: RolNaam[]
}

export function GebruikerRollenBeheer({
  profielId,
  beschikbareRollen,
  huidigeRolNamen,
}: GebruikerRollenBeheerProps) {
  const [geselecteerd, setGeselecteerd] = useState<Set<RolNaam>>(
    new Set(huidigeRolNamen)
  )
  const [isPending, startTransition] = useTransition()
  const [fout, setFout] = useState<string | null>(null)
  const [succes, setSucces] = useState(false)

  function toggleRol(naam: RolNaam) {
    setGeselecteerd(prev => {
      const nieuw = new Set(prev)
      if (nieuw.has(naam)) nieuw.delete(naam)
      else nieuw.add(naam)
      return nieuw
    })
    setSucces(false)
  }

  function handleOpslaan() {
    setFout(null)
    setSucces(false)
    startTransition(async () => {
      const result = await updateProfielRollen(profielId, Array.from(geselecteerd))
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
          Rollen opgeslagen.
        </div>
      )}

      {/* Rollenlijst */}
      <div className="flex flex-col gap-2">
        {beschikbareRollen.map(rol => {
          const actief = geselecteerd.has(rol.naam as RolNaam)
          return (
            <label
              key={rol.id}
              className="flex items-center gap-4 px-4 py-3 rounded-xl cursor-pointer transition-colors"
              style={{ background: actief ? '#F0EDF8' : 'white', border: '1px solid', borderColor: actief ? '#C4BCDA' : '#E8E4DF' }}
            >
              <input
                type="checkbox"
                checked={actief}
                onChange={() => toggleRol(rol.naam as RolNaam)}
                className="w-4 h-4 rounded accent-[#6B5B95] cursor-pointer"
              />
              <div className="flex-1 flex items-center gap-3">
                <RolBadge naam={rol.naam} kleur={rol.kleur} size="sm" />
                {rol.omschrijving && (
                  <span className="text-sm" style={{ color: '#8B82A8' }}>{rol.omschrijving}</span>
                )}
              </div>
            </label>
          )
        })}
      </div>

      <div>
        <button
          onClick={handleOpslaan}
          disabled={isPending}
          className="px-6 py-2.5 rounded-xl text-sm font-bold text-white"
          style={{ background: isPending ? '#9B8FCE' : '#6B5B95' }}
        >
          {isPending ? 'Opslaan...' : 'Rollen opslaan'}
        </button>
      </div>
    </div>
  )
}
