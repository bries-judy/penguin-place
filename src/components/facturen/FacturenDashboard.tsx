'use client'

import { useState, useTransition } from 'react'
import {
  genereerMaandFacturen,
  updateFactuurStatus,
  verwijderFactuur,
  type FactuurMetParent,
} from '@/app/actions/facturen'
import type { FactuurStatus, GenerateMaandFacturenRow } from '@/lib/supabase/types'

const MAANDEN = [
  'Januari', 'Februari', 'Maart', 'April', 'Mei', 'Juni',
  'Juli', 'Augustus', 'September', 'Oktober', 'November', 'December',
]

const STATUS_LABEL: Record<FactuurStatus, string> = {
  draft:   'Concept',
  sent:    'Verzonden',
  paid:    'Betaald',
  overdue: 'Te laat',
}

const STATUS_STYLE: Record<FactuurStatus, React.CSSProperties> = {
  draft:   { background: '#F0EDFF', color: '#6B5B95' },
  sent:    { background: '#E8F4FD', color: '#1976D2' },
  paid:    { background: '#E8F5E9', color: '#388E3C' },
  overdue: { background: '#FFF3E0', color: '#E65100' },
}

interface Props {
  initieleFacturen: FactuurMetParent[]
  huidigJaar: number
  huidigMaand: number
}

