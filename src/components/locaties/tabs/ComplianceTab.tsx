'use client'

import { useState, useEffect } from 'react'
import { locatieBijwerken } from '@/app/actions/locaties'
import type { LocatieMetRelaties } from '../LocatieDetail'
import type { InspectieOordeel, CaoType } from '@/types/locaties'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  locatie: LocatieMetRelaties
}

// ─── Helpers / constanten ─────────────────────────────────────────────────────

const OORDEEL_CONFIG: Record<InspectieOordeel, { label: string; bg: string; text: string }> = {
  goed:        { label: 'Goed',        bg: 'bg-[#8df4ed]/40', text: 'text-[#006a66]' },
  voldoende:   { label: 'Voldoende',   bg: 'bg-amber-50',     text: 'text-amber-700' },
  onvoldoende: { label: 'Onvoldoende', bg: 'bg-red-50',       text: 'text-red-700'   },
}

const CAO_LABELS: Record<CaoType, string> = {
  kinderopvang: 'Kinderopvang',
  sociaal_werk: 'Sociaal Werk',
  overig:       'Overig',
}

function dagenTotVergunning(vergunning_geldig_tot: string | null): number | null {
  if (!vergunning_geldig_tot) return null
  const nu = new Date()
  const geldig = new Date(vergunning_geldig_tot)
  return Math.floor((geldig.getTime() - nu.getTime()) / (1000 * 60 * 60 * 24))
}

