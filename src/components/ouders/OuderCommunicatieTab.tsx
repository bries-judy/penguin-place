'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  Plus, Phone, MessageSquare, StickyNote, ListTodo, Mail,
  CheckCircle2, Trash2, MoreVertical, Paperclip, Download, ArrowDown, ArrowUp,
} from 'lucide-react'
import { memoAfvinken, memoVerwijderen } from '@/app/actions/ouderMemos'
import { bijlageSignedUrl } from '@/app/actions/ouderEmails'
import type { OuderDetail, OuderMemo, OuderMemoType, OuderEmail, OuderEmailBijlage } from '@/types/ouders'
import type { PortaalBericht, AndereOuderRij } from './OuderDetail'
import NieuweMemoForm from './NieuweMemoForm'
import EmailHerkoppelMenu from './EmailHerkoppelMenu'

interface Props {
  ouder: OuderDetail
  memos: OuderMemo[]
  portaalberichten: PortaalBericht[]
  emails: OuderEmail[]
  andereOuders: AndereOuderRij[]
  /** Counter die ophoogt wanneer de "Open taken"-tile in de header geklikt is.
   *  Elke verhoging triggert "Alleen open taken" aan. */
  forceAlleenOpenTaken?: number
}

const MEMO_TYPE_CONFIG: Record<
  OuderMemoType,
  { label: string; style: { background: string; color: string }; Icon: typeof Phone }
> = {
  telefoon: { label: 'Telefoon', style: { background: '#E8F4FD', color: '#1976D2' }, Icon: Phone },
  gesprek:  { label: 'Gesprek',  style: { background: '#F0EDFF', color: '#6B5B95' }, Icon: MessageSquare },
  notitie:  { label: 'Notitie',  style: { background: '#FDF6E3', color: '#8B6914' }, Icon: StickyNote },
  taak:     { label: 'Taak',     style: { background: '#FFF3E0', color: '#E65100' }, Icon: ListTodo },
}

const PORTAAL_STYLE = { background: '#E8F5E9', color: '#388E3C' }
const EMAIL_STYLE   = { background: '#EDE9F8', color: '#6B5B95' }

type FilterKey = OuderMemoType | 'portaal' | 'email'

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'notitie',  label: 'Notities' },
  { key: 'telefoon', label: 'Telefoon' },
  { key: 'gesprek',  label: 'Gesprek' },
  { key: 'taak',     label: 'Taken' },
  { key: 'email',    label: 'E-mail' },
  { key: 'portaal',  label: 'Portaal' },
]

interface UnifiedItem {
  id: string
  bron: 'memo' | 'portaal' | 'email'
  datum: string
  memo?: OuderMemo
  bericht?: PortaalBericht
  email?: OuderEmail
}

