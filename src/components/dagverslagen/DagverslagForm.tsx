'use client'

import { useState, useTransition } from 'react'
import { dagverslagAanmaken, dagverslagBijwerken } from '@/app/actions/dagverslagen'

const inputCls = 'w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-[#181c1d] bg-white focus:outline-none focus:ring-2 focus:ring-[#006684]/30 placeholder:text-slate-300'
const labelCls = 'text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5'

interface Dagverslag {
  id: string
  datum: string
  activiteiten: string | null
  eten_drinken: string | null
  slaaptijden: string | null
  stemming: string | null
  bijzonderheden: string | null
}

interface Props {
  kindId: string
  groepId: string
  bestaand?: Dagverslag
  onClose: () => void
}

export default function DagverslagForm({ kindId, groepId, bestaand, onClose }: Props) {
  const [isPending, startTransition] = useTransition()
  const [fout, setFout] = useState<string | null>(null)

  const isBewerken = !!bestaand

  function handleSubmit(formData: FormData) {
    setFout(null)
    startTransition(async () => {
      if (isBewerken) {
        const result = await dagverslagBijwerken(bestaand!.id, formData)
        if (result.error) { setFout(result.error); return }
      } else {
        formData.set('kind_id', kindId)
        formData.set('groep_id', groepId)
        const result = await dagverslagAanmaken(formData)
        if (result.error) { setFout(result.error); return }
      }
      onClose()
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-lg font-bold text-[#181c1d]">
            {isBewerken ? 'Dagverslag bewerken' : 'Nieuw dagverslag'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <form action={handleSubmit} className="p-6 space-y-4">
          {!isBewerken && (
            <div>
              <label className={labelCls}>Datum</label>
              <input type="date" name="datum" required
                defaultValue={new Date().toISOString().split('T')[0]}
                className={inputCls} />
            </div>
          )}

          <div>
            <label className={labelCls}>Activiteiten</label>
            <textarea name="activiteiten" rows={3}
              defaultValue={bestaand?.activiteiten ?? ''}
              className={`${inputCls} resize-none`}
              placeholder="Wat heeft het kind vandaag gedaan?" />
          </div>

          <div>
            <label className={labelCls}>Eten & drinken</label>
            <textarea name="eten_drinken" rows={2}
              defaultValue={bestaand?.eten_drinken ?? ''}
              className={`${inputCls} resize-none`}
              placeholder="Hoe ging het met eten en drinken?" />
          </div>

          <div>
            <label className={labelCls}>Slaaptijden</label>
            <input name="slaaptijden" type="text"
              defaultValue={bestaand?.slaaptijden ?? ''}
              className={inputCls}
              placeholder="Bijv. 12:30 - 14:00 (1,5 uur)" />
          </div>

          <div>
            <label className={labelCls}>Stemming</label>
            <input name="stemming" type="text"
              defaultValue={bestaand?.stemming ?? ''}
              className={inputCls}
              placeholder="Bijv. vrolijk, rustig, energiek" />
          </div>

          <div>
            <label className={labelCls}>Bijzonderheden</label>
            <textarea name="bijzonderheden" rows={2}
              defaultValue={bestaand?.bijzonderheden ?? ''}
              className={`${inputCls} resize-none`}
              placeholder="Overige opmerkingen" />
          </div>

          {!isBewerken && (
            <div>
              <label className={labelCls}>Foto&apos;s toevoegen</label>
              <input type="file" name="bestanden" multiple
                accept="image/jpeg,image/png,image/webp,image/heic"
                className="text-sm text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-[#006684]/10 file:px-4 file:py-2 file:text-sm file:font-medium file:text-[#006684] hover:file:bg-[#006684]/20" />
            </div>
          )}

          {fout && (
            <div className="bg-red-50 text-red-700 text-sm rounded-xl px-4 py-3">
              {fout}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="px-5 py-2 rounded-xl text-sm font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-50">
              Annuleren
            </button>
            <button type="submit" disabled={isPending}
              className="px-5 py-2 rounded-xl text-white text-sm font-bold shadow hover:opacity-90 disabled:opacity-60"
              style={{ background: 'linear-gradient(to right, #004d64, #006684)' }}>
              {isPending ? 'Opslaan…' : (isBewerken ? 'Opslaan' : 'Dagverslag aanmaken')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
