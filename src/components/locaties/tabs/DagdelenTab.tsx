'use client'

import { useState, useEffect, useCallback } from 'react'
import { getDagdeelConfiguraties, dagdeelConfigBijwerken } from '@/app/actions/dagdelen'
import FeestdagenBeheer from '@/components/locaties/FeestdagenBeheer'
import type { Groep } from '@/types/locaties'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  locatieId: string
  groepen: Groep[]
}

interface DagdeelRij {
  dagdeel: string
  label: string
  starttijd: string
  eindtijd: string
  uren: number | null
}

// ─── Helpers / constanten ─────────────────────────────────────────────────────

const DAGDEEL_LABELS: Record<string, string> = {
  ochtend: 'Ochtend',
  middag: 'Middag',
  hele_dag: 'Hele dag',
  na_school: 'Na school',
  voor_school: 'Voor school',
  studiedag_bso: 'Studiedag BSO',
}

const DAGDEEL_VOLGORDE = ['ochtend', 'middag', 'hele_dag', 'na_school', 'voor_school'] as const

const STANDAARD_TIJDEN: Record<string, { starttijd: string; eindtijd: string }> = {
  ochtend:     { starttijd: '07:30', eindtijd: '13:15' },
  middag:      { starttijd: '12:30', eindtijd: '18:00' },
  hele_dag:    { starttijd: '07:30', eindtijd: '18:00' },
  na_school:   { starttijd: '15:00', eindtijd: '18:00' },
  voor_school: { starttijd: '07:30', eindtijd: '08:30' },
}

function berekenUren(start: string, eind: string): string {
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = eind.split(':').map(Number)
  const uren = (eh * 60 + em - sh * 60 - sm) / 60
  return uren > 0 ? uren.toFixed(2) : '—'
}

