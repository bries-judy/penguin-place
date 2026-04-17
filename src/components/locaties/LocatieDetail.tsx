'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { locatieDeactiveren } from '@/app/actions/locaties'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import AlgemeenTab from './tabs/AlgemeenTab'
import OpeningstijdenTab from './tabs/OpeningstijdenTab'
import GroepenTab from './tabs/GroepenTab'
import ComplianceTab from './tabs/ComplianceTab'
import PersoneelTab from './tabs/PersoneelTab'
import FacturatieTab from './tabs/FacturatieTab'
import DagdelenTab from './tabs/DagdelenTab'
import type {
  Locatie, Groep, OpeningstijdenRegel, OpeningstijdenUitzondering,
  LocatieType, LocatieStatus,
} from '@/types/locaties'
import { LOCATIE_TYPE_LABELS } from '@/types/locaties'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ManagerProfiel {
  id: string
  profiles: { naam: string } | null
}

export interface LocatieMetRelaties extends Locatie {
  locatiemanager: ManagerProfiel | null
  plaatsvervangend_manager: ManagerProfiel | null
  groepen: Groep[]
  locatie_openingstijden: OpeningstijdenRegel[]
  locatie_openingstijden_uitzonderingen: OpeningstijdenUitzondering[]
}

interface Props {
  locatie: LocatieMetRelaties
}

// ─── Helpers / constanten ─────────────────────────────────────────────────────

const LOCATIE_STATUS_CONFIG: Record<LocatieStatus, { label: string; bg: string; text: string; dot: string }> = {
  actief:    { label: 'Actief',    bg: 'bg-[#8df4ed]/40', text: 'text-[#006a66]', dot: 'bg-[#006a66]' },
  inactief:  { label: 'Inactief',  bg: 'bg-slate-100',    text: 'text-slate-500', dot: 'bg-slate-400' },
  in_opbouw: { label: 'In opbouw', bg: 'bg-amber-50',     text: 'text-amber-700', dot: 'bg-amber-500' },
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function LocatieDetail({ locatie }: Props) {
  const router = useRouter()
  const [confirmerenDeactiveren, setConfirm] = useState(false)
  const [bezig, setBezig] = useState(false)
  const [fout, setFout]   = useState<string | null>(null)

  const statusCfg = LOCATIE_STATUS_CONFIG[locatie.status]

  async function handleDeactiveren() {
    setBezig(true)
    setFout(null)
    const res = await locatieDeactiveren(locatie.id)
    setBezig(false)
    if (res.error) {
      setFout(res.error)
    } else {
      router.push('/dashboard/locaties')
    }
  }

  const tabs = [
    { value: 'algemeen',       label: 'Algemeen' },
    { value: 'openingstijden', label: 'Openingstijden' },
    { value: 'dagdelen',       label: 'Dagdelen' },
    { value: 'groepen',        label: 'Groepen' },
    { value: 'compliance',     label: 'Compliance' },
    { value: 'personeel',      label: 'Personeel' },
    { value: 'facturatie',     label: 'Facturatie' },
  ]

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Top bar */}
      <header className="bg-white/70 backdrop-blur-md flex items-center justify-between px-8 py-4 border-b border-slate-100 sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/locaties"
            className="text-slate-400 hover:text-slate-600 flex items-center gap-1 text-sm"
          >
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            Locaties
          </Link>
          <span className="text-slate-200">/</span>
          <h2 className="text-xl font-bold tracking-tight text-cyan-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
            {locatie.naam}
          </h2>
        </div>

        {confirmerenDeactiveren ? (
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-500">
              Weet je zeker dat je <strong>{locatie.naam}</strong> wilt deactiveren?
            </span>
            <button
              onClick={handleDeactiveren}
              disabled={bezig}
              className="text-sm font-bold text-red-600 hover:text-red-800 disabled:opacity-50"
            >
              Ja, deactiveren
            </button>
            <button
              onClick={() => setConfirm(false)}
              className="text-sm font-semibold text-slate-500 hover:text-slate-700"
            >
              Annuleren
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirm(true)}
            className="text-sm font-semibold text-slate-400 hover:text-red-500 flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-sm">block</span>
            Deactiveren
          </button>
        )}
      </header>

      <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">
        {/* Paginakop */}
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-extrabold text-[#004d64] tracking-tight" style={{ fontFamily: 'Manrope, sans-serif' }}>
            {locatie.naam}
          </h1>
          {locatie.code && (
            <span className="text-xs font-mono font-bold bg-slate-100 text-slate-500 px-2.5 py-1 rounded-lg">
              {locatie.code}
            </span>
          )}
          {locatie.type && (
            <span className="text-xs font-semibold bg-[#bee9ff]/60 text-[#004d64] px-2.5 py-1 rounded-full">
              {LOCATIE_TYPE_LABELS[locatie.type as LocatieType]}
            </span>
          )}
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${statusCfg.bg} ${statusCfg.text}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
            {statusCfg.label}
          </span>
        </div>

        {fout && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
            {fout}
          </div>
        )}

        {/* Tabs */}
        <Tabs defaultValue="algemeen">
          <TabsList variant="line" className="border-b border-slate-200 w-full rounded-none pb-0 h-auto">
            {tabs.map(t => (
              <TabsTrigger key={t.value} value={t.value} className="pb-3">
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <div className="pt-6">
            <TabsContent value="algemeen">
              <AlgemeenTab locatie={locatie} />
            </TabsContent>
            <TabsContent value="openingstijden">
              <OpeningstijdenTab
                locatieId={locatie.id}
                openingstijden={locatie.locatie_openingstijden}
                uitzonderingen={locatie.locatie_openingstijden_uitzonderingen}
              />
            </TabsContent>
            <TabsContent value="dagdelen">
              <DagdelenTab locatieId={locatie.id} groepen={locatie.groepen} />
            </TabsContent>
            <TabsContent value="groepen">
              <GroepenTab locatieId={locatie.id} groepen={locatie.groepen} />
            </TabsContent>
            <TabsContent value="compliance">
              <ComplianceTab locatie={locatie} />
            </TabsContent>
            <TabsContent value="personeel">
              <PersoneelTab locatie={locatie} />
            </TabsContent>
            <TabsContent value="facturatie">
              <FacturatieTab locatie={locatie} />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  )
}
