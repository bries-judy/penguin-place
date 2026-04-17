// ─── Ouder CRM — types ──────────────────────────────────────────────────────
//
// Zie docs/features/ouder-crm/spec-fase1.md voor de scope van deze types.
// Deze types matchen de aggregate-responses van de server actions in
// src/app/actions/ouders.ts en src/app/actions/ouderMemos.ts.

export type OuderMemoType      = 'telefoon' | 'gesprek' | 'notitie' | 'taak'
export type OuderMemoZichtbaar = 'alle_staff' | 'alleen_auteur' | 'team_locatie'
export type FollowUpStatus     = 'open' | 'afgerond' | 'geannuleerd'

export interface OuderMemo {
  id: string
  ouder_id: string
  auteur_id: string
  type: OuderMemoType
  onderwerp: string
  inhoud: string
  datum: string
  kind_id: string | null
  follow_up_datum: string | null
  follow_up_status: FollowUpStatus | null
  zichtbaar_voor: OuderMemoZichtbaar
  created_at: string
  updated_at: string
  deleted_at: string | null
  // joins
  auteur?: { naam: string }
  kind?: { voornaam: string; achternaam: string } | null
}

export interface OuderAuditEntry {
  veld: string
  oude_waarde: string | null
  nieuwe_waarde: string | null
  at: string
}

export interface OuderKindContract {
  id: string
  opvangtype: string
  status: string
  startdatum: string
  locatie_naam: string | null
  groep_naam: string | null
  dagen_per_week: number | null
}

export interface OuderKindRij {
  kind_id: string
  voornaam: string
  achternaam: string
  geboortedatum: string | null
  geslacht: string | null
  relatie: string
  contactpersoon_id: string | null
  contracten: OuderKindContract[]
  planned_days: string[] // bv. ['maandag', 'dinsdag', 'donderdag']
}

export interface OuderDetail {
  id: string
  voornaam: string
  achternaam: string
  email: string
  telefoon_mobiel: string | null
  actief: boolean
  created_at: string
  // aggregate
  kinderen: OuderKindRij[]
  openstaand_bedrag: number
  aantal_open_taken: number
  laatste_contact_datum: string | null
  laatste_contact_type: string | null
  actieve_contracten_count: number
  audit_log: OuderAuditEntry[]
}

export interface OuderLijstRij {
  id: string
  voornaam: string
  achternaam: string
  email: string
  telefoon_mobiel: string | null
  actief: boolean
  aantal_kinderen: number
  openstaand_bedrag: number
}

// ─── Ouder CRM — Fase 2a: e-mail-timeline ────────────────────────────────────

export type OuderEmailBron     = 'handmatig' | 'm365' | 'gmail' | 'imap' | 'seed'
export type OuderEmailRichting = 'inbound' | 'outbound'

export interface OuderEmailBijlage {
  id: string
  email_id: string
  bestandsnaam: string
  mime_type: string
  storage_path: string
  grootte_bytes: number | null
  volgorde: number
}

export interface OuderEmail {
  id: string
  ouder_id: string
  bron: OuderEmailBron
  richting: OuderEmailRichting
  message_id: string | null
  van_adres: string
  aan_adressen: string[]
  cc_adressen: string[]
  onderwerp: string
  body_plain: string | null
  body_html: string | null
  verzonden_op: string
  staff_id: string | null
  thread_id: string | null
  heeft_bijlagen: boolean
  created_at: string
  // joins
  staff?: { naam: string } | null
  bijlagen?: OuderEmailBijlage[]
}
