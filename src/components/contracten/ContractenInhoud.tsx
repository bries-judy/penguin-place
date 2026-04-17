'use client'

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import ContractTypenBeheer from './ContractTypenBeheer'
import MerkenBeheer from './MerkenBeheer'
import TariefBeheer, { type TariefSetRij } from './TariefBeheer'
import KortingsBeheer, { type KortingsTypeRij } from './KortingsBeheer'

// ─── Types ────────────────────────────────────────────────────────────────────

interface MerkRij {
  id: string
  code: string
  naam: string
  beschrijving: string | null
  actief: boolean
  locaties: { count: number }[]
}

interface ContractTypeRij {
  id: string
  merk_id: string
  naam: string
  code: string
  opvangtype: 'kdv' | 'bso' | 'peuteropvang' | 'gastouder'
  contractvorm: 'schoolweken' | 'standaard' | 'super_flexibel' | 'flexibel'
  beschrijving: string | null
  min_uren_maand: number | null
  min_dagdelen_week: number | null
  geldig_in_vakanties: boolean
  opvang_op_inschrijving: boolean
  annuleringstermijn_uren: number | null
  actief: boolean
  merk?: { naam: string; code: string } | null
}

interface LocatieOptie {
  id: string
  naam: string
  merk_id: string | null
}

interface Props {
  merken: MerkRij[]
  contracttypen: ContractTypeRij[]
  locaties: LocatieOptie[]
  tariefsets: TariefSetRij[]
  kortingstypen: KortingsTypeRij[]
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ContractenInhoud({ merken, contracttypen, locaties, tariefsets, kortingstypen }: Props) {
  const merkenOpties = merken.map(m => ({ id: m.id, naam: m.naam, code: m.code }))
  const contracttypenOpties = contracttypen.map(ct => ({
    id: ct.id,
    naam: ct.naam,
    code: ct.code,
    merk_id: ct.merk_id,
    opvangtype: ct.opvangtype,
  }))

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <h1 className="text-2xl font-black text-[#004d64] mb-1" style={{ fontFamily: 'Manrope, sans-serif' }}>
        Contractbeheer
      </h1>
      <p className="text-sm text-slate-500 mb-6">
        Beheer merken, contracttypen en tarieven voor je organisatie.
      </p>

      <Tabs defaultValue="contracttypen">
        <TabsList variant="line" className="border-b border-slate-200 w-full rounded-none pb-0 h-auto">
          <TabsTrigger value="contracttypen" className="pb-3">Contracttypen</TabsTrigger>
          <TabsTrigger value="tarieven" className="pb-3">Tarieven</TabsTrigger>
          <TabsTrigger value="merken" className="pb-3">Merken</TabsTrigger>
          <TabsTrigger value="kortingen" className="pb-3">Kortingen</TabsTrigger>
        </TabsList>

        <div className="pt-6">
          <TabsContent value="contracttypen">
            <ContractTypenBeheer contracttypen={contracttypen} merken={merkenOpties} />
          </TabsContent>
          <TabsContent value="tarieven">
            <TariefBeheer tariefsets={tariefsets} merken={merkenOpties} contracttypen={contracttypenOpties} />
          </TabsContent>
          <TabsContent value="merken">
            <MerkenBeheer merken={merken} locaties={locaties} />
          </TabsContent>
          <TabsContent value="kortingen">
            <KortingsBeheer kortingstypen={kortingstypen} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}
