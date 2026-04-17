'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Phone, MessageSquare, StickyNote, ListTodo, CheckCircle2, Trash2 } from 'lucide-react'
import { memoAfvinken, memoVerwijderen } from '@/app/actions/ouderMemos'
import type { OuderDetail, OuderMemo, OuderMemoType } from '@/types/ouders'
import type { PortaalBericht } from './OuderDetail'
import NieuweMemoForm from './NieuweMemoForm'

interface Props {
  ouder: OuderDetail
  memos: OuderMemo[]
  portaalberichten: PortaalBericht[]
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

type FilterKey = OuderMemoType | 'portaal'

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'notitie',  label: "Notities" },
  { key: 'telefoon', label: 'Telefoon' },
  { key: 'gesprek',  label: 'Gesprek' },
  { key: 'taak',     label: 'Taken' },
  { key: 'portaal',  label: 'Portaal' },
]

interface UnifiedItem {
  id: string
  bron: 'memo' | 'portaal'
  datum: string
  memo?: OuderMemo
  bericht?: PortaalBericht
}

function formatDatum(iso: string): string {
  return new Date(iso).toLocaleString('nl-NL', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function OuderCommunicatieTab({ ouder, memos, portaalberichten }: Props) {
  const router = useRouter()
  const [formOpen, setFormOpen] = useState(false)
  const [actieveFilters, setFilters] = useState<Set<FilterKey>>(
    new Set(FILTERS.map(f => f.key)),
  )
  const [alleenOpenTaken, setAlleenOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [fout, setFout] = useState<string | null>(null)

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

    return [...memoItems, ...portaalItems].sort(
      (a, b) => new Date(b.datum).getTime() - new Date(a.datum).getTime(),
    )
  }, [memos, portaalberichten, actieveFilters, alleenOpenTaken])

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
          Nog geen berichten of memo's voor de geselecteerde filters.
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
              ) : item.bericht ? (
                <PortaalRij bericht={item.bericht} />
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
