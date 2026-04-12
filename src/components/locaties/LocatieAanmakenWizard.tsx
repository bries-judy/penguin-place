'use client'

import { useState, useEffect, useMemo, useCallback, memo } from 'react'
import { useRouter } from 'next/navigation'
import { locatieAanmaken, groepAanmaken } from '@/app/actions/locaties'
import type { LocatieType } from '@/types/locaties'
import { LOCATIE_TYPE_LABELS } from '@/types/locaties'

// ─── Types ────────────────────────────────────────────────────────────────────

type Stap = 1 | 2 | 3

interface DagTijd {
  dag: string
  label: string
  is_open: boolean
  open_tijd: string
  sluit_tijd: string
}

type GroepType = 'baby_0_1' | 'peuter_1_2' | 'peuter_2_4' | 'bso' | 'horizontaal' | 'verticaal'

// ─── Helpers / constanten ─────────────────────────────────────────────────────

const GROEP_TYPE_LABELS: Record<GroepType, string> = {
  baby_0_1:    'Baby (0–1 jaar)',
  peuter_1_2:  'Dreumes (1–2 jaar)',
  peuter_2_4:  'Peuter (2–4 jaar)',
  bso:         'BSO',
  horizontaal: 'Horizontale groep',
  verticaal:   'Verticale groep',
}

const GROEP_TYPE_MAP: Record<GroepType, { opvangtype: string; leeftijdscategorie: string }> = {
  baby_0_1:    { opvangtype: 'kdv', leeftijdscategorie: 'baby' },
  peuter_1_2:  { opvangtype: 'kdv', leeftijdscategorie: 'dreumes' },
  peuter_2_4:  { opvangtype: 'kdv', leeftijdscategorie: 'peuter' },
  bso:         { opvangtype: 'bso', leeftijdscategorie: 'bso' },
  horizontaal: { opvangtype: 'kdv', leeftijdscategorie: 'baby' },
  verticaal:   { opvangtype: 'kdv', leeftijdscategorie: 'baby' },
}

const DEFAULT_TIJDEN: DagTijd[] = [
  { dag: 'ma', label: 'Maandag',    is_open: true,  open_tijd: '07:00', sluit_tijd: '18:00' },
  { dag: 'di', label: 'Dinsdag',    is_open: true,  open_tijd: '07:00', sluit_tijd: '18:00' },
  { dag: 'wo', label: 'Woensdag',   is_open: true,  open_tijd: '07:00', sluit_tijd: '18:00' },
  { dag: 'do', label: 'Donderdag',  is_open: true,  open_tijd: '07:00', sluit_tijd: '18:00' },
  { dag: 'vr', label: 'Vrijdag',    is_open: true,  open_tijd: '07:00', sluit_tijd: '18:00' },
  { dag: 'za', label: 'Zaterdag',   is_open: false, open_tijd: '08:00', sluit_tijd: '18:00' },
  { dag: 'zo', label: 'Zondag',     is_open: false, open_tijd: '08:00', sluit_tijd: '18:00' },
]

const STAPPEN = [
  { nr: 1, label: 'Basisgegevens' },
  { nr: 2, label: 'Openingstijden' },
  { nr: 3, label: 'Eerste groep' },
]

function postcodeGeldig(v: string) { return /^\d{4}\s?[A-Z]{2}$/i.test(v) }
function emailGeldig(v: string) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) }

// ─── Stap 1: Basisgegevens ──────────────────────────────────────────────────

