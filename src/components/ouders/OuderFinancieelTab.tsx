'use client'

import type { OuderDetail } from '@/types/ouders'
import type { OuderFactuur } from './OuderDetail'

interface Props {
  ouder: OuderDetail
  facturen: OuderFactuur[]
}

type FactuurStatus = OuderFactuur['status']

const STATUS_LABEL: Record<FactuurStatus, string> = {
  draft:   'Concept',
  sent:    'Verzonden',
  paid:    'Betaald',
  overdue: 'Te laat',
}

const STATUS_STYLE: Record<FactuurStatus, React.CSSProperties> = {
  draft:   { background: '#F0EDFF', color: '#6B5B95' },
  sent:    { background: '#E8F4FD', color: '#1976D2' },
  paid:    { background: '#E8F5E9', color: '#388E3C' },
  overdue: { background: '#FFF3E0', color: '#E65100' },
}

function formatEuro(bedrag: number): string {
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(bedrag)
}

function formatPeriode(start: string, eind: string): string {
  const s = new Date(start)
  const e = new Date(eind)
  return `${s.toLocaleDateString('nl-NL', { month: 'short', year: 'numeric' })} — ${e.toLocaleDateString('nl-NL', { month: 'short', year: 'numeric' })}`
}

export default function OuderFinancieelTab({ ouder, facturen }: Props) {
  const saldoKleur =
    ouder.openstaand_bedrag > 0
      ? { background: '#FDECEA', color: '#ba1a1a', borderColor: '#F4C7C2' }
      : { background: '#D8F0E4', color: '#1a6b40', borderColor: '#B9DEC8' }

  return (
    <div className="space-y-6">
      {/* Openstaand saldo */}
      <section className="rounded-xl border px-5 py-4" style={saldoKleur}>
        <div className="text-[11px] uppercase tracking-wider font-bold opacity-80">
          Openstaand saldo
        </div>
        <div
          className="text-2xl font-extrabold mt-0.5"
          style={{ fontFamily: 'Manrope, sans-serif' }}
        >
          {formatEuro(ouder.openstaand_bedrag)}
        </div>
        <p className="text-sm mt-1 opacity-80">
          {ouder.openstaand_bedrag > 0
            ? 'Som van facturen met status "Verzonden" of "Te laat".'
            : 'Alle facturen zijn betaald.'}
        </p>
      </section>

      {/* Facturen-tabel */}
      <section
        className="bg-white rounded-xl border overflow-hidden"
        style={{ borderColor: '#E8E4DF' }}
      >
        <div
          className="px-4 py-3 border-b font-semibold text-sm"
          style={{ borderColor: '#F0EDEA', color: '#2D2540' }}
        >
          Facturen
        </div>
        {facturen.length === 0 ? (
          <p className="p-8 text-center text-sm" style={{ color: '#8B82A8' }}>
            Nog geen facturen voor deze ouder.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: '#F5F3F0' }}>
                <th className="text-left px-4 py-3 font-semibold" style={{ color: '#5A5278' }}>Factuurnr</th>
                <th className="text-left px-4 py-3 font-semibold" style={{ color: '#5A5278' }}>Periode</th>
                <th className="text-right px-4 py-3 font-semibold" style={{ color: '#5A5278' }}>Bedrag</th>
                <th className="text-left px-4 py-3 font-semibold" style={{ color: '#5A5278' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {facturen.map(f => (
                <tr key={f.id} className="border-t" style={{ borderColor: '#F0EDEA' }}>
                  <td className="px-4 py-3 font-mono font-semibold" style={{ color: '#2D2540' }}>
                    {f.factuurnummer ?? '—'}
                  </td>
                  <td className="px-4 py-3" style={{ color: '#5A5278' }}>
                    {formatPeriode(f.periode_start, f.periode_eind)}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold" style={{ color: '#2D2540' }}>
                    {formatEuro(Number(f.totaal_bedrag))}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold"
                      style={STATUS_STYLE[f.status]}
                    >
                      {STATUS_LABEL[f.status]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* Placeholders fase 2 */}
      <section
        className="rounded-xl border p-5"
        style={{ background: '#F5F3F0', borderColor: '#E8E4DF' }}
      >
        <h3
          className="text-sm font-bold uppercase tracking-wider mb-2"
          style={{ color: '#5A5278' }}
        >
          Jaaropgaves
        </h3>
        <p className="text-sm" style={{ color: '#8B82A8' }}>
          Beschikbaar in fase 2. Jaaropgaves voor de Belastingdienst worden automatisch
          gegenereerd zodra de `jaaropgaves`-tabel beschikbaar is.
        </p>
      </section>

      <section
        className="rounded-xl border p-5"
        style={{ background: '#F5F3F0', borderColor: '#E8E4DF' }}
      >
        <h3
          className="text-sm font-bold uppercase tracking-wider mb-2"
          style={{ color: '#5A5278' }}
        >
          SEPA-machtiging
        </h3>
        <p className="text-sm" style={{ color: '#8B82A8' }}>
          Beschikbaar in fase 2. SEPA-machtigingen worden dan beheerd via de
          `sepa_machtigingen`-tabel.
        </p>
      </section>
    </div>
  )
}
