'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

// ─── Kind aanmaken ────────────────────────────────────────────────────────────

export async function kindAanmaken(formData: FormData) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Niet ingelogd')

  // Profiel ophalen voor organisatie_id
  const { data: profile } = await supabase
    .from('profiles')
    .select('organisatie_id')
    .eq('id', user.id)
    .single()
  if (!profile?.organisatie_id) throw new Error('Geen organisatie gevonden')

  const voornaam    = formData.get('voornaam') as string
  const tussenvoegsel = (formData.get('tussenvoegsel') as string) || null
  const achternaam  = formData.get('achternaam') as string
  const geboortedatum = formData.get('geboortedatum') as string || null
  const verwachte_geboortedatum = formData.get('verwachte_geboortedatum') as string || null
  const geslacht    = formData.get('geslacht') as string || null
  const bsn         = (formData.get('bsn') as string) || null

  // 1. Kind aanmaken
  const { data: kind, error: kindError } = await supabase
    .from('kinderen')
    .insert({
      organisatie_id: profile.organisatie_id,
      voornaam,
      tussenvoegsel,
      achternaam,
      geboortedatum:            geboortedatum || null,
      verwachte_geboortedatum:  verwachte_geboortedatum || null,
      geslacht:                 geslacht as 'man' | 'vrouw' | 'onbekend' | null,
      bsn,
      actief: true,
    })
    .select('id')
    .single()

  if (kindError || !kind) return { error: kindError?.message ?? 'Onbekende fout' }

  // 2. Adres aanmaken (optioneel)
  const straat = formData.get('straat') as string
  if (straat) {
    await supabase.from('adressen').insert({
      kind_id:    kind.id,
      straat,
      huisnummer: formData.get('huisnummer') as string,
      postcode:   formData.get('postcode') as string,
      woonplaats: formData.get('woonplaats') as string,
    })
  }

  // 3. Contactpersoon aanmaken
  const cp_voornaam = formData.get('cp_voornaam') as string
  if (cp_voornaam) {
    await supabase.from('contactpersonen').insert({
      kind_id:                  kind.id,
      rol:                      (formData.get('cp_rol') as 'ouder1' | 'ouder2' | 'voogd' | 'noodcontact') ?? 'ouder1',
      voornaam:                 cp_voornaam,
      achternaam:               formData.get('cp_achternaam') as string,
      telefoon_mobiel:          (formData.get('cp_telefoon') as string) || null,
      email:                    (formData.get('cp_email') as string) || null,
      relatie_tot_kind:         (formData.get('cp_relatie') as string) || null,
      machtigt_ophalen:         formData.get('cp_ophalen') === 'on',
      ontvangt_factuur:         formData.get('cp_factuur') === 'on',
      ontvangt_correspondentie: formData.get('cp_correspondentie') === 'on',
    })
  }

  revalidatePath('/dashboard/kinderen')
  redirect(`/dashboard/kinderen/${kind.id}`)
}

// ─── Kind updaten ─────────────────────────────────────────────────────────────

export async function kindUpdaten(kindId: string, formData: FormData) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any

  await supabase.from('kinderen').update({
    voornaam:                formData.get('voornaam') as string,
    tussenvoegsel:           (formData.get('tussenvoegsel') as string) || null,
    achternaam:              formData.get('achternaam') as string,
    geboortedatum:           (formData.get('geboortedatum') as string) || null,
    verwachte_geboortedatum: (formData.get('verwachte_geboortedatum') as string) || null,
    geslacht:                (formData.get('geslacht') as 'man' | 'vrouw' | 'onbekend') || null,
    bsn:                     (formData.get('bsn') as string) || null,
  }).eq('id', kindId)

  // Adres upsert
  const straat = formData.get('straat') as string
  if (straat) {
    await supabase.from('adressen').upsert({
      kind_id:    kindId,
      straat,
      huisnummer: formData.get('huisnummer') as string,
      postcode:   formData.get('postcode') as string,
      woonplaats: formData.get('woonplaats') as string,
    }, { onConflict: 'kind_id' })
  }

  revalidatePath(`/dashboard/kinderen/${kindId}`)
  return { success: true }
}

