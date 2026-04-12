'use client'

import { useState, useTransition } from 'react'
import { updateProfielLocaties } from '@/app/actions/gebruikers'

interface LocatieItem {
  id: string
  naam: string
  adres?: string
}

interface GebruikerLocatiesBeheerProps {
  profielId: string
  alleLocaties: LocatieItem[]
  toegewezenLocatieIds: string[]
}

export function GebruikerLocatiesBeheer({
  profielId,
  alleLocaties,
  toegewezenLocatieIds,
}: GebruikerLocatiesBeheerProps) {
  const [geselecteerd, setGeselecteerd] = useState<Set<string>>(
    new Set(toegewezenLocatieIds)
  )
  const [isPending, startTransition] = useTransition()
  const [fout, setFout] = useState<string | null>(null)
  const [succes, setSucces] = useState(false)

  function toggleLocatie(id: string) {
    setGeselecteerd(prev => {
      const nieuw = new Set(prev)
      if (nieuw.has(id)) nieuw.delete(id)
      else nieuw.add(id)
      return nieuw
    })
    setSucces(false)
  }

  function handleOpslaan() {
    setFout(null)
    setSucces(false)
    startTransition(async () => {
      const result = await updateProfielLocaties(profielId, Array.from(geselecteerd))
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
          Locaties opgeslagen.
        </div>
      )}

      {alleLocaties.length === 0 ? (
        <div className="px-4 py-8 text-center text-sm" style={{ color: '#8B82A8' }}>
          Geen locaties beschikbaar in uw organisatie.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {alleLocaties.map(locatie => {
            const actief = geselecteerd.has(locatie.id)
            return (
              <label
                key={locatie.id}
                className="flex items-center gap-4 px-4 py-3 rounded-xl cursor-pointer transition-colors"
                style={{
                  background: actief ? '#F0EDF8' : 'white',
                  border: '1px solid',
                  borderColor: actief ? '#C4BCDA' : '#E8E4DF',
                }}
              >
                <input
                  type="checkbox"
                  checked={actief}
                  onChange={() => toggleLocatie(locatie.id)}
                  className="w-4 h-4 rounded accent-[#6B5B95] cursor-pointer"
                />
                <div className="flex-1">
                  <p className="text-sm font-semibold" style={{ color: '#2D2540' }}>{locatie.naam}</p>
                  {locatie.adres && (
                    <p className="text-xs mt-0.5" style={{ color: '#9B8FCE' }}>{locatie.adres}</p>
                  )}
                </div>
                <span className="material-symbols-outlined text-base" style={{ color: '#C4BCDA' }}>location_on</span>
              </label>
            )
          })}
        </div>
      )}

      <div>
        <button
          onClick={handleOpslaan}
          disabled={isPending}
          className="px-6 py-2.5 rounded-xl text-sm font-bold text-white"
          style={{ background: isPending ? '#9B8FCE' : '#6B5B95' }}
        >
          {isPending ? 'Opslaan...' : 'Locaties opslaan'}
        </button>
      </div>
    </div>
  )
}