export default function FacturenDashboard({
  initieleFacturen,
  huidigJaar,
  huidigMaand,
}: Props) {
  const [facturen, setFacturen] = useState<FactuurMetParent[]>(initieleFacturen)
  const [geselecteerdJaar, setGeselecteerdJaar] = useState(huidigJaar)
  const [geselecteerdeMaand, setGeselecteerdeMaand] = useState(huidigMaand)
  const [resultaat, setResultaat] = useState<GenerateMaandFacturenRow[] | null>(null)
  const [foutmelding, setFoutmelding] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const jaren = Array.from({ length: 3 }, (_, i) => huidigJaar - 1 + i)

  function handleGenereer() {
    setFoutmelding(null)
    setResultaat(null)

    startTransition(async () => {
      const res = await genereerMaandFacturen(geselecteerdJaar, geselecteerdeMaand)

      if ('error' in res) {
        setFoutmelding(res.error)
        return
      }

      setResultaat(res.data)

      // Voeg nieuwe facturen toe aan de lijst
      const nieuweIds = res.data
        .filter(r => r.uitkomst === 'aangemaakt' && r.invoice_id)
        .map(r => r.invoice_id!)

      if (nieuweIds.length > 0) {
        // Re-fetch is gedaan via revalidatePath in de action; hier tonen we de resultaten
        // De pagina wordt bij volgende navigatie ververst
      }
    })
  }

  async function handleStatusUpdate(invoiceId: string, nieuwStatus: FactuurStatus) {
    const res = await updateFactuurStatus(invoiceId, nieuwStatus)
    if (res.error) {
      setFoutmelding(res.error)
      return
    }
    setFacturen(prev =>
      prev.map(f => f.id === invoiceId ? { ...f, status: nieuwStatus } : f)
    )
  }

  async function handleVerwijder(invoiceId: string) {
    if (!confirm('Weet je zeker dat je deze concept-factuur wilt verwijderen?')) return

    const res = await verwijderFactuur(invoiceId)
    if (res.error) {
      setFoutmelding(res.error)
      return
    }
    setFacturen(prev => prev.filter(f => f.id !== invoiceId))
  }

  const aangemaakt = resultaat?.filter(r => r.uitkomst === 'aangemaakt') ?? []
  const overgeslagen = resultaat?.filter(r => r.uitkomst === 'overgeslagen_bestaat') ?? []

  return (
    <div className="flex-1 overflow-auto p-6" style={{ background: '#ECEAE7' }}>
      {/* Header */}
      <div className="mb-6">
        <h1
          className="text-2xl font-black"
          style={{ fontFamily: 'Manrope, sans-serif', color: '#2D2540' }}
        >
          Facturen
        </h1>
        <p className="text-sm mt-1" style={{ color: '#8B82A8' }}>
          Genereer maandfacturen op basis van actieve contracten
        </p>
      </div>

      {/* Genereer-paneel */}
      <div
        className="rounded-2xl p-5 mb-6"
        style={{ background: 'white', boxShadow: '0 1px 3px rgba(91,82,212,0.08)' }}
      >
        <h2 className="font-bold text-sm mb-4" style={{ color: '#2D2540' }}>
          Facturen genereren
        </h2>

        <div className="flex items-end gap-4 flex-wrap">
          {/* Maand */}
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: '#8B82A8' }}>
              Maand
            </label>
            <select
              value={geselecteerdeMaand}
              onChange={e => setGeselecteerdeMaand(Number(e.target.value))}
              className="rounded-lg px-3 py-2 text-sm border font-semibold"
              style={{ borderColor: '#E8E4DF', color: '#2D2540' }}
            >
              {MAANDEN.map((naam, i) => (
                <option key={i + 1} value={i + 1}>{naam}</option>
              ))}
            </select>
          </div>

          {/* Jaar */}
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: '#8B82A8' }}>
              Jaar
            </label>
            <select
              value={geselecteerdJaar}
              onChange={e => setGeselecteerdJaar(Number(e.target.value))}
              className="rounded-lg px-3 py-2 text-sm border font-semibold"
              style={{ borderColor: '#E8E4DF', color: '#2D2540' }}
            >
              {jaren.map(j => (
                <option key={j} value={j}>{j}</option>
              ))}
            </select>
          </div>

          {/* Knop */}
          <button
            onClick={handleGenereer}
            disabled={isPending}
            className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold transition-opacity"
            style={{
              background: isPending ? '#C4B8E0' : '#6B5B95',
              color: 'white',
              opacity: isPending ? 0.7 : 1,
            }}
          >
            <span className="material-symbols-outlined text-base">
              {isPending ? 'hourglass_empty' : 'receipt_long'}
            </span>
            {isPending ? 'Bezig...' : `Genereer ${MAANDEN[geselecteerdeMaand - 1]} ${geselecteerdJaar}`}
          </button>
        </div>

        {/* Resultaat */}
        {resultaat && (
          <div
            className="mt-4 rounded-xl p-4 text-sm"
            style={{ background: '#F5F3F0' }}
          >
            <p className="font-bold mb-2" style={{ color: '#2D2540' }}>
              Resultaat {MAANDEN[geselecteerdeMaand - 1]} {geselecteerdJaar}
            </p>
            <div className="flex gap-6">
              <span style={{ color: '#388E3C' }}>
                <span className="font-bold">{aangemaakt.length}</span> aangemaakt
              </span>
              <span style={{ color: '#8B82A8' }}>
                <span className="font-bold">{overgeslagen.length}</span> overgeslagen (bestonden al)
              </span>
            </div>

            {aangemaakt.length > 0 && (
              <table className="mt-3 w-full text-xs">
                <thead>
                  <tr style={{ color: '#8B82A8' }}>
                    <th className="text-left pb-1">Ouder</th>
                    <th className="text-left pb-1">Factuurnummer</th>
                    <th className="text-right pb-1">Bedrag</th>
                    <th className="text-right pb-1">Regels</th>
                  </tr>
                </thead>
                <tbody>
                  {aangemaakt.map((r, i) => (
                    <tr key={i} style={{ color: '#2D2540' }}>
                      <td className="py-0.5">{r.parent_naam}</td>
                      <td className="py-0.5 font-mono">{r.factuurnummer}</td>
                      <td className="py-0.5 text-right font-bold">
                        €{r.totaal_bedrag?.toFixed(2) ?? '0.00'}
                      </td>
                      <td className="py-0.5 text-right">{r.aantal_regels}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Foutmelding */}
        {foutmelding && (
          <div
            className="mt-4 rounded-xl p-3 text-sm font-semibold"
            style={{ background: '#FFF3E0', color: '#E65100' }}
          >
            {foutmelding}
          </div>
        )}
      </div>

      {/* Factuurlijst */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: 'white', boxShadow: '0 1px 3px rgba(91,82,212,0.08)' }}
      >
        <div className="p-5 border-b" style={{ borderColor: '#E8E4DF' }}>
          <h2 className="font-bold text-sm" style={{ color: '#2D2540' }}>
            Alle facturen
            <span
              className="ml-2 text-xs font-semibold rounded-full px-2 py-0.5"
              style={{ background: '#F0EDFF', color: '#6B5B95' }}
            >
              {facturen.length}
            </span>
          </h2>
        </div>

        {facturen.length === 0 ? (
          <div className="p-12 text-center" style={{ color: '#8B82A8' }}>
            <span className="material-symbols-outlined text-4xl block mb-2">receipt_long</span>
            <p className="text-sm">Nog geen facturen. Genereer de eerste facturen hierboven.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr
                className="text-xs font-semibold uppercase tracking-wide"
                style={{ color: '#8B82A8', borderBottom: '1px solid #E8E4DF' }}
              >
                <th className="text-left px-5 py-3">Nummer</th>
                <th className="text-left px-4 py-3">Ontvanger</th>
                <th className="text-left px-4 py-3">Periode</th>
                <th className="text-right px-4 py-3">Bedrag</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {facturen.map(factuur => {
                const cp = factuur.contactpersonen
                const naam = cp
                  ? `${cp.voornaam} ${cp.achternaam}`
                  : '—'
                const periodeLabel = new Date(factuur.periode_start + 'T12:00:00')
                  .toLocaleDateString('nl-NL', { month: 'long', year: 'numeric' })

                return (
                  <tr
                    key={factuur.id}
                    style={{ borderBottom: '1px solid #F5F3F0' }}
                  >
                    <td className="px-5 py-3 font-mono text-xs font-bold" style={{ color: '#6B5B95' }}>
                      {factuur.factuurnummer}
                    </td>
                    <td className="px-4 py-3" style={{ color: '#2D2540' }}>
                      <div className="font-semibold">{naam}</div>
                      {cp?.email && (
                        <div className="text-xs" style={{ color: '#8B82A8' }}>{cp.email}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 capitalize" style={{ color: '#2D2540' }}>
                      {periodeLabel}
                    </td>
                    <td className="px-4 py-3 text-right font-bold" style={{ color: '#2D2540' }}>
                      €{factuur.totaal_bedrag.toFixed(2)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="text-xs font-bold rounded-full px-2.5 py-1"
                        style={STATUS_STYLE[factuur.status]}
                      >
                        {STATUS_LABEL[factuur.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 justify-end">
                        {/* Status-overgang knoppen */}
                        {factuur.status === 'draft' && (
                          <button
                            onClick={() => handleStatusUpdate(factuur.id, 'sent')}
                            className="text-xs font-semibold px-3 py-1 rounded-lg transition-colors"
                            style={{ background: '#E8F4FD', color: '#1976D2' }}
                            title="Markeer als verzonden"
                          >
                            Verzend
                          </button>
                        )}
                        {factuur.status === 'sent' && (
                          <>
                            <button
                              onClick={() => handleStatusUpdate(factuur.id, 'paid')}
                              className="text-xs font-semibold px-3 py-1 rounded-lg"
                              style={{ background: '#E8F5E9', color: '#388E3C' }}
                              title="Markeer als betaald"
                            >
                              Betaald
                            </button>
                            <button
                              onClick={() => handleStatusUpdate(factuur.id, 'overdue')}
                              className="text-xs font-semibold px-3 py-1 rounded-lg"
                              style={{ background: '#FFF3E0', color: '#E65100' }}
                              title="Markeer als te laat"
                            >
                              Te laat
                            </button>
                          </>
                        )}
                        {factuur.status === 'overdue' && (
                          <button
                            onClick={() => handleStatusUpdate(factuur.id, 'paid')}
                            className="text-xs font-semibold px-3 py-1 rounded-lg"
                            style={{ background: '#E8F5E9', color: '#388E3C' }}
                            title="Markeer als betaald"
                          >
                            Betaald
                          </button>
                        )}

                        {/* Verwijder (alleen draft) */}
                        {factuur.status === 'draft' && (
                          <button
                            onClick={() => handleVerwijder(factuur.id)}
                            className="p-1 rounded-lg transition-colors"
                            style={{ color: '#C4B8E0' }}
                            title="Verwijder concept-factuur"
                          >
                            <span className="material-symbols-outlined text-base">delete</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* MVP-disclaimer */}
      <div
        className="mt-4 rounded-xl p-3 text-xs"
        style={{ background: '#FFF8E7', color: '#8B6914', border: '1px solid #FFE082' }}
      >
        <span className="font-bold">Let op (MVP):</span>{' '}
        Facturen worden gegroepeerd per contactpersoon. Als dezelfde ouder voor meerdere kinderen
        apart is geregistreerd (zonder gezamenlijke contactpersoon), ontvangt hij/zij meerdere
        facturen. Gebruik de{' '}
        <span className="font-bold">siblings</span>-koppeling en één gedeeld contactpersoon-record
        om dit te voorkomen.
      </div>
    </div>
  )
}
