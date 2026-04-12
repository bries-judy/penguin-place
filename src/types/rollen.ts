export type RolNaam =
  | 'klantadviseur'
  | 'vestigingsmanager'
  | 'personeelsplanner'
  | 'regiomanager'
  | 'directie'
  | 'beheerder'

export interface Rol {
  id: string
  organisatie_id: string
  naam: RolNaam
  omschrijving: string | null
  kleur: string
  is_systeem_rol: boolean
  created_at: string
  deleted_at: string | null
}

export interface Module {
  id: string
  sleutel: string
  naam: string
  omschrijving: string | null
  icoon: string | null
  volgorde: number
}

export interface RolRecht {
  id: string
  rol_id: string
  module_sleutel: string
  kan_lezen: boolean
  kan_aanmaken: boolean
  kan_wijzigen: boolean
  kan_verwijderen: boolean
}

export interface RolRechtInput {
  module_sleutel: string
  kan_lezen: boolean
  kan_aanmaken: boolean
  kan_wijzigen: boolean
  kan_verwijderen: boolean
}

export interface ProfielRol {
  id: string
  profiel_id: string
  rol_naam: RolNaam
  organisatie_id: string
  created_at: string
  deleted_at: string | null
}

export interface ProfielLocatie {
  id: string
  profiel_id: string
  locatie_id: string
  organisatie_id: string
  created_at: string
  deleted_at: string | null
}

export interface ProfielMetRollenEnLocaties {
  id: string
  naam: string
  email: string
  rol_namen: RolNaam[]
  locatie_ids: string[]
  locatie_namen: string[]
}
