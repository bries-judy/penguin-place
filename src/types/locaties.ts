// ─── Enum types ───────────────────────────────────────────────────────────────

export type LocatieType = 'kdv' | 'bso' | 'peuterspeelzaal' | 'gastouder' | 'combinatie'
export type LocatieStatus = 'actief' | 'inactief' | 'in_opbouw'
export type GroepStatus = 'actief' | 'gesloten' | 'alleen_wachtlijst'
export type InspectieOordeel = 'goed' | 'voldoende' | 'onvoldoende'
export type CaoType = 'kinderopvang' | 'sociaal_werk' | 'overig'
export type DagVanDeWeek = 'ma' | 'di' | 'wo' | 'do' | 'vr' | 'za' | 'zo'

// Bestaande enums (uit 001_core_schema.sql)
export type Opvangtype = 'kdv' | 'bso' | 'peuteropvang' | 'gastouder'
export type Leeftijdscategorie = 'baby' | 'dreumes' | 'peuter' | 'bso'

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface Locatie {
  id: string
  organisatie_id: string
  naam: string
  adres: string
  postcode: string
  plaats: string
  label: string
  actief: boolean
  // Nieuw in 013
  code: string | null
  type: LocatieType | null
  status: LocatieStatus
  huisnummer: string
  land: string
  telefoon: string
  email: string
  website: string | null
  lrk_nummer: string | null
  ggd_regio: string | null
  laatste_inspectie_datum: string | null  // ISO date string
  inspectie_oordeel: InspectieOordeel | null
  volgende_inspectie_datum: string | null  // ISO date string
  vergunning_geldig_tot: string | null     // ISO date string
  cao: CaoType | null
  locatiemanager_id: string | null
  plaatsvervangend_manager_id: string | null
  noodcontact_naam: string | null
  noodcontact_telefoon: string | null
  iban: string | null
  kvk_nummer: string | null
  buitenspeelruimte: boolean
  buitenspeelruimte_m2: number | null
  heeft_keuken: boolean
  rolstoeltoegankelijk: boolean
  parkeerplaatsen: number | null
  notities: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface Groep {
  id: string
  locatie_id: string
  naam: string
  opvangtype: Opvangtype
  leeftijdscategorie: Leeftijdscategorie
  min_leeftijd_maanden: number
  max_leeftijd_maanden: number
  max_capaciteit: number
  actief: boolean
  // Nieuw in 013
  status: GroepStatus
  m2: number | null
  bkr_ratio: string | null
  ruimtenaam: string | null
  notities: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
  // Berekend veld (niet opgeslagen)
  m2_per_kind: number | null
}

export interface OpeningstijdenRegel {
  id: string
  locatie_id: string
  dag_van_week: DagVanDeWeek
  is_open: boolean
  open_tijd: string | null   // "HH:MM"
  sluit_tijd: string | null  // "HH:MM"
}

export interface OpeningstijdenUitzondering {
  id: string
  locatie_id: string
  start_datum: string   // ISO date string
  eind_datum: string    // ISO date string
  is_gesloten: boolean
  open_tijd: string | null   // "HH:MM"
  sluit_tijd: string | null  // "HH:MM"
  omschrijving: string
  created_at: string
  updated_at: string
}

// ─── Weergave labels ──────────────────────────────────────────────────────────

export const LOCATIE_TYPE_LABELS: Record<LocatieType, string> = {
  kdv:             'Kinderdagverblijf',
  bso:             'Buitenschoolse opvang',
  peuterspeelzaal: 'Peuterspeelzaal',
  gastouder:       'Gastouderopvang',
  combinatie:      'Combinatielocatie',
}

export const LOCATIE_STATUS_LABELS: Record<LocatieStatus, string> = {
  actief:    'Actief',
  inactief:  'Inactief',
  in_opbouw: 'In opbouw',
}

export const GROEP_STATUS_LABELS: Record<GroepStatus, string> = {
  actief:            'Actief',
  gesloten:          'Gesloten',
  alleen_wachtlijst: 'Alleen wachtlijst',
}

export const DAG_LABELS: Record<DagVanDeWeek, string> = {
  ma: 'Maandag',
  di: 'Dinsdag',
  wo: 'Woensdag',
  do: 'Donderdag',
  vr: 'Vrijdag',
  za: 'Zaterdag',
  zo: 'Zondag',
}
