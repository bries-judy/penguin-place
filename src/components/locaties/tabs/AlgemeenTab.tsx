'use client'

import { useState, useEffect } from 'react'
import { locatieBijwerken } from '@/app/actions/locaties'
import type { LocatieMetRelaties } from '../LocatieDetail'
import type { LocatieType, LocatieStatus, CaoType } from '@/types/locaties'
import { LOCATIE_TYPE_LABELS } from '@/types/locaties'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  locatie: LocatieMetRelaties
}

type Sectie = 'basisgegevens' | 'adres' | 'contact' | 'faciliteiten' | 'notities'

// ─── Helpers / constanten ─────────────────────────────────────────────────────

function postcodeGeldig(v: string) { return /^\d{4}\s?[A-Z]{2}$/i.test(v) }
function emailGeldig(v: string) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) }

// ─── Component ────────────────────────────────────────────────────────────────

export default function AlgemeenTab({ locatie }: Props) {
  const [bewerkSectie, setBewerkSectie] = useState<Sectie | null>(null)
  const [bezig, setBezig]               = useState(false)
  const [toast, setToast]               = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [isDirty, setIsDirty]           = useState(false)

  // Basisgegevens
  const [naam, setNaam]     = useState(locatie.naam)
  const [type, setType]     = useState<LocatieType | ''>(locatie.type ?? '')
  const [status, setStatus] = useState<LocatieStatus>(locatie.status)

  // Adres
  const [adres, setAdres]       = useState(locatie.adres)
  const [huisnummer, setHuis]   = useState(locatie.huisnummer)
  const [postcode, setPostcode] = useState(locatie.postcode)
  const [plaats, setPlaats]     = useState(locatie.plaats)
  const [land, setLand]         = useState(locatie.land)

  // Contact
  const [telefoon, setTelefoon] = useState(locatie.telefoon)
  const [email, setEmail]       = useState(locatie.email)
  const [website, setWebsite]   = useState(locatie.website ?? '')

  // Faciliteiten
  const [buitenspeelruimte, setBuiten]   = useState(locatie.buitenspeelruimte)
  const [buitenM2, setBuitenM2]           = useState(String(locatie.buitenspeelruimte_m2 ?? ''))
  const [heeftKeuken, setKeuken]          = useState(locatie.heeft_keuken)
  const [rolstoel, setRolstoel]           = useState(locatie.rolstoeltoegankelijk)
  const [parkeerplaatsen, setParkeer]     = useState(String(locatie.parkeerplaatsen ?? ''))

  // Notities
  const [notities, setNotities] = useState(locatie.notities ?? '')

  // Validatiefouten per sectie
  const [fouten, setFouten] = useState<Record<string, string>>({})

  // Unsaved changes
  useEffect(() => {
    if (!isDirty) return
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault() }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isDirty])

  // Toast auto-dismiss
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3500)
    return () => clearTimeout(t)
  }, [toast])

  function annuleer(sectie: Sectie) {
    // Reset naar originele waarden
    if (sectie === 'basisgegevens') { setNaam(locatie.naam); setType(locatie.type ?? ''); setStatus(locatie.status) }
    if (sectie === 'adres') { setAdres(locatie.adres); setHuis(locatie.huisnummer); setPostcode(locatie.postcode); setPlaats(locatie.plaats); setLand(locatie.land) }
    if (sectie === 'contact') { setTelefoon(locatie.telefoon); setEmail(locatie.email); setWebsite(locatie.website ?? '') }
    if (sectie === 'faciliteiten') { setBuiten(locatie.buitenspeelruimte); setBuitenM2(String(locatie.buitenspeelruimte_m2 ?? '')); setKeuken(locatie.heeft_keuken); setRolstoel(locatie.rolstoeltoegankelijk); setParkeer(String(locatie.parkeerplaatsen ?? '')) }
    if (sectie === 'notities') { setNotities(locatie.notities ?? '') }
    setBewerkSectie(null)
    setFouten({})
    setIsDirty(false)
  }

  async function slaOp(sectie: Sectie) {
    // Valideer sectie
    const f: Record<string, string> = {}
    if (sectie === 'adres' && postcode && !postcodeGeldig(postcode))
      f.postcode = 'Postcode moet het formaat 1234 AB hebben'
    if (sectie === 'contact' && email && !emailGeldig(email))
      f.email = 'Vul een geldig e-mailadres in'
    if (Object.keys(f).length > 0) { setFouten(f); return }

    setBezig(true)
    const fd = new FormData()
    // Vul altijd alle verplichte velden in
    fd.append('naam', naam)
    fd.append('type', type)
    fd.append('status', status)
    fd.append('adres', adres)
    fd.append('huisnummer', huisnummer)
    fd.append('postcode', postcode)
    fd.append('plaats', plaats)
    fd.append('land', land)
    fd.append('telefoon', telefoon)
    fd.append('email', email)
    if (website) fd.append('website', website)
    if (buitenspeelruimte) fd.append('buitenspeelruimte', 'on')
    if (buitenM2) fd.append('buitenspeelruimte_m2', buitenM2)
    if (heeftKeuken) fd.append('heeft_keuken', 'on')
    if (rolstoel) fd.append('rolstoeltoegankelijk', 'on')
    if (parkeerplaatsen) fd.append('parkeerplaatsen', parkeerplaatsen)
    if (notities) fd.append('notities', notities)
    // Compliance velden doorgeven (niet gewijzigd door deze tab)
    if (locatie.lrk_nummer) fd.append('lrk_nummer', locatie.lrk_nummer)
    if (locatie.ggd_regio) fd.append('ggd_regio', locatie.ggd_regio)
    if (locatie.cao) fd.append('cao', locatie.cao)
    if (locatie.laatste_inspectie_datum) fd.append('laatste_inspectie_datum', locatie.laatste_inspectie_datum)
    if (locatie.inspectie_oordeel) fd.append('inspectie_oordeel', locatie.inspectie_oordeel)
    if (locatie.volgende_inspectie_datum) fd.append('volgende_inspectie_datum', locatie.volgende_inspectie_datum)
    if (locatie.vergunning_geldig_tot) fd.append('vergunning_geldig_tot', locatie.vergunning_geldig_tot)
    if (locatie.locatiemanager_id) fd.append('locatiemanager_id', locatie.locatiemanager_id)
    if (locatie.plaatsvervangend_manager_id) fd.append('plaatsvervangend_manager_id', locatie.plaatsvervangend_manager_id)
    if (locatie.noodcontact_naam) fd.append('noodcontact_naam', locatie.noodcontact_naam)
    if (locatie.noodcontact_telefoon) fd.append('noodcontact_telefoon', locatie.noodcontact_telefoon)
    if (locatie.iban) fd.append('iban', locatie.iban)
    if (locatie.kvk_nummer) fd.append('kvk_nummer', locatie.kvk_nummer)

    const res = await locatieBijwerken(locatie.id, fd)
    setBezig(false)

    if (res.error) {
      setToast({ type: 'error', message: res.error })
    } else {
      setToast({ type: 'success', message: 'Locatie opgeslagen ✓' })
      setBewerkSectie(null)
      setIsDirty(false)
      setFouten({})
    }
  }

  const isBewerken = (s: Sectie) => bewerkSectie === s

  const inputKlasse = (fout?: string) =>
    `w-full border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#006684]/30 ${fout ? 'border-red-300 bg-red-50' : 'border-slate-200'}`

  const sectionHeader = (titel: string, sectie: Sectie) => (
    <div className="flex items-center justify-between mb-4">
      <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider">{titel}</h4>
      {isBewerken(sectie) ? (
        <div className="flex gap-2">
          <button
            onClick={() => slaOp(sectie)}
            disabled={bezig}
            className="text-xs font-bold text-white bg-[#006a66] px-3 py-1 rounded-lg hover:bg-[#005a57] disabled:opacity-50"
          >
            {bezig ? 'Opslaan...' : 'Opslaan'}
          </button>
          <button onClick={() => annuleer(sectie)} className="text-xs font-semibold text-slate-400 hover:text-slate-600 px-3 py-1">
            Annuleren
          </button>
        </div>
      ) : (
        <button
          onClick={() => { setBewerkSectie(sectie); setIsDirty(true) }}
          className="text-xs font-semibold text-[#006684] hover:text-[#004d64] flex items-center gap-1"
        >
          <span className="material-symbols-outlined text-sm">edit</span>
          Bewerken
        </button>
      )}
    </div>
  )

  return (
    <div className="space-y-6 max-w-2xl">
      {/* ── Basisgegevens ─── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        {sectionHeader('Basisgegevens', 'basisgegevens')}
        {isBewerken('basisgegevens') ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1">Naam</label>
              <input type="text" value={naam} onChange={e => setNaam(e.target.value)} className={inputKlasse()} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1">Type</label>
              <select
                value={type}
                onChange={e => setType(e.target.value as LocatieType)}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#006684]/30 bg-white"
              >
                <option value="">— Geen type —</option>
                {(Object.entries(LOCATIE_TYPE_LABELS) as [LocatieType, string][]).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1">Status</label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as LocatieStatus)}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#006684]/30 bg-white"
              >
                <option value="actief">Actief</option>
                <option value="inactief">Inactief</option>
                <option value="in_opbouw">In opbouw</option>
              </select>
            </div>
          </div>
        ) : (
          <dl className="space-y-3 text-sm">
            <div className="flex gap-4">
              <dt className="w-32 shrink-0 text-slate-400 font-medium">Naam</dt>
              <dd className="text-slate-700 font-semibold">{locatie.naam}</dd>
            </div>
            <div className="flex gap-4">
              <dt className="w-32 shrink-0 text-slate-400 font-medium">Code</dt>
              <dd>
                {locatie.code ? (
                  <span className="font-mono font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded text-xs">
                    {locatie.code}
                  </span>
                ) : '—'}
              </dd>
            </div>
            <div className="flex gap-4">
              <dt className="w-32 shrink-0 text-slate-400 font-medium">Type</dt>
              <dd className="text-slate-700">{locatie.type ? LOCATIE_TYPE_LABELS[locatie.type] : '—'}</dd>
            </div>
            <div className="flex gap-4">
              <dt className="w-32 shrink-0 text-slate-400 font-medium">Status</dt>
              <dd className="text-slate-700 capitalize">{locatie.status.replace('_', ' ')}</dd>
            </div>
          </dl>
        )}
      </div>

      {/* ── Adres ─── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        {sectionHeader('Adres', 'adres')}
        {isBewerken('adres') ? (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="block text-sm font-semibold text-slate-600 mb-1">Straat</label>
                <input type="text" value={adres} onChange={e => setAdres(e.target.value)} className={inputKlasse()} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1">Huisnummer</label>
                <input type="text" value={huisnummer} onChange={e => setHuis(e.target.value)} className={inputKlasse()} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1">Postcode</label>
                <input type="text" value={postcode} onChange={e => setPostcode(e.target.value)} className={inputKlasse(fouten.postcode)} />
                {fouten.postcode && <p className="text-xs text-red-600 mt-1">{fouten.postcode}</p>}
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1">Plaats</label>
                <input type="text" value={plaats} onChange={e => setPlaats(e.target.value)} className={inputKlasse()} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1">Land</label>
              <input type="text" value={land} onChange={e => setLand(e.target.value)} className={inputKlasse()} />
            </div>
          </div>
        ) : (
          <dl className="space-y-3 text-sm">
            <div className="flex gap-4">
              <dt className="w-32 shrink-0 text-slate-400 font-medium">Adres</dt>
              <dd className="text-slate-700">{[locatie.adres, locatie.huisnummer].filter(Boolean).join(' ') || '—'}</dd>
            </div>
            <div className="flex gap-4">
              <dt className="w-32 shrink-0 text-slate-400 font-medium">Postcode</dt>
              <dd className="text-slate-700">{locatie.postcode || '—'}</dd>
            </div>
            <div className="flex gap-4">
              <dt className="w-32 shrink-0 text-slate-400 font-medium">Plaats</dt>
              <dd className="text-slate-700">{locatie.plaats || '—'}</dd>
            </div>
            <div className="flex gap-4">
              <dt className="w-32 shrink-0 text-slate-400 font-medium">Land</dt>
              <dd className="text-slate-700">{locatie.land}</dd>
            </div>
          </dl>
        )}
      </div>

      {/* ── Contact ─── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        {sectionHeader('Contact', 'contact')}
        {isBewerken('contact') ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1">Telefoon</label>
              <input type="tel" value={telefoon} onChange={e => setTelefoon(e.target.value)} className={inputKlasse()} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1">E-mail</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onBlur={() => email && !emailGeldig(email) && setFouten(f => ({ ...f, email: 'Vul een geldig e-mailadres in' }))}
                className={inputKlasse(fouten.email)}
              />
              {fouten.email && <p className="text-xs text-red-600 mt-1">{fouten.email}</p>}
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1">Website</label>
              <input type="url" value={website} onChange={e => setWebsite(e.target.value)} className={inputKlasse()} placeholder="https://" />
            </div>
          </div>
        ) : (
          <dl className="space-y-3 text-sm">
            <div className="flex gap-4">
              <dt className="w-32 shrink-0 text-slate-400 font-medium">Telefoon</dt>
              <dd>
                {locatie.telefoon
                  ? <a href={`tel:${locatie.telefoon}`} className="text-[#006684] hover:underline">{locatie.telefoon}</a>
                  : '—'}
              </dd>
            </div>
            <div className="flex gap-4">
              <dt className="w-32 shrink-0 text-slate-400 font-medium">E-mail</dt>
              <dd>
                {locatie.email
                  ? <a href={`mailto:${locatie.email}`} className="text-[#006684] hover:underline">{locatie.email}</a>
                  : '—'}
              </dd>
            </div>
            <div className="flex gap-4">
              <dt className="w-32 shrink-0 text-slate-400 font-medium">Website</dt>
              <dd>
                {locatie.website
                  ? <a href={locatie.website} target="_blank" rel="noopener noreferrer" className="text-[#006684] hover:underline">{locatie.website}</a>
                  : '—'}
              </dd>
            </div>
          </dl>
        )}
      </div>

      {/* ── Faciliteiten ─── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        {sectionHeader('Faciliteiten', 'faciliteiten')}
        {isBewerken('faciliteiten') ? (
          <div className="space-y-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={buitenspeelruimte} onChange={e => setBuiten(e.target.checked)} className="w-4 h-4 accent-[#006a66]" />
              <span className="text-sm font-semibold text-slate-600">Buitenspeelruimte</span>
            </label>
            {buitenspeelruimte && (
              <div className="ml-7">
                <label className="block text-sm font-semibold text-slate-600 mb-1">Oppervlakte (m²)</label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={buitenM2}
                  onChange={e => setBuitenM2(e.target.value)}
                  className="w-32 border border-slate-200 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-[#006684]/30"
                />
              </div>
            )}
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={heeftKeuken} onChange={e => setKeuken(e.target.checked)} className="w-4 h-4 accent-[#006a66]" />
              <span className="text-sm font-semibold text-slate-600">Keuken aanwezig</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={rolstoel} onChange={e => setRolstoel(e.target.checked)} className="w-4 h-4 accent-[#006a66]" />
              <span className="text-sm font-semibold text-slate-600">Rolstoeltoegankelijk</span>
            </label>
            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1">Parkeerplaatsen</label>
              <input
                type="number"
                min="0"
                value={parkeerplaatsen}
                onChange={e => setParkeer(e.target.value)}
                className="w-32 border border-slate-200 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-[#006684]/30"
              />
            </div>
          </div>
        ) : (
          <dl className="space-y-3 text-sm">
            <div className="flex gap-4">
              <dt className="w-32 shrink-0 text-slate-400 font-medium">Buitenspeelruimte</dt>
              <dd className="text-slate-700">
                {locatie.buitenspeelruimte
                  ? `Ja${locatie.buitenspeelruimte_m2 ? ` (${locatie.buitenspeelruimte_m2} m²)` : ''}`
                  : 'Nee'}
              </dd>
            </div>
            <div className="flex gap-4">
              <dt className="w-32 shrink-0 text-slate-400 font-medium">Keuken</dt>
              <dd className="text-slate-700">{locatie.heeft_keuken ? 'Ja' : 'Nee'}</dd>
            </div>
            <div className="flex gap-4">
              <dt className="w-32 shrink-0 text-slate-400 font-medium">Rolstoeltoegankelijk</dt>
              <dd className="text-slate-700">{locatie.rolstoeltoegankelijk ? 'Ja' : 'Nee'}</dd>
            </div>
            <div className="flex gap-4">
              <dt className="w-32 shrink-0 text-slate-400 font-medium">Parkeerplaatsen</dt>
              <dd className="text-slate-700">{locatie.parkeerplaatsen ?? '—'}</dd>
            </div>
          </dl>
        )}
      </div>

      {/* ── Notities ─── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        {sectionHeader('Notities', 'notities')}
        {isBewerken('notities') ? (
          <textarea
            value={notities}
            onChange={e => setNotities(e.target.value)}
            rows={4}
            className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#006684]/30 resize-none"
            placeholder="Interne notities over deze locatie..."
          />
        ) : (
          <p className="text-sm text-slate-600 whitespace-pre-wrap">
            {locatie.notities || <span className="text-slate-300 italic">Geen notities</span>}
          </p>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl shadow-lg text-sm font-semibold flex items-center gap-2 ${
          toast.type === 'success' ? 'bg-[#8df4ed]/90 text-[#006a66]' : 'bg-red-50 border border-red-200 text-red-700'
        }`}>
          <span className="material-symbols-outlined text-sm">
            {toast.type === 'success' ? 'check_circle' : 'error'}
          </span>
          {toast.message}
        </div>
      )}
    </div>
  )
}
