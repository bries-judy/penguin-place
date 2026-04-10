'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import {
  kindUpdaten, medischUpdaten, contactpersoonOpslaan,
  kindUitschrijven, notitieToevoegen,
} from '@/app/actions/kinderen'
import { contractAanmaken, contractActiveren, contractWijzigen } from '@/app/actions/contracten'
import type { Kind, Adres, Contactpersoon, MedischGegevens, Contract, ContractStatus, Opvangtype } from '@/lib/supabase/types'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ContractMetRefs extends Contract {
  locaties: { naam: string } | null
  groepen:  { naam: string } | null
}

interface Props {
  kind:           Kind
  adres:          Adres | null
  contactpersonen: Contactpersoon[]
  medisch:        MedischGegevens | null
  contracten:     ContractMetRefs[]
  notities:       { id: string; tekst: string; created_at: string; user_id: string }[]
  siblings:       { siblingId: string; kind: unknown }[]
  locaties:       { id: string; naam: string }[]
  groepen:        { id: string; naam: string; locatie_id: string }[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

type Tab = 'algemeen' | 'contacten' | 'medisch' | 'contracten' | 'notities'

const DAG_LABELS = ['Ma', 'Di', 'Wo', 'Do', 'Vr']

const OPVANG_LABEL: Record<Opvangtype, string> = {
  kdv: 'KDV', bso: 'BSO', peuteropvang: 'Peuteropvang', gastouder: 'Gastouder',
}

const STATUS_CFG: Record<ContractStatus, { label: string; bg: string; text: string }> = {
  actief:       { label: 'Actief',      bg: 'bg-[#8df4ed]/40', text: 'text-[#006a66]' },
  concept:      { label: 'Concept',     bg: 'bg-slate-100',    text: 'text-slate-500' },
  opgeschort:   { label: 'Opgeschort',  bg: 'bg-[#ffb783]/30', text: 'text-[#703700]' },
  'beëindigd':  { label: 'Beëindigd',   bg: 'bg-slate-50',     text: 'text-slate-400' },
  wachtlijst:   { label: 'Wachtlijst',  bg: 'bg-[#bee9ff]/60', text: 'text-[#004d64]' },
}

function volledigeNaam(k: Pick<Kind, 'voornaam' | 'tussenvoegsel' | 'achternaam'>) {
  return [k.voornaam, k.tussenvoegsel, k.achternaam].filter(Boolean).join(' ')
}

function leeftijdStr(geboortedatum: string | null, verwacht: string | null) {
  const datum = geboortedatum ?? verwacht
  if (!datum) return null
  const geb = new Date(datum)
  const nu  = new Date()
  const mnd = (nu.getFullYear() - geb.getFullYear()) * 12 + (nu.getMonth() - geb.getMonth())
  if (!geboortedatum) return `verwacht ${new Date(verwacht!).toLocaleDateString('nl-NL', { month: 'long', year: 'numeric' })}`
  if (mnd < 12) return `${mnd} maanden`
  const jr = Math.floor(mnd / 12)
  const rm = mnd % 12
  return rm > 0 ? `${jr} jaar en ${rm} maanden` : `${jr} jaar`
}

const inputCls = 'w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-[#181c1d] bg-white focus:outline-none focus:ring-2 focus:ring-[#006684]/30 placeholder:text-slate-300'
const labelCls = 'text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5'

// ─── Contractformulier ────────────────────────────────────────────────────────

function ContractForm({
  kindId, locaties, groepen, bestaand, onClose,
}: {
  kindId: string
  locaties: Props['locaties']
  groepen:  Props['groepen']
  bestaand?: ContractMetRefs
  onClose: () => void
}) {
  const [isPending, startTransition] = useTransition()
  const [selectedLocatie, setSelectedLocatie] = useState(bestaand?.locatie_id ?? locaties[0]?.id ?? '')
  const [error, setError] = useState<string | null>(null)

  const locGroepen = groepen.filter(g => g.locatie_id === selectedLocatie)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    setError(null)
    startTransition(async () => {
      const result = bestaand
        ? await contractWijzigen(bestaand.id, kindId, fd)
        : await contractAanmaken(kindId, fd)
      if (result?.error) setError(result.error)
      else onClose()
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white">
          <h3 className="text-lg font-black text-[#004d64]" style={{ fontFamily: 'Manrope, sans-serif' }}>
            {bestaand ? 'Contractwijziging' : 'Nieuw contract'}
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {bestaand && (
            <div className="bg-[#ffb783]/15 border border-[#ffb783]/40 rounded-xl p-3 text-xs text-[#703700] flex items-start gap-2">
              <span className="material-symbols-outlined text-sm mt-0.5">info</span>
              Het bestaande contract wordt beëindigd per dag vóór de nieuwe ingangsdatum. Een nieuw concept wordt aangemaakt.
            </div>
          )}

          <div className="space-y-1.5">
            <label className={labelCls}>Locatie *</label>
            <select name="locatie_id" value={selectedLocatie} onChange={e => setSelectedLocatie(e.target.value)} className={inputCls} required>
              {locaties.map(l => <option key={l.id} value={l.id}>{l.naam}</option>)}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className={labelCls}>Groep</label>
            <select name="groep_id" className={inputCls}>
              <option value="">— Nog niet toegewezen —</option>
              {locGroepen.map(g => <option key={g.id} value={g.id}>{g.naam}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className={labelCls}>Opvangtype *</label>
              <select name="opvangtype" defaultValue={bestaand?.opvangtype ?? 'kdv'} className={inputCls} required>
                <option value="kdv">KDV</option>
                <option value="bso">BSO</option>
                <option value="peuteropvang">Peuteropvang</option>
                <option value="gastouder">Gastouder</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className={labelCls}>Contracttype *</label>
              <select name="contracttype" defaultValue={bestaand?.contracttype ?? 'vast'} className={inputCls} required>
                <option value="vast">Vast</option>
                <option value="flex">Flex</option>
                <option value="tijdelijk">Tijdelijk</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className={labelCls}>Zorgdagen *</label>
            <div className="flex gap-2">
              {DAG_LABELS.map((d, i) => (
                <label key={i} className="flex flex-col items-center gap-1 cursor-pointer">
                  <input
                    type="checkbox"
                    name="zorgdagen"
                    value={i}
                    defaultChecked={bestaand?.zorgdagen.includes(i)}
                    className="w-4 h-4 accent-[#004d64]"
                  />
                  <span className="text-xs font-bold text-slate-500">{d}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className={labelCls}>Uren per dag *</label>
              <input type="number" name="uren_per_dag" step="0.5" min="1" max="12" defaultValue={bestaand?.uren_per_dag ?? 8} className={inputCls} required />
            </div>
            <div className="space-y-1.5">
              <label className={labelCls}>{bestaand ? 'Ingangsdatum *' : 'Startdatum *'}</label>
              <input type="date" name="startdatum" defaultValue={bestaand?.startdatum} className={inputCls} required />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className={labelCls}>Einddatum (optioneel)</label>
            <input type="date" name="einddatum" defaultValue={bestaand?.einddatum ?? ''} className={inputCls} />
          </div>

          <div className="space-y-1.5">
            <label className={labelCls}>Notities</label>
            <textarea name="notities" rows={2} defaultValue={bestaand?.notities ?? ''} className={`${inputCls} resize-none`} placeholder="Interne opmerkingen..." />
          </div>

          {error && <p className="text-sm text-[#ba1a1a] bg-[#ba1a1a]/10 px-4 py-2 rounded-xl">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-500 hover:bg-slate-50">Annuleren</button>
            <button type="submit" disabled={isPending}
              className="flex-1 py-2.5 rounded-xl text-white text-sm font-bold shadow-md hover:opacity-90 disabled:opacity-60"
              style={{ background: 'linear-gradient(to right, #004d64, #006684)' }}>
              {isPending ? 'Opslaan…' : bestaand ? 'Wijziging doorvoeren' : 'Contract aanmaken'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Uitschrijven Modal ───────────────────────────────────────────────────────

function UitschrijvenModal({ kindId, naam, onClose }: { kindId: string; naam: string; onClose: () => void }) {
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      await kindUitschrijven(kindId, fd)
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4">
        <div className="px-6 py-5 border-b border-slate-100">
          <h3 className="text-lg font-black text-[#ba1a1a]" style={{ fontFamily: 'Manrope, sans-serif' }}>Kind uitschrijven</h3>
          <p className="text-sm text-slate-500 mt-1">{naam}</p>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="bg-[#ba1a1a]/10 rounded-xl p-3 text-xs text-[#ba1a1a] flex items-start gap-2">
            <span className="material-symbols-outlined text-sm mt-0.5">warning</span>
            Alle actieve contracten worden beëindigd. Gegevens blijven bewaard conform wettelijke bewaartermijn.
          </div>
          <div className="space-y-1.5">
            <label className={labelCls}>Datum uitschrijving *</label>
            <input type="date" name="datum_uitschrijving" required className={inputCls}
              defaultValue={new Date().toISOString().slice(0, 10)} />
          </div>
          <div className="space-y-1.5">
            <label className={labelCls}>Reden (optioneel)</label>
            <textarea name="reden_uitschrijving" rows={2} className={`${inputCls} resize-none`} placeholder="Verhuizing, opvang elders..." />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-500">Annuleren</button>
            <button type="submit" disabled={isPending}
              className="flex-1 py-2.5 rounded-xl text-white text-sm font-bold bg-[#ba1a1a] hover:opacity-90 disabled:opacity-60">
              {isPending ? 'Uitschrijven…' : 'Definitief uitschrijven'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── KindProfiel ─────────────────────────────────────────────────────────────

export default function KindProfiel({
  kind, adres, contactpersonen, medisch, contracten,
  notities, siblings, locaties, groepen,
}: Props) {
  const [actieveTab, setTab]           = useState<Tab>('algemeen')
  const [bewerkAlgemeen, setBewerkAlg] = useState(false)
  const [bewerkMedisch, setBewerkMed]  = useState(false)
  const [contractModal, setContractModal] = useState<null | 'nieuw' | ContractMetRefs>(null)
  const [uitschrijvenModal, setUit]    = useState(false)
  const [isPending, startTransition]   = useTransition()

  const naam = volledigeNaam(kind)
  const actieveContracten = contracten.filter(c => c.status === 'actief' || c.status === 'concept')
  const historiekContracten = contracten.filter(c => c.status === 'beëindigd' || c.status === 'opgeschort')

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'algemeen',   label: 'Algemeen',   icon: 'person' },
    { id: 'contacten',  label: 'Contacten',  icon: 'contacts' },
    { id: 'medisch',    label: 'Medisch',    icon: 'medical_information' },
    { id: 'contracten', label: 'Contracten', icon: 'description' },
    { id: 'notities',   label: 'Notities',   icon: 'sticky_note_2' },
  ]

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Top bar */}
      <header className="bg-white/70 backdrop-blur-md px-8 py-4 border-b border-slate-100 sticky top-0 z-40">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <Link href="/dashboard/kinderen" className="p-2 hover:bg-slate-100 rounded-xl text-slate-400">
              <span className="material-symbols-outlined">arrow_back</span>
            </Link>
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-[#bee9ff]/60 flex items-center justify-center text-[#004d64] font-black text-base">
                {kind.voornaam[0]}{kind.achternaam[0]}
              </div>
              <div>
                <h2 className="text-xl font-black text-[#004d64]" style={{ fontFamily: 'Manrope, sans-serif' }}>{naam}</h2>
                <p className="text-xs text-slate-400">
                  {leeftijdStr(kind.geboortedatum, kind.verwachte_geboortedatum) ?? 'Geboortedatum onbekend'}
                  {kind.geboortedatum && ` · ${new Date(kind.geboortedatum).toLocaleDateString('nl-NL')}`}
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!kind.actief && (
              <span className="px-3 py-1 bg-slate-100 text-slate-500 text-xs font-bold rounded-full">Gearchiveerd</span>
            )}
            {kind.actief && (
              <button onClick={() => setUit(true)} className="px-4 py-2 text-sm font-semibold text-[#ba1a1a] border border-[#ba1a1a]/30 rounded-xl hover:bg-[#ba1a1a]/5 transition-colors">
                Uitschrijven
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                actieveTab === t.id
                  ? 'bg-[#004d64] text-white'
                  : 'text-slate-500 hover:text-[#004d64] hover:bg-slate-100'
              }`}
            >
              <span className="material-symbols-outlined text-base">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>
      </header>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto px-8 py-8">

        {/* ─ Algemeen ──────────────────────────────────────────── */}
        {actieveTab === 'algemeen' && (
          <div className="max-w-2xl space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-black text-[#004d64]" style={{ fontFamily: 'Manrope, sans-serif' }}>Basisgegevens</h3>
                <button onClick={() => setBewerkAlg(!bewerkAlgemeen)} className="text-xs font-bold text-[#006684] hover:underline flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">{bewerkAlgemeen ? 'close' : 'edit'}</span>
                  {bewerkAlgemeen ? 'Annuleren' : 'Bewerken'}
                </button>
              </div>

              {bewerkAlgemeen ? (
                <form action={(fd) => {
                  startTransition(async () => {
                    await kindUpdaten(kind.id, fd)
                    setBewerkAlg(false)
                  })
                }} className="space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className={labelCls}>Voornaam</label>
                      <input name="voornaam" defaultValue={kind.voornaam} className={inputCls} required />
                    </div>
                    <div>
                      <label className={labelCls}>Tussenvoegsel</label>
                      <input name="tussenvoegsel" defaultValue={kind.tussenvoegsel ?? ''} className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>Achternaam</label>
                      <input name="achternaam" defaultValue={kind.achternaam} className={inputCls} required />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelCls}>Geboortedatum</label>
                      <input type="date" name="geboortedatum" defaultValue={kind.geboortedatum ?? ''} className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>Geslacht</label>
                      <select name="geslacht" defaultValue={kind.geslacht ?? ''} className={inputCls}>
                        <option value="">—</option>
                        <option value="man">Jongen</option>
                        <option value="vrouw">Meisje</option>
                        <option value="onbekend">Onbekend</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className={labelCls}>Straat</label>
                      <input name="straat" defaultValue={adres?.straat ?? ''} className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>Huisnummer</label>
                      <input name="huisnummer" defaultValue={adres?.huisnummer ?? ''} className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>Postcode</label>
                      <input name="postcode" defaultValue={adres?.postcode ?? ''} className={inputCls} />
                    </div>
                  </div>
                  <div>
                    <label className={labelCls}>Woonplaats</label>
                    <input name="woonplaats" defaultValue={adres?.woonplaats ?? ''} className={inputCls} />
                  </div>
                  <button type="submit" disabled={isPending}
                    className="px-6 py-2.5 rounded-xl text-white text-sm font-bold shadow-md hover:opacity-90 disabled:opacity-60"
                    style={{ background: 'linear-gradient(to right, #004d64, #006684)' }}>
                    {isPending ? 'Opslaan…' : 'Opslaan'}
                  </button>
                </form>
              ) : (
                <dl className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
                  {[
                    ['Volledige naam', naam],
                    ['Geboortedatum', kind.geboortedatum ? new Date(kind.geboortedatum).toLocaleDateString('nl-NL') : kind.verwachte_geboortedatum ? `Verwacht: ${new Date(kind.verwachte_geboortedatum).toLocaleDateString('nl-NL')}` : '—'],
                    ['Leeftijd', leeftijdStr(kind.geboortedatum, kind.verwachte_geboortedatum) ?? '—'],
                    ['Geslacht', kind.geslacht === 'man' ? 'Jongen' : kind.geslacht === 'vrouw' ? 'Meisje' : kind.geslacht === 'onbekend' ? 'Onbekend' : '—'],
                    ['Adres', adres ? `${adres.straat} ${adres.huisnummer}, ${adres.postcode} ${adres.woonplaats}` : '—'],
                    ['Aangemeld op', new Date(kind.aangemeld_op).toLocaleDateString('nl-NL')],
                  ].map(([k, v]) => (
                    <div key={k}>
                      <dt className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{k}</dt>
                      <dd className="mt-0.5 font-semibold text-[#181c1d]">{v}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>

            {/* Siblings */}
            {siblings.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                <h3 className="font-black text-[#004d64] mb-4" style={{ fontFamily: 'Manrope, sans-serif' }}>Broers & Zussen</h3>
                <div className="space-y-2">
                  {siblings.map(s => {
                    const sk = s.kind as Kind
                    return sk ? (
                      <Link key={s.siblingId} href={`/dashboard/kinderen/${sk.id}`}
                        className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors">
                        <div className="w-8 h-8 rounded-full bg-[#bee9ff]/60 flex items-center justify-center text-[#004d64] font-bold text-xs">
                          {sk.voornaam[0]}{sk.achternaam[0]}
                        </div>
                        <span className="text-sm font-semibold text-[#181c1d]">{volledigeNaam(sk)}</span>
                        <span className="material-symbols-outlined text-slate-300 text-sm ml-auto">chevron_right</span>
                      </Link>
                    ) : null
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─ Contacten ─────────────────────────────────────────── */}
        {actieveTab === 'contacten' && (
          <div className="max-w-2xl space-y-4">
            {contactpersonen.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-100 p-10 text-center">
                <span className="material-symbols-outlined text-4xl text-slate-200 block mb-2">contacts</span>
                <p className="text-slate-400 font-semibold">Nog geen contactpersonen</p>
              </div>
            ) : contactpersonen.map(cp => (
              <div key={cp.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-black text-[#181c1d]" style={{ fontFamily: 'Manrope, sans-serif' }}>
                      {cp.voornaam} {cp.achternaam}
                    </p>
                    <p className="text-xs text-slate-400 capitalize">{cp.relatie_tot_kind ?? cp.rol.replace('1','').replace('2','')}</p>
                  </div>
                  <div className="flex gap-2">
                    {cp.machtigt_ophalen && <span className="text-[10px] font-bold bg-[#8df4ed]/40 text-[#006a66] px-2 py-1 rounded-full">Ophalen</span>}
                    {cp.ontvangt_factuur && <span className="text-[10px] font-bold bg-[#bee9ff]/60 text-[#004d64] px-2 py-1 rounded-full">Factuur</span>}
                  </div>
                </div>
                <dl className="grid grid-cols-2 gap-3 text-sm">
                  {cp.telefoon_mobiel && <div><dt className={labelCls}>Mobiel</dt><dd className="font-semibold">{cp.telefoon_mobiel}</dd></div>}
                  {cp.email && <div><dt className={labelCls}>Email</dt><dd className="font-semibold truncate">{cp.email}</dd></div>}
                </dl>
              </div>
            ))}
          </div>
        )}

        {/* ─ Medisch ───────────────────────────────────────────── */}
        {actieveTab === 'medisch' && (
          <div className="max-w-2xl space-y-4">
            {/* Foto toestemming banner */}
            <div className={`rounded-2xl p-4 flex items-center gap-3 ${medisch?.foto_toestemming ? 'bg-[#8df4ed]/30' : 'bg-slate-100'}`}>
              <span className={`material-symbols-outlined ${medisch?.foto_toestemming ? 'text-[#006a66]' : 'text-slate-400'}`}>
                {medisch?.foto_toestemming ? 'photo_camera' : 'no_photography'}
              </span>
              <span className={`text-sm font-semibold ${medisch?.foto_toestemming ? 'text-[#006a66]' : 'text-slate-500'}`}>
                Foto-toestemming: {medisch?.foto_toestemming ? 'Ja — foto\'s publiceren toegestaan' : 'Nee — geen foto\'s publiceren'}
              </span>
            </div>

            {/* Allergie waarschuwing */}
            {medisch?.allergieeen && (
              <div className="bg-[#ba1a1a]/10 border border-[#ba1a1a]/30 rounded-2xl p-4 flex items-start gap-3">
                <span className="material-symbols-outlined text-[#ba1a1a]">warning</span>
                <div>
                  <p className="text-sm font-black text-[#ba1a1a]">Allergie / Medische aandacht</p>
                  <p className="text-sm text-[#ba1a1a]/80 mt-1">{medisch.allergieeen}</p>
                </div>
              </div>
            )}

            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-black text-[#004d64]" style={{ fontFamily: 'Manrope, sans-serif' }}>Medische gegevens</h3>
                <button onClick={() => setBewerkMed(!bewerkMedisch)} className="text-xs font-bold text-[#006684] hover:underline flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">{bewerkMedisch ? 'close' : 'edit'}</span>
                  {bewerkMedisch ? 'Annuleren' : 'Bewerken'}
                </button>
              </div>

              {bewerkMedisch ? (
                <form action={(fd) => {
                  startTransition(async () => {
                    await medischUpdaten(kind.id, fd)
                    setBewerkMed(false)
                  })
                }} className="space-y-4">
                  {[
                    ['allergieeen',    'Allergieën'],
                    ['medicatie',      'Medicatie (naam, dosering, tijdstip)'],
                    ['dieetwensen',    'Dieetwensen'],
                    ['zorgbehoeften',  'Zorgbehoeften / Extra ondersteuning'],
                    ['huisarts',       'Huisarts (naam + telefoon)'],
                    ['zorgverzekering','Zorgverzekering (verzekeraar + polisnummer)'],
                    ['bijzonderheden', 'Overige bijzonderheden'],
                  ].map(([name, label]) => (
                    <div key={name}>
                      <label className={labelCls}>{label}</label>
                      <textarea name={name} rows={2} defaultValue={(medisch as Record<string,unknown>)?.[name] as string ?? ''}
                        className={`${inputCls} resize-none`} />
                    </div>
                  ))}
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" name="foto_toestemming" defaultChecked={medisch?.foto_toestemming ?? false} className="w-4 h-4 accent-[#004d64]" />
                    <span className="text-sm text-slate-600">Foto-toestemming (publicatie in app/nieuwsbrief)</span>
                  </label>
                  <button type="submit" disabled={isPending}
                    className="px-6 py-2.5 rounded-xl text-white text-sm font-bold shadow-md hover:opacity-90 disabled:opacity-60"
                    style={{ background: 'linear-gradient(to right, #004d64, #006684)' }}>
                    {isPending ? 'Opslaan…' : 'Opslaan'}
                  </button>
                </form>
              ) : (
                <dl className="space-y-4 text-sm">
                  {[
                    ['Allergieën', medisch?.allergieeen],
                    ['Medicatie', medisch?.medicatie],
                    ['Dieetwensen', medisch?.dieetwensen],
                    ['Zorgbehoeften', medisch?.zorgbehoeften],
                    ['Huisarts', medisch?.huisarts],
                    ['Zorgverzekering', medisch?.zorgverzekering],
                    ['Bijzonderheden', medisch?.bijzonderheden],
                  ].map(([k, v]) => (
                    <div key={k as string}>
                      <dt className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{k}</dt>
                      <dd className="mt-0.5 text-[#181c1d] whitespace-pre-wrap">{v || <span className="text-slate-300">—</span>}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>
          </div>
        )}

        {/* ─ Contracten ────────────────────────────────────────── */}
        {actieveTab === 'contracten' && (
          <div className="max-w-3xl space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-[#004d64] text-lg" style={{ fontFamily: 'Manrope, sans-serif' }}>Contracten</h3>
              {kind.actief && (
                <button onClick={() => setContractModal('nieuw')}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-bold shadow hover:opacity-90"
                  style={{ background: 'linear-gradient(to right, #004d64, #006684)' }}>
                  <span className="material-symbols-outlined text-base">add</span>
                  Nieuw contract
                </button>
              )}
            </div>

            {/* Actieve + concept contracten */}
            {actieveContracten.length > 0 && (
              <div className="space-y-3">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Actief / Concept</p>
                {actieveContracten.map(c => {
                  const cfg = STATUS_CFG[c.status]
                  return (
                    <div key={c.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${cfg.bg} ${cfg.text}`}>{cfg.label}</span>
                            <span className="text-xs text-slate-400 font-semibold">{OPVANG_LABEL[c.opvangtype]}</span>
                          </div>
                          <p className="font-bold text-[#181c1d]">{c.locaties?.naam ?? '—'}{c.groepen ? ` · ${c.groepen.naam}` : ''}</p>
                        </div>
                        <div className="flex gap-2">
                          {c.status === 'concept' && (
                            <button onClick={() => startTransition(async () => { await contractActiveren(c.id, kind.id) })}
                              className="px-3 py-1.5 text-xs font-bold bg-[#006a66] text-white rounded-lg hover:opacity-90">
                              Activeren
                            </button>
                          )}
                          {c.status === 'actief' && (
                            <button onClick={() => setContractModal(c)}
                              className="px-3 py-1.5 text-xs font-bold border border-slate-200 text-slate-500 rounded-lg hover:bg-slate-50">
                              Wijziging
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Zorgdagen</p>
                          <div className="flex gap-0.5 mt-1">
                            {DAG_LABELS.map((d, i) => (
                              <span key={i} className={`w-6 h-6 rounded text-[10px] font-bold flex items-center justify-center ${
                                c.zorgdagen.includes(i) ? 'bg-[#004d64] text-white' : 'bg-slate-100 text-slate-300'
                              }`}>{d[0]}</span>
                            ))}
                          </div>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Startdatum</p>
                          <p className="font-semibold mt-1">{new Date(c.startdatum).toLocaleDateString('nl-NL')}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Uren / dag</p>
                          <p className="font-semibold mt-1">{c.uren_per_dag} uur</p>
                        </div>
                      </div>
                      {c.notities && (
                        <p className="mt-3 text-xs text-slate-400 flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-sm">info</span>{c.notities}
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {/* Historiek */}
            {historiekContracten.length > 0 && (
              <div className="space-y-3">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Historiek</p>
                {historiekContracten.map(c => {
                  const cfg = STATUS_CFG[c.status]
                  return (
                    <div key={c.id} className="bg-slate-50 rounded-2xl border border-slate-100 p-4 opacity-70">
                      <div className="flex items-center gap-3 text-sm">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${cfg.bg} ${cfg.text}`}>{cfg.label}</span>
                        <span className="font-semibold text-slate-600">{c.locaties?.naam ?? '—'}</span>
                        <span className="text-slate-400">{OPVANG_LABEL[c.opvangtype]}</span>
                        <span className="text-slate-400 ml-auto text-xs">
                          {new Date(c.startdatum).toLocaleDateString('nl-NL')}
                          {c.einddatum && ` → ${new Date(c.einddatum).toLocaleDateString('nl-NL')}`}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {contracten.length === 0 && (
              <div className="bg-white rounded-2xl border border-slate-100 p-10 text-center">
                <span className="material-symbols-outlined text-4xl text-slate-200 block mb-2">description</span>
                <p className="text-slate-400 font-semibold">Geen contracten</p>
                <p className="text-slate-300 text-sm mt-1">Maak een contract aan met de knop hierboven.</p>
              </div>
            )}
          </div>
        )}

        {/* ─ Notities ──────────────────────────────────────────── */}
        {actieveTab === 'notities' && (
          <div className="max-w-2xl space-y-4">
            <form action={(fd) => {
              startTransition(async () => { await notitieToevoegen(kind.id, fd) })
            }} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 space-y-3">
              <textarea name="tekst" rows={3} required
                className={`${inputCls} resize-none`}
                placeholder="Interne notitie toevoegen (alleen zichtbaar voor medewerkers)..." />
              <div className="flex justify-end">
                <button type="submit" disabled={isPending}
                  className="px-5 py-2 rounded-xl text-white text-sm font-bold shadow hover:opacity-90 disabled:opacity-60"
                  style={{ background: 'linear-gradient(to right, #004d64, #006684)' }}>
                  {isPending ? 'Opslaan…' : 'Notitie opslaan'}
                </button>
              </div>
            </form>

            {notities.map(n => (
              <div key={n.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
                <p className="text-sm text-[#181c1d] whitespace-pre-wrap">{n.tekst}</p>
                <p className="text-[11px] text-slate-400 mt-3">
                  {new Date(n.created_at).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            ))}

            {notities.length === 0 && (
              <div className="text-center py-10 text-slate-400">
                <span className="material-symbols-outlined text-4xl text-slate-200 block mb-2">sticky_note_2</span>
                Nog geen notities
              </div>
            )}
          </div>
        )}
      </div>

      {/* Contract modal */}
      {contractModal && (
        <ContractForm
          kindId={kind.id}
          locaties={locaties}
          groepen={groepen}
          bestaand={contractModal === 'nieuw' ? undefined : contractModal}
          onClose={() => setContractModal(null)}
        />
      )}

      {/* Uitschrijven modal */}
      {uitschrijvenModal && (
        <UitschrijvenModal kindId={kind.id} naam={naam} onClose={() => setUit(false)} />
      )}
    </div>
  )
}
