'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Lock, Pencil, Trash2 } from 'lucide-react'
import { verwijderRol } from '@/app/actions/rollen'
import { RolBadge } from './RolBadge'
import type { Rol } from '@/types/rollen'

interface RollenTableProps {
  rollen: Rol[]
}

export function RollenTable({ rollen }: RollenTableProps) {
  const [bevestigenId, setBevestigenId] = useState<string | null>(null)
  const [fout, setFout] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleVerwijder(rolId: string) {
    setFout(null)
    startTransition(async () => {
      const result = await verwijderRol(rolId)
      if (!result.success) setFout(result.error ?? 'Verwijderen mislukt')
      setBevestigenId(null)
    })
  }

  if (rollen.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <span className="material-symbols-outlined text-5xl mb-3" style={{ color: '#C4BCDA' }}>shield</span>
        <p className="text-sm font-medium" style={{ color: '#8B82A8' }}>Nog geen rollen gevonden.</p>
      </div>
    )
  }

  return (
    <>
      {fout && (
        <div className="mb-4 rounded-xl px-4 py-3 text-sm font-medium" style={{ background: '#FEE2E2', color: '#B91C1C' }}>
          {fout}
        </div>
      )}

      {/* Tabelkop */}
      <div
        className="grid gap-4 px-4 py-3 text-xs font-bold uppercase tracking-wider rounded-xl mb-1"
        style={{ gridTemplateColumns: '1fr 2fr 120px 120px', color: '#9B8FCE', background: '#F0EDF8' }}
      >
        <span>Naam</span>
        <span>Omschrijving</span>
        <span>Type</span>
        <span className="text-right">Acties</span>
      </div>

      {/* Rijen */}
      <div className="flex flex-col gap-1">
        {rollen.map(rol => (
          <div
            key={rol.id}
            className="grid gap-4 px-4 py-3 rounded-xl items-center"
            style={{ gridTemplateColumns: '1fr 2fr 120px 120px', background: 'white' }}
          >
            {/* Naam */}
            <div className="flex items-center gap-2">
              <RolBadge naam={rol.naam} kleur={rol.kleur} size="sm" />
            </div>

            {/* Omschrijving */}
            <span className="text-sm truncate" style={{ color: '#5C5470' }}>
              {rol.omschrijving ?? '—'}
            </span>

            {/* Type */}
            {rol.is_systeem_rol ? (
              <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full w-fit"
                style={{ background: '#F1F5F9', color: '#64748B' }}>
                <Lock size={11} />
                Systeem
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full w-fit"
                style={{ background: '#EDE9F8', color: '#6B5B95' }}>
                Aangepast
              </span>
            )}

            {/* Acties */}
            <div className="flex items-center justify-end gap-2">
              <Link
                href={`/dashboard/rollen/${rol.id}`}
                className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                style={{ color: '#6B5B95', background: '#EDE9F8' }}
              >
                <Pencil size={12} />
                Bewerken
              </Link>

              {!rol.is_systeem_rol && (
                bevestigenId === rol.id ? (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleVerwijder(rol.id)}
                      disabled={isPending}
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                      style={{ background: '#FEE2E2', color: '#B91C1C' }}
                    >
                      {isPending ? 'Bezig...' : 'Ja, verwijder'}
                    </button>
                    <button
                      onClick={() => setBevestigenId(null)}
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg"
                      style={{ color: '#8B82A8', background: '#F5F3F0' }}
                    >
                      Annuleer
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setBevestigenId(rol.id)}
                    className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                    style={{ color: '#B91C1C', background: '#FEE2E2' }}
                  >
                    <Trash2 size={12} />
                    Verwijder
                  </button>
                )
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
