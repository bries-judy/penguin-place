'use client'

import Link from 'next/link'
import { Phone, MessageSquare, StickyNote, ListTodo, Mail, User as UserIcon } from 'lucide-react'
import type { OuderDetail, OuderMemo, OuderEmail } from '@/types/ouders'
import type { PortaalBericht } from './OuderDetail'

interface Props {
  ouder: OuderDetail
  memos: OuderMemo[]
  portaalberichten: PortaalBericht[]
  emails: OuderEmail[]
}

interface TimelineItem {
  id: string
  bron: 'memo' | 'portaal' | 'email'
  datum: string
  titel: string
  inhoud: string
  auteur: string
  typeLabel: string
  typeKleur: { background: string; color: string }
}

const MEMO_TYPE_STYLE: Record<string, { background: string; color: string; label: string }> = {
  telefoon: { background: '#E8F4FD', color: '#1976D2', label: 'Telefoon' },
  gesprek:  { background: '#F0EDFF', color: '#6B5B95', label: 'Gesprek' },
  notitie:  { background: '#FDF6E3', color: '#8B6914', label: 'Notitie' },
  taak:     { background: '#FFF3E0', color: '#E65100', label: 'Taak' },
}

const PORTAAL_STYLE = { background: '#E8F5E9', color: '#388E3C', label: 'Portaal' }
const EMAIL_STYLE   = { background: '#EDE9F8', color: '#6B5B95', label: 'E-mail' }

function icoonVoor(bron: string, type?: string) {
  if (bron === 'portaal') return <MessageSquare className="w-4 h-4" />
  if (bron === 'email')   return <Mail className="w-4 h-4" />
  switch (type) {
    case 'telefoon': return <Phone className="w-4 h-4" />
    case 'gesprek':  return <MessageSquare className="w-4 h-4" />
    case 'taak':     return <ListTodo className="w-4 h-4" />
    default:         return <StickyNote className="w-4 h-4" />
  }
}

