'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil } from 'lucide-react'
import { ouderBijwerken } from '@/app/actions/ouders'
import type { OuderDetail } from '@/types/ouders'

interface Props {
  ouder: OuderDetail
}

const AUDIT_VELD_LABELS: Record<string, string> = {
  voornaam:        'Voornaam',
  achternaam:      'Achternaam',
  email:           'E-mail',
  telefoon_mobiel: 'Telefoon mobiel',
}

const inputStyle: React.CSSProperties = {
  borderColor: '#C8C2D8',
  background: '#FFFFFF',
  color: '#2D2540',
}

function formatDatum(iso: string): string {
  return new Date(iso).toLocaleString('nl-NL', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function OuderGegevensTab({ ouder }: Props) {
  const router = useRouter()
  const [bewerken, setBewerken]     = useState(false)
  const [voornaam, setVoornaam]     = useState(ouder.voornaam)
  const [achternaam, setAchternaam] = useState(ouder.achternaam)
  const [email, setEmail]           = useState(ouder.email)
  const [telefoon, setTelefoon]     = useState(ouder.telefoon_mobiel ?? '')
  const [fout, setFout]             = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function annuleer() {
    setVoornaam(ouder.voornaam)
    setAchternaam(ouder.achternaam)
    setEmail(ouder.email)
    setTelefoon(ouder.telefoon_mobiel ?? '')
    setFout(null)
    setBewerken(false)
  }

  function opslaan() {
    setFout(null)
    const fd = new FormData()
    fd.append('voornaam', voornaam)
    fd.append('achternaam', achternaam)
    fd.append('email', email)
    if (telefoon) fd.append('telefoon_mobiel', telefoon)

    startTransition(async () => {
      const res = await ouderBijwerken(ouder.id, fd)
      if (res.error) { setFout(res.error); return }
      setBewerken(false)
      router.refresh()
    })
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Persoonsgegevens */}
      <section
        className="bg-white rounded-xl border p-5"
        style={{ borderColor: '#E8E4DF' }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3
            className="text-sm font-bold uppercase tracking-wider"
            style={{ color: '#5A5278' }}
          >
            Persoonsgegevens
          </h3>
          {!bewerken ? (
            <button
              onClick={() => setBewerken(true)}
              className="inline-flex items-center gap-1 text-xs font-semibold"
              style={{ color: '#6B5B95' }}
            >
              <Pencil className="w-3.5 h-3.5" /> Bewerken
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={opslaan}
                disabled={isPending}
                className="px-3 py-1 text-xs font-semibold rounded-lg disabled:opacity-50"
                style={{ background: '#6B5B95', color: '#FFFFFF' }}
              >
                {isPending ? 'Opslaan…' : 'Opslaan'}
              </button>
              <button
                onClick={annuleer}
                className="px-3 py-1 text-xs font-semibold rounded-lg border"
                style={{ borderColor: '#C8C2D8', color: '#5A5278' }}
              >
                Annuleren
              </button>
            </div>
          )}
        </div>

        {fout && (
          <div
            className="mb-3 text-sm px-3 py-2 rounded-xl"
            style={{ background: '#FDECEA', color: '#ba1a1a' }}
          >
            {fout}
          </div>
        )}

        {bewerken ? (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: '#5A5278' }}>Voornaam</label>
              <input
                type="text" value={voornaam} onChange={e => setVoornaam(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border outline-none" style={inputStyle}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: '#5A5278' }}>Achternaam</label>
              <input
                type="text" value={achternaam} onChange={e => setAchternaam(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border outline-none" style={inputStyle}
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-semibold mb-1" style={{ color: '#5A5278' }}>E-mail</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border outline-none" style={inputStyle}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: '#5A5278' }}>Telefoon mobiel</label>
              <input
                type="tel" value={telefoon} onChange={e => setTelefoon(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border outline-none" style={inputStyle}
              />
            </div>
          </div>
        ) : (
          <dl className="space-y-3 text-sm">
            <Rij label="Voornaam"         value={ouder.voornaam} />
            <Rij label="Achternaam"       value={ouder.achternaam} />
            <Rij label="E-mail"           value={ouder.email} />
            <Rij label="Telefoon mobiel"  value={ouder.telefoon_mobiel ?? '—'} />
          </dl>
        )}
      </section>

      {/* AVG-checkboxen (read-only in fase 1) */}
      <section
        className="bg-white rounded-xl border p-5"
        style={{ borderColor: '#E8E4DF' }}
      >
        <h3
          className="text-sm font-bold uppercase tracking-wider mb-3"
          style={{ color: '#5A5278' }}
        >
          AVG &amp; toestemmingen
        </h3>
        <div className="space-y-2 text-sm" style={{ color: '#8B82A8' }}>
          <div>☐ Toestemming foto's / beeldmateriaal</div>
          <div>☐ Toestemming medische noodgevallen</div>
          <div>☐ Nieuwsbrief marketing</div>
        </div>
        <p className="mt-3 text-xs" style={{ color: '#8B82A8' }}>
          Bewerkbaar in fase 2.
        </p>
      </section>

      {/* Audit-trail */}
      <section
        className="bg-white rounded-xl border p-5"
        style={{ borderColor: '#E8E4DF' }}
      >
        <h3
          className="text-sm font-bold uppercase tracking-wider mb-3"
          style={{ color: '#5A5278' }}
        >
          Audit-trail (laatste 10 wijzigingen)
        </h3>
        {ouder.audit_log.length === 0 ? (
          <p className="text-sm" style={{ color: '#8B82A8' }}>
            Nog geen wijzigingen geregistreerd.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="text-left pb-2 font-semibold" style={{ color: '#8B82A8' }}>Veld</th>
                <th className="text-left pb-2 font-semibold" style={{ color: '#8B82A8' }}>Van</th>
                <th className="text-left pb-2 font-semibold" style={{ color: '#8B82A8' }}>Naar</th>
                <th className="text-left pb-2 font-semibold" style={{ color: '#8B82A8' }}>Wanneer</th>
              </tr>
            </thead>
            <tbody>
              {ouder.audit_log.map((a, i) => (
                <tr key={i} className="border-t" style={{ borderColor: '#F0EDEA' }}>
                  <td className="py-2 font-semibold" style={{ color: '#2D2540' }}>
                    {AUDIT_VELD_LABELS[a.veld] ?? a.veld}
                  </td>
                  <td className="py-2" style={{ color: '#8B82A8' }}>{a.oude_waarde ?? '—'}</td>
                  <td className="py-2" style={{ color: '#5A5278' }}>{a.nieuwe_waarde ?? '—'}</td>
                  <td className="py-2" style={{ color: '#8B82A8' }}>{formatDatum(a.at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  )
}

function Rij({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-4">
      <dt className="w-40 shrink-0 font-medium" style={{ color: '#8B82A8' }}>{label}</dt>
      <dd style={{ color: '#2D2540' }}>{value}</dd>
    </div>
  )
}
