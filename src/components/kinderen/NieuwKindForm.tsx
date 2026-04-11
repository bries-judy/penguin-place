'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { kindAanmaken } from '@/app/actions/kinderen'

interface Props {
  locaties: { id: string; naam: string }[]
}

const DAG_LABELS = ['Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag']

export default function NieuwKindForm({ locaties }: Props) {
  const [stap, setStap]             = useState<1 | 2 | 3>(1)
  const [preGeboorte, setPreGeb]    = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError]           = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    setError(null)
    startTransition(async () => {
      const result = await kindAanmaken(fd)
      if (result?.error) setError(result.error)
    })
  }

  const stapLabels = ['Kind', 'Contactpersoon', 'Adres']

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Top bar */}
      <header className="bg-white/70 backdrop-blur-md flex justify-between items-center px-8 py-4 border-b border-slate-100">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/kinderen" className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400">
            <span className="material-symbols-outlined">arrow_back</span>
          </Link>
          <h2 className="text-xl font-bold tracking-tight text-cyan-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Kind aanmelden
          </h2>
        </div>
        {/* Stap indicator */}
        <div className="flex items-center gap-2">
          {stapLabels.map((label, i) => {
            const nr = i + 1
            const actief = stap === nr
            const klaar  = stap > nr
            return (
              <div key={nr} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => stap > nr && setStap(nr as 1|2|3)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                    actief  ? 'bg-[#004d64] text-white' :
                    klaar   ? 'bg-[#8df4ed]/60 text-[#006a66] cursor-pointer hover:opacity-80' :
                              'bg-slate-100 text-slate-400'
                  }`}
                >
                  {klaar
                    ? <span className="material-symbols-outlined text-sm">check</span>
                    : <span>{nr}</span>
                  }
                  {label}
                </button>
                {i < 2 && <span className="text-slate-300 text-xs">›</span>}
              </div>
            )
          })}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-8 py-8">
        <form onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-8">

          {/* ─ Stap 1: Kind ─────────────────────────────────────── */}
          {stap === 1 && (
            <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 space-y-6">
              <div>
                <h3 className="text-lg font-black text-[#004d64]" style={{ fontFamily: 'Manrope, sans-serif' }}>Basisgegevens kind</h3>
                <p className="text-sm text-slate-400 mt-1">Vul de gegevens van het kind in.</p>
              </div>

              {/* Naam */}
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Voornaam *</label>
                  <input name="voornaam" required className={inputCls} placeholder="Emma" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Tussenvoegsel</label>
                  <input name="tussenvoegsel" className={inputCls} placeholder="de" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Achternaam *</label>
                  <input name="achternaam" required className={inputCls} placeholder="Vries" />
                </div>
              </div>

              {/* Geslacht */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Geslacht</label>
                <div className="flex gap-3">
                  {[['man','Jongen'],['vrouw','Meisje'],['onbekend','Onbekend']].map(([v,l]) => (
                    <label key={v} className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="geslacht" value={v} className="accent-[#004d64]" />
                      <span className="text-sm text-slate-600">{l}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Geboortedatum toggle */}
              <div className="space-y-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <div
                    onClick={() => setPreGeb(!preGeboorte)}
                    className={`w-10 h-6 rounded-full transition-colors relative ${preGeboorte ? 'bg-[#004d64]' : 'bg-slate-200'}`}
                  >
                    <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${preGeboorte ? 'left-5' : 'left-1'}`} />
                  </div>
                  <span className="text-sm font-semibold text-slate-600">Kind nog niet geboren (pre-registratie)</span>
                </label>

                {preGeboorte ? (
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Verwachte geboortedatum *</label>
                    <input type="date" name="verwachte_geboortedatum" required className={inputCls} />
                    <p className="text-[11px] text-slate-400">De werkelijke geboortedatum vul je later in via het kindprofiel.</p>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Geboortedatum *</label>
                    <input type="date" name="geboortedatum" required className={inputCls} />
                  </div>
                )}
              </div>

              {/* BSN */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">BSN (optioneel)</label>
                <input name="bsn" className={inputCls} placeholder="123456789" maxLength={9} />
                <p className="text-[11px] text-slate-400">9-cijferig burgerservicenummer — optioneel, kan later worden toegevoegd</p>
              </div>

              <div className="pt-4 flex justify-end">
                <button type="button" onClick={() => setStap(2)}
                  className="px-6 py-2.5 rounded-xl text-white text-sm font-bold shadow-md hover:opacity-90 transition-all"
                  style={{ background: 'linear-gradient(to right, #004d64, #006684)' }}>
                  Volgende — Contactpersoon
                </button>
              </div>
            </section>
          )}

          {/* ─ Stap 2: Contactpersoon ─────────────────────────── */}
          {stap === 2 && (
            <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 space-y-6">
              <div>
                <h3 className="text-lg font-black text-[#004d64]" style={{ fontFamily: 'Manrope, sans-serif' }}>Contactpersoon</h3>
                <p className="text-sm text-slate-400 mt-1">Vul de gegevens van ouder of verzorger in.</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Rol</label>
                <select name="cp_rol" className={inputCls}>
                  <option value="ouder1">Ouder / Verzorger 1</option>
                  <option value="ouder2">Ouder / Verzorger 2</option>
                  <option value="voogd">Voogd</option>
                  <option value="noodcontact">Noodcontact</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Voornaam *</label>
                  <input name="cp_voornaam" required className={inputCls} placeholder="Margreet" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Achternaam *</label>
                  <input name="cp_achternaam" required className={inputCls} placeholder="de Vries" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Mobiel *</label>
                  <input name="cp_telefoon" required className={inputCls} placeholder="06-12345678" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">E-mailadres</label>
                  <input type="email" name="cp_email" className={inputCls} placeholder="email@voorbeeld.nl" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Relatie tot kind</label>
                <input name="cp_relatie" className={inputCls} placeholder="moeder, vader, stiefvader..." />
              </div>

              <div className="space-y-3 border-t border-slate-100 pt-4">
                {[
                  ['cp_ophalen',         'Gemachtigd tot ophalen'],
                  ['cp_factuur',         'Ontvangt factuur'],
                  ['cp_correspondentie', 'Ontvangt correspondentie'],
                ].map(([name, label]) => (
                  <label key={name} className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" name={name} defaultChecked={name === 'cp_ophalen' || name === 'cp_factuur'} className="w-4 h-4 accent-[#004d64]" />
                    <span className="text-sm text-slate-600">{label}</span>
                  </label>
                ))}
              </div>

              <div className="pt-4 flex justify-between">
                <button type="button" onClick={() => setStap(1)} className={secondaryBtn}>Terug</button>
                <button type="button" onClick={() => setStap(3)}
                  className="px-6 py-2.5 rounded-xl text-white text-sm font-bold shadow-md hover:opacity-90 transition-all"
                  style={{ background: 'linear-gradient(to right, #004d64, #006684)' }}>
                  Volgende — Adres
                </button>
              </div>
            </section>
          )}

          {/* ─ Stap 3: Adres + opslaan ───────────────────────── */}
          {stap === 3 && (
            <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 space-y-6">
              <div>
                <h3 className="text-lg font-black text-[#004d64]" style={{ fontFamily: 'Manrope, sans-serif' }}>Adres</h3>
                <p className="text-sm text-slate-400 mt-1">Optioneel — kan later ook worden ingevuld.</p>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2 space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Straat</label>
                  <input name="straat" className={inputCls} placeholder="Segeerssingel" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Huisnummer</label>
                  <input name="huisnummer" className={inputCls} placeholder="14b" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Postcode</label>
                  <input name="postcode" className={inputCls} placeholder="4331 JH" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Woonplaats</label>
                  <input name="woonplaats" className={inputCls} placeholder="Middelburg" />
                </div>
              </div>

              {error && (
                <p className="text-sm text-[#ba1a1a] bg-[#ba1a1a]/10 px-4 py-3 rounded-xl">{error}</p>
              )}

              <div className="pt-4 flex justify-between">
                <button type="button" onClick={() => setStap(2)} className={secondaryBtn}>Terug</button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-8 py-2.5 rounded-xl text-white text-sm font-bold shadow-md hover:opacity-90 transition-all active:scale-95 disabled:opacity-60"
                  style={{ background: 'linear-gradient(to right, #004d64, #006684)' }}>
                  {isPending ? 'Aanmelden…' : 'Kind aanmelden'}
                </button>
              </div>
            </section>
          )}

        </form>
      </div>
    </div>
  )
}

const inputCls = 'w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-[#181c1d] bg-white focus:outline-none focus:ring-2 focus:ring-[#006684]/30 placeholder:text-slate-300'
const secondaryBtn = 'px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-500 hover:bg-slate-50 transition-colors'
// suppress unused var
void DAG_LABELS