function formatUren(uren: number | null): string {
  if (uren == null || uren <= 0) return '—'
  return uren.toFixed(2)
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function DagdelenTab({ locatieId, groepen }: Props) {
  // ── Locatie-level configuratie ───────────────────────────────────────────
  const [rijen, setRijen] = useState<DagdeelRij[]>([])
  const [bewerken, setBewerken] = useState(false)
  const [bezig, setBezig] = useState(false)
  const [laden, setLaden] = useState(true)
  const [fouten, setFouten] = useState<Record<string, string>>({})
  const [ingangsdatum, setIngangsdatum] = useState(new Date().toISOString().split('T')[0])

  // ── Groep-overrides ─────────────────────────────────────────────────────
  const [actieveGroep, setActieveGroep] = useState<string | null>(null)
  const [groepRijen, setGroepRijen] = useState<DagdeelRij[]>([])
  const [groepBewerken, setGroepBewerken] = useState(false)
  const [groepBezig, setGroepBezig] = useState(false)
  const [groepFouten, setGroepFouten] = useState<Record<string, string>>({})
  const [groepIngangsdatum, setGroepIngangsdatum] = useState(new Date().toISOString().split('T')[0])

  // ── Toast ───────────────────────────────────────────────────────────────
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  function toonToast(type: 'success' | 'error', message: string) { setToast({ type, message }) }
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3500)
    return () => clearTimeout(t)
  }, [toast])

  // ── Data laden ──────────────────────────────────────────────────────────
  const maakRijen = useCallback((data: Record<string, unknown>[] | null): DagdeelRij[] => {
    return DAGDEEL_VOLGORDE.map(dagdeel => {
      const bestaand = data?.find((d: Record<string, unknown>) => d.dagdeel_enum === dagdeel)
      const standaard = STANDAARD_TIJDEN[dagdeel]
      return {
        dagdeel,
        label: DAGDEEL_LABELS[dagdeel],
        starttijd: (bestaand?.starttijd as string) ?? standaard.starttijd,
        eindtijd: (bestaand?.eindtijd as string) ?? standaard.eindtijd,
        uren: (bestaand?.uren as number) ?? null,
      }
    })
  }, [])

  const laadLocatieConfig = useCallback(async () => {
    setLaden(true)
    const res = await getDagdeelConfiguraties(locatieId)
    if (res.data) setRijen(maakRijen(res.data))
    setLaden(false)
  }, [locatieId, maakRijen])

  useEffect(() => { laadLocatieConfig() }, [laadLocatieConfig])

  const laadGroepConfig = useCallback(async (groepId: string) => {
    const res = await getDagdeelConfiguraties(locatieId, groepId)
    if (res.data) {
      // Alleen groep-specifieke rijen (met groep_id) als overrides tonen
      const groepSpecifiek = (res.data as Record<string, unknown>[]).filter(d => d.groep_id != null)
      if (groepSpecifiek.length > 0) {
        setGroepRijen(maakRijen(groepSpecifiek))
      } else {
        // Geen overrides: start met locatie-defaults
        setGroepRijen(maakRijen(null))
      }
    }
  }, [locatieId, maakRijen])

  useEffect(() => {
    if (actieveGroep) laadGroepConfig(actieveGroep)
  }, [actieveGroep, laadGroepConfig])

  // ── Locatie save ────────────────────────────────────────────────────────
  function updateRij(dagdeel: string, veld: 'starttijd' | 'eindtijd', waarde: string) {
    setRijen(prev => prev.map(r => r.dagdeel === dagdeel ? { ...r, [veld]: waarde } : r))
  }

  async function slaLocatieOp() {
    const f: Record<string, string> = {}
    rijen.forEach(r => {
      if (r.eindtijd <= r.starttijd) f[r.dagdeel] = 'Eindtijd moet na starttijd liggen'
    })
    if (!ingangsdatum) f.ingangsdatum = 'Ingangsdatum is verplicht'
    if (Object.keys(f).length > 0) { setFouten(f); return }
    setFouten({})
    setBezig(true)

    for (const rij of rijen) {
      const fd = new FormData()
      fd.append('locatie_id', locatieId)
      fd.append('dagdeel_enum', rij.dagdeel)
      fd.append('starttijd', rij.starttijd)
      fd.append('eindtijd', rij.eindtijd)
      fd.append('ingangsdatum', ingangsdatum)

      const res = await dagdeelConfigBijwerken(fd)
      if (res.error) {
        setBezig(false)
        toonToast('error', res.error)
        return
      }
    }

    setBezig(false)
    setBewerken(false)
    toonToast('success', 'Dagdeelconfiguratie opgeslagen')
    laadLocatieConfig()
  }

  // ── Groep save ──────────────────────────────────────────────────────────
  function updateGroepRij(dagdeel: string, veld: 'starttijd' | 'eindtijd', waarde: string) {
    setGroepRijen(prev => prev.map(r => r.dagdeel === dagdeel ? { ...r, [veld]: waarde } : r))
  }

  async function slaGroepOp() {
    if (!actieveGroep) return
    const f: Record<string, string> = {}
    groepRijen.forEach(r => {
      if (r.eindtijd <= r.starttijd) f[r.dagdeel] = 'Eindtijd moet na starttijd liggen'
    })
    if (!groepIngangsdatum) f.ingangsdatum = 'Ingangsdatum is verplicht'
    if (Object.keys(f).length > 0) { setGroepFouten(f); return }
    setGroepFouten({})
    setGroepBezig(true)

    for (const rij of groepRijen) {
      const fd = new FormData()
      fd.append('locatie_id', locatieId)
      fd.append('groep_id', actieveGroep)
      fd.append('dagdeel_enum', rij.dagdeel)
      fd.append('starttijd', rij.starttijd)
      fd.append('eindtijd', rij.eindtijd)
      fd.append('ingangsdatum', groepIngangsdatum)

      const res = await dagdeelConfigBijwerken(fd)
      if (res.error) {
        setGroepBezig(false)
        toonToast('error', res.error)
        return
      }
    }

    setGroepBezig(false)
    setGroepBewerken(false)
    toonToast('success', 'Groep-dagdeelconfiguratie opgeslagen')
    laadGroepConfig(actieveGroep)
  }

  // ── Render helpers ──────────────────────────────────────────────────────
  const inputKlasse = (fout?: string) =>
    `border rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-[#006684]/30 ${fout ? 'border-red-300 bg-red-50' : 'border-slate-200'}`

  function renderTabel(data: DagdeelRij[]) {
    return (
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100">
            <th className="text-left py-2 px-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Dagdeel</th>
            <th className="text-left py-2 px-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Starttijd</th>
            <th className="text-left py-2 px-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Eindtijd</th>
            <th className="text-left py-2 px-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Uren</th>
          </tr>
        </thead>
        <tbody>
          {data.map(r => (
            <tr key={r.dagdeel} className="border-b border-slate-50 last:border-0">
              <td className="py-2 px-2 font-semibold text-slate-600">{r.label}</td>
              <td className="py-2 px-2 text-slate-700">{r.starttijd}</td>
              <td className="py-2 px-2 text-slate-700">{r.eindtijd}</td>
              <td className="py-2 px-2 text-slate-500">{formatUren(r.uren) !== '—' ? formatUren(r.uren) : berekenUren(r.starttijd, r.eindtijd)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    )
  }

  function renderEditRijen(
    data: DagdeelRij[],
    onUpdate: (dagdeel: string, veld: 'starttijd' | 'eindtijd', waarde: string) => void,
    errors: Record<string, string>,
  ) {
    return data.map(r => (
      <div key={r.dagdeel} className="flex items-center gap-4">
        <div className="w-28 shrink-0 text-sm font-semibold text-slate-600">{r.label}</div>
        <input
          type="time"
          step="900"
          value={r.starttijd}
          onChange={e => onUpdate(r.dagdeel, 'starttijd', e.target.value)}
          className={inputKlasse(errors[r.dagdeel])}
        />
        <span className="text-slate-400">—</span>
        <input
          type="time"
          step="900"
          value={r.eindtijd}
          onChange={e => onUpdate(r.dagdeel, 'eindtijd', e.target.value)}
          className={inputKlasse(errors[r.dagdeel])}
        />
        <span className="text-sm text-slate-400 w-16">{berekenUren(r.starttijd, r.eindtijd)} u</span>
        {errors[r.dagdeel] && <span className="text-xs text-red-600">{errors[r.dagdeel]}</span>}
      </div>
    ))
  }

  if (laden) {
    return <div className="text-sm text-slate-400 py-8">Laden...</div>
  }

  return (
    <div className="space-y-8 max-w-2xl">
      {/* ── Locatie dagdeel-configuratie ─── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <div className="flex items-center justify-between mb-5">
          <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Dagdeeltijden locatie</h4>
          {bewerken ? (
            <div className="flex gap-2">
              <button
                onClick={slaLocatieOp}
                disabled={bezig}
                className="text-xs font-bold text-white bg-[#006a66] px-3 py-1 rounded-lg hover:bg-[#005a57] disabled:opacity-50"
              >
                {bezig ? 'Opslaan...' : 'Opslaan'}
              </button>
              <button
                onClick={() => { setBewerken(false); setFouten({}); laadLocatieConfig() }}
                className="text-xs font-semibold text-slate-400 hover:text-slate-600 px-3 py-1"
              >
                Annuleren
              </button>
            </div>
          ) : (
            <button
              onClick={() => setBewerken(true)}
              className="text-xs font-semibold text-[#006684] hover:text-[#004d64] flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-sm">edit</span>
              Bewerken
            </button>
          )}
        </div>

        {bewerken ? (
          <div className="space-y-3">
            {renderEditRijen(rijen, updateRij, fouten)}
            <div className="pt-3 border-t border-slate-100 mt-4">
              <label className="block text-sm font-semibold text-slate-600 mb-1">
                Ingangsdatum <span className="text-red-400">*</span>
              </label>
              <input
                type="date"
                value={ingangsdatum}
                onChange={e => setIngangsdatum(e.target.value)}
                className={inputKlasse(fouten.ingangsdatum)}
              />
              {fouten.ingangsdatum && <p className="text-xs text-red-600 mt-1">{fouten.ingangsdatum}</p>}
            </div>
          </div>
        ) : (
          rijen.length > 0 ? renderTabel(rijen) : (
            <p className="text-sm text-slate-400 italic">Geen dagdeelconfiguratie ingesteld. Klik op Bewerken om standaardtijden in te stellen.</p>
          )
        )}
      </div>

      {/* ── Groep-overrides ─── */}
      {groepen.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Afwijkende tijden per groep</h4>

          <div className="space-y-2">
            {groepen.filter(g => g.status !== 'gesloten').map(groep => (
              <div key={groep.id} className="border border-slate-100 rounded-xl">
                <button
                  onClick={() => {
                    if (actieveGroep === groep.id) {
                      setActieveGroep(null)
                      setGroepBewerken(false)
                    } else {
                      setActieveGroep(groep.id)
                      setGroepBewerken(false)
                      setGroepFouten({})
                    }
                  }}
                  className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50 rounded-xl"
                >
                  <span>{groep.naam}</span>
                  <span className="material-symbols-outlined text-sm text-slate-400">
                    {actieveGroep === groep.id ? 'expand_less' : 'expand_more'}
                  </span>
                </button>

                {actieveGroep === groep.id && (
                  <div className="px-4 pb-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs text-slate-400">Dagdeeltijden voor {groep.naam}</span>
                      {groepBewerken ? (
                        <div className="flex gap-2">
                          <button
                            onClick={slaGroepOp}
                            disabled={groepBezig}
                            className="text-xs font-bold text-white bg-[#006a66] px-3 py-1 rounded-lg hover:bg-[#005a57] disabled:opacity-50"
                          >
                            {groepBezig ? 'Opslaan...' : 'Opslaan'}
                          </button>
                          <button
                            onClick={() => { setGroepBewerken(false); setGroepFouten({}); laadGroepConfig(groep.id) }}
                            className="text-xs font-semibold text-slate-400 hover:text-slate-600 px-3 py-1"
                          >
                            Annuleren
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setGroepBewerken(true)}
                          className="text-xs font-semibold text-[#006684] hover:text-[#004d64] flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-sm">edit</span>
                          Bewerken
                        </button>
                      )}
                    </div>

                    {groepBewerken ? (
                      <div className="space-y-3">
                        {renderEditRijen(groepRijen, updateGroepRij, groepFouten)}
                        <div className="pt-3 border-t border-slate-100 mt-4">
                          <label className="block text-sm font-semibold text-slate-600 mb-1">
                            Ingangsdatum <span className="text-red-400">*</span>
                          </label>
                          <input
                            type="date"
                            value={groepIngangsdatum}
                            onChange={e => setGroepIngangsdatum(e.target.value)}
                            className={inputKlasse(groepFouten.ingangsdatum)}
                          />
                          {groepFouten.ingangsdatum && <p className="text-xs text-red-600 mt-1">{groepFouten.ingangsdatum}</p>}
                        </div>
                      </div>
                    ) : (
                      renderTabel(groepRijen)
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Feestdagen ─── */}
      <FeestdagenBeheer locatieId={locatieId} />

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
