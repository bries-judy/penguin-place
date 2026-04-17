'use client'

import { useState } from 'react'
import { Mail, Phone, Plus, MoreHorizontal } from 'lucide-react'
import type { OuderDetail } from '@/types/ouders'

interface Props {
  ouder: OuderDetail
  onNieuweMemo: () => void
}

function initialen(voornaam: string, achternaam: string) {
  return (voornaam.charAt(0) + achternaam.charAt(0)).toUpperCase() || '–'
}

function formatEuro(bedrag: number): string {
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(bedrag)
}

function formatDatum(iso: string | null): string {
  if (!iso) return 'Nog geen contact'
  return new Date(iso).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })
}

const TYPE_LABEL_CONTACT: Record<string, string> = {
  telefoon: 'Telefoongesprek',
  gesprek:  'Gesprek',
  notitie:  'Notitie',
  taak:     'Taak',
}

interface TileProps {
  label: string
  value: string
  sub?: string
  tone?: 'neutraal' | 'rood' | 'oranje' | 'groen'
}

function Tile({ label, value, sub, tone = 'neutraal' }: TileProps) {
  const toneStyle: React.CSSProperties = (() => {
    switch (tone) {
      case 'rood':   return { background: '#FDECEA', color: '#ba1a1a', borderColor: '#F4C7C2' }
      case 'oranje': return { background: '#FFF3E0', color: '#E65100', borderColor: '#F5D5A8' }
      case 'groen':  return { background: '#D8F0E4', color: '#1a6b40', borderColor: '#B9DEC8' }
      default:       return { background: '#FFFFFF', color: '#2D2540', borderColor: '#E8E4DF' }
    }
  })()

  return (
    <div className="rounded-xl border px-4 py-3" style={toneStyle}>
      <div className="text-[11px] uppercase tracking-wider font-bold opacity-80">{label}</div>
      <div
        className="text-xl font-extrabold mt-0.5"
        style={{ fontFamily: 'Manrope, sans-serif' }}
      >
        {value}
      </div>
      {sub && <div className="text-xs opacity-80 mt-0.5">{sub}</div>}
    </div>
  )
}

export default function OuderHeader({ ouder, onNieuweMemo }: Props) {
  const [menuOpen, setMenuOpen] = useState(false)

  const aantalKinderen = ouder.kinderen.length
  const klantSinds = ouder.created_at
    ? new Date(ouder.created_at).toLocaleDateString('nl-NL', { month: 'short', year: 'numeric' })
    : '—'
  const saldoTone = ouder.openstaand_bedrag > 0 ? 'rood' : 'neutraal'
  const takenTone = ouder.aantal_open_taken > 0 ? 'oranje' : 'neutraal'

  return (
    <section
      className="bg-white rounded-xl border p-6"
      style={{ borderColor: '#E8E4DF' }}
    >
      <div className="flex items-start gap-5">
        <div
          className="shrink-0 w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold"
          style={{ background: '#EDE9F8', color: '#6B5B95', fontFamily: 'Manrope, sans-serif' }}
        >
          {initialen(ouder.voornaam, ouder.achternaam)}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1
              className="text-2xl font-extrabold"
              style={{ fontFamily: 'Manrope, sans-serif', color: '#2D2540' }}
            >
              {ouder.voornaam} {ouder.achternaam}
            </h1>
            <span
              className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold"
              style={
                ouder.actief
                  ? { background: '#D8F0E4', color: '#1a6b40' }
                  : { background: '#F0EDFF', color: '#6B5B95' }
              }
            >
              {ouder.actief ? 'Actief' : 'Inactief'}
            </span>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-4 text-sm" style={{ color: '#5A5278' }}>
            <a href={`mailto:${ouder.email}`} className="inline-flex items-center gap-1.5 hover:underline">
              <Mail className="w-4 h-4" /> {ouder.email}
            </a>
            {ouder.telefoon_mobiel && (
              <a href={`tel:${ouder.telefoon_mobiel}`} className="inline-flex items-center gap-1.5 hover:underline">
                <Phone className="w-4 h-4" /> {ouder.telefoon_mobiel}
              </a>
            )}
          </div>

          <div className="mt-1 text-xs" style={{ color: '#8B82A8' }}>
            {aantalKinderen} {aantalKinderen === 1 ? 'kind' : 'kinderen'} · Klant sinds {klantSinds}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onNieuweMemo}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold rounded-xl"
            style={{ background: '#6B5B95', color: '#FFFFFF' }}
          >
            <Plus className="w-4 h-4" /> Memo
          </button>
          <button
            disabled
            title="Beschikbaar in fase 3"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold rounded-xl border opacity-50 cursor-not-allowed"
            style={{ borderColor: '#C8C2D8', color: '#5A5278', background: '#FFFFFF' }}
          >
            Nieuwe e-mail
          </button>
          <div className="relative">
            <button
              onClick={() => setMenuOpen(v => !v)}
              className="p-2 rounded-xl border"
              style={{ borderColor: '#C8C2D8', color: '#5A5278', background: '#FFFFFF' }}
              aria-label="Meer acties"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
            {menuOpen && (
              <div
                className="absolute right-0 mt-1 w-44 rounded-xl border shadow-sm py-1 z-20"
                style={{ borderColor: '#E8E4DF', background: '#FFFFFF' }}
              >
                <button
                  disabled
                  className="w-full text-left px-3 py-2 text-sm opacity-50 cursor-not-allowed"
                  style={{ color: '#5A5278' }}
                >
                  Deactiveren (fase 2)
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Metric tiles */}
      <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-3">
        <Tile
          label="Openstaand saldo"
          value={formatEuro(ouder.openstaand_bedrag)}
          sub={ouder.openstaand_bedrag > 0 ? 'Niet betaalde facturen' : 'Alles betaald'}
          tone={saldoTone}
        />
        <Tile
          label="Laatste contact"
          value={formatDatum(ouder.laatste_contact_datum)}
          sub={
            ouder.laatste_contact_type
              ? TYPE_LABEL_CONTACT[ouder.laatste_contact_type] ?? ouder.laatste_contact_type
              : undefined
          }
        />
        <Tile
          label="Open taken"
          value={String(ouder.aantal_open_taken)}
          sub={ouder.aantal_open_taken === 1 ? 'openstaand' : 'openstaand'}
          tone={takenTone}
        />
        <Tile
          label="Actieve contracten"
          value={String(ouder.actieve_contracten_count)}
          sub={ouder.actieve_contracten_count === 1 ? 'contract' : 'contracten'}
        />
      </div>
    </section>
  )
}