function formatDatum(iso: string): string {
  return new Date(iso).toLocaleString('nl-NL', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function formatBytes(bytes: number | null): string {
  if (!bytes || bytes <= 0) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function OuderCommunicatieTab({
  ouder, memos, portaalberichten, emails, andereOuders, forceAlleenOpenTaken,
}: Props) {
  const router = useRouter()
  const [formOpen, setFormOpen] = useState(false)
  const [actieveFilters, setFilters] = useState<Set<FilterKey>>(
    new Set(FILTERS.map(f => f.key)),
  )
  const [alleenOpenTaken, setAlleenOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [fout, setFout] = useState<string | null>(null)

  // Vink "Alleen open taken" aan wanneer de header-tile is geklikt
  useEffect(() => {
    if (forceAlleenOpenTaken && forceAlleenOpenTaken > 0) {
      setAlleenOpen(true)
    }
  }, [forceAlleenOpenTaken])

  const items: UnifiedItem[] = useMemo(() => {
    const memoItems: UnifiedItem[] = memos
      .filter(m => actieveFilters.has(m.type))
      .filter(m => !alleenOpenTaken || (m.type === 'taak' && m.follow_up_status === 'open'))
      .map(m => ({ id: `m-${m.id}`, bron: 'memo', datum: m.datum, memo: m }))

    const portaalItems: UnifiedItem[] = alleenOpenTaken
      ? []
      : portaalberichten
          .filter(() => actieveFilters.has('portaal'))
          .map(p => ({ id: `p-${p.id}`, bron: 'portaal', datum: p.created_at, bericht: p }))

    const emailItems: UnifiedItem[] = alleenOpenTaken
      ? []
      : emails
          .filter(() => actieveFilters.has('email'))
          .map(e => ({ id: `e-${e.id}`, bron: 'email', datum: e.verzonden_op, email: e }))

    return [...memoItems, ...portaalItems, ...emailItems].sort(
      (a, b) => new Date(b.datum).getTime() - new Date(a.datum).getTime(),
    )
  }, [memos, portaalberichten, emails, actieveFilters, alleenOpenTaken])

  function toggleFilter(k: FilterKey) {
    setFilters(prev => {
      const next = new Set(prev)
      if (next.has(k)) next.delete(k); else next.add(k)
      return next
    })
  }

  function handleAfvinken(memoId: string) {
    setFout(null)
    startTransition(async () => {
      const res = await memoAfvinken(memoId, ouder.id)
      if (res.error) setFout(res.error)
      else router.refresh()
    })
  }

  function handleVerwijderen(memoId: string) {
    if (!confirm('Weet je zeker dat je deze memo wilt verwijderen?')) return
    setFout(null)
    startTransition(async () => {
      const res = await memoVerwijderen(memoId, ouder.id)
      if (res.error) setFout(res.error)
      else router.refresh()
    })
  }

  return (
    <div className="space-y-5">
      {/* Filterrij */}
      <div
        className="bg-white rounded-xl border p-4 flex flex-wrap items-center gap-3"
        style={{ borderColor: '#E8E4DF' }}
      >
        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#5A5278' }}>
          Toon:
        </span>
        {FILTERS.map(f => {
          const actief = actieveFilters.has(f.key)
          return (
            <label
              key={f.key}
              className="inline-flex items-center gap-1.5 text-sm cursor-pointer select-none"
              style={{ color: actief ? '#2D2540' : '#8B82A8' }}
            >
              <input
                type="checkbox"
                checked={actief}
                onChange={() => toggleFilter(f.key)}
                style={{ accentColor: '#6B5B95' }}
                className="w-4 h-4"
              />
              {f.label}
            </label>
          )
        })}
        <span className="mx-2" style={{ color: '#C8C2D8' }}>|</span>
        <label
          className="inline-flex items-center gap-1.5 text-sm cursor-pointer select-none"
          style={{ color: alleenOpenTaken ? '#E65100' : '#8B82A8' }}
        >
          <input
            type="checkbox"
            checked={alleenOpenTaken}
            onChange={e => setAlleenOpen(e.target.checked)}
            style={{ accentColor: '#E65100' }}
            className="w-4 h-4"
          />
          Alleen open taken
        </label>

        <button
          onClick={() => setFormOpen(v => !v)}
          className="ml-auto inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold rounded-xl"
          style={{ background: '#6B5B95', color: '#FFFFFF' }}
        >
          <Plus className="w-4 h-4" /> Nieuwe memo
        </button>
      </div>

      {formOpen && (
        <NieuweMemoForm
          ouder={ouder}
          onKlaar={() => { setFormOpen(false); router.refresh() }}
          onAnnuleer={() => setFormOpen(false)}
        />
      )}

      {fout && (
        <div
          className="text-sm px-3 py-2 rounded-xl"
          style={{ background: '#FDECEA', color: '#ba1a1a' }}
        >
          {fout}
        </div>
      )}

      {/* Timeline */}
      {items.length === 0 ? (
        <div
          className="bg-white rounded-xl border p-8 text-center text-sm"
          style={{ borderColor: '#E8E4DF', color: '#8B82A8' }}
        >
          Nog geen berichten, memo's of e-mails voor de geselecteerde filters.
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map(item => (
            <li
              key={item.id}
              className="bg-white rounded-xl border p-4"
              style={{ borderColor: '#E8E4DF' }}
            >
              {item.bron === 'memo' && item.memo ? (
                <MemoRij
                  memo={item.memo}
                  kindNaam={
                    item.memo.kind
                      ? `${item.memo.kind.voornaam} ${item.memo.kind.achternaam}`
                      : null
                  }
                  isPending={isPending}
                  onAfvinken={() => handleAfvinken(item.memo!.id)}
                  onVerwijderen={() => handleVerwijderen(item.memo!.id)}
                />
              ) : item.bron === 'portaal' && item.bericht ? (
                <PortaalRij bericht={item.bericht} />
              ) : item.bron === 'email' && item.email ? (
                <EmailRij email={item.email} andereOuders={andereOuders} />
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function MemoRij({
  memo, kindNaam, isPending, onAfvinken, onVerwijderen,
}: {
  memo: OuderMemo
  kindNaam: string | null
  isPending: boolean
  onAfvinken: () => void
  onVerwijderen: () => void
}) {
  const cfg = MEMO_TYPE_CONFIG[memo.type]
  const Icon = cfg.Icon
  const isOpenTaak = memo.type === 'taak' && memo.follow_up_status === 'open'

  return (
    <div className="flex items-start gap-3">
      <span
        className="shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-full"
        style={cfg.style}
      >
        <Icon className="w-4 h-4" />
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider"
            style={cfg.style}
          >
            {cfg.label}
          </span>
          <h4 className="text-sm font-semibold" style={{ color: '#2D2540' }}>
            {memo.onderwerp}
          </h4>
          {memo.type === 'taak' && memo.follow_up_status === 'afgerond' && (
            <span
              className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
              style={{ background: '#D8F0E4', color: '#1a6b40' }}
            >
              Afgerond
            </span>
          )}
        </div>
        {memo.inhoud && (
          <p className="mt-1 text-sm whitespace-pre-wrap" style={{ color: '#5A5278' }}>
            {memo.inhoud}
          </p>
        )}
        <div className="mt-1 text-xs flex flex-wrap items-center gap-2" style={{ color: '#8B82A8' }}>
          <span>{formatDatum(memo.datum)}</span>
          <span>·</span>
          <span>{memo.auteur?.naam ?? '—'}</span>
          {kindNaam && (<><span>·</span><span>{kindNaam}</span></>)}
          {memo.follow_up_datum && (
            <>
              <span>·</span>
              <span>
                Follow-up vóór{' '}
                {new Date(memo.follow_up_datum).toLocaleDateString('nl-NL')}
              </span>
            </>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1">
        {isOpenTaak && (
          <button
            onClick={onAfvinken}
            disabled={isPending}
            title="Taak afvinken"
            className="p-1.5 rounded-lg hover:bg-[#D8F0E4] disabled:opacity-50"
            style={{ color: '#1a6b40' }}
          >
            <CheckCircle2 className="w-4 h-4" />
          </button>
        )}
        <button
          onClick={onVerwijderen}
          disabled={isPending}
          title="Verwijderen"
          className="p-1.5 rounded-lg hover:bg-[#FDECEA] disabled:opacity-50"
          style={{ color: '#ba1a1a' }}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

function PortaalRij({ bericht }: { bericht: PortaalBericht }) {
  const isOuder = bericht.afzender_type === 'ouder'
  return (
    <div className="flex items-start gap-3">
      <span
        className="shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-full"
        style={PORTAAL_STYLE}
      >
        <MessageSquare className="w-4 h-4" />
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span
            className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider"
            style={PORTAAL_STYLE}
          >
            Portaal
          </span>
          <span className="text-sm font-semibold" style={{ color: '#2D2540' }}>
            {isOuder ? 'Bericht van ouder' : 'Bericht van staff'}
          </span>
        </div>
        {bericht.inhoud ? (
          <p className="mt-1 text-sm whitespace-pre-wrap" style={{ color: '#5A5278' }}>
            {bericht.inhoud}
          </p>
        ) : (
          <p className="mt-1 text-sm italic" style={{ color: '#8B82A8' }}>
            Media-bijlage (niet getoond)
          </p>
        )}
        <div className="mt-1 text-xs" style={{ color: '#8B82A8' }}>
          {formatDatum(bericht.created_at)} · Kanaal: Ouderportaal
        </div>
      </div>
    </div>
  )
}

function EmailRij({
  email, andereOuders,
}: {
  email: OuderEmail
  andereOuders: AndereOuderRij[]
}) {
  const [uitgeklapt, setUitgeklapt] = useState(false)
  const [menuOpen, setMenuOpen]     = useState(false)
  const [herkoppelOpen, setHerkoppel] = useState(false)
  const isOutbound = email.richting === 'outbound'
  const RichtingIcoon = isOutbound ? ArrowUp : ArrowDown

  const meta = isOutbound
    ? `${email.van_adres} → ${email.aan_adressen[0] ?? '—'}`
    : `${email.van_adres}`

  const excerpt = (email.body_plain ?? '')
    .split('\n')
    .filter(r => r.trim().length > 0)
    .slice(0, 2)
    .join(' ')
    .slice(0, 240)

  return (
    <div className="flex items-start gap-3">
      <span
        className="shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-full relative"
        style={EMAIL_STYLE}
      >
        <Mail className="w-4 h-4" />
        <span
          className="absolute -bottom-0.5 -right-0.5 inline-flex items-center justify-center w-4 h-4 rounded-full border"
          style={{ background: '#FFFFFF', borderColor: '#C8C2D8' }}
        >
          <RichtingIcoon className="w-2.5 h-2.5" style={{ color: '#6B5B95' }} />
        </span>
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider"
            style={EMAIL_STYLE}
          >
            {isOutbound ? 'E-mail uit' : 'E-mail in'}
          </span>
          <h4 className="text-sm font-semibold truncate" style={{ color: '#2D2540' }}>
            {email.onderwerp}
          </h4>
          {email.bron === 'seed' && (
            <span
              className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
              style={{ background: '#FFF3E0', color: '#E65100' }}
              title="Demo-data (wordt vervangen door echte M365-sync in Fase 3)"
            >
              Demo
            </span>
          )}
          {email.heeft_bijlagen && (
            <span
              className="inline-flex items-center gap-0.5 text-xs"
              style={{ color: '#8B82A8' }}
            >
              <Paperclip className="w-3 h-3" />
              {email.bijlagen?.length ?? 1}
            </span>
          )}
        </div>

        {!uitgeklapt && excerpt && (
          <p className="mt-1 text-sm line-clamp-2" style={{ color: '#5A5278' }}>
            {excerpt}
          </p>
        )}

        {uitgeklapt && (
          <div className="mt-2 space-y-3">
            <pre
              className="whitespace-pre-wrap text-sm font-sans"
              style={{ color: '#2D2540', fontFamily: 'inherit' }}
            >
              {email.body_plain ?? email.body_html ?? '(geen tekst)'}
            </pre>
            {email.bijlagen && email.bijlagen.length > 0 && (
              <BijlagenLijst bijlagen={email.bijlagen} />
            )}
          </div>
        )}

        <div className="mt-1 text-xs flex flex-wrap items-center gap-2" style={{ color: '#8B82A8' }}>
          <span>{formatDatum(email.verzonden_op)}</span>
          <span>·</span>
          <span>{meta}</span>
          {email.staff?.naam && isOutbound && (
            <>
              <span>·</span>
              <span>Door {email.staff.naam}</span>
            </>
          )}
        </div>

        <button
          onClick={() => setUitgeklapt(v => !v)}
          className="mt-1 text-xs font-semibold hover:underline"
          style={{ color: '#6B5B95' }}
        >
          {uitgeklapt ? 'Inklappen' : 'Uitklappen'}
        </button>
      </div>
      <div className="relative">
        <button
          onClick={() => setMenuOpen(v => !v)}
          className="p-1.5 rounded-lg hover:bg-[#F5F3F0]"
          style={{ color: '#5A5278' }}
          aria-label="Meer acties"
        >
          <MoreVertical className="w-4 h-4" />
        </button>
        {menuOpen && !herkoppelOpen && (
          <div
            className="absolute right-0 top-full mt-1 w-56 rounded-xl border shadow-sm py-1 z-20"
            style={{ borderColor: '#E8E4DF', background: '#FFFFFF' }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => { setHerkoppel(true); setMenuOpen(false) }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-[#EDE9F8]/40"
              style={{ color: '#2D2540' }}
            >
              Verplaats naar andere ouder…
            </button>
          </div>
        )}
        {herkoppelOpen && (
          <EmailHerkoppelMenu
            emailId={email.id}
            onderwerp={email.onderwerp}
            andereOuders={andereOuders}
            onSluit={() => setHerkoppel(false)}
          />
        )}
      </div>
    </div>
  )
}

function BijlagenLijst({ bijlagen }: { bijlagen: OuderEmailBijlage[] }) {
  const [fout, setFout] = useState<string | null>(null)
  const [bezigId, setBezigId] = useState<string | null>(null)

  async function download(b: OuderEmailBijlage) {
    setFout(null)
    setBezigId(b.id)
    try {
      const res = await bijlageSignedUrl(b.id)
      if (res.error || !res.url) {
        setFout(res.error ?? 'Kon URL niet ophalen')
        return
      }
      window.open(res.url, '_blank', 'noopener')
    } finally {
      setBezigId(null)
    }
  }

  return (
    <div className="space-y-1.5">
      <h5 className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#8B82A8' }}>
        Bijlagen
      </h5>
      <div className="flex flex-wrap gap-2">
        {bijlagen.map(b => (
          <button
            key={b.id}
            onClick={() => download(b)}
            disabled={bezigId === b.id}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold hover:bg-[#EDE9F8]/40 disabled:opacity-50"
            style={{ borderColor: '#C8C2D8', color: '#2D2540', background: '#FFFFFF' }}
          >
            <Paperclip className="w-3 h-3" style={{ color: '#6B5B95' }} />
            <span className="truncate max-w-[14rem]">{b.bestandsnaam}</span>
            <span style={{ color: '#8B82A8' }}>{formatBytes(b.grootte_bytes)}</span>
            <Download className="w-3 h-3" style={{ color: '#6B5B95' }} />
          </button>
        ))}
      </div>
      {fout && (
        <div
          className="text-xs px-2 py-1 rounded-lg"
          style={{ background: '#FDECEA', color: '#ba1a1a' }}
        >
          {fout}
        </div>
      )}
    </div>
  )
}
