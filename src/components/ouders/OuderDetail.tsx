'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import type { OuderDetail as OuderDetailType, OuderMemo, OuderEmail } from '@/types/ouders'
import OuderHeader from './OuderHeader'
import OuderOverzichtTab from './OuderOverzichtTab'
import OuderKinderenTab from './OuderKinderenTab'
import OuderPlanningTab from './OuderPlanningTab'
import OuderCommunicatieTab from './OuderCommunicatieTab'
import OuderDocumentenTab from './OuderDocumentenTab'
import OuderFinancieelTab from './OuderFinancieelTab'
import OuderGegevensTab from './OuderGegevensTab'

export interface PortaalBericht {
  id: string
  conversation_id: string
  afzender_id: string
  afzender_type: string
  inhoud: string | null
  created_at: string
}

export interface OuderFactuur {
  id: string
  factuurnummer: string | null
  periode_start: string
  periode_eind: string
  totaal_bedrag: number
  status: 'draft' | 'sent' | 'paid' | 'overdue'
  created_at: string
}

export interface AndereOuderRij {
  id: string
  voornaam: string
  achternaam: string
  email: string
}

interface Props {
  ouder: OuderDetailType
  memos: OuderMemo[]
  portaalberichten: PortaalBericht[]
  facturen: OuderFactuur[]
  emails: OuderEmail[]
  andereOuders: AndereOuderRij[]
}

const TABS = [
  { value: 'overzicht',    label: 'Overzicht' },
  { value: 'kinderen',     label: 'Kinderen' },
  { value: 'planning',     label: 'Planning' },
  { value: 'communicatie', label: 'Communicatie' },
  { value: 'financieel',   label: 'Financieel' },
  { value: 'documenten',   label: 'Documenten' },
  { value: 'gegevens',     label: 'Gegevens' },
] as const

export default function OuderDetail({
  ouder,
  memos,
  portaalberichten,
  facturen,
  emails,
  andereOuders,
}: Props) {
  const [actieveTab, setActieveTab] = useState<string>('overzicht')
  // Wordt ingesteld door de "Open taken"-tile en eenmalig geconsumeerd
  // door de Communicatie-tab om de "Alleen open taken"-filter vooraf
  // aan te vinken. Null = geen force-actie.
  const [forceAlleenOpenTaken, setForceAlleenOpenTaken] = useState<number>(0)

  function naarCommunicatie() {
    setActieveTab('communicatie')
  }

  function handleHeaderNavigate(doel: {
    tab: 'financieel' | 'communicatie' | 'documenten'
    alleenOpenTaken?: boolean
  }) {
    setActieveTab(doel.tab)
    if (doel.tab === 'communicatie' && doel.alleenOpenTaken) {
      // Bump counter zodat useEffect in de tab hem herkent als nieuwe actie,
      // ook als gebruiker de tile 2x klikt.
      setForceAlleenOpenTaken((n) => n + 1)
    }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <header
        className="bg-white/80 backdrop-blur-md flex items-center gap-3 px-8 py-4 border-b sticky top-0 z-40"
        style={{ borderColor: '#E8E4DF' }}
      >
        <Link
          href="/dashboard/ouders"
          className="inline-flex items-center gap-1 text-sm hover:underline"
          style={{ color: '#8B82A8' }}
        >
          <ArrowLeft className="w-4 h-4" /> Ouders
        </Link>
        <span style={{ color: '#C8C2D8' }}>/</span>
        <h2
          className="text-lg font-bold tracking-tight"
          style={{ fontFamily: 'Manrope, sans-serif', color: '#2D2540' }}
        >
          {ouder.voornaam} {ouder.achternaam}
        </h2>
      </header>

      <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">
        <OuderHeader
          ouder={ouder}
          onNieuweMemo={naarCommunicatie}
          onNavigate={handleHeaderNavigate}
        />

        <Tabs value={actieveTab} onValueChange={(v) => setActieveTab(v as string)}>
          <TabsList
            variant="line"
            className="border-b w-full rounded-none pb-0 h-auto gap-3"
            style={{ borderColor: '#E8E4DF' }}
          >
            {TABS.map(t => (
              <TabsTrigger key={t.value} value={t.value} className="pb-3 text-sm font-semibold">
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <div className="pt-6">
            <TabsContent value="overzicht">
              <OuderOverzichtTab ouder={ouder} memos={memos} portaalberichten={portaalberichten} emails={emails} />
            </TabsContent>
            <TabsContent value="kinderen">
              <OuderKinderenTab ouder={ouder} />
            </TabsContent>
            <TabsContent value="planning">
              <OuderPlanningTab ouder={ouder} />
            </TabsContent>
            <TabsContent value="communicatie">
              <OuderCommunicatieTab
                ouder={ouder}
                memos={memos}
                portaalberichten={portaalberichten}
                emails={emails}
                andereOuders={andereOuders}
                forceAlleenOpenTaken={forceAlleenOpenTaken}
              />
            </TabsContent>
            <TabsContent value="financieel">
              <OuderFinancieelTab ouder={ouder} facturen={facturen} />
            </TabsContent>
            <TabsContent value="documenten">
              <OuderDocumentenTab ouder={ouder} />
            </TabsContent>
            <TabsContent value="gegevens">
              <OuderGegevensTab ouder={ouder} />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  )
}
