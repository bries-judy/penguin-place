'use client'

import { useState, useEffect, useRef } from 'react'
import { locatieBijwerken, zoekGebruikers } from '@/app/actions/locaties'
import type { LocatieMetRelaties } from '../LocatieDetail'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  locatie: LocatieMetRelaties
}

interface GebruikerResultaat {
  id: string
  naam: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function managerNaam(profiel: { naam: string } | null | undefined): string {
  if (!profiel) return '—'
  return profiel.naam || '—'
}

// ─── UserPicker sub-component ────────────────────────────────────────────────

function UserPicker({
  label,
  selectedId,
  selectedNaam,
  onSelect,
}: {
  label: string
  selectedId: string | null
  selectedNaam: string
  onSelect: (id: string | null, naam: string) => void
}) {
  const [zoek, setZoek]               = useState('')
  const [resultaten, setResultaten]   = useState<GebruikerResultaat[]>([])
  const [toonLijst, setToonLijst]     = useState(false)
  const [zoekBezig, setZoekBezig]     = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!zoek.trim()) { setResultaten([]); return }
    debounceRef.current = setTimeout(async () => {
      setZoekBezig(true)
      const res = await zoekGebruikers(zoek)
      setResultaten(res)
      setZoekBezig(false)
    }, 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [zoek])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setToonLijst(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function kies(g: GebruikerResultaat) {
    onSelect(g.id, g.naam)
    setZoek('')
    setResultaten([])
    setToonLijst(false)
  }

  function wis() {
    onSelect(null, '')
    setZoek('')
  }

  return (
    <div ref={containerRef} className="relative">
      <label className="block text-sm font-semibold text-slate-600 mb-1">{label}</label>
      {selectedId ? (
        <div className="flex items-center justify-between border border-slate-200 rounded-xl px-4 py-2.5">
          <span className="text-sm text-slate-700 font-semibold">{selectedNaam}</span>
          <button onClick={wis} className="text-slate-400 hover:text-slate-600">
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>
      ) : (
        <div>
          <input
            type="text"
            value={zoek}
            onChange={e => { setZoek(e.target.value); setToonLijst(true) }}
            onFocus={() => setToonLijst(true)}
            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#006684]/30"
            placeholder="Zoek op naam..."
          />
          {toonLijst && (zoek.trim() || resultaten.length > 0) && (
            <div className="absolute z-20 top-full mt-1 left-0 right-0 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
              {zoekBezig ? (
                <div className="px-4 py-3 text-sm text-slate-400">Zoeken...</div>
              ) : resultaten.length > 0 ? (
                resultaten.map(g => (
                  <button
                    key={g.id}
                    onClick={() => kies(g)}
                    className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                  >
                    <div className="w-7 h-7 rounded-full bg-[#bee9ff]/60 flex items-center justify-center text-[#004d64] font-bold text-xs shrink-0">
                      {g.naam[0]?.toUpperCase()}
                    </div>
                    {g.naam}
                  </button>
                ))
              ) : zoek.trim() ? (
                <div className="px-4 py-3 text-sm text-slate-400">Geen resultaten voor &ldquo;{zoek}&rdquo;</div>
              ) : null}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function PersoneelTab({ locatie }: Props) {
  const [bewerkModus, setBewerkModus] = useState(false)
  const [bezig, setBezig]             = useState(false)
  const [toast, setToast]             = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const [managerId, setManagerId]         = useState<string | null>(locatie.locatiemanager_id)
  const [managerNaamStr, setManagerNaam]  = useState(managerNaam(locatie.locatiemanager?.profiles))
  const [plaatsId, setPlaatsId]           = useState<string | null>(locatie.plaatsvervangend_manager_id)
  const [plaatsNaamStr, setPlaatsNaam]    = useState(managerNaam(locatie.plaatsvervangend_manager?.profiles))
  const [noodNaam, setNoodNaam]           = useState(locatie.noodcontact_naam ?? '')
  const [noodTel, setNoodTel]             = useState(locatie.noodcontact_telefoon ?? '')

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3500)
    return () => clearTimeout(t)
  }, [toast])

  function annuleer() {
    setManagerId(locatie.locatiemanager_id)
    setManagerNaam(managerNaam(locatie.locatiemanager?.profiles))
    setPlaatsId(locatie.plaatsvervangend_manager_id)
    setPlaatsNaam(managerNaam(locatie.plaatsvervangend_manager?.profiles))
    setNoodNaam(locatie.noodcontact_naam ?? '')
    setNoodTel(locatie.noodcontact_telefoon ?? '')
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
    if (locatie.iban) fd.append('iban', locatie.iban)
    if (locatie.kvk_nummer) fd.append('kvk_nummer', locatie.kvk_nummer)
    // Personeel velden
    if (managerId) fd.append('locatiemanager_id', managerId)
    if (plaatsId) fd.append('plaatsvervangend_manager_id', plaatsId)
    if (noodNaam) fd.append('noodcontact_naam', noodNaam)
    if (noodTel) fd.append('noodcontact_telefoon', noodTel)

    const res = await locatieBijwerken(locatie.id, fd)
    setBezig(false)
    if (res.error) {
      setToast({ type: 'error', message: res.error })
    } else {
      setToast({ type: 'success', message: 'Personeel opgeslagen ✓' })
      setBewerkModus(false)
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <div className="flex items-center justify-between mb-5">
          <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Personeel & Beheer</h4>
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
          <div className="space-y-5">
            <UserPicker
              label="Locatiemanager"
              selectedId={managerId}
              selectedNaam={managerNaamStr}
              onSelect={(id, naam) => { setManagerId(id); setManagerNaam(naam) }}
            />
            <UserPicker
              label="Plaatsvervangend manager"
              selectedId={plaatsId}
              selectedNaam={plaatsNaamStr}
              onSelect={(id, naam) => { setPlaatsId(id); setPlaatsNaam(naam) }}
            />
            <div>
              <h5 className="text-sm font-bold text-slate-500 mb-3 mt-2">Noodcontact</h5>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-semibold text-slate-600 mb-1">Naam</label>
                  <input
                    type="text"
                    value={noodNaam}
                    onChange={e => setNoodNaam(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#006684]/30"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-600 mb-1">Telefoonnummer</label>
                  <input
                    type="tel"
                    value={noodTel}
                    onChange={e => setNoodTel(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#006684]/30"
                  />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <dl className="space-y-3 text-sm">
            <div className="flex gap-4">
              <dt className="w-44 shrink-0 text-slate-400 font-medium">Locatiemanager</dt>
              <dd className="text-slate-700">
                {locatie.locatiemanager
                  ? managerNaam(locatie.locatiemanager.profiles)
                  : '—'}
              </dd>
            </div>
            <div className="flex gap-4">
              <dt className="w-44 shrink-0 text-slate-400 font-medium">Plaatsvervanger</dt>
              <dd className="text-slate-700">
                {locatie.plaatsvervangend_manager
                  ? managerNaam(locatie.plaatsvervangend_manager.profiles)
                  : '—'}
              </dd>
            </div>
            <div className="pt-2 border-t border-slate-50">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Noodcontact</p>
              <div className="space-y-2">
                <div className="flex gap-4">
                  <dt className="w-44 shrink-0 text-slate-400 font-medium">Naam</dt>
                  <dd className="text-slate-700">{locatie.noodcontact_naam ?? '—'}</dd>
                </div>
                <div className="flex gap-4">
                  <dt className="w-44 shrink-0 text-slate-400 font-medium">Telefoon</dt>
                  <dd>
                    {locatie.noodcontact_telefoon
                      ? <a href={`tel:${locatie.noodcontact_telefoon}`} className="text-[#006684] hover:underline">{locatie.noodcontact_telefoon}</a>
                      : '—'}
                  </dd>
                </div>
              </div>
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
