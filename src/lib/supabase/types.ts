export type Opvangtype = 'kdv' | 'bso' | 'peuteropvang' | 'gastouder'
export type FactuurStatus = 'draft' | 'sent' | 'paid' | 'overdue'
export type Leeftijdscategorie = 'baby' | 'dreumes' | 'peuter' | 'bso'
export type Contracttype = 'vast' | 'flex' | 'tijdelijk'
export type ContractStatus = 'actief' | 'wachtlijst' | 'beëindigd' | 'concept' | 'opgeschort'
export type AppRole = 'klantadviseur' | 'vestigingsmanager' | 'personeelsplanner' | 'regiomanager' | 'directie' | 'beheerder'
export type WachtlijstStatus = 'wachtend' | 'aangeboden' | 'geplaatst' | 'vervallen' | 'geannuleerd'
export type AanbiedingStatus = 'openstaand' | 'geaccepteerd' | 'geweigerd' | 'verlopen'
export type Geslacht = 'man' | 'vrouw' | 'onbekend'
export type ContactpersoonRol = 'ouder1' | 'ouder2' | 'voogd' | 'noodcontact'
export type Contractvorm = 'schoolweken' | 'standaard' | 'super_flexibel' | 'flexibel'
export type DagdeelEnum = 'ochtend' | 'middag' | 'hele_dag' | 'na_school' | 'voor_school' | 'studiedag_bso'
export type TariefStatus = 'concept' | 'actief' | 'vervallen'
export type KortingsTypeEnum = 'percentage' | 'vast_bedrag'
export type KortingsGrondslag = 'op_uurtarief' | 'op_maandprijs' | 'op_uren_per_maand'
export type ContractStatusNieuw = 'concept' | 'actief' | 'te_beeindigen' | 'beeindigd' | 'geannuleerd' | 'facturatie_fout'