// ─── Medisch updaten ──────────────────────────────────────────────────────────

export async function medischUpdaten(kindId: string, formData: FormData) {
  const supabase = await createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any).from('medisch_gegevens').upsert({
    kind_id:          kindId,
    allergieeen:      (formData.get('allergieeen') as string) || null,
    medicatie:        (formData.get('medicatie') as string) || null,
    dieetwensen:      (formData.get('dieetwensen') as string) || null,
    zorgbehoeften:    (formData.get('zorgbehoeften') as string) || null,
    huisarts:         (formData.get('huisarts') as string) || null,
    zorgverzekering:  (formData.get('zorgverzekering') as string) || null,
    foto_toestemming: formData.get('foto_toestemming') === 'on',
    bijzonderheden:   (formData.get('bijzonderheden') as string) || null,
  }, { onConflict: 'kind_id' })

  revalidatePath(`/dashboard/kinderen/${kindId}`)
  return { success: true }
}

// ─── Contactpersoon toevoegen/updaten ─────────────────────────────────────────

export async function contactpersoonOpslaan(kindId: string, formData: FormData) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any
  const contactId = formData.get('contact_id') as string | null

  const data = {
    kind_id:                  kindId,
    rol:                      formData.get('rol') as 'ouder1' | 'ouder2' | 'voogd' | 'noodcontact',
    voornaam:                 formData.get('voornaam') as string,
    achternaam:               formData.get('achternaam') as string,
    telefoon_mobiel:          (formData.get('telefoon_mobiel') as string) || null,
    telefoon_prive:           (formData.get('telefoon_prive') as string) || null,
    email:                    (formData.get('email') as string) || null,
    relatie_tot_kind:         (formData.get('relatie_tot_kind') as string) || null,
    machtigt_ophalen:         formData.get('machtigt_ophalen') === 'on',
    ontvangt_factuur:         formData.get('ontvangt_factuur') === 'on',
    ontvangt_correspondentie: formData.get('ontvangt_correspondentie') === 'on',
  }

  if (contactId) {
    await supabase.from('contactpersonen').update(data).eq('id', contactId)
  } else {
    await supabase.from('contactpersonen').insert(data)
  }

  revalidatePath(`/dashboard/kinderen/${kindId}`)
  return { success: true }
}

// ─── Kind uitschrijven ────────────────────────────────────────────────────────

export async function kindUitschrijven(kindId: string, formData: FormData) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any
  const datum = formData.get('datum_uitschrijving') as string
  const reden = (formData.get('reden_uitschrijving') as string) || null

  // Kind deactiveren
  await supabase.from('kinderen').update({
    actief:               false,
    datum_uitschrijving:  datum,
    reden_uitschrijving:  reden,
  }).eq('id', kindId)

  // Alle actieve contracten beëindigen
  await supabase.from('contracten')
    .update({ status: 'beëindigd', einddatum: datum })
    .eq('kind_id', kindId)
    .in('status', ['actief', 'concept', 'opgeschort'])

  revalidatePath('/dashboard/kinderen')
  revalidatePath(`/dashboard/kinderen/${kindId}`)
  return { success: true }
}

// ─── Notitie toevoegen ────────────────────────────────────────────────────────

export async function notitieToevoegen(kindId: string, formData: FormData) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Niet ingelogd')

  const tekst = formData.get('tekst') as string
  if (!tekst?.trim()) return { error: 'Notitie is leeg' }

  await supabase.from('kind_notities').insert({
    kind_id: kindId,
    tekst:   tekst.trim(),
    user_id: user.id,
  })

  revalidatePath(`/dashboard/kinderen/${kindId}`)
  return { success: true }
}