const StapBasisgegevens = memo(function StapBasisgegevens({
  naam, setNaam, type, setType, adres, setAdres, huisnummer, setHuis,
  postcode, setPostcode, plaats, setPlaats, telefoon, setTelefoon,
  email, setEmail, website, setWebsite, fouten1, setFouten1,
}: {
  naam: string; setNaam: (v: string) => void
  type: LocatieType | ''; setType: (v: LocatieType) => void
  adres: string; setAdres: (v: string) => void
  huisnummer: string; setHuis: (v: string) => void
  postcode: string; setPostcode: (v: string) => void
  plaats: string; setPlaats: (v: string) => void
  telefoon: string; setTelefoon: (v: string) => void
  email: string; setEmail: (v: string) => void
  website: string; setWebsite: (v: string) => void
  fouten1: Record<string, string>; setFouten1: React.Dispatch<React.SetStateAction<Record<string, string>>>
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5">
      <h3 className="text-lg font-bold text-[#004d64]" style={{ fontFamily: 'Manrope, sans-serif' }}>
        Basisgegevens
      </h3>

      {/* Naam */}
      <div>
        <label className="block text-sm font-semibold text-slate-600 mb-1">
          Naam <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          value={naam}
          onChange={e => setNaam(e.target.value)}
          onBlur={() => naam.trim() === '' && setFouten1(f => ({ ...f, naam: 'Naam is verplicht' }))}
          className={`w-full border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#006684]/30 ${fouten1.naam ? 'border-red-300 bg-red-50' : 'border-slate-200'}`}
          placeholder="Bijv. Kinderopvang De Maan"
        />
        {fouten1.naam && <p className="text-xs text-red-600 mt-1">{fouten1.naam}</p>}
      </div>

      {/* Type */}
      <div>
        <label className="block text-sm font-semibold text-slate-600 mb-1">
          Type <span className="text-red-400">*</span>
        </label>
        <select
          value={type}
          onChange={e => setType(e.target.value as LocatieType)}
          className={`w-full border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#006684]/30 bg-white ${fouten1.type ? 'border-red-300 bg-red-50' : 'border-slate-200'}`}
        >
          <option value="">Selecteer type</option>
          {(Object.entries(LOCATIE_TYPE_LABELS) as [LocatieType, string][]).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
        {fouten1.type && <p className="text-xs text-red-600 mt-1">{fouten1.type}</p>}
      </div>

      {/* Adres */}
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2">
          <label className="block text-sm font-semibold text-slate-600 mb-1">
            Straat <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={adres}
            onChange={e => setAdres(e.target.value)}
            className={`w-full border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#006684]/30 ${fouten1.adres ? 'border-red-300 bg-red-50' : 'border-slate-200'}`}
            placeholder="Straatnaam"
          />
          {fouten1.adres && <p className="text-xs text-red-600 mt-1">{fouten1.adres}</p>}
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-600 mb-1">
            Huisnummer <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={huisnummer}
            onChange={e => setHuis(e.target.value)}
            className={`w-full border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#006684]/30 ${fouten1.huisnummer ? 'border-red-300 bg-red-50' : 'border-slate-200'}`}
            placeholder="1A"
          />
          {fouten1.huisnummer && <p className="text-xs text-red-600 mt-1">{fouten1.huisnummer}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-semibold text-slate-600 mb-1">
            Postcode <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={postcode}
            onChange={e => setPostcode(e.target.value)}
            onBlur={() => postcode && !postcodeGeldig(postcode) && setFouten1(f => ({ ...f, postcode: 'Postcode moet het formaat 1234 AB hebben' }))}
            className={`w-full border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#006684]/30 ${fouten1.postcode ? 'border-red-300 bg-red-50' : 'border-slate-200'}`}
            placeholder="1234 AB"
          />
          {fouten1.postcode && <p className="text-xs text-red-600 mt-1">{fouten1.postcode}</p>}
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-600 mb-1">
            Plaats <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={plaats}
            onChange={e => setPlaats(e.target.value)}
            className={`w-full border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#006684]/30 ${fouten1.plaats ? 'border-red-300 bg-red-50' : 'border-slate-200'}`}
            placeholder="Amsterdam"
          />
          {fouten1.plaats && <p className="text-xs text-red-600 mt-1">{fouten1.plaats}</p>}
        </div>
      </div>

      {/* Contact */}
      <div>
        <label className="block text-sm font-semibold text-slate-600 mb-1">
          Telefoon <span className="text-red-400">*</span>
        </label>
        <input
          type="tel"
          value={telefoon}
          onChange={e => setTelefoon(e.target.value)}
          className={`w-full border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#006684]/30 ${fouten1.telefoon ? 'border-red-300 bg-red-50' : 'border-slate-200'}`}
          placeholder="020 123 4567"
        />
        {fouten1.telefoon && <p className="text-xs text-red-600 mt-1">{fouten1.telefoon}</p>}
      </div>

      <div>
        <label className="block text-sm font-semibold text-slate-600 mb-1">
          E-mail <span className="text-red-400">*</span>
        </label>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          onBlur={() => email && !emailGeldig(email) && setFouten1(f => ({ ...f, email: 'Vul een geldig e-mailadres in' }))}
          className={`w-full border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#006684]/30 ${fouten1.email ? 'border-red-300 bg-red-50' : 'border-slate-200'}`}
          placeholder="info@locatie.nl"
        />
        {fouten1.email && <p className="text-xs text-red-600 mt-1">{fouten1.email}</p>}
      </div>

      <div>
        <label className="block text-sm font-semibold text-slate-600 mb-1">Website</label>
        <input
          type="url"
          value={website}
          onChange={e => setWebsite(e.target.value)}
          className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#006684]/30"
          placeholder="https://www.locatie.nl"
        />
      </div>
    </div>
  )
})

// ─── Stap 2: Openingstijden ─────────────────────────────────────────────────

const StapOpeningstijden = memo(function StapOpeningstijden({
  tijden, updateTijd, fouten2,
}: {
  tijden: DagTijd[]
  updateTijd: (dag: string, veld: keyof DagTijd, waarde: string | boolean) => void
  fouten2: Record<string, string>
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5">
      <h3 className="text-lg font-bold text-[#004d64]" style={{ fontFamily: 'Manrope, sans-serif' }}>
        Openingstijden
      </h3>
      <div className="space-y-3">
        {tijden.map(t => (
          <div key={t.dag} className="flex items-center gap-4">
            <div className="w-24 shrink-0">
              <span className="text-sm font-semibold text-slate-600">{t.label}</span>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={t.is_open}
                onChange={e => updateTijd(t.dag, 'is_open', e.target.checked)}
                className="w-4 h-4 accent-[#006a66]"
              />
              <span className="text-sm text-slate-500">{t.is_open ? 'Open' : 'Gesloten'}</span>
            </label>
            {t.is_open && (
              <div className="flex items-center gap-2">
                <input
                  type="time"
                  step="900"
                  value={t.open_tijd}
                  onChange={e => updateTijd(t.dag, 'open_tijd', e.target.value)}
                  className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-[#006684]/30"
                />
                <span className="text-slate-400">—</span>
                <input
                  type="time"
                  step="900"
                  value={t.sluit_tijd}
                  onChange={e => updateTijd(t.dag, 'sluit_tijd', e.target.value)}
                  className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-[#006684]/30"
                />
                {fouten2[t.dag] && (
                  <span className="text-xs text-red-600">{fouten2[t.dag]}</span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
})

// ─── Stap 3: Eerste groep ───────────────────────────────────────────────────

const StapEersteGroep = memo(function StapEersteGroep({
  groepNaam, setGroepNaam, groepType, setGroepType,
  minLeeftijd, setMinLeeftijd, maxLeeftijd, setMaxLeeftijd,
  maxCapaciteit, setMaxCapaciteit, m2, setM2,
  bkrRatio, setBkrRatio, ruimtenaam, setRuimtenaam,
  fouten3, m2PerKind, bezig, onOverslaan,
}: {
  groepNaam: string; setGroepNaam: (v: string) => void
  groepType: GroepType | ''; setGroepType: (v: GroepType | '') => void
  minLeeftijd: string; setMinLeeftijd: (v: string) => void
  maxLeeftijd: string; setMaxLeeftijd: (v: string) => void
  maxCapaciteit: string; setMaxCapaciteit: (v: string) => void
  m2: string; setM2: (v: string) => void
  bkrRatio: string; setBkrRatio: (v: string) => void
  ruimtenaam: string; setRuimtenaam: (v: string) => void
  fouten3: Record<string, string>
  m2PerKind: string | null
  bezig: boolean
  onOverslaan: () => void
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-[#004d64]" style={{ fontFamily: 'Manrope, sans-serif' }}>
          Eerste groep (optioneel)
        </h3>
        <button
          onClick={onOverslaan}
          disabled={bezig}
          className="text-sm text-slate-400 hover:text-slate-600 underline disabled:opacity-50"
        >
          Stap overslaan
        </button>
      </div>

      <div>
        <label className="block text-sm font-semibold text-slate-600 mb-1">
          Groepsnaam <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          value={groepNaam}
          onChange={e => setGroepNaam(e.target.value)}
          className={`w-full border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#006684]/30 ${fouten3.groepNaam ? 'border-red-300 bg-red-50' : 'border-slate-200'}`}
          placeholder="Bijv. Groep 1"
        />
        {fouten3.groepNaam && <p className="text-xs text-red-600 mt-1">{fouten3.groepNaam}</p>}
      </div>

      <div>
        <label className="block text-sm font-semibold text-slate-600 mb-1">
          Groepstype <span className="text-red-400">*</span>
        </label>
        <select
          value={groepType}
          onChange={e => setGroepType(e.target.value as GroepType)}
          className={`w-full border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#006684]/30 bg-white ${fouten3.groepType ? 'border-red-300 bg-red-50' : 'border-slate-200'}`}
        >
          <option value="">Selecteer type</option>
          {(Object.entries(GROEP_TYPE_LABELS) as [GroepType, string][]).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
        {fouten3.groepType && <p className="text-xs text-red-600 mt-1">{fouten3.groepType}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-semibold text-slate-600 mb-1">
            Min leeftijd (maanden) <span className="text-red-400">*</span>
          </label>
          <input
            type="number"
            min="0"
            value={minLeeftijd}
            onChange={e => setMinLeeftijd(e.target.value)}
            className={`w-full border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#006684]/30 ${fouten3.minLeeftijd ? 'border-red-300 bg-red-50' : 'border-slate-200'}`}
          />
          {fouten3.minLeeftijd && <p className="text-xs text-red-600 mt-1">{fouten3.minLeeftijd}</p>}
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-600 mb-1">
            Max leeftijd (maanden) <span className="text-red-400">*</span>
          </label>
          <input
            type="number"
            min="0"
            value={maxLeeftijd}
            onChange={e => setMaxLeeftijd(e.target.value)}
            className={`w-full border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#006684]/30 ${fouten3.maxLeeftijd ? 'border-red-300 bg-red-50' : 'border-slate-200'}`}
          />
          {fouten3.maxLeeftijd && <p className="text-xs text-red-600 mt-1">{fouten3.maxLeeftijd}</p>}
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-slate-600 mb-1">
          Max capaciteit <span className="text-red-400">*</span>
        </label>
        <input
          type="number"
          min="1"
          value={maxCapaciteit}
          onChange={e => setMaxCapaciteit(e.target.value)}
          className={`w-full border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#006684]/30 ${fouten3.maxCapaciteit ? 'border-red-300 bg-red-50' : 'border-slate-200'}`}
        />
        {fouten3.maxCapaciteit && <p className="text-xs text-red-600 mt-1">{fouten3.maxCapaciteit}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-semibold text-slate-600 mb-1">
            Oppervlakte (m²) <span className="text-red-400">*</span>
          </label>
          <input
            type="number"
            min="0.1"
            step="0.1"
            value={m2}
            onChange={e => setM2(e.target.value)}
            className={`w-full border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#006684]/30 ${fouten3.m2 ? 'border-red-300 bg-red-50' : 'border-slate-200'}`}
          />
          {fouten3.m2 && <p className="text-xs text-red-600 mt-1">{fouten3.m2}</p>}
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-600 mb-1">m²/kind</label>
          <div className={`w-full border rounded-xl px-4 py-2.5 text-sm font-bold ${
            m2PerKind && Number(m2PerKind) < 3.5
              ? 'border-red-200 bg-red-50 text-red-600'
              : 'border-slate-100 bg-slate-50 text-slate-500'
          }`}>
            {m2PerKind ?? '—'}
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-slate-600 mb-1">
          BKR-verhouding <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          value={bkrRatio}
          onChange={e => setBkrRatio(e.target.value)}
          className={`w-full border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#006684]/30 ${fouten3.bkrRatio ? 'border-red-300 bg-red-50' : 'border-slate-200'}`}
          placeholder="Bijv. 1:3"
        />
        {fouten3.bkrRatio && <p className="text-xs text-red-600 mt-1">{fouten3.bkrRatio}</p>}
      </div>

      <div>
        <label className="block text-sm font-semibold text-slate-600 mb-1">Ruimtenaam</label>
        <input
          type="text"
          value={ruimtenaam}
          onChange={e => setRuimtenaam(e.target.value)}
          className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#006684]/30"
          placeholder="Bijv. Rode Kamer"
        />
      </div>
    </div>
  )
})

// ─── Hoofdcomponent ─────────────────────────────────────────────────────────

export default function LocatieAanmakenWizard() {
  const router = useRouter()

  const [stap, setStap]       = useState<Stap>(1)
  const [bezig, setBezig]     = useState(false)
  const [fout, setFout]       = useState<string | null>(null)
  const [isDirty, setIsDirty] = useState(false)

  // Stap 1 velden
  const [naam, setNaam]         = useState('')
  const [type, setType]         = useState<LocatieType | ''>('')
  const [adres, setAdres]       = useState('')
  const [huisnummer, setHuis]   = useState('')
  const [postcode, setPostcode] = useState('')
  const [plaats, setPlaats]     = useState('')
  const [telefoon, setTelefoon] = useState('')
  const [email, setEmail]       = useState('')
  const [website, setWebsite]   = useState('')

  // Stap 1 fouten
  const [fouten1, setFouten1] = useState<Record<string, string>>({})

  // Stap 2 velden
  const [tijden, setTijden] = useState<DagTijd[]>(DEFAULT_TIJDEN)
  const [fouten2, setFouten2] = useState<Record<string, string>>({})

  // Stap 3 velden
  const [groepNaam, setGroepNaam]         = useState('')
  const [groepType, setGroepType]         = useState<GroepType | ''>('')
  const [minLeeftijd, setMinLeeftijd]     = useState('')
  const [maxLeeftijd, setMaxLeeftijd]     = useState('')
  const [maxCapaciteit, setMaxCapaciteit] = useState('')
  const [m2, setM2]                       = useState('')
  const [bkrRatio, setBkrRatio]           = useState('')
  const [ruimtenaam, setRuimtenaam]       = useState('')
  const [fouten3, setFouten3]             = useState<Record<string, string>>({})

  const m2PerKind = useMemo(() => {
    if (!m2 || !maxCapaciteit || Number(maxCapaciteit) <= 0) return null
    return (Number(m2) / Number(maxCapaciteit)).toFixed(1)
  }, [m2, maxCapaciteit])

  // Unsaved changes waarschuwing
  useEffect(() => {
    if (!isDirty) return
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault() }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isDirty])

  // Markeer dirty bij eerste invoer
  useEffect(() => {
    if (naam || type || adres) setIsDirty(true)
  }, [naam, type, adres])

  function valideerStap1(): boolean {
    const f: Record<string, string> = {}
    if (!naam.trim()) f.naam = 'Naam is verplicht'
    if (!type) f.type = 'Type is verplicht'
    if (!adres.trim()) f.adres = 'Straat is verplicht'
    if (!huisnummer.trim()) f.huisnummer = 'Huisnummer is verplicht'
    if (!postcode.trim()) f.postcode = 'Postcode is verplicht'
    else if (!postcodeGeldig(postcode)) f.postcode = 'Postcode moet het formaat 1234 AB hebben'
    if (!plaats.trim()) f.plaats = 'Plaats is verplicht'
    if (!telefoon.trim()) f.telefoon = 'Telefoon is verplicht'
    if (!email.trim()) f.email = 'E-mail is verplicht'
    else if (!emailGeldig(email)) f.email = 'Vul een geldig e-mailadres in'
    setFouten1(f)
    return Object.keys(f).length === 0
  }

  function valideerStap2(): boolean {
    const f: Record<string, string> = {}
    tijden.forEach(t => {
      if (t.is_open && t.open_tijd >= t.sluit_tijd) {
        f[t.dag] = 'Sluitingstijd moet na openingstijd liggen'
      }
    })
    setFouten2(f)
    return Object.keys(f).length === 0
  }

  function valideerStap3(): boolean {
    const f: Record<string, string> = {}
    if (!groepNaam.trim()) f.groepNaam = 'Groepsnaam is verplicht'
    if (!groepType) f.groepType = 'Groepstype is verplicht'
    if (!minLeeftijd) f.minLeeftijd = 'Minimumleeftijd is verplicht'
    if (!maxLeeftijd) f.maxLeeftijd = 'Maximumleeftijd is verplicht'
    if (minLeeftijd && maxLeeftijd && Number(minLeeftijd) >= Number(maxLeeftijd))
      f.minLeeftijd = 'Minimumleeftijd moet kleiner zijn dan maximumleeftijd'
    if (!maxCapaciteit) f.maxCapaciteit = 'Capaciteit is verplicht'
    else if (!Number.isInteger(Number(maxCapaciteit)) || Number(maxCapaciteit) <= 0)
      f.maxCapaciteit = 'Capaciteit moet een positief geheel getal zijn'
    if (!m2) f.m2 = 'Oppervlakte is verplicht'
    else if (Number(m2) <= 0) f.m2 = 'Oppervlakte moet groter zijn dan 0'
    if (!bkrRatio.trim()) f.bkrRatio = 'BKR-verhouding is verplicht'
    setFouten3(f)
    return Object.keys(f).length === 0
  }

  const naarVolgende = useCallback(() => {
    if (stap === 1 && !valideerStap1()) return
    if (stap === 2 && !valideerStap2()) return
    setStap(prev => (prev + 1) as Stap)
    setFout(null)
  }, [stap, naam, type, adres, huisnummer, postcode, plaats, telefoon, email, tijden])

  const naarVorige = useCallback(() => {
    setStap(prev => (prev - 1) as Stap)
    setFout(null)
  }, [])

  const updateTijd = useCallback((dag: string, veld: keyof DagTijd, waarde: string | boolean) => {
    setTijden(prev => prev.map(t => t.dag === dag ? { ...t, [veld]: waarde } : t))
  }, [])

  const handleSubmit = useCallback(async (overslaan: boolean) => {
    if (!overslaan && !valideerStap3()) return

    setBezig(true)
    setFout(null)

    const fd = new FormData()
    fd.append('naam', naam)
    fd.append('type', type)
    fd.append('adres', adres)
    fd.append('huisnummer', huisnummer)
    fd.append('postcode', postcode)
    fd.append('plaats', plaats)
    fd.append('telefoon', telefoon)
    fd.append('email', email)
    if (website) fd.append('website', website)

    const result = await locatieAanmaken(fd)

    if (result.error || !result.id) {
      setFout(result.error ?? 'Onbekende fout')
      setBezig(false)
      return
    }

    if (!overslaan && groepType) {
      const map = GROEP_TYPE_MAP[groepType]
      const gfd = new FormData()
      gfd.append('naam', groepNaam)
      gfd.append('opvangtype', map.opvangtype)
      gfd.append('leeftijdscategorie', map.leeftijdscategorie)
      gfd.append('min_leeftijd_maanden', minLeeftijd)
      gfd.append('max_leeftijd_maanden', maxLeeftijd)
      gfd.append('max_capaciteit', maxCapaciteit)
      gfd.append('m2', m2)
      gfd.append('bkr_ratio', bkrRatio)
      if (ruimtenaam) gfd.append('ruimtenaam', ruimtenaam)
      await groepAanmaken(result.id, gfd)
    }

    setIsDirty(false)
    router.push(`/dashboard/locaties/${result.id}`)
  }, [naam, type, adres, huisnummer, postcode, plaats, telefoon, email, website,
      groepNaam, groepType, minLeeftijd, maxLeeftijd, maxCapaciteit, m2, bkrRatio, ruimtenaam, router])

  const handleOverslaan = useCallback(() => handleSubmit(true), [handleSubmit])

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Top bar */}
      <header className="bg-white/70 backdrop-blur-md flex items-center px-8 py-4 border-b border-slate-100 sticky top-0 z-40">
        <h2 className="text-xl font-bold tracking-tight text-cyan-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
          Nieuwe locatie toevoegen
        </h2>
      </header>

      <div className="flex-1 overflow-y-auto px-8 py-8">
        <div className="max-w-2xl mx-auto space-y-8">

          {/* Stap indicator */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              {STAPPEN.map((s, i) => (
                <div key={s.nr} className="flex items-center gap-2 flex-1">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    stap > s.nr ? 'bg-[#006a66] text-white' :
                    stap === s.nr ? 'bg-[#004d64] text-white' :
                    'bg-slate-200 text-slate-400'
                  }`}>
                    {stap > s.nr ? (
                      <span className="material-symbols-outlined text-sm">check</span>
                    ) : s.nr}
                  </div>
                  <span className={`text-sm font-semibold ${stap === s.nr ? 'text-[#004d64]' : 'text-slate-400'}`}>
                    {s.label}
                  </span>
                  {i < STAPPEN.length - 1 && (
                    <div className={`flex-1 h-0.5 ${stap > s.nr ? 'bg-[#006a66]' : 'bg-slate-200'}`} />
                  )}
                </div>
              ))}
            </div>
            {/* Progressiebalk */}
            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#006a66] transition-all duration-300"
                style={{ width: `${((stap - 1) / 2) * 100}%` }}
              />
            </div>
          </div>

          {fout && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
              {fout}
            </div>
          )}

          {stap === 1 && (
            <StapBasisgegevens
              naam={naam} setNaam={setNaam}
              type={type} setType={setType as (v: LocatieType) => void}
              adres={adres} setAdres={setAdres}
              huisnummer={huisnummer} setHuis={setHuis}
              postcode={postcode} setPostcode={setPostcode}
              plaats={plaats} setPlaats={setPlaats}
              telefoon={telefoon} setTelefoon={setTelefoon}
              email={email} setEmail={setEmail}
              website={website} setWebsite={setWebsite}
              fouten1={fouten1} setFouten1={setFouten1}
            />
          )}

          {stap === 2 && (
            <StapOpeningstijden
              tijden={tijden}
              updateTijd={updateTijd}
              fouten2={fouten2}
            />
          )}

          {stap === 3 && (
            <StapEersteGroep
              groepNaam={groepNaam} setGroepNaam={setGroepNaam}
              groepType={groepType} setGroepType={setGroepType}
              minLeeftijd={minLeeftijd} setMinLeeftijd={setMinLeeftijd}
              maxLeeftijd={maxLeeftijd} setMaxLeeftijd={setMaxLeeftijd}
              maxCapaciteit={maxCapaciteit} setMaxCapaciteit={setMaxCapaciteit}
              m2={m2} setM2={setM2}
              bkrRatio={bkrRatio} setBkrRatio={setBkrRatio}
              ruimtenaam={ruimtenaam} setRuimtenaam={setRuimtenaam}
              fouten3={fouten3}
              m2PerKind={m2PerKind}
              bezig={bezig}
              onOverslaan={handleOverslaan}
            />
          )}

          {/* Navigatieknoppen */}
          <div className="flex justify-between pb-8">
            {stap > 1 ? (
              <button
                onClick={naarVorige}
                disabled={bezig}
                className="px-5 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                ← Vorige
              </button>
            ) : (
              <div />
            )}

            {stap < 3 ? (
              <button
                onClick={naarVolgende}
                className="px-6 py-2.5 rounded-xl text-sm font-bold text-white shadow-sm transition-all hover:opacity-90 active:scale-95"
                style={{ background: 'linear-gradient(to right, #004d64, #006684)' }}
              >
                Volgende →
              </button>
            ) : (
              <button
                onClick={() => handleSubmit(false)}
                disabled={bezig}
                className="px-6 py-2.5 rounded-xl text-sm font-bold text-white shadow-sm transition-all hover:opacity-90 active:scale-95 disabled:opacity-50"
                style={{ background: 'linear-gradient(to right, #004d64, #006684)' }}
              >
                {bezig ? 'Opslaan...' : 'Locatie aanmaken'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
