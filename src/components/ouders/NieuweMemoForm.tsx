'use client'

import { useState, useTransition } from 'react'
import { memoAanmaken } from '@/app/actions/ouderMemos'
import type {
  OuderDetail,
  OuderMemoType,
  OuderMemoZichtbaar,
} from '@/types/ouders'

interface Props {
  ouder: OuderDetail
  onKlaar: () => void
  onAnnuleer: () => void
}

const TYPE_OPTIES: { value: OuderMemoType; label: string }[] = [
  { value: 'notitie',  label: 'Notitie' },
  { value: 'telefoon', label: 'Telefoongesprek' },
  { value: 'gesprek',  label: 'Gesprek' },
  { value: 'taak',     label: 'Taak' },
]

const ZICHTBAAR_OPTIES: { value: OuderMemoZichtbaar; label: string }[] = [
  { value: 'alle_staff',    label: 'Alle staff' },
  { value: 'alleen_auteur', label: 'Alleen ikzelf' },
  { value: 'team_locatie',  label: 'Team van locatie' },
]

function nowLocalDatetime(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const inputStyle: React.CSSProperties = {
  borderColor: '#C8C2D8',
  background: '#FFFFFF',
  color: '#2D2540',
}

export default function NieuweMemoForm({ ouder, onKlaar, onAnnuleer }: Props) {
  const [type, setType]             = useState<OuderMemoType>('notitie')
  const [onderwerp, setOnderwerp]   = useState('')
  const [inhoud, setInhoud]         = useState('')
  const [datum, setDatum]           = useState(nowLocalDatetime())
  const [kindId, setKindId]         = useState<string>('')
  const [zichtbaar, setZichtbaar]   = useState<OuderMemoZichtbaar>('alle_staff')
  const [followUpDatum, setFollowUp] = useState<string>('')
  const [fout, setFout]             = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFout(null)
    if (!onderwerp.trim()) {
      setFout('Onderwerp is verplicht')
      return
    }

    const fd = new FormData()
    fd.append('ouder_id', ouder.id)
    fd.append('type', type)
    fd.append('onderwerp', onderwerp.trim())
    if (inhoud.trim()) fd.append('inhoud', inhoud.trim())
    if (datum) fd.append('datum', new Date(datum).toISOString())
    if (kindId) fd.append('kind_id', kindId)
    fd.append('zichtbaar_voor', zichtbaar)
    if (type === 'taak' && followUpDatum) fd.append('follow_up_datum', followUpDatum)

    startTransition(async () => {
      const res = await memoAanmaken(fd)
      if (res.error) {
        setFout(res.error)
        return
      }
      onKlaar()
    })
  }

  return (
    <form
      onSubmit={onSubmit}
      className="bg-white rounded-xl border p-5 space-y-4"
      style={{ borderColor: '#C8C2D8' }}
    >
      <div className="flex items-center justify-between">
        <h4
          className="text-sm font-bold uppercase tracking-wider"
          style={{ color: '#5A5278' }}
        >
          Nieuwe memo
        </h4>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold mb-1" style={{ color: '#5A5278' }}>
            Type
          </label>
          <select
            value={type}
            onChange={e => setType(e.target.value as OuderMemoType)}
            className="w-full px-3 py-2 text-sm rounded-xl border outline-none"
            style={inputStyle}
          >
            {TYPE_OPTIES.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold mb-1" style={{ color: '#5A5278' }}>
            Datum
          </label>
          <input
            type="datetime-local"
            value={datum}
            onChange={e => setDatum(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-xl border outline-none"
            style={inputStyle}
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold mb-1" style={{ color: '#5A5278' }}>
          Onderwerp <span style={{ color: '#ba1a1a' }}>*</span>
        </label>
        <input
          type="text"
          value={onderwerp}
          onChange={e => setOnderwerp(e.target.value)}
          required
          className="w-full px-3 py-2 text-sm rounded-xl border outline-none"
          style={inputStyle}
        />
      </div>

      <div>
        <label className="block text-xs font-semibold mb-1" style={{ color: '#5A5278' }}>
          Inhoud (optioneel)
        </label>
        <textarea
          value={inhoud}
          onChange={e => setInhoud(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 text-sm rounded-xl border outline-none resize-none"
          style={inputStyle}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold mb-1" style={{ color: '#5A5278' }}>
            Kind (optioneel)
          </label>
          <select
            value={kindId}
            onChange={e => setKindId(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-xl border outline-none"
            style={inputStyle}
          >
            <option value="">— Algemeen —</option>
            {ouder.kinderen.map(k => (
              <option key={k.kind_id} value={k.kind_id}>
                {k.voornaam} {k.achternaam}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold mb-1" style={{ color: '#5A5278' }}>
            Zichtbaar voor
          </label>
          <select
            value={zichtbaar}
            onChange={e => setZichtbaar(e.target.value as OuderMemoZichtbaar)}
            className="w-full px-3 py-2 text-sm rounded-xl border outline-none"
            style={inputStyle}
          >
            {ZICHTBAAR_OPTIES.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      {type === 'taak' && (
        <div>
          <label className="block text-xs font-semibold mb-1" style={{ color: '#5A5278' }}>
            Follow-up vóór
          </label>
          <input
            type="date"
            value={followUpDatum}
            onChange={e => setFollowUp(e.target.value)}
            className="w-full max-w-xs px-3 py-2 text-sm rounded-xl border outline-none"
            style={inputStyle}
          />
        </div>
      )}

      {fout && (
        <div
          className="text-sm px-3 py-2 rounded-xl"
          style={{ background: '#FDECEA', color: '#ba1a1a' }}
        >
          {fout}
        </div>
      )}

      <div className="flex items-center gap-2 pt-1">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-xl disabled:opacity-50"
          style={{ background: '#6B5B95', color: '#FFFFFF' }}
        >
          {isPending ? 'Opslaan…' : 'Opslaan'}
        </button>
        <button
          type="button"
          onClick={onAnnuleer}
          className="inline-flex px-4 py-2 text-sm font-semibold rounded-xl border"
          style={{ borderColor: '#C8C2D8', color: '#5A5278', background: '#FFFFFF' }}
        >
          Annuleren
        </button>
      </div>
    </form>
  )
}
