'use client'

import { useState, useEffect } from 'react'
import { locatieBijwerken } from '@/app/actions/locaties'
import type { LocatieMetRelaties } from '../LocatieDetail'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  locatie: LocatieMetRelaties
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatIban(iban: string): string {
  return iban.replace(/\s/g, '').replace(/(.{4})/g, '$1 ').trim()
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function FacturatieTab({ locatie }: Props) {
  const [bewerkModus, setBewerkModus] = useState(false)
  const [bezig, setBezig]             = useState(false)
  const [toast, setToast]             = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const [iban, setIban]         = useState(locatie.iban ?? '')
  const [kvk, setKvk]           = useState(locatie.kvk_nummer ?? '')

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3500)
    return () => clearTimeout(t)
  }, [toast])

  function annuleer() {
    setIban(locatie.iban ?? '')
    setKvk(locatie.kvk_nummer ?? '')
    setBewerkModus(false)
  }

  async function slaOp() {
    setBezig(true)
    const fd = new FormData()
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
    // Facturatie velden
    if (iban) fd.append('iban', iban.replace(/\s/g, ''))
    if (kvk) fd.append('kvk_nummer', kvk)

    const res = await locatieBijwerken(locatie.id, fd)
    setBezig(false)
    if (res.error) {
      setToast({ type: 'error', message: res.error })
    } else {
      setToast({ type: 'success', message: 'Facturatiegegevens opgeslagen ✓' })
      setBewerkModus(false)
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Informatieve notitie */}
      <div className="bg-[#bee9ff]/30 border border-[#bee9ff] rounded-xl px-5 py-4 flex items-start gap-3">
        <span className="material-symbols-outlined text-[#006684] mt-0.5">info</span>
        <p className="text-sm text-[#004d64]">
          Facturatie-entiteit en tariefmodel worden gekoppeld vanuit de facturatiemodule.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <div className="flex items-center justify-between mb-5">
          <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Financiële gegevens</h4>
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
              <label className="block text-sm font-semibold text-slate-600 mb-1">IBAN (optioneel)</label>
              <input
                type="text"
                value={iban}
                onChange={e => setIban(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-mono outline-none focus:ring-2 focus:ring-[#006684]/30"
                placeholder="NL00 BANK 0000 0000 00"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1">KVK-nummer (optioneel)</label>
              <input
                type="text"
                value={kvk}
                onChange={e => setKvk(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-mono outline-none focus:ring-2 focus:ring-[#006684]/30"
                placeholder="12345678"
              />
            </div>
          </div>
        ) : (
          <dl className="space-y-3 text-sm">
            <div className="flex gap-4">
              <dt className="w-32 shrink-0 text-slate-400 font-medium">IBAN</dt>
              <dd className="font-mono text-slate-700">
                {locatie.iban ? formatIban(locatie.iban) : '—'}
              </dd>
            </div>
            <div className="flex gap-4">
              <dt className="w-32 shrink-0 text-slate-400 font-medium">KVK-nummer</dt>
              <dd className="font-mono text-slate-700">{locatie.kvk_nummer ?? '—'}</dd>
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
