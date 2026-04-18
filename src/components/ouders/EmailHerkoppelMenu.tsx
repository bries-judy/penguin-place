'use client'

import { useState, useTransition, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { X, Search } from 'lucide-react'
import { emailHerkoppelen } from '@/app/actions/ouderEmails'
import type { AndereOuderRij } from './OuderDetail'

interface Props {
  emailId: string
  onderwerp: string
  andereOuders: AndereOuderRij[]
  onSluit: () => void
}

const inputStyle: React.CSSProperties = {
  borderColor: '#C8C2D8',
  background: '#FFFFFF',
  color: '#2D2540',
}

export default function EmailHerkoppelMenu({
  emailId,
  onderwerp,
  andereOuders,
  onSluit,
}: Props) {
  const router = useRouter()
  const [zoek, setZoek]             = useState('')
  const [bevestigId, setBevestigId] = useState<string | null>(null)
  const [fout, setFout]             = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const gefilterd = useMemo(() => {
    const q = zoek.trim().toLowerCase()
    if (!q) return andereOuders.slice(0, 20)
    return andereOuders
      .filter(o =>
        `${o.voornaam} ${o.achternaam}`.toLowerCase().includes(q) ||
        o.email.toLowerCase().includes(q),
      )
      .slice(0, 20)
  }, [zoek, andereOuders])

  const doelOuder = bevestigId
    ? andereOuders.find(o => o.id === bevestigId) ?? null
    : null

  function handleVerplaats() {
    if (!bevestigId) return
    setFout(null)
    startTransition(async () => {
      const res = await emailHerkoppelen(emailId, bevestigId)
      if (res.error) { setFout(res.error); return }
      router.refresh()
      onSluit()
    })
  }

  return (
    <div
      className="absolute right-0 top-full mt-1 w-80 rounded-xl border shadow-lg z-30 overflow-hidden"
      style={{ borderColor: '#C8C2D8', background: '#FFFFFF' }}
      onClick={(e) => e.stopPropagation()}
    >
      <div
        className="flex items-center justify-between px-3 py-2 border-b"
        style={{ borderColor: '#E8E4DF' }}
      >
        <span className="text-sm font-semibold" style={{ color: '#2D2540' }}>
          Verplaats naar andere ouder
        </span>
        <button
          onClick={onSluit}
          className="p-1 rounded-lg hover:bg-[#F5F3F0]"
          style={{ color: '#8B82A8' }}
          aria-label="Sluiten"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {bevestigId && doelOuder ? (
        <div className="p-4 space-y-3">
          <p className="text-sm" style={{ color: '#2D2540' }}>
            Verplaats <strong>“{onderwerp}”</strong> naar{' '}
            <strong>{doelOuder.voornaam} {doelOuder.achternaam}</strong>?
          </p>
          {fout && (
            <div
              className="text-xs px-2 py-1.5 rounded-lg"
              style={{ background: '#FDECEA', color: '#ba1a1a' }}
            >
              {fout}
            </div>
          )}
          <div className="flex items-center gap-2">
            <button
              onClick={handleVerplaats}
              disabled={isPending}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold rounded-lg disabled:opacity-50"
              style={{ background: '#6B5B95', color: '#FFFFFF' }}
            >
              {isPending ? 'Verplaatsen…' : 'Verplaatsen'}
            </button>
            <button
              onClick={() => { setBevestigId(null); setFout(null) }}
              className="inline-flex px-3 py-1.5 text-sm font-semibold rounded-lg border"
              style={{ borderColor: '#C8C2D8', color: '#5A5278' }}
            >
              Terug
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="px-3 py-2 border-b" style={{ borderColor: '#F0EDEA' }}>
            <div className="relative">
              <Search
                className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5"
                style={{ color: '#8B82A8' }}
              />
              <input
                type="text"
                value={zoek}
                onChange={e => setZoek(e.target.value)}
                placeholder="Zoek op naam of e-mail…"
                autoFocus
                className="w-full pl-8 pr-2 py-1.5 text-sm rounded-lg border outline-none"
                style={inputStyle}
              />
            </div>
          </div>

          <div className="max-h-64 overflow-y-auto">
            {gefilterd.length === 0 ? (
              <p className="p-4 text-sm text-center" style={{ color: '#8B82A8' }}>
                Geen ouders gevonden.
              </p>
            ) : (
              <ul>
                {gefilterd.map(o => (
                  <li key={o.id}>
                    <button
                      onClick={() => setBevestigId(o.id)}
                      className="w-full text-left px-3 py-2 hover:bg-[#EDE9F8]/40 border-b"
                      style={{ borderColor: '#F0EDEA' }}
                    >
                      <div className="text-sm font-semibold" style={{ color: '#2D2540' }}>
                        {o.voornaam} {o.achternaam}
                      </div>
                      <div className="text-xs" style={{ color: '#8B82A8' }}>
                        {o.email}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  )
}