function formatRelatief(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('nl-NL', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function OuderOverzichtTab({ ouder, memos, portaalberichten, emails }: Props) {
  // Union van memo's + portaalberichten + e-mails, gesorteerd op datum DESC, top 5
  const timeline: TimelineItem[] = [
    ...memos.map(m => ({
      id: `m-${m.id}`,
      bron: 'memo' as const,
      datum: m.datum,
      titel: m.onderwerp,
      inhoud: m.inhoud,
      auteur: m.auteur?.naam ?? '—',
      typeLabel: MEMO_TYPE_STYLE[m.type]?.label ?? m.type,
      typeKleur: MEMO_TYPE_STYLE[m.type] ?? MEMO_TYPE_STYLE.notitie,
      _type: m.type,
    })),
    ...portaalberichten.map(p => ({
      id: `p-${p.id}`,
      bron: 'portaal' as const,
      datum: p.created_at,
      titel: p.afzender_type === 'ouder' ? 'Bericht van ouder' : 'Bericht van staff',
      inhoud: p.inhoud ?? '(media)',
      auteur: p.afzender_type === 'ouder' ? 'Ouder' : 'Medewerker',
      typeLabel: PORTAAL_STYLE.label,
      typeKleur: { background: PORTAAL_STYLE.background, color: PORTAAL_STYLE.color },
      _type: undefined as string | undefined,
    })),
    ...emails.map(e => ({
      id: `e-${e.id}`,
      bron: 'email' as const,
      datum: e.verzonden_op,
      titel: e.onderwerp,
      inhoud: (e.body_plain ?? '').slice(0, 200),
      auteur:
        e.richting === 'outbound'
          ? (e.staff?.naam ?? 'Medewerker')
          : e.van_adres,
      typeLabel: e.richting === 'outbound' ? 'E-mail uit' : 'E-mail in',
      typeKleur: { background: EMAIL_STYLE.background, color: EMAIL_STYLE.color },
      _type: undefined as string | undefined,
    })),
  ]
    .sort((a, b) => new Date(b.datum).getTime() - new Date(a.datum).getTime())
    .slice(0, 5)

  const openTaken = memos.filter(m => m.type === 'taak' && m.follow_up_status === 'open')

  return (
    <div className="grid gap-6" style={{ gridTemplateColumns: '2fr 1fr' }}>
      {/* ── Links: recente activiteit ── */}
      <section
        className="bg-white rounded-xl border p-5"
        style={{ borderColor: '#E8E4DF' }}
      >
        <h3
          className="text-sm font-bold uppercase tracking-wider mb-4"
          style={{ color: '#5A5278' }}
        >
          Recente activiteit
        </h3>
        {timeline.length === 0 ? (
          <p className="text-sm" style={{ color: '#8B82A8' }}>
            Nog geen activiteit.
          </p>
        ) : (
          <ul className="space-y-3">
            {timeline.map(item => {
              // _type hack voor icoon-kleur; niet in TimelineItem zelf om interface schoon te houden
              const t = (item as TimelineItem & { _type?: string })._type
              return (
                <li
                  key={item.id}
                  className="flex items-start gap-3 pb-3 last:pb-0 border-b last:border-b-0"
                  style={{ borderColor: '#F0EDEA' }}
                >
                  <span
                    className="shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-full"
                    style={item.typeKleur}
                  >
                    {icoonVoor(item.bron, t)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider"
                        style={item.typeKleur}
                      >
                        {item.typeLabel}
                      </span>
                      <span
                        className="text-sm font-semibold truncate"
                        style={{ color: '#2D2540' }}
                      >
                        {item.titel}
                      </span>
                    </div>
                    {item.inhoud && (
                      <p
                        className="mt-1 text-sm line-clamp-2"
                        style={{ color: '#5A5278' }}
                      >
                        {item.inhoud}
                      </p>
                    )}
                    <div className="mt-1 text-xs" style={{ color: '#8B82A8' }}>
                      {formatRelatief(item.datum)} · {item.auteur}
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {/* ── Rechts: samenvatting ── */}
      <div className="space-y-4">
        <section
          className="bg-white rounded-xl border p-5"
          style={{ borderColor: '#E8E4DF' }}
        >
          <h3
            className="text-sm font-bold uppercase tracking-wider mb-3"
            style={{ color: '#5A5278' }}
          >
            Kinderen ({ouder.kinderen.length})
          </h3>
          {ouder.kinderen.length === 0 ? (
            <p className="text-sm" style={{ color: '#8B82A8' }}>
              Geen kinderen gekoppeld.
            </p>
          ) : (
            <ul className="space-y-2">
              {ouder.kinderen.map(k => (
                <li key={k.kind_id}>
                  <Link
                    href={`/dashboard/kinderen/${k.kind_id}`}
                    className="flex items-center gap-3 py-1.5 hover:underline"
                  >
                    <span
                      className="inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold"
                      style={{ background: '#EDE9F8', color: '#6B5B95' }}
                    >
                      {k.voornaam.charAt(0).toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <div
                        className="text-sm font-semibold truncate"
                        style={{ color: '#2D2540' }}
                      >
                        {k.voornaam} {k.achternaam}
                      </div>
                      <div className="text-xs" style={{ color: '#8B82A8' }}>
                        {k.relatie}
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {openTaken.length > 0 && (
          <section
            className="rounded-xl border p-5"
            style={{ background: '#FFF3E0', borderColor: '#F5D5A8' }}
          >
            <h3
              className="text-sm font-bold uppercase tracking-wider mb-2"
              style={{ color: '#E65100' }}
            >
              Open taken ({openTaken.length})
            </h3>
            <ul className="space-y-1.5">
              {openTaken.slice(0, 3).map(t => (
                <li key={t.id} className="text-sm" style={{ color: '#7a3400' }}>
                  • {t.onderwerp}
                  {t.follow_up_datum && (
                    <span className="opacity-70 ml-1">
                      (vóór {new Date(t.follow_up_datum).toLocaleDateString('nl-NL')})
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        <section
          className="bg-white rounded-xl border p-5"
          style={{ borderColor: '#E8E4DF' }}
        >
          <h3
            className="text-sm font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5"
            style={{ color: '#5A5278' }}
          >
            <UserIcon className="w-3.5 h-3.5" />
            Co-ouder
          </h3>
          <p className="text-xs" style={{ color: '#8B82A8' }}>
            Co-ouder-koppeling is in fase 2 beschikbaar.
          </p>
        </section>
      </div>
    </div>
  )
}
