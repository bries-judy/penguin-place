'use client'

import { useState, useEffect, useCallback } from 'react'
import { getFeestdagen, feestdagToevoegen, feestdagVerwijderen } from '@/app/actions/dagdelen'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Feestdag {
  id: string
  datum: string
  naam: string
  locatie_id: string | null
}

interface Props {
  locatieId?: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDatum(iso: string): string {
  return new Date(iso).toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'long' })
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function FeestdagenBeheer({ locatieId }: Props) {
  const huidigJaar = new Date().getFullYear()
  const [jaar, setJaar] = useState(huidigJaar)
  const [feestdagen, setFeestdagen] = useState<Feestdag[]>([])
  const [laden, setLaden] = useState(true)

  // Formulier
  const [toonForm, setToonForm] = useState(false)
  const [datum, setDatum] = useState('')
  const [naam, setNaam] = useState('')
  const [isLocatieSpecifiek, setIsLocatieSpecifiek] = useState(false)
  const [fouten, setFouten] = useState<Record<string, string>>({})
  const [bezig, setBezig] = useState(false)

  // Verwijderen
  const [confirmVerwijderId, setConfirmVerwijderId] = useState<string | null>(null)
  const [verwijderBezig, setVerwijderBezig] = useState(false)

  // Toast
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  function toonToast(type: 'success' | 'error', message: string) { setToast({ type, message }) }
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3500)
    return () => clearTimeout(t)
  }, [toast])

  // Data laden
  const laadFeestdagen = useCallback(async () => {
    setLaden(true)
    const res = await getFeestdagen(jaar)
    if (res.data) {
      // Filter: toon org-brede (locatie_id = null) + locatie-specifieke als locatieId is meegegeven
      const gefilterd = (res.data as Feestdag[]).filter(f =>
        f.locatie_id === null || f.locatie_id === locatieId
      )
      setFeestdagen(gefilterd)
    }
    setLaden(false)
  }, [jaar, locatieId])

  useEffect(() => { laadFeestdagen() }, [laadFeestdagen])

  // Toevoegen
  function resetForm() {
    setDatum(''); setNaam(''); setIsLocatieSpecifiek(false); setFouten({})
  }

  async function handleToevoegen() {
    const f: Record<string, string> = {}
    if (!datum) f.datum = 'Datum is verplicht'
    if (!naam.trim()) f.naam = 'Naam is verplicht'
    if (Object.keys(f).length > 0) { setFouten(f); return }
    setFouten({})
    setBezig(true)

    const fd = new FormData()
    fd.append('datum', datum)
    fd.append('naam', naam.trim())
    if (isLocatieSpecifiek && locatieId) fd.append('locatie_id', locatieId)

    const res = await feestdagToevoegen(fd)
    setBezig(false)
    if (res.error) {
      toonToast('error', res.error)
    } else {
      resetForm()
      setToonForm(false)
      toonToast('success', 'Feestdag toegevoegd')
      laadFeestdagen()
    }
  }

  // Verwijderen
  async function handleVerwijderen(id: string) {
    setVerwijderBezig(true)
    const res = await feestdagVerwijderen(id)
    setVerwijderBezig(false)
    if (res.error) {
      toonToast('error', res.error)
    } else {
      setConfirmVerwijderId(null)
      toonToast('success', 'Feestdag verwijderd')
      laadFeestdagen()
    }
  }

  const inputKlasse = (fout?: string) =>
    `w-full border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#006684]/30 ${fout ? 'border-red-300 bg-red-50' : 'border-slate-200'}`

  return (
    <div className="space-y-8 max-w-2xl">
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Feestdagen</h4>
          <div className="flex items-center gap-3">
            {/* Jaarselector */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setJaar(j => j - 1)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <span className="material-symbols-outlined text-sm">chevron_left</span>
              </button>
              <span className="text-sm font-bold text-slate-600 w-12 text-center">{jaar}</span>
              <button
                onClick={() => setJaar(j => j + 1)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <span className="material-symbols-outlined text-sm">chevron_right</span>
              </button>
            </div>
            <button
              onClick={() => { setToonForm(!toonForm); resetForm() }}
              className="text-xs font-semibold text-[#006684] hover:text-[#004d64] flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-sm">{toonForm ? 'remove' : 'add'}</span>
              Toevoegen
            </button>
          </div>
        </div>

        {/* Tabel */}
        {laden ? (
          <p className="text-sm text-slate-400 py-4">Laden...</p>
        ) : feestdagen.length > 0 ? (
          <div className="overflow-x-auto mb-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left py-2 px-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Datum</th>
                  <th className="text-left py-2 px-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Naam</th>
                  <th className="text-left py-2 px-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Scope</th>
                  <th className="py-2 px-2" />
                </tr>
              </thead>
              <tbody>
                {feestdagen.map(f => (
                  <tr key={f.id} className="border-b border-slate-50 last:border-0">
                    <td className="py-2 px-2 text-slate-700">{formatDatum(f.datum)}</td>
                    <td className="py-2 px-2 font-medium text-slate-700">{f.naam}</td>
                    <td className="py-2 px-2">
                      {f.locatie_id ? (
                        <span className="text-xs font-semibold bg-[#bee9ff]/60 text-[#004d64] px-2 py-0.5 rounded-full">Locatie</span>
                      ) : (
                        <span className="text-xs font-semibold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">Organisatie</span>
                      )}
                    </td>
                    <td className="py-2 px-2 text-right">
                      {confirmVerwijderId === f.id ? (
                        <div className="flex items-center gap-2 justify-end text-xs">
                          <span className="text-slate-500">Verwijderen?</span>
                          <button
                            onClick={() => handleVerwijderen(f.id)}
                            disabled={verwijderBezig}
                            className="text-red-600 font-bold hover:text-red-800 disabled:opacity-50"
                          >
                            Ja
                          </button>
                          <span className="text-slate-300">/</span>
                          <button onClick={() => setConfirmVerwijderId(null)} className="text-slate-500 font-bold hover:text-slate-700">
                            Nee
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmVerwijderId(f.id)}
                          className="text-xs text-slate-400 hover:text-red-500"
                        >
                          <span className="material-symbols-outlined text-sm">delete</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : !toonForm && (
          <p className="text-sm text-slate-400 italic mb-4">Geen feestdagen ingesteld voor {jaar}</p>
        )}

        {/* Toevoegen formulier */}
        {toonForm && (
          <div className="border-t border-slate-100 pt-5 mt-4 space-y-4">
            <h5 className="text-sm font-bold text-slate-600">Nieuwe feestdag</h5>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1">
                  Datum <span className="text-red-400">*</span>
                </label>
                <input
                  type="date"
                  value={datum}
                  onChange={e => setDatum(e.target.value)}
                  className={inputKlasse(fouten.datum)}
                />
                {fouten.datum && <p className="text-xs text-red-600 mt-1">{fouten.datum}</p>}
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1">
                  Naam <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={naam}
                  onChange={e => setNaam(e.target.value)}
                  className={inputKlasse(fouten.naam)}
                  placeholder="Bijv. Koningsdag"
                />
                {fouten.naam && <p className="text-xs text-red-600 mt-1">{fouten.naam}</p>}
              </div>
            </div>
            {locatieId && (
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isLocatieSpecifiek}
                  onChange={e => setIsLocatieSpecifiek(e.target.checked)}
                  className="w-4 h-4 accent-[#006a66]"
                />
                <span className="text-sm text-slate-600">Alleen voor deze locatie</span>
              </label>
            )}
            <div className="flex gap-3">
              <button
                onClick={handleToevoegen}
                disabled={bezig}
                className="px-4 py-2 text-sm font-bold text-white bg-[#006a66] rounded-xl hover:bg-[#005a57] disabled:opacity-50"
              >
                {bezig ? 'Toevoegen...' : 'Toevoegen'}
              </button>
              <button
                onClick={() => { setToonForm(false); resetForm() }}
                className="px-4 py-2 text-sm font-semibold text-slate-500 hover:text-slate-700"
              >
                Annuleren
              </button>
            </div>
          </div>
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