export interface Database {
  public: {
    Tables: {
      organisaties: {
        Row: {
          id: string
          naam: string
          actief: boolean
          created_at: string
        }
        Insert: Omit<organisaties['Row'], 'id' | 'created_at'>
        Update: Partial<organisaties['Row']>
      }
      locaties: {
        Row: {
          id: string
          organisatie_id: string
          naam: string
          adres: string
          postcode: string
          plaats: string
          label: string
          actief: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<locaties['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<locaties['Row']>
      }
      groepen: {
        Row: {
          id: string
          locatie_id: string
          naam: string
          opvangtype: Opvangtype
          leeftijdscategorie: Leeftijdscategorie
          min_leeftijd_maanden: number
          max_leeftijd_maanden: number
          max_capaciteit: number
          actief: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<groepen['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<groepen['Row']>
      }
      kinderen: {
        Row: {
          id: string
          organisatie_id: string
          voornaam: string
          tussenvoegsel: string | null
          achternaam: string
          geboortedatum: string | null
          verwachte_geboortedatum: string | null
          bsn: string | null
          geslacht: Geslacht | null
          actief: boolean
          datum_uitschrijving: string | null
          reden_uitschrijving: string | null
          aangemeld_op: string
          created_at: string
          updated_at: string
        }
        Insert: Omit<kinderen['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<kinderen['Row']>
      }
      contracten: {
        Row: {
          id: string
          kind_id: string
          locatie_id: string
          groep_id: string | null
          opvangtype: Opvangtype
          contracttype: Contracttype
          status: ContractStatus
          zorgdagen: number[]
          uren_per_dag: number
          startdatum: string
          einddatum: string | null
          flexpool: boolean
          uurtarief: number | null
          maandprijs: number | null
          ondertekend_op: string | null
          ondertekend_door: string | null
          notities: string | null
          vorige_contract_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<contracten['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<contracten['Row']>
      }
      placements: {
        Row: {
          id: string
          organisatie_id: string
          kind_id: string
          contract_id: string
          groep_id: string
          startdatum: string
          einddatum: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<placements['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<placements['Row']>
      }
      adressen: {
        Row: {
          id: string
          kind_id: string
          straat: string
          huisnummer: string
          postcode: string
          woonplaats: string
          land: string
          created_at: string
          updated_at: string
        }
        Insert: Omit<adressen['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<adressen['Row']>
      }
      contactpersonen: {
        Row: {
          id: string
          kind_id: string
          rol: ContactpersoonRol
          voornaam: string
          achternaam: string
          telefoon_mobiel: string | null
          telefoon_prive: string | null
          telefoon_werk: string | null
          email: string | null
          relatie_tot_kind: string | null
          machtigt_ophalen: boolean
          ontvangt_factuur: boolean
          ontvangt_correspondentie: boolean
          bsn: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<contactpersonen['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<contactpersonen['Row']>
      }
      medisch_gegevens: {
        Row: {
          id: string
          kind_id: string
          allergieeen: string | null
          medicatie: string | null
          dieetwensen: string | null
          zorgbehoeften: string | null
          huisarts: string | null
          zorgverzekering: string | null
          foto_toestemming: boolean
          bijzonderheden: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<medisch_gegevens['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<medisch_gegevens['Row']>
      }
      siblings: {
        Row: {
          id: string
          kind_id_a: string
          kind_id_b: string
          organisatie_id: string
          created_at: string
        }
        Insert: Omit<siblings['Row'], 'id' | 'created_at'>
        Update: Partial<siblings['Row']>
      }
      flex_dagen: {
        Row: {
          id: string
          contract_id: string
          groep_id: string
          datum: string
          geannuleerd: boolean
          aangemaakt_door: string | null
          created_at: string
        }
        Insert: Omit<flex_dagen['Row'], 'id' | 'created_at'>
        Update: Partial<flex_dagen['Row']>
      }
      groepsoverdrachten: {
        Row: {
          id: string
          kind_id: string
          van_groep_id: string
          naar_groep_id: string
          overdrachtsdatum: string
          uitgevoerd: boolean
          aangemaakt_door: string | null
          created_at: string
        }
        Insert: Omit<groepsoverdrachten['Row'], 'id' | 'created_at'>
        Update: Partial<groepsoverdrachten['Row']>
      }
      kind_notities: {
        Row: {
          id: string
          kind_id: string
          tekst: string
          user_id: string
          created_at: string
        }
        Insert: Omit<kind_notities['Row'], 'id' | 'created_at'>
        Update: Partial<kind_notities['Row']>
      }
      capaciteit_overrides: {
        Row: {
          id: string
          groep_id: string
          max_capaciteit: number
          start_datum: string
          eind_datum: string
          reden: string
          aangemaakt_door: string | null
          created_at: string
        }
        Insert: Omit<capaciteit_overrides['Row'], 'id' | 'created_at'>
        Update: Partial<capaciteit_overrides['Row']>
      }
      profiles: {
        Row: {
          id: string
          organisatie_id: string | null
          naam: string
          email: string
          actief: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<profiles['Row'], 'created_at' | 'updated_at'>
        Update: Partial<profiles['Row']>
      }
      user_roles: {
        Row: {
          id: string
          user_id: string
          role: AppRole
        }
        Insert: Omit<user_roles['Row'], 'id'>
        Update: Partial<user_roles['Row']>
      }
      wachtlijst: {
        Row: {
          id: string
          organisatie_id: string
          kind_id: string
          opvangtype: Opvangtype
          gewenste_startdatum: string | null
          gewenste_dagen: number[]
          prioriteit: number
          status: WachtlijstStatus
          notities: string | null
          aangemeld_op: string
          created_at: string
          updated_at: string
        }
        Insert: Omit<wachtlijst['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<wachtlijst['Row']>
      }
      locatievoorkeuren: {
        Row: {
          id: string
          wachtlijst_id: string
          locatie_id: string
          voorkeur_volgorde: number
          created_at: string
        }
        Insert: Omit<locatievoorkeuren['Row'], 'id' | 'created_at'>
        Update: Partial<locatievoorkeuren['Row']>
      }
      aanbiedingen: {
        Row: {
          id: string
          wachtlijst_id: string
          locatie_id: string
          groep_id: string | null
          aangeboden_op: string
          verloopdatum: string | null
          status: AanbiedingStatus
          notities: string | null
          aangemaakt_door: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<aanbiedingen['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<aanbiedingen['Row']>
      }
      invoices: {
        Row: {
          id: string
          organisatie_id: string
          parent_id: string
          periode_start: string
          periode_eind: string
          totaal_bedrag: number
          status: FactuurStatus
          factuurnummer: string
          created_at: string
          updated_at: string
        }
        Insert: Omit<invoices['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<invoices['Row']>
      }
      invoice_lines: {
        Row: {
          id: string
          invoice_id: string
          contract_id: string
          kind_id: string
          omschrijving: string | null
          bedrag: number
          dagen_actief: number | null
          dagen_in_maand: number | null
          created_at: string
        }
        Insert: Omit<invoice_lines['Row'], 'id' | 'created_at'>
        Update: Partial<invoice_lines['Row']>
      }
      merken: {
        Row: {
          id: string
          organisatie_id: string
          code: string
          naam: string
          beschrijving: string | null
          actief: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<merken['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<merken['Row']>
      }
      merk_locaties: {
        Row: {
          merk_id: string
          locatie_id: string
        }
        Insert: merk_locaties['Row']
        Update: Partial<merk_locaties['Row']>
      }
      contracttypen: {
        Row: {
          id: string
          organisatie_id: string
          merk_id: string
          naam: string
          code: string
          opvangtype: Opvangtype
          contractvorm: Contractvorm
          beschrijving: string | null
          min_uren_maand: number | null
          min_dagdelen_week: number | null
          geldig_in_vakanties: boolean
          opvang_op_inschrijving: boolean
          annuleringstermijn_uren: number | null
          actief: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<contracttypen['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<contracttypen['Row']>
      }
      tarief_sets: {
        Row: {
          id: string
          organisatie_id: string
          merk_id: string
          contract_type_id: string
          jaar: number
          opvangtype: Opvangtype
          uurtarief: number
          max_overheidsuurprijs: number
          ingangsdatum: string
          status: TariefStatus
          created_at: string
          updated_at: string
        }
        Insert: Omit<tarief_sets['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<tarief_sets['Row']>
      }
      dagdeel_configuraties: {
        Row: {
          id: string
          organisatie_id: string
          locatie_id: string | null
          groep_id: string | null
          dagdeel_enum: DagdeelEnum
          starttijd: string
          eindtijd: string
          uren: number
          ingangsdatum: string
          created_at: string
        }
        Insert: Omit<dagdeel_configuraties['Row'], 'id' | 'created_at'>
        Update: Partial<dagdeel_configuraties['Row']>
      }
      feestdagen: {
        Row: {
          id: string
          organisatie_id: string
          datum: string
          naam: string
          locatie_id: string | null
          created_at: string
        }
        Insert: Omit<feestdagen['Row'], 'id' | 'created_at'>
        Update: Partial<feestdagen['Row']>
      }
      kortings_typen: {
        Row: {
          id: string
          organisatie_id: string
          code: string
          naam: string
          type_enum: KortingsTypeEnum
          waarde: number
          grondslag_enum: KortingsGrondslag
          max_kortingsbedrag: number | null
          stapelbaar: boolean
          vereist_documentatie: boolean
          actief: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<kortings_typen['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<kortings_typen['Row']>
      }
      kind_contract_kortingen: {
        Row: {
          id: string
          kind_contract_id: string
          kortings_type_id: string
          startdatum: string
          einddatum: string | null
          berekend_bedrag: number
          created_at: string
        }
        Insert: Omit<kind_contract_kortingen['Row'], 'id' | 'created_at'>
        Update: Partial<kind_contract_kortingen['Row']>
      }
    }
    Views: Record<string, never>
    Functions: {
      generate_maand_facturen: {
        Args: {
          p_organisatie_id: string
          p_jaar: number
          p_maand: number
        }
        Returns: GenerateMaandFacturenRow[]
      }
      check_factuur_integriteit: {
        Args: { p_organisatie_id?: string }
        Returns: FactuurIntegriteitRij[]
      }
    }
    Enums: {
      opvangtype: Opvangtype
      leeftijdscategorie: Leeftijdscategorie
      contracttype: Contracttype
      contract_status: ContractStatus
      app_role: AppRole
      wachtlijst_status: WachtlijstStatus
      aanbieding_status: AanbiedingStatus
      factuur_status: FactuurStatus
      contractvorm: Contractvorm
      dagdeel_enum: DagdeelEnum
      tarief_status: TariefStatus
      kortings_type_enum: KortingsTypeEnum
      kortings_grondslag: KortingsGrondslag
      contract_status_nieuw: ContractStatusNieuw
    }
  }
}

// Factuur function return types
export interface GenerateMaandFacturenRow {
  parent_naam: string
  parent_email: string | null
  invoice_id: string | null
  factuurnummer: string | null
  totaal_bedrag: number | null
  aantal_regels: number
  uitkomst: 'aangemaakt' | 'overgeslagen_bestaat' | 'overgeslagen_geen_tarief'
}

export interface FactuurIntegriteitRij {
  probleem: string
  invoice_id: string
  factuurnummer: string
}

// Handige type aliases
type Tables = Database['public']['Tables']
type organisaties = Tables['organisaties']
type locaties = Tables['locaties']
type groepen = Tables['groepen']
type kinderen = Tables['kinderen']
type contracten = Tables['contracten']
type placements = Tables['placements']
type flex_dagen = Tables['flex_dagen']
type groepsoverdrachten = Tables['groepsoverdrachten']
type kind_notities = Tables['kind_notities']
type capaciteit_overrides = Tables['capaciteit_overrides']
type profiles = Tables['profiles']
type user_roles = Tables['user_roles']
type wachtlijst = Tables['wachtlijst']
type locatievoorkeuren = Tables['locatievoorkeuren']
type aanbiedingen = Tables['aanbiedingen']
type adressen = Tables['adressen']
type contactpersonen = Tables['contactpersonen']
type medisch_gegevens = Tables['medisch_gegevens']
type siblings = Tables['siblings']
type invoices = Tables['invoices']
type invoice_lines = Tables['invoice_lines']
type merken = Tables['merken']
type merk_locaties = Tables['merk_locaties']
type contracttypen = Tables['contracttypen']
type tarief_sets = Tables['tarief_sets']
type dagdeel_configuraties = Tables['dagdeel_configuraties']
type feestdagen = Tables['feestdagen']
type kortings_typen = Tables['kortings_typen']
type kind_contract_kortingen = Tables['kind_contract_kortingen']

export type Organisatie = organisaties['Row']
export type Locatie = locaties['Row']
export type Groep = groepen['Row']
export type Kind = kinderen['Row']
export type Contract = contracten['Row']
export type Placement = placements['Row']
export type FlexDag = flex_dagen['Row']
export type Groepsoverdracht = groepsoverdrachten['Row']
export type KindNotitie = kind_notities['Row']
export type CapaciteitOverride = capaciteit_overrides['Row']
export type Profile = profiles['Row']
export type Wachtlijst = wachtlijst['Row']
export type Locatievoorkeur = locatievoorkeuren['Row']
export type Aanbieding = aanbiedingen['Row']
export type Adres = adressen['Row']
export type Contactpersoon = contactpersonen['Row']
export type MedischGegevens = medisch_gegevens['Row']
export type Sibling = siblings['Row']
export type Invoice = invoices['Row']
export type InvoiceLine = invoice_lines['Row']
export type Merk = merken['Row']
export type MerkLocatie = merk_locaties['Row']
export type ContractTypeNieuw = contracttypen['Row']
export type TariefSet = tarief_sets['Row']
export type DagdeelConfiguratie = dagdeel_configuraties['Row']
export type Feestdag = feestdagen['Row']
export type KortingsType = kortings_typen['Row']
export type KindContractKorting = kind_contract_kortingen['Row']

// Kindprofiel met alle gejoinde data
export interface KindMetData {
  kind: Kind
  adres: Adres | null
  contactpersonen: Contactpersoon[]
  medisch: MedischGegevens | null
  contracten: (Contract & { locaties: { naam: string } | null; groepen: { naam: string } | null })[]
  notities: { id: string; tekst: string; created_at: string }[]
  siblings: (Kind & { relatie: 'a' | 'b' })[]
}

// Wachtlijst met gejoinde data voor de UI
export interface WachtlijstEntry {
  id: string
  kind_id: string
  opvangtype: Opvangtype
  gewenste_startdatum: string | null
  gewenste_dagen: number[]
  prioriteit: number
  status: WachtlijstStatus
  notities: string | null
  aangemeld_op: string
  kinderen: {
    voornaam: string
    achternaam: string
    geboortedatum: string
  }
  locatievoorkeuren: {
    locatie_id: string
    voorkeur_volgorde: number
    locaties: { naam: string } | null
  }[]
  aanbiedingen: {
    id: string
    status: AanbiedingStatus
    aangeboden_op: string
    verloopdatum: string | null
    groep_id: string | null
  }[]
}

// Bezettingsdata voor het dashboard
export interface GroepBezetting {
  groep: Groep
  dagBezetting: {
    dag: number  // 0=ma t/m 4=vr
    aanwezig: number
    max: number
    percentage: number
    status: 'groen' | 'oranje' | 'rood'
  }[]
}
