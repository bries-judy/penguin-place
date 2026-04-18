'use client'

import Link from 'next/link'
import { ArrowRight, FileSignature } from 'lucide-react'
import type { OuderDetail, OuderKindRij } from '@/types/ouders'

interface Props {
  ouder: OuderDetail
}

function berekenLeeftijd(geboortedatum: string | null): string {
  if (!geboortedatum) return '—'
  const geb = new Date(geboortedatum)
  const nu = new Date()
  const maanden =
    (nu.getFullYear() - geb.getFullYear()) * 12 +
    (nu.getMonth() - geb.getMonth())
  if (maanden < 24) return `${maanden} mnd`
  const jaar = Math.floor(maanden / 12)
  return `${jaar} jaar`
}

function initialen(voornaam: string) {
  return voornaam.charAt(0).toUpperCase() || '–'
}

function avatarKleur(geslacht: string | null): { bg: string; fg: string } {
  if (geslacht === 'man')   return { bg: '#E8F4FD', fg: '#1976D2' }
  if (geslacht === 'vrouw') return { bg: '#FDECF2', fg: '#B24C77' }
  return { bg: '#EDE9F8', fg: '#6B5B95' }
}

function MetaRij({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt
        className="text-[10px] uppercase tracking-wider font-bold"
        style={{ color: '#8B82A8' }}
      >
        {label}
      </dt>
      <dd className="text-sm font-semibold" style={{ color: '#2D2540' }}>
        {value}
      </dd>
    </div>
  )
}

function KindKaart({ kind }: { kind: OuderKindRij }) {
  const leeftijd = berekenLeeftijd(kind.geboortedatum)
  const kleur = avatarKleur(kind.geslacht)
  const hoofdContract = kind.contracten[0]

  return (
    <article
      className="bg-white rounded-xl border p-5"
      style={{ borderColor: '#E8E4DF' }}
    >
      <div className="flex items-start gap-4">
        <span
          className="shrink-0 w-12 h-12 rounded-full flex items-center justify-center font-bold"
          style={{ background: kleur.bg, color: kleur.fg, fontFamily: 'Manrope, sans-serif' }}
        >
          {initialen(kind.voornaam)}
        </span>
        <div className="flex-1 min-w-0">
          <h3
            className="text-base font-extrabold"
            style={{ fontFamily: 'Manrope, sans-serif', color: '#2D2540' }}
          >
            {kind.voornaam} {kind.achternaam}
          </h3>
          <div className="text-xs" style={{ color: '#8B82A8' }}>
            {leeftijd} · {kind.geslacht ?? 'onbekend'} · {kind.relatie}
          </div>
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3">
        <MetaRij label="Opvangtype" value={hoofdContract?.opvangtype ?? '—'} />
        <MetaRij label="Locatie"    value={hoofdContract?.locatie_naam ?? '—'} />
        <MetaRij label="Groep"      value={hoofdContract?.groep_naam ?? '—'} />
        <MetaRij
          label="Dagen/week"
          value={hoofdContract?.dagen_per_week != null ? String(hoofdContract.dagen_per_week) : '—'}
        />
      </dl>

      <div className="mt-4 flex items-center gap-2">
        <Link
          href={`/dashboard/kinderen/${kind.kind_id}`}
          className="inline-flex items-center gap-1 text-sm font-semibold hover:underline"
          style={{ color: '#6B5B95' }}
        >
          Profiel <ArrowRight className="w-4 h-4" />
        </Link>
        {hoofdContract && (
          <>
            <span style={{ color: '#C8C2D8' }}>·</span>
            <Link
              href={`/dashboard/contracten/${hoofdContract.id}`}
              className="inline-flex items-center gap-1 text-sm font-semibold hover:underline"
              style={{ color: '#6B5B95' }}
            >
              <FileSignature className="w-4 h-4" /> Contract
            </Link>
          </>
        )}
      </div>
    </article>
  )
}

export default function OuderKinderenTab({ ouder }: Props) {
  if (ouder.kinderen.length === 0) {
    return (
      <p className="text-sm" style={{ color: '#8B82A8' }}>
        Er zijn nog geen kinderen aan deze ouder gekoppeld.
      </p>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {ouder.kinderen.map(k => (
        <KindKaart key={k.kind_id} kind={k} />
      ))}
    </div>
  )
}
