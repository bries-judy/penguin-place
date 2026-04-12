'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { upsertRol } from '@/app/actions/rollen'
import type { Rol } from '@/types/rollen'

const KLEUREN = [
  '#3B82F6', '#8B5CF6', '#10B981', '#F59E0B',
  '#EF4444', '#1F2937', '#6366F1', '#EC4899',
]

interface RolFormProps {
  rol?: Rol
  isReadonly?: boolean
}

export function RolForm({ rol, isReadonly = false }: RolFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [fout, setFout] = useState<string | null>(null)
  const [succes, setSucces] = useState(false)
  const [gekozenKleur, setGekozenKleur] = useState(rol?.kleur ?? '#6366F1')

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (isReadonly) return
    setFout(null)
    setSucces(false)

    const formData = new FormData(e.currentTarget)
    formData.set('kleur', gekozenKleur)
    if (rol?.id) formData.set('rol_id', rol.id)

    startTransition(async () => {
      const result = await upsertRol(formData)
      if (!result.success) {
        setFout(result.error ?? 'Opslaan mislukt')
      } else {
        setSucces(true)
        if (!rol?.id && result.rolId) {
          router.push(`/dashboard/rollen/${result.rolId}`)
        }
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">

      {isReadonly && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm"
          style={{ background: '#F0EDF8', color: '#6B5B95' }}>
          <span className="material-symbols-outlined text-base">lock</span>
          Systeemrollen kunnen niet worden hernoemd of gewijzigd.
        </div>
      )}

      {fout && (
        <div className="px-4 py-3 rounded-xl text-sm font-medium" style={{ background: '#FEE2E2', color: '#B91C1C' }}>
          {fout}
        </div>
      )}

      {succes && (
        <div className="px-4 py-3 rounded-xl text-sm font-medium" style={{ background: '#D1FAE5', color: '#065F46' }}>
          Rol opgeslagen.
        </div>
      )}

      {/* Naam */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-semibold" style={{ color: '#2D2540' }}>Naam</label>
        <input
          type="text"
          name="naam"
          defaultValue={rol?.naam ?? ''}
          readOnly={isReadonly}
          required
          placeholder="bijv. klantadviseur"
          className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition"
          style={{
            borderColor: '#E8E4DF',
            background: isReadonly ? '#F5F3F0' : 'white',
            color: '#2D2540',
          }}
        />
      </div>

      {/* Omschrijving */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-semibold" style={{ color: '#2D2540' }}>Omschrijving</label>
        <textarea
          name="omschrijving"
          defaultValue={rol?.omschrijving ?? ''}
          readOnly={isReadonly}
          rows={3}
          placeholder="Korte omschrijving van deze rol..."
          className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition resize-none"
          style={{
            borderColor: '#E8E4DF',
            background: isReadonly ? '#F5F3F0' : 'white',
            color: '#2D2540',
          }}
        />
      </div>

      {/* Kleur */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-semibold" style={{ color: '#2D2540' }}>Kleur</label>
        <div className="flex items-center gap-2">
          {KLEUREN.map(kleur => (
            <button
              key={kleur}
              type="button"
              disabled={isReadonly}
              onClick={() => setGekozenKleur(kleur)}
              className="w-8 h-8 rounded-full border-2 transition-transform"
              style={{
                backgroundColor: kleur,
                borderColor: gekozenKleur === kleur ? '#2D2540' : 'transparent',
                transform: gekozenKleur === kleur ? 'scale(1.2)' : 'scale(1)',
              }}
              title={kleur}
            />
          ))}
          <span className="ml-2 text-xs font-mono px-2 py-1 rounded-lg"
            style={{ background: '#F5F3F0', color: '#5C5470' }}>
            {gekozenKleur}
          </span>
        </div>
      </div>

      {!isReadonly && (
        <div className="pt-2">
          <button
            type="submit"
            disabled={isPending}
            className="px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-opacity"
            style={{ background: isPending ? '#9B8FCE' : '#6B5B95' }}
          >
            {isPending ? 'Opslaan...' : rol?.id ? 'Wijzigingen opslaan' : 'Rol aanmaken'}
          </button>
        </div>
      )}
    </form>
  )
}
