'use client'

import { useState, useTransition } from 'react'
import { dagverslagPubliceren, dagverslagVerwijderen } from '@/app/actions/dagverslagen'
import DagverslagForm from './DagverslagForm'

interface Dagverslag {
  id: string
  datum: string
  activiteiten: string | null
  eten_drinken: string | null
  slaaptijden: string | null
  stemming: string | null
  bijzonderheden: string | null
  gepubliceerd: boolean
  gepubliceerd_op: string | null
  auteur_id: string
  created_at: string
  media: { id: string; bestandsnaam: string }[]
}

interface Props {
  kindId: string
  groepId: string | null
  dagverslagen: Dagverslag[]
}

export default function DagverslagLijst({ kindId, groepId, dagverslagen }: Props) {
  const [modal, setModal] = useState<null | 'nieuw' | Dagverslag>(null)
  const [isPending, startTransition] = useTransition()

  function handlePubliceer(id: string) {
    startTransition(async () => {
      await dagverslagPubliceren(id)
    })
  }

  function handleVerwijder(id: string) {
    if (!confirm('Weet je zeker dat je dit dagverslag wilt verwijderen?')) return
    startTransition(async () => {
      await dagverslagVerwijderen(id)
    })
  }

  return (
    <div className="max-w-2xl space-y-4">
      {/* Header met knop */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          {dagverslagen.length} dagverslag{dagverslagen.length !== 1 ? 'en' : ''}
        </p>
        {groepId && (
          <button
            onClick={() => setModal('nieuw')}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-sm font-bold shadow hover:opacity-90"
            style={{ background: 'linear-gradient(to right, #004d64, #006684)' }}>
            <span className="material-symbols-outlined text-[18px]">add</span>
            Nieuw dagverslag
          </button>
        )}
        {!groepId && (
          <p className="text-xs text-amber-600">Kind heeft geen actieve groep — dagverslagen aanmaken is niet mogelijk.</p>
        )}
      </div>

      {/* Dagverslagen */}
      {dagverslagen.map(dv => (
        <div key={dv.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold text-[#181c1d]">
                {new Date(dv.datum).toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
              {dv.gepubliceerd ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#8df4ed]/40 text-[#006a66]">
                  <span className="material-symbols-outlined text-[14px]">check_circle</span>
                  Gepubliceerd
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700">
                  <span className="material-symbols-outlined text-[14px]">edit_note</span>
                  Concept
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {!dv.gepubliceerd && (
                <button
                  onClick={() => handlePubliceer(dv.id)}
                  disabled={isPending}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-[#006684] hover:bg-[#006684]/10 disabled:opacity-50"
                  title="Publiceren">
                  <span className="material-symbols-outlined text-[16px]">publish</span>
                  Publiceren
                </button>
              )}
              <button
                onClick={() => setModal(dv)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50"
                title="Bewerken">
                <span className="material-symbols-outlined text-[18px]">edit</span>
              </button>
              <button
                onClick={() => handleVerwijder(dv.id)}
                disabled={isPending}
                className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-50"
                title="Verwijderen">
                <span className="material-symbols-outlined text-[18px]">delete</span>
              </button>
            </div>
          </div>

          <div className="space-y-2 text-sm text-[#181c1d]">
            {dv.activiteiten && (
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase">Activiteiten</span>
                <p className="whitespace-pre-wrap">{dv.activiteiten}</p>
              </div>
            )}
            {dv.eten_drinken && (
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase">Eten & drinken</span>
                <p className="whitespace-pre-wrap">{dv.eten_drinken}</p>
              </div>
            )}
            {dv.slaaptijden && (
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase">Slaaptijden</span>
                <p>{dv.slaaptijden}</p>
              </div>
            )}
            {dv.stemming && (
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase">Stemming</span>
                <p>{dv.stemming}</p>
              </div>
            )}
            {dv.bijzonderheden && (
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase">Bijzonderheden</span>
                <p className="whitespace-pre-wrap">{dv.bijzonderheden}</p>
              </div>
            )}
          </div>

          {dv.media.length > 0 && (
            <div className="mt-3 flex items-center gap-1 text-xs text-slate-400">
              <span className="material-symbols-outlined text-[16px]">photo_library</span>
              {dv.media.length} foto{dv.media.length !== 1 ? "'s" : ''}
            </div>
          )}
        </div>
      ))}

      {dagverslagen.length === 0 && (
        <div className="text-center py-10 text-slate-400">
          <span className="material-symbols-outlined text-4xl text-slate-200 block mb-2">article</span>
          Nog geen dagverslagen
        </div>
      )}

      {/* Modal */}
      {modal && groepId && (
        <DagverslagForm
          kindId={kindId}
          groepId={groepId}
          bestaand={modal === 'nieuw' ? undefined : modal}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}
