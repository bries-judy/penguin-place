'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { OuderDetail, OuderKindRij } from '@/types/ouders'

interface Props {
  ouder: OuderDetail
}

const DAGEN = ['maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag'] as const
const DAGEN_KORT: Record<typeof DAGEN[number], string> = {
  maandag: 'Ma', dinsdag: 'Di', woensdag: 'Wo', donderdag: 'Do', vrijdag: 'Vr',
}

function weekStart(offset: number): Date {
  const nu = new Date()
  const dag = nu.getDay() // 0 = zo
  const maandag = new Date(nu)
  maandag.setDate(nu.getDate() - ((dag + 6) % 7) + offset * 7)
  maandag.setHours(0, 0, 0, 0)
  return maandag
}

function weekLabel(start: Date): string {
  const eind = new Date(start)
  eind.setDate(start.getDate() + 4)
  const fmt = (d: Date) => d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })
  return `${fmt(start)} — ${fmt(eind)}`
}

/**
 * Fallback-logica: we hebben nog geen echte planned_days uit de backend.
 * Totdat die er is, beschouwen we elk actief contract als "5 dagen", en
 * laten de dagen leeg voor kinderen zonder contract. De frontend-prompt
 * verwacht expliciet "bereken uit contracten als planned_days leeg is".
 */
function plannedDaysFor(kind: OuderKindRij): string[] {
  if (kind.planned_days.length > 0) return kind.planned_days
  const actief = kind.contracten.find(c => c.status === 'actief')
  if (!actief) return []
  const n = actief.dagen_per_week ?? 5
  return DAGEN.slice(0, Math.max(0, Math.min(5, n)))
}

export default function OuderPlanningTab({ ouder }: Props) {
  const [offset, setOffset] = useState(0)
  const start = weekStart(offset)

  return (
    <section
      className="bg-white rounded-xl border p-5"
      style={{ borderColor: '#E8E4DF' }}
    >
      <div className="flex items-center justify-between mb-4">
        <h3
          className="text-sm font-bold uppercase tracking-wider"
          style={{ color: '#5A5278' }}
        >
          Weekplanning
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setOffset(o => o - 1)}
            className="p-1.5 rounded-lg border"
            style={{ borderColor: '#C8C2D8', color: '#5A5278' }}
            aria-label="Vorige week"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span
            className="text-sm font-semibold min-w-[12rem] text-center"
            style={{ color: '#2D2540' }}
          >
            {weekLabel(start)}
          </span>
          <button
            onClick={() => setOffset(o => o + 1)}
            className="p-1.5 rounded-lg border"
            style={{ borderColor: '#C8C2D8', color: '#5A5278' }}
            aria-label="Volgende week"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {ouder.kinderen.length === 0 ? (
        <p className="text-sm" style={{ color: '#8B82A8' }}>
          Geen kinderen om planning voor te tonen.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
            <thead>
              <tr>
                <th
                  className="text-left px-3 py-2 font-semibold border-b"
                  style={{ color: '#5A5278', borderColor: '#E8E4DF' }}
                >
                  Kind
                </th>
                {DAGEN.map(d => (
                  <th
                    key={d}
                    className="text-center px-3 py-2 font-semibold border-b"
                    style={{ color: '#5A5278', borderColor: '#E8E4DF' }}
                  >
                    {DAGEN_KORT[d]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ouder.kinderen.map(k => {
                const dagen = plannedDaysFor(k)
                const hoofdContract = k.contracten.find(c => c.status === 'actief') ?? k.contracten[0]
                return (
                  <tr key={k.kind_id}>
                    <td
                      className="px-3 py-3 font-semibold border-b"
                      style={{ color: '#2D2540', borderColor: '#F0EDEA' }}
                    >
                      {k.voornaam}
                    </td>
                    {DAGEN.map(d => {
                      const ingepland = dagen.includes(d)
                      return (
                        <td
                          key={d}
                          className="px-2 py-2 text-center border-b align-top"
                          style={{ borderColor: '#F0EDEA' }}
                        >
                          {ingepland ? (
                            <div
                              className="mx-auto inline-block px-2.5 py-1.5 rounded-lg text-xs font-semibold"
                              style={{ background: '#EDE9F8', color: '#6B5B95', minWidth: '4.5rem' }}
                            >
                              <div>{hoofdContract?.opvangtype ?? 'Opvang'}</div>
                              <div
                                className="text-[10px] font-normal opacity-80 mt-0.5 truncate max-w-[7rem]"
                                title={hoofdContract?.locatie_naam ?? ''}
                              >
                                {hoofdContract?.locatie_naam ?? ''}
                              </div>
                            </div>
                          ) : (
                            <span style={{ color: '#C8C2D8' }}>—</span>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-4 text-xs" style={{ color: '#8B82A8' }}>
        Planning wordt nu afgeleid uit de contract-configuratie. Detailplanning per dag komt in een latere fase.
      </p>
    </section>
  )
}