function formatDatum(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ComplianceTab({ locatie }: Props) {
  const [bewerkModus, setBewerkModus] = useState(false)
  const [bezig, setBezig]             = useState(false)
  const [toast, setToast]             = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [fouten, setFouten]           = useState<Record<string, string>>({})

  const [lrkNummer, setLrk]           = useState(locatie.lrk_nummer ?? '')
  const [gekopieerd, setGekopieerd]   = useState(false)
  const [ggdRegio, setGgd]            = useState(locatie.ggd_regio ?? '')
  const [inspDatum, setInspDatum]     = useState(locatie.laatste_inspectie_datum ?? '')
  const [oordeel, setOordeel]         = useState<InspectieOordeel | ''>(locatie.inspectie_oordeel ?? '')
  const [volgendeInsp, setVolgInsp]   = useState(locatie.volgende_inspectie_datum ?? '')
  const [vergunning, setVergunning]   = useState(locatie.vergunning_geldig_tot ?? '')
  const [cao, setCao]                 = useState<CaoType | ''>(locatie.cao ?? '')

  const dagenResterend = dagenTotVergunning(vergunning || locatie.vergunning_geldig_tot)
  const toonWaarschuwing = dagenResterend !== null && dagenResterend < 60

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3500)
    return () => clearTimeout(t)
  }, [toast])

  function annuleer() {
    setLrk(locatie.lrk_nummer ?? '')
    setGgd(locatie.ggd_regio ?? '')
    setInspDatum(locatie.laatste_inspectie_datum ?? '')
    setOordeel(locatie.inspectie_oordeel ?? '')
    setVolgInsp(locatie.volgende_inspectie_datum ?? '')
    setVergunning(locatie.vergunning_geldig_tot ?? '')
    setCao(locatie.cao ?? '')
    setBewerkModus(false)
    setFouten({})
  }

  async function slaOp() {
    const f: Record<string, string> = {}
    if (lrkNummer && !/^\d{12}$/.test(lrkNummer))
      f.lrkNummer = 'LRK-nummer moet exact 12 cijfers bevatten'
    if (Object.keys(f).length > 0) { setFouten(f); return }

    setBezig(true)
    const fd = new FormData()
    // Alle locatievelden doorgeven
    fd.append('naam', locatie.naam)
    fd.append('type', locatie.type ?? '')
    fd.append('status', locatie.status)
    fd.append('adres', locatie.adres)
    fd.append('huisnummer', locatie.huisnummer)
    fd.append('postcode', locatie.postcode)
    fd.append('plaats', locatie.plaats)
    fd.append('land', locatie.land)
    fd.append('telefoon', locatie.telefoon)
    fd.append('email', locatie.email)
    if (locatie.website) fd.append('website', locatie.website)
    if (locatie.buitenspeelruimte) fd.append('buitenspeelruimte', 'on')
    if (locatie.buitenspeelruimte_m2) fd.append('buitenspeelruimte_m2', String(locatie.buitenspeelruimte_m2))
    if (locatie.heeft_keuken) fd.append('heeft_keuken', 'on')
    if (locatie.rolstoeltoegankelijk) fd.append('rolstoeltoegankelijk', 'on')
    if (locatie.parkeerplaatsen) fd.append('parkeerplaatsen', String(locatie.parkeerplaatsen))
    if (locatie.notities) fd.append('notities', locatie.notities)
    if (locatie.locatiemanager_id) fd.append('locatiemanager_id', locatie.locatiemanager_id)
    if (locatie.plaatsvervangend_manager_id) fd.append('plaatsvervangend_manager_id', locatie.plaatsvervangend_manager_id)
    if (locatie.noodcontact_naam) fd.append('noodcontact_naam', locatie.noodcontact_naam)
    if (locatie.noodcontact_telefoon) fd.append('noodcontact_telefoon', locatie.noodcontact_telefoon)
    if (locatie.iban) fd.append('iban', locatie.iban)
    if (locatie.kvk_nummer) fd.append('kvk_nummer', locatie.kvk_nummer)
    // Compliance velden
    if (lrkNummer) fd.append('lrk_nummer', lrkNummer)
    if (ggdRegio) fd.append('ggd_regio', ggdRegio)
    if (inspDatum) fd.append('laatste_inspectie_datum', inspDatum)
    if (oordeel) fd.append('inspectie_oordeel', oordeel)
    if (volgendeInsp) fd.append('volgende_inspectie_datum', volgendeInsp)
    if (vergunning) fd.append('vergunning_geldig_tot', vergunning)
    if (cao) fd.append('cao', cao)

    const res = await locatieBijwerken(locatie.id, fd)
    setBezig(false)
    if (res.error) {
      setToast({ type: 'error', message: res.error })
    } else {
      setToast({ type: 'success', message: 'Compliance opgeslagen ✓' })
      setBewerkModus(false)
      setFouten({})
    }
  }

  async function kopieerLrk() {
    await navigator.clipboard.writeText(lrkNummer)
    setGekopieerd(true)
    setTimeout(() => setGekopieerd(false), 2000)
  }

  const inputKlasse = (fout?: string) =>
    `w-full border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#006684]/30 ${fout ? 'border-red-300 bg-red-50' : 'border-slate-200'}`

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Vergunningswaarschuwing */}
      {toonWaarschuwing && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 flex items-start gap-3">
          <span className="material-symbols-outlined text-amber-500 mt-0.5">warning</span>
          <div>
            <p className="text-sm font-bold text-amber-700">Vergunning verloopt binnenkort</p>
            <p className="text-sm text-amber-600 mt-0.5">
              Vergunning verloopt over <strong>{dagenResterend}</strong> dag{dagenResterend !== 1 ? 'en' : ''} — vergeet niet tijdig te verlengen.
            </p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <div className="flex items-center justify-between mb-5">
          <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Compliance gegevens</h4>
          {bewerkModus ? (
            <div className="flex gap-2">
              <button
                onClick={slaOp}
                disabled={bezig}
                className="text-xs font-bold text-white bg-[#006a66] px-3 py-1 rounded-lg hover:bg-[#005a57] disabled:opacity-50"
              >
                {bezig ? 'Opslaan...' : 'Opslaan'}
              </button>
              <button onClick={annuleer} className="text-xs font-semibold text-slate-400 hover:text-slate-600 px-3 py-1">
                Annuleren
              </button>
            </div>
          ) : (
            <button
              onClick={() => setBewerkModus(true)}
              className="text-xs font-semibold text-[#006684] hover:text-[#004d64] flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-sm">edit</span>
              Bewerken
            </button>
          )}
        </div>

        {bewerkModus ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1">LRK-nummer (12 cijfers)</label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={12}
                value={lrkNummer}
                onChange={e => setLrk(e.target.value.replace(/\D/g, ''))}
                onBlur={() => lrkNummer && !/^\d{12}$/.test(lrkNummer) && setFouten(f => ({ ...f, lrkNummer: 'LRK-nummer moet exact 12 cijfers bevatten' }))}
                className={inputKlasse(fouten.lrkNummer)}
                placeholder="123456789012"
              />
              {fouten.lrkNummer && <p className="text-xs text-red-600 mt-1">{fouten.lrkNummer}</p>}
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1">GGD-regio</label>
              <input type="text" value={ggdRegio} onChange={e => setGgd(e.target.value)} className={inputKlasse()} placeholder="Bijv. GGD Amsterdam" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1">Laatste inspectie</label>
                <input type="date" value={inspDatum} onChange={e => setInspDatum(e.target.value)} className={inputKlasse()} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1">Oordeel</label>
                <select value={oordeel} onChange={e => setOordeel(e.target.value as InspectieOordeel)} className={`${inputKlasse()} bg-white`}>
                  <option value="">— Geen oordeel —</option>
                  <option value="goed">Goed</option>
                  <option value="voldoende">Voldoende</option>
                  <option value="onvoldoende">Onvoldoende</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1">Volgende inspectie</label>
              <input type="date" value={volgendeInsp} onChange={e => setVolgInsp(e.target.value)} className={inputKlasse()} />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1">Vergunning geldig tot</label>
              <input type="date" value={vergunning} onChange={e => setVergunning(e.target.value)} className={inputKlasse()} />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1">CAO</label>
              <select value={cao} onChange={e => setCao(e.target.value as CaoType)} className={`${inputKlasse()} bg-white`}>
                <option value="">— Geen CAO —</option>
                {(Object.entries(CAO_LABELS) as [CaoType, string][]).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
          </div>
        ) : (
          <dl className="space-y-3 text-sm">
            <div className="flex gap-4">
              <dt className="w-40 shrink-0 text-slate-400 font-medium">LRK-nummer</dt>
              <dd className="flex items-center gap-2">
                {locatie.lrk_nummer ? (
                  <>
                    <span className="font-mono font-semibold text-slate-700">{locatie.lrk_nummer}</span>
                    <button
                      onClick={kopieerLrk}
                      className="text-slate-400 hover:text-[#006684]"
                      title="Kopiëren"
                    >
                      <span className="material-symbols-outlined text-sm">
                        {gekopieerd ? 'check' : 'content_copy'}
                      </span>
                    </button>
                  </>
                ) : '—'}
              </dd>
            </div>
            <div className="flex gap-4">
              <dt className="w-40 shrink-0 text-slate-400 font-medium">GGD-regio</dt>
              <dd className="text-slate-700">{locatie.ggd_regio ?? '—'}</dd>
            </div>
            <div className="flex gap-4">
              <dt className="w-40 shrink-0 text-slate-400 font-medium">Laatste inspectie</dt>
              <dd className="flex items-center gap-2">
                <span className="text-slate-700">{formatDatum(locatie.laatste_inspectie_datum)}</span>
                {locatie.inspectie_oordeel && (
                  <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${OORDEEL_CONFIG[locatie.inspectie_oordeel].bg} ${OORDEEL_CONFIG[locatie.inspectie_oordeel].text}`}>
                    {OORDEEL_CONFIG[locatie.inspectie_oordeel].label}
                  </span>
                )}
              </dd>
            </div>
            <div className="flex gap-4">
              <dt className="w-40 shrink-0 text-slate-400 font-medium">Volgende inspectie</dt>
              <dd className="text-slate-700">{formatDatum(locatie.volgende_inspectie_datum)}</dd>
            </div>
            <div className="flex gap-4">
              <dt className="w-40 shrink-0 text-slate-400 font-medium">Vergunning geldig tot</dt>
              <dd className="flex items-center gap-2">
                <span className="text-slate-700">{formatDatum(locatie.vergunning_geldig_tot)}</span>
                {toonWaarschuwing && (
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">
                    Nog {dagenResterend} dag{dagenResterend !== 1 ? 'en' : ''}
                  </span>
                )}
              </dd>
            </div>
            <div className="flex gap-4">
              <dt className="w-40 shrink-0 text-slate-400 font-medium">CAO</dt>
              <dd className="text-slate-700">{locatie.cao ? CAO_LABELS[locatie.cao] : '—'}</dd>
            </div>
          </dl>
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
