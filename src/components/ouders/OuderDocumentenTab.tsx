'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import type { OuderDetail } from '@/types/ouders'

interface Props {
  ouder: OuderDetail
}

const STATUS_STYLE: Record<string, React.CSSProperties> = {
  actief:      { background: '#D8F0E4', color: '#1a6b40' },
  concept:     { background: '#F0EDFF', color: '#6B5B95' },
  beëindigd:  { background: '#EDEAE4', color: '#5A5278' },
  beeindigd:   { background: '#EDEAE4', color: '#5A5278' },
  opgezegd:    { background: '#FFF3E0', color: '#E65100' },
  opgezet:     { background: '#F0EDFF', color: '#6B5B95' },
}

function statusStyle(status: string): React.CSSProperties {
  return STATUS_STYLE[status] ?? { background: '#EDEAE4', color: '#5A5278' }
}

export default function OuderDocumentenTab({ ouder }: Props) {
  const rijen = ouder.kinderen.flatMap(k =>
    k.contracten.map(c => ({
      contract_id: c.id,
      kind_naam: `${k.voornaam} ${k.achternaam}`,
      opvangtype: c.opvangtype,
      locatie_naam: c.locatie_naam,
      startdatum: c.startdatum,
      status: c.status,
    })),
  )

  if (rijen.length === 0) {
    return (
      <p className="text-sm" style={{ color: '#8B82A8' }}>
        Er zijn geen contracten voor de kinderen van deze ouder.
      </p>
    )
  }

  return (
    <section
      className="bg-white rounded-xl border overflow-hidden"
      style={{ borderColor: '#E8E4DF' }}
    >
      <table className="w-full text-sm">
        <thead>
          <tr style={{ background: '#F5F3F0' }}>
            <th className="text-left px-4 py-3 font-semibold" style={{ color: '#5A5278' }}>Contract</th>
            <th className="text-left px-4 py-3 font-semibold" style={{ color: '#5A5278' }}>Kind</th>
            <th className="text-left px-4 py-3 font-semibold" style={{ color: '#5A5278' }}>Locatie</th>
            <th className="text-left px-4 py-3 font-semibold" style={{ color: '#5A5278' }}>Startdatum</th>
            <th className="text-left px-4 py-3 font-semibold" style={{ color: '#5A5278' }}>Status</th>
            <th className="text-right px-4 py-3 font-semibold" style={{ color: '#5A5278' }}></th>
          </tr>
        </thead>
        <tbody>
          {rijen.map(r => (
            <tr
              key={r.contract_id}
              className="border-t"
              style={{ borderColor: '#F0EDEA' }}
            >
              <td className="px-4 py-3 font-semibold capitalize" style={{ color: '#2D2540' }}>
                {r.opvangtype}
              </td>
              <td className="px-4 py-3" style={{ color: '#5A5278' }}>{r.kind_naam}</td>
              <td className="px-4 py-3" style={{ color: '#5A5278' }}>{r.locatie_naam ?? '—'}</td>
              <td className="px-4 py-3" style={{ color: '#5A5278' }}>
                {new Date(r.startdatum).toLocaleDateString('nl-NL')}
              </td>
              <td className="px-4 py-3">
                <span
                  className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize"
                  style={statusStyle(r.status)}
                >
                  {r.status.replace('_', ' ')}
                </span>
              </td>
              <td className="px-4 py-3 text-right">
                <Link
                  href={`/dashboard/contracten/${r.contract_id}`}
                  className="inline-flex items-center gap-1 text-sm font-semibold hover:underline"
                  style={{ color: '#6B5B95' }}
                >
                  Bekijken <ArrowRight className="w-4 h-4" />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}
