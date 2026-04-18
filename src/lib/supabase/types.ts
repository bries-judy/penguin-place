export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      aanbiedingen: {
        Row: {
          aangeboden_op: string | null
          aangemaakt_door: string | null
          created_at: string | null
          groep_id: string | null
          id: string
          locatie_id: string
          notities: string | null
          status: Database["public"]["Enums"]["aanbieding_status"] | null
          updated_at: string | null
          verloopdatum: string | null
          wachtlijst_id: string
        }
        Insert: {
          aangeboden_op?: string | null
          aangemaakt_door?: string | null
          created_at?: string | null
          groep_id?: string | null
          id?: string
          locatie_id: string
          notities?: string | null
          status?: Database["public"]["Enums"]["aanbieding_status"] | null
          updated_at?: string | null
          verloopdatum?: string | null
          wachtlijst_id: string
        }
        Update: {
          aangeboden_op?: string | null
          aangemaakt_door?: string | null
          created_at?: string | null
          groep_id?: string | null
          id?: string
          locatie_id?: string
          notities?: string | null
          status?: Database["public"]["Enums"]["aanbieding_status"] | null
          updated_at?: string | null
          verloopdatum?: string | null
          wachtlijst_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "aanbiedingen_groep_id_fkey"
            columns: ["groep_id"]
            isOneToOne: false
            referencedRelation: "groepen"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aanbiedingen_locatie_id_fkey"
            columns: ["locatie_id"]
            isOneToOne: false
            referencedRelation: "locaties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aanbiedingen_wachtlijst_id_fkey"
            columns: ["wachtlijst_id"]
            isOneToOne: false
            referencedRelation: "wachtlijst"
            referencedColumns: ["id"]
          },
        ]
      }
      adressen: {
        Row: {
          created_at: string | null
          huisnummer: string
          id: string
          kind_id: string
          land: string
          postcode: string
          straat: string
          updated_at: string | null
          woonplaats: string
        }
        Insert: {
          created_at?: string | null
          huisnummer: string
          id?: string
          kind_id: string
          land?: string
          postcode: string
          straat: string
          updated_at?: string | null
          woonplaats: string
        }
        Update: {
          created_at?: string | null
          huisnummer?: string
          id?: string
          kind_id?: string
          land?: string
          postcode?: string
          straat?: string
          updated_at?: string | null
          woonplaats?: string
        }
        Relationships: [
          {
            foreignKeyName: "adressen_kind_id_fkey"
            columns: ["kind_id"]
            isOneToOne: true
            referencedRelation: "kinderen"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          actie: string
          created_at: string
          details: Json | null
          id: string
          record_id: string | null
          tabel: string | null
          user_id: string | null
        }
        Insert: {
          actie: string
          created_at?: string
          details?: Json | null
          id?: string
          record_id?: string | null
          tabel?: string | null
          user_id?: string | null
        }
        Update: {
          actie?: string
          created_at?: string
          details?: Json | null
          id?: string
          record_id?: string | null
          tabel?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      capaciteit_overrides: {
        Row: {
          aangemaakt_door: string | null
          created_at: string
          eind_datum: string
          groep_id: string
          id: string
          max_capaciteit: number
          reden: string | null
          start_datum: string
        }
        Insert: {
          aangemaakt_door?: string | null
          created_at?: string
          eind_datum: string
          groep_id: string
          id?: string
          max_capaciteit: number
          reden?: string | null
          start_datum: string
        }
        Update: {
          aangemaakt_door?: string | null
          created_at?: string
          eind_datum?: string
          groep_id?: string
          id?: string
          max_capaciteit?: number
          reden?: string | null
          start_datum?: string
        }
        Relationships: [
          {
            foreignKeyName: "capaciteit_overrides_groep_id_fkey"
            columns: ["groep_id"]
            isOneToOne: false
            referencedRelation: "groepen"
            referencedColumns: ["id"]
          },
        ]
      }
      contactpersonen: {
        Row: {
          achternaam: string
          bsn: string | null
          created_at: string | null
          email: string | null
          id: string
          kind_id: string
          machtigt_ophalen: boolean
          ontvangt_correspondentie: boolean
          ontvangt_factuur: boolean
          relatie_tot_kind: string | null
          rol: Database["public"]["Enums"]["contactpersoon_rol"]
          telefoon_mobiel: string | null
          telefoon_prive: string | null
          telefoon_werk: string | null
          updated_at: string | null
          voornaam: string
        }
        Insert: {
          achternaam: string
          bsn?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          kind_id: string
          machtigt_ophalen?: boolean
          ontvangt_correspondentie?: boolean
          ontvangt_factuur?: boolean
          relatie_tot_kind?: string | null
          rol?: Database["public"]["Enums"]["contactpersoon_rol"]
          telefoon_mobiel?: string | null
          telefoon_prive?: string | null
          telefoon_werk?: string | null
          updated_at?: string | null
          voornaam: string
        }
        Update: {
          achternaam?: string
          bsn?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          kind_id?: string
          machtigt_ophalen?: boolean
          ontvangt_correspondentie?: boolean
          ontvangt_factuur?: boolean
          relatie_tot_kind?: string | null
          rol?: Database["public"]["Enums"]["contactpersoon_rol"]
          telefoon_mobiel?: string | null
          telefoon_prive?: string | null
          telefoon_werk?: string | null
          updated_at?: string | null
          voornaam?: string
        }
        Relationships: [
          {
            foreignKeyName: "contactpersonen_kind_id_fkey"
            columns: ["kind_id"]
            isOneToOne: false
            referencedRelation: "kinderen"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_events: {
        Row: {
          contract_id: string
          created_at: string
          event_type: string
          id: string
          organisatie_id: string
          payload: Json
        }
        Insert: {
          contract_id: string
          created_at?: string
          event_type: string
          id?: string
          organisatie_id: string
          payload?: Json
        }
        Update: {
          contract_id?: string
          created_at?: string
          event_type?: string
          id?: string
          organisatie_id?: string
          payload?: Json
        }
        Relationships: [
          {
            foreignKeyName: "contract_events_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracten"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_events_organisatie_id_fkey"
            columns: ["organisatie_id"]
            isOneToOne: false
            referencedRelation: "organisaties"
            referencedColumns: ["id"]
          },
        ]
      }
      contracten: {
        Row: {
          contract_type_id: string | null
          contracttype: Database["public"]["Enums"]["contracttype"]
          created_at: string
          dagdelen: Json | null
          einddatum: string | null
          flexpool: boolean
          groep_id: string | null
          id: string
          kind_id: string
          locatie_id: string
          maandprijs: number | null
          maandprijs_bruto: number | null
          maandprijs_netto: number | null
          notities: string | null
          ondertekend_door: string | null
          ondertekend_op: string | null
          opvangtype: Database["public"]["Enums"]["opvangtype"]
          startdatum: string
          status: Database["public"]["Enums"]["contract_status"]
          updated_at: string
          uren_per_dag: number
          uurtarief: number | null
          vorige_contract_id: string | null
          zorgdagen: number[]
        }
        Insert: {
          contract_type_id?: string | null
          contracttype?: Database["public"]["Enums"]["contracttype"]
          created_at?: string
          dagdelen?: Json | null
          einddatum?: string | null
          flexpool?: boolean
          groep_id?: string | null
          id?: string
          kind_id: string
          locatie_id: string
          maandprijs?: number | null
          maandprijs_bruto?: number | null
          maandprijs_netto?: number | null
          notities?: string | null
          ondertekend_door?: string | null
          ondertekend_op?: string | null
          opvangtype: Database["public"]["Enums"]["opvangtype"]
          startdatum: string
          status?: Database["public"]["Enums"]["contract_status"]
          updated_at?: string
          uren_per_dag?: number
          uurtarief?: number | null
          vorige_contract_id?: string | null
          zorgdagen?: number[]
        }
        Update: {
          contract_type_id?: string | null
          contracttype?: Database["public"]["Enums"]["contracttype"]
          created_at?: string
          dagdelen?: Json | null
          einddatum?: string | null
          flexpool?: boolean
          groep_id?: string | null
          id?: string
          kind_id?: string
          locatie_id?: string
          maandprijs?: number | null
          maandprijs_bruto?: number | null
          maandprijs_netto?: number | null
          notities?: string | null
          ondertekend_door?: string | null
          ondertekend_op?: string | null
          opvangtype?: Database["public"]["Enums"]["opvangtype"]
          startdatum?: string
          status?: Database["public"]["Enums"]["contract_status"]
          updated_at?: string
          uren_per_dag?: number
          uurtarief?: number | null
          vorige_contract_id?: string | null
          zorgdagen?: number[]
        }
        Relationships: [
          {
            foreignKeyName: "contracten_contract_type_id_fkey"
            columns: ["contract_type_id"]
            isOneToOne: false
            referencedRelation: "contracttypen"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracten_groep_id_fkey"
            columns: ["groep_id"]
            isOneToOne: false
            referencedRelation: "groepen"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracten_kind_id_fkey"
            columns: ["kind_id"]
            isOneToOne: false
            referencedRelation: "kinderen"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracten_locatie_id_fkey"
            columns: ["locatie_id"]
            isOneToOne: false
            referencedRelation: "locaties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracten_vorige_contract_id_fkey"
            columns: ["vorige_contract_id"]
            isOneToOne: false
            referencedRelation: "contracten"
            referencedColumns: ["id"]
          },
        ]
      }
      contracttypen: {
        Row: {
          actief: boolean
          annuleringstermijn_uren: number | null
          beschrijving: string | null
          code: string
          contractvorm: Database["public"]["Enums"]["contractvorm"]
          created_at: string
          deleted_at: string | null
          geldig_in_vakanties: boolean
          id: string
          merk_id: string
          min_dagdelen_week: number | null
          min_uren_maand: number | null
          naam: string
          opvang_op_inschrijving: boolean
          opvangtype: Database["public"]["Enums"]["opvangtype"]
          organisatie_id: string
          updated_at: string
        }
        Insert: {
          actief?: boolean
          annuleringstermijn_uren?: number | null
          beschrijving?: string | null
          code: string
          contractvorm: Database["public"]["Enums"]["contractvorm"]
          created_at?: string
          deleted_at?: string | null
          geldig_in_vakanties?: boolean
          id?: string
          merk_id: string
          min_dagdelen_week?: number | null
          min_uren_maand?: number | null
          naam: string
          opvang_op_inschrijving?: boolean
          opvangtype: Database["public"]["Enums"]["opvangtype"]
          organisatie_id: string
          updated_at?: string
        }
        Update: {
          actief?: boolean
          annuleringstermijn_uren?: number | null
          beschrijving?: string | null
          code?: string
          contractvorm?: Database["public"]["Enums"]["contractvorm"]
          created_at?: string
          deleted_at?: string | null
          geldig_in_vakanties?: boolean
          id?: string
          merk_id?: string
          min_dagdelen_week?: number | null
          min_uren_maand?: number | null
          naam?: string
          opvang_op_inschrijving?: boolean
          opvangtype?: Database["public"]["Enums"]["opvangtype"]
          organisatie_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contracttypen_merk_id_fkey"
            columns: ["merk_id"]
            isOneToOne: false
            referencedRelation: "merken"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracttypen_organisatie_id_fkey"
            columns: ["organisatie_id"]
            isOneToOne: false
            referencedRelation: "organisaties"
            referencedColumns: ["id"]
          },
        ]
      }
      dagdeel_configuraties: {
        Row: {
          created_at: string
          dagdeel_enum: Database["public"]["Enums"]["dagdeel_enum"]
          eindtijd: string
          groep_id: string | null
          id: string
          ingangsdatum: string
          locatie_id: string | null
          organisatie_id: string
          starttijd: string
          updated_at: string
          uren: number | null
        }
        Insert: {
          created_at?: string
          dagdeel_enum: Database["public"]["Enums"]["dagdeel_enum"]
          eindtijd: string
          groep_id?: string | null
          id?: string
          ingangsdatum: string
          locatie_id?: string | null
          organisatie_id: string
          starttijd: string
          updated_at?: string
          uren?: number | null
        }
        Update: {
          created_at?: string
          dagdeel_enum?: Database["public"]["Enums"]["dagdeel_enum"]
          eindtijd?: string
          groep_id?: string | null
          id?: string
          ingangsdatum?: string
          locatie_id?: string | null
          organisatie_id?: string
          starttijd?: string
          updated_at?: string
          uren?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "dagdeel_configuraties_groep_id_fkey"
            columns: ["groep_id"]
            isOneToOne: false
            referencedRelation: "groepen"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dagdeel_configuraties_locatie_id_fkey"
            columns: ["locatie_id"]
            isOneToOne: false
            referencedRelation: "locaties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dagdeel_configuraties_organisatie_id_fkey"
            columns: ["organisatie_id"]
            isOneToOne: false
            referencedRelation: "organisaties"
            referencedColumns: ["id"]
          },
        ]
      }
      dagverslag_media: {
        Row: {
          bestandsgrootte: number | null
          bestandsnaam: string
          created_at: string
          dagverslag_id: string
          id: string
          mime_type: string
          storage_path: string
          uploaded_by: string
          volgorde: number
        }
        Insert: {
          bestandsgrootte?: number | null
          bestandsnaam: string
          created_at?: string
          dagverslag_id: string
          id?: string
          mime_type: string
          storage_path: string
          uploaded_by: string
          volgorde?: number
        }
        Update: {
          bestandsgrootte?: number | null
          bestandsnaam?: string
          created_at?: string
          dagverslag_id?: string
          id?: string
          mime_type?: string
          storage_path?: string
          uploaded_by?: string
          volgorde?: number
        }
        Relationships: [
          {
            foreignKeyName: "dagverslag_media_dagverslag_id_fkey"
            columns: ["dagverslag_id"]
            isOneToOne: false
            referencedRelation: "dagverslagen"
            referencedColumns: ["id"]
          },
        ]
      }
      dagverslagen: {
        Row: {
          activiteiten: string | null
          auteur_id: string
          bijzonderheden: string | null
          created_at: string
          datum: string
          deleted_at: string | null
          eten_drinken: string | null
          gepubliceerd: boolean
          gepubliceerd_op: string | null
          groep_id: string
          id: string
          kind_id: string
          organisatie_id: string
          slaaptijden: string | null
          stemming: string | null
          updated_at: string
        }
        Insert: {
          activiteiten?: string | null
          auteur_id: string
          bijzonderheden?: string | null
          created_at?: string
          datum: string
          deleted_at?: string | null
          eten_drinken?: string | null
          gepubliceerd?: boolean
          gepubliceerd_op?: string | null
          groep_id: string
          id?: string
          kind_id: string
          organisatie_id: string
          slaaptijden?: string | null
          stemming?: string | null
          updated_at?: string
        }
        Update: {
          activiteiten?: string | null
          auteur_id?: string
          bijzonderheden?: string | null
          created_at?: string
          datum?: string
          deleted_at?: string | null
          eten_drinken?: string | null
          gepubliceerd?: boolean
          gepubliceerd_op?: string | null
          groep_id?: string
          id?: string
          kind_id?: string
          organisatie_id?: string
          slaaptijden?: string | null
          stemming?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dagverslagen_groep_id_fkey"
            columns: ["groep_id"]
            isOneToOne: false
            referencedRelation: "groepen"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dagverslagen_kind_id_fkey"
            columns: ["kind_id"]
            isOneToOne: false
            referencedRelation: "kinderen"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dagverslagen_organisatie_id_fkey"
            columns: ["organisatie_id"]
            isOneToOne: false
            referencedRelation: "organisaties"
            referencedColumns: ["id"]
          },
        ]
      }
      factuur_nummers: {
        Row: {
          jaar: number
          laatste_nummer: number
          organisatie_id: string
        }
        Insert: {
          jaar: number
          laatste_nummer?: number
          organisatie_id: string
        }
        Update: {
          jaar?: number
          laatste_nummer?: number
          organisatie_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "factuur_nummers_organisatie_id_fkey"
            columns: ["organisatie_id"]
            isOneToOne: false
            referencedRelation: "organisaties"
            referencedColumns: ["id"]
          },
        ]
      }
      feestdagen: {
        Row: {
          created_at: string
          datum: string
          id: string
          locatie_id: string | null
          naam: string
          organisatie_id: string
        }
        Insert: {
          created_at?: string
          datum: string
          id?: string
          locatie_id?: string | null
          naam: string
          organisatie_id: string
        }
        Update: {
          created_at?: string
          datum?: string
          id?: string
          locatie_id?: string | null
          naam?: string
          organisatie_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feestdagen_locatie_id_fkey"
            columns: ["locatie_id"]
            isOneToOne: false
            referencedRelation: "locaties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feestdagen_organisatie_id_fkey"
            columns: ["organisatie_id"]
            isOneToOne: false
            referencedRelation: "organisaties"
            referencedColumns: ["id"]
          },
        ]
      }
      flex_dagen: {
        Row: {
          aangemaakt_door: string | null
          contract_id: string
          created_at: string
          datum: string
          geannuleerd: boolean
          groep_id: string
          id: string
        }
        Insert: {
          aangemaakt_door?: string | null
          contract_id: string
          created_at?: string
          datum: string
          geannuleerd?: boolean
          groep_id: string
          id?: string
        }
        Update: {
          aangemaakt_door?: string | null
          contract_id?: string
          created_at?: string
          datum?: string
          geannuleerd?: boolean
          groep_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "flex_dagen_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracten"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flex_dagen_groep_id_fkey"
            columns: ["groep_id"]
            isOneToOne: false
            referencedRelation: "groepen"
            referencedColumns: ["id"]
          },
        ]
      }
      groepen: {
        Row: {
          actief: boolean
          bkr_ratio: string | null
          created_at: string
          deleted_at: string | null
          id: string
          leeftijdscategorie: Database["public"]["Enums"]["leeftijdscategorie"]
          locatie_id: string
          m2: number | null
          max_capaciteit: number
          max_leeftijd_maanden: number
          min_leeftijd_maanden: number
          naam: string
          notities: string | null
          opvangtype: Database["public"]["Enums"]["opvangtype"]
          ruimtenaam: string | null
          status: Database["public"]["Enums"]["groep_status"]
          updated_at: string
        }
        Insert: {
          actief?: boolean
          bkr_ratio?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          leeftijdscategorie: Database["public"]["Enums"]["leeftijdscategorie"]
          locatie_id: string
          m2?: number | null
          max_capaciteit?: number
          max_leeftijd_maanden?: number
          min_leeftijd_maanden?: number
          naam: string
          notities?: string | null
          opvangtype: Database["public"]["Enums"]["opvangtype"]
          ruimtenaam?: string | null
          status?: Database["public"]["Enums"]["groep_status"]
          updated_at?: string
        }
        Update: {
          actief?: boolean
          bkr_ratio?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          leeftijdscategorie?: Database["public"]["Enums"]["leeftijdscategorie"]
          locatie_id?: string
          m2?: number | null
          max_capaciteit?: number
          max_leeftijd_maanden?: number
          min_leeftijd_maanden?: number
          naam?: string
          notities?: string | null
          opvangtype?: Database["public"]["Enums"]["opvangtype"]
          ruimtenaam?: string | null
          status?: Database["public"]["Enums"]["groep_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "groepen_locatie_id_fkey"
            columns: ["locatie_id"]
            isOneToOne: false
            referencedRelation: "locaties"
            referencedColumns: ["id"]
          },
        ]
      }
      groepsoverdrachten: {
        Row: {
          aangemaakt_door: string | null
          created_at: string
          id: string
          kind_id: string
          naar_groep_id: string
          overdrachtsdatum: string
          uitgevoerd: boolean
          van_groep_id: string
        }
        Insert: {
          aangemaakt_door?: string | null
          created_at?: string
          id?: string
          kind_id: string
          naar_groep_id: string
          overdrachtsdatum: string
          uitgevoerd?: boolean
          van_groep_id: string
        }
        Update: {
          aangemaakt_door?: string | null
          created_at?: string
          id?: string
          kind_id?: string
          naar_groep_id?: string
          overdrachtsdatum?: string
          uitgevoerd?: boolean
          van_groep_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "groepsoverdrachten_kind_id_fkey"
            columns: ["kind_id"]
            isOneToOne: false
            referencedRelation: "kinderen"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "groepsoverdrachten_naar_groep_id_fkey"
            columns: ["naar_groep_id"]
            isOneToOne: false
            referencedRelation: "groepen"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "groepsoverdrachten_van_groep_id_fkey"
            columns: ["van_groep_id"]
            isOneToOne: false
            referencedRelation: "groepen"
            referencedColumns: ["id"]
          },
        ]
      }
      import_logs: {
        Row: {
          aantal_records: number
          bestandsnaam: string
          created_at: string
          error_message: string | null
          id: string
          import_type: string
          kolom_mapping: Json | null
          status: string
          user_id: string | null
        }
        Insert: {
          aantal_records?: number
          bestandsnaam: string
          created_at?: string
          error_message?: string | null
          id?: string
          import_type?: string
          kolom_mapping?: Json | null
          status?: string
          user_id?: string | null
        }
        Update: {
          aantal_records?: number
          bestandsnaam?: string
          created_at?: string
          error_message?: string | null
          id?: string
          import_type?: string
          kolom_mapping?: Json | null
          status?: string
          user_id?: string | null
        }
        Relationships: []
      }
      invoice_lines: {
        Row: {
          bedrag: number
          contract_id: string
          created_at: string
          dagen_actief: number | null
          dagen_in_maand: number | null
          id: string
          invoice_id: string
          kind_id: string
          omschrijving: string | null
        }
        Insert: {
          bedrag: number
          contract_id: string
          created_at?: string
          dagen_actief?: number | null
          dagen_in_maand?: number | null
          id?: string
          invoice_id: string
          kind_id: string
          omschrijving?: string | null
        }
        Update: {
          bedrag?: number
          contract_id?: string
          created_at?: string
          dagen_actief?: number | null
          dagen_in_maand?: number | null
          id?: string
          invoice_id?: string
          kind_id?: string
          omschrijving?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoice_lines_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracten"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_lines_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_lines_kind_id_fkey"
            columns: ["kind_id"]
            isOneToOne: false
            referencedRelation: "kinderen"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          created_at: string
          factuurnummer: string
          id: string
          organisatie_id: string
          parent_id: string
          periode_eind: string
          periode_start: string
          status: Database["public"]["Enums"]["factuur_status"]
          totaal_bedrag: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          factuurnummer: string
          id?: string
          organisatie_id: string
          parent_id: string
          periode_eind: string
          periode_start: string
          status?: Database["public"]["Enums"]["factuur_status"]
          totaal_bedrag?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          factuurnummer?: string
          id?: string
          organisatie_id?: string
          parent_id?: string
          periode_eind?: string
          periode_start?: string
          status?: Database["public"]["Enums"]["factuur_status"]
          totaal_bedrag?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_organisatie_id_fkey"
            columns: ["organisatie_id"]
            isOneToOne: false
            referencedRelation: "organisaties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "contactpersonen"
            referencedColumns: ["id"]
          },
        ]
      }
      kind_contract_kortingen: {
        Row: {
          berekend_bedrag: number
          created_at: string
          einddatum: string | null
          id: string
          kind_contract_id: string
          kortings_type_id: string
          startdatum: string
        }
        Insert: {
          berekend_bedrag: number
          created_at?: string
          einddatum?: string | null
          id?: string
          kind_contract_id: string
          kortings_type_id: string
          startdatum: string
        }
        Update: {
          berekend_bedrag?: number
          created_at?: string
          einddatum?: string | null
          id?: string
          kind_contract_id?: string
          kortings_type_id?: string
          startdatum?: string
        }
        Relationships: [
          {
            foreignKeyName: "kind_contract_kortingen_kind_contract_id_fkey"
            columns: ["kind_contract_id"]
            isOneToOne: false
            referencedRelation: "contracten"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kind_contract_kortingen_kortings_type_id_fkey"
            columns: ["kortings_type_id"]
            isOneToOne: false
            referencedRelation: "kortings_typen"
            referencedColumns: ["id"]
          },
        ]
      }
      kind_notities: {
        Row: {
          created_at: string
          id: string
          kind_id: string
          tekst: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind_id: string
          tekst: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kind_id?: string
          tekst?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "kind_notities_kind_id_fkey"
            columns: ["kind_id"]
            isOneToOne: false
            referencedRelation: "kinderen"
            referencedColumns: ["id"]
          },
        ]
      }
      kinderen: {
        Row: {
          aangemeld_op: string | null
          achternaam: string
          actief: boolean
          bsn: string | null
          created_at: string
          datum_uitschrijving: string | null
          geboortedatum: string
          geslacht: string | null
          id: string
          organisatie_id: string
          reden_uitschrijving: string | null
          tussenvoegsel: string | null
          updated_at: string
          verwachte_geboortedatum: string | null
          voornaam: string
        }
        Insert: {
          aangemeld_op?: string | null
          achternaam: string
          actief?: boolean
          bsn?: string | null
          created_at?: string
          datum_uitschrijving?: string | null
          geboortedatum: string
          geslacht?: string | null
          id?: string
          organisatie_id: string
          reden_uitschrijving?: string | null
          tussenvoegsel?: string | null
          updated_at?: string
          verwachte_geboortedatum?: string | null
          voornaam: string
        }
        Update: {
          aangemeld_op?: string | null
          achternaam?: string
          actief?: boolean
          bsn?: string | null
          created_at?: string
          datum_uitschrijving?: string | null
          geboortedatum?: string
          geslacht?: string | null
          id?: string
          organisatie_id?: string
          reden_uitschrijving?: string | null
          tussenvoegsel?: string | null
          updated_at?: string
          verwachte_geboortedatum?: string | null
          voornaam?: string
        }
        Relationships: [
          {
            foreignKeyName: "kinderen_organisatie_id_fkey"
            columns: ["organisatie_id"]
            isOneToOne: false
            referencedRelation: "organisaties"
            referencedColumns: ["id"]
          },
        ]
      }
      kortings_typen: {
        Row: {
          actief: boolean
          code: string
          created_at: string
          deleted_at: string | null
          grondslag_enum: Database["public"]["Enums"]["kortings_grondslag"]
          id: string
          max_kortingsbedrag: number | null
          naam: string
          organisatie_id: string
          stapelbaar: boolean
          type_enum: Database["public"]["Enums"]["kortings_type_enum"]
          updated_at: string
          vereist_documentatie: boolean
          waarde: number
        }
        Insert: {
          actief?: boolean
          code: string
          created_at?: string
          deleted_at?: string | null
          grondslag_enum: Database["public"]["Enums"]["kortings_grondslag"]
          id?: string
          max_kortingsbedrag?: number | null
          naam: string
          organisatie_id: string
          stapelbaar?: boolean
          type_enum: Database["public"]["Enums"]["kortings_type_enum"]
          updated_at?: string
          vereist_documentatie?: boolean
          waarde: number
        }
        Update: {
          actief?: boolean
          code?: string
          created_at?: string
          deleted_at?: string | null
          grondslag_enum?: Database["public"]["Enums"]["kortings_grondslag"]
          id?: string
          max_kortingsbedrag?: number | null
          naam?: string
          organisatie_id?: string
          stapelbaar?: boolean
          type_enum?: Database["public"]["Enums"]["kortings_type_enum"]
          updated_at?: string
          vereist_documentatie?: boolean
          waarde?: number
        }
        Relationships: [
          {
            foreignKeyName: "kortings_typen_organisatie_id_fkey"
            columns: ["organisatie_id"]
            isOneToOne: false
            referencedRelation: "organisaties"
            referencedColumns: ["id"]
          },
        ]
      }
      locatie_openingstijden: {
        Row: {
          dag_van_week: string
          id: string
          is_open: boolean
          locatie_id: string
          open_tijd: string | null
          sluit_tijd: string | null
        }
        Insert: {
          dag_van_week: string
          id?: string
          is_open?: boolean
          locatie_id: string
          open_tijd?: string | null
          sluit_tijd?: string | null
        }
        Update: {
          dag_van_week?: string
          id?: string
          is_open?: boolean
          locatie_id?: string
          open_tijd?: string | null
          sluit_tijd?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "locatie_openingstijden_locatie_id_fkey"
            columns: ["locatie_id"]
            isOneToOne: false
            referencedRelation: "locaties"
            referencedColumns: ["id"]
          },
        ]
      }
      locatie_openingstijden_uitzonderingen: {
        Row: {
          created_at: string
          eind_datum: string
          id: string
          is_gesloten: boolean
          locatie_id: string
          omschrijving: string
          open_tijd: string | null
          sluit_tijd: string | null
          start_datum: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          eind_datum: string
          id?: string
          is_gesloten?: boolean
          locatie_id: string
          omschrijving: string
          open_tijd?: string | null
          sluit_tijd?: string | null
          start_datum: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          eind_datum?: string
          id?: string
          is_gesloten?: boolean
          locatie_id?: string
          omschrijving?: string
          open_tijd?: string | null
          sluit_tijd?: string | null
          start_datum?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "locatie_openingstijden_uitzonderingen_locatie_id_fkey"
            columns: ["locatie_id"]
            isOneToOne: false
            referencedRelation: "locaties"
            referencedColumns: ["id"]
          },
        ]
      }
      locaties: {
        Row: {
          actief: boolean
          adres: string | null
          buitenspeelruimte: boolean
          buitenspeelruimte_m2: number | null
          cao: Database["public"]["Enums"]["cao_type"] | null
          code: string | null
          created_at: string
          deleted_at: string | null
          email: string | null
          ggd_regio: string | null
          heeft_keuken: boolean
          huisnummer: string | null
          iban: string | null
          id: string
          inspectie_oordeel:
            | Database["public"]["Enums"]["inspectie_oordeel"]
            | null
          kvk_nummer: string | null
          laatste_inspectie_datum: string | null
          label: string | null
          land: string
          locatiemanager_id: string | null
          lrk_nummer: string | null
          merk_id: string | null
          naam: string
          noodcontact_naam: string | null
          noodcontact_telefoon: string | null
          notities: string | null
          organisatie_id: string
          parkeerplaatsen: number | null
          plaats: string | null
          plaatsvervangend_manager_id: string | null
          postcode: string | null
          rolstoeltoegankelijk: boolean
          status: Database["public"]["Enums"]["locatie_status"]
          telefoon: string | null
          type: Database["public"]["Enums"]["locatie_type"] | null
          updated_at: string
          vergunning_geldig_tot: string | null
          volgende_inspectie_datum: string | null
          website: string | null
        }
        Insert: {
          actief?: boolean
          adres?: string | null
          buitenspeelruimte?: boolean
          buitenspeelruimte_m2?: number | null
          cao?: Database["public"]["Enums"]["cao_type"] | null
          code?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          ggd_regio?: string | null
          heeft_keuken?: boolean
          huisnummer?: string | null
          iban?: string | null
          id?: string
          inspectie_oordeel?:
            | Database["public"]["Enums"]["inspectie_oordeel"]
            | null
          kvk_nummer?: string | null
          laatste_inspectie_datum?: string | null
          label?: string | null
          land?: string
          locatiemanager_id?: string | null
          lrk_nummer?: string | null
          merk_id?: string | null
          naam: string
          noodcontact_naam?: string | null
          noodcontact_telefoon?: string | null
          notities?: string | null
          organisatie_id: string
          parkeerplaatsen?: number | null
          plaats?: string | null
          plaatsvervangend_manager_id?: string | null
          postcode?: string | null
          rolstoeltoegankelijk?: boolean
          status?: Database["public"]["Enums"]["locatie_status"]
          telefoon?: string | null
          type?: Database["public"]["Enums"]["locatie_type"] | null
          updated_at?: string
          vergunning_geldig_tot?: string | null
          volgende_inspectie_datum?: string | null
          website?: string | null
        }
        Update: {
          actief?: boolean
          adres?: string | null
          buitenspeelruimte?: boolean
          buitenspeelruimte_m2?: number | null
          cao?: Database["public"]["Enums"]["cao_type"] | null
          code?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          ggd_regio?: string | null
          heeft_keuken?: boolean
          huisnummer?: string | null
          iban?: string | null
          id?: string
          inspectie_oordeel?:
            | Database["public"]["Enums"]["inspectie_oordeel"]
            | null
          kvk_nummer?: string | null
          laatste_inspectie_datum?: string | null
          label?: string | null
          land?: string
          locatiemanager_id?: string | null
          lrk_nummer?: string | null
          merk_id?: string | null
          naam?: string
          noodcontact_naam?: string | null
          noodcontact_telefoon?: string | null
          notities?: string | null
          organisatie_id?: string
          parkeerplaatsen?: number | null
          plaats?: string | null
          plaatsvervangend_manager_id?: string | null
          postcode?: string | null
          rolstoeltoegankelijk?: boolean
          status?: Database["public"]["Enums"]["locatie_status"]
          telefoon?: string | null
          type?: Database["public"]["Enums"]["locatie_type"] | null
          updated_at?: string
          vergunning_geldig_tot?: string | null
          volgende_inspectie_datum?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "locaties_merk_id_fkey"
            columns: ["merk_id"]
            isOneToOne: false
            referencedRelation: "merken"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "locaties_organisatie_id_fkey"
            columns: ["organisatie_id"]
            isOneToOne: false
            referencedRelation: "organisaties"
            referencedColumns: ["id"]
          },
        ]
      }
      locatievoorkeuren: {
        Row: {
          created_at: string | null
          id: string
          locatie_id: string
          voorkeur_volgorde: number | null
          wachtlijst_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          locatie_id: string
          voorkeur_volgorde?: number | null
          wachtlijst_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          locatie_id?: string
          voorkeur_volgorde?: number | null
          wachtlijst_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "locatievoorkeuren_locatie_id_fkey"
            columns: ["locatie_id"]
            isOneToOne: false
            referencedRelation: "locaties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "locatievoorkeuren_wachtlijst_id_fkey"
            columns: ["wachtlijst_id"]
            isOneToOne: false
            referencedRelation: "wachtlijst"
            referencedColumns: ["id"]
          },
        ]
      }
      medisch_gegevens: {
        Row: {
          allergieeen: string | null
          bijzonderheden: string | null
          created_at: string | null
          dieetwensen: string | null
          foto_toestemming: boolean
          huisarts: string | null
          id: string
          kind_id: string
          medicatie: string | null
          updated_at: string | null
          zorgbehoeften: string | null
          zorgverzekering: string | null
        }
        Insert: {
          allergieeen?: string | null
          bijzonderheden?: string | null
          created_at?: string | null
          dieetwensen?: string | null
          foto_toestemming?: boolean
          huisarts?: string | null
          id?: string
          kind_id: string
          medicatie?: string | null
          updated_at?: string | null
          zorgbehoeften?: string | null
          zorgverzekering?: string | null
        }
        Update: {
          allergieeen?: string | null
          bijzonderheden?: string | null
          created_at?: string | null
          dieetwensen?: string | null
          foto_toestemming?: boolean
          huisarts?: string | null
          id?: string
          kind_id?: string
          medicatie?: string | null
          updated_at?: string | null
          zorgbehoeften?: string | null
          zorgverzekering?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "medisch_gegevens_kind_id_fkey"
            columns: ["kind_id"]
            isOneToOne: true
            referencedRelation: "kinderen"
            referencedColumns: ["id"]
          },
        ]
      }
      merken: {
        Row: {
          actief: boolean
          beschrijving: string | null
          code: string
          created_at: string
          deleted_at: string | null
          id: string
          naam: string
          organisatie_id: string
          updated_at: string
        }
        Insert: {
          actief?: boolean
          beschrijving?: string | null
          code: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          naam: string
          organisatie_id: string
          updated_at?: string
        }
        Update: {
          actief?: boolean
          beschrijving?: string | null
          code?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          naam?: string
          organisatie_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "merken_organisatie_id_fkey"
            columns: ["organisatie_id"]
            isOneToOne: false
            referencedRelation: "organisaties"
            referencedColumns: ["id"]
          },
        ]
      }
      modules: {
        Row: {
          icoon: string | null
          id: string
          naam: string
          omschrijving: string | null
          sleutel: string
          volgorde: number | null
        }
        Insert: {
          icoon?: string | null
          id?: string
          naam: string
          omschrijving?: string | null
          sleutel: string
          volgorde?: number | null
        }
        Update: {
          icoon?: string | null
          id?: string
          naam?: string
          omschrijving?: string | null
          sleutel?: string
          volgorde?: number | null
        }
        Relationships: []
      }
      organisaties: {
        Row: {
          actief: boolean
          created_at: string
          id: string
          naam: string
        }
        Insert: {
          actief?: boolean
          created_at?: string
          id?: string
          naam: string
        }
        Update: {
          actief?: boolean
          created_at?: string
          id?: string
          naam?: string
        }
        Relationships: []
      }
      ouder_kind: {
        Row: {
          actief: boolean
          contactpersoon_id: string | null
          created_at: string
          id: string
          kind_id: string
          ouder_id: string
          relatie: Database["public"]["Enums"]["contactpersoon_rol"]
        }
        Insert: {
          actief?: boolean
          contactpersoon_id?: string | null
          created_at?: string
          id?: string
          kind_id: string
          ouder_id: string
          relatie?: Database["public"]["Enums"]["contactpersoon_rol"]
        }
        Update: {
          actief?: boolean
          contactpersoon_id?: string | null
          created_at?: string
          id?: string
          kind_id?: string
          ouder_id?: string
          relatie?: Database["public"]["Enums"]["contactpersoon_rol"]
        }
        Relationships: [
          {
            foreignKeyName: "ouder_kind_contactpersoon_id_fkey"
            columns: ["contactpersoon_id"]
            isOneToOne: false
            referencedRelation: "contactpersonen"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ouder_kind_kind_id_fkey"
            columns: ["kind_id"]
            isOneToOne: false
            referencedRelation: "kinderen"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ouder_kind_ouder_id_fkey"
            columns: ["ouder_id"]
            isOneToOne: false
            referencedRelation: "ouder_profielen"
            referencedColumns: ["id"]
          },
        ]
      }
      ouder_profielen: {
        Row: {
          achternaam: string
          actief: boolean
          created_at: string
          email: string
          id: string
          organisatie_id: string
          telefoon_mobiel: string | null
          updated_at: string
          voornaam: string
        }
        Insert: {
          achternaam?: string
          actief?: boolean
          created_at?: string
          email?: string
          id: string
          organisatie_id: string
          telefoon_mobiel?: string | null
          updated_at?: string
          voornaam?: string
        }
        Update: {
          achternaam?: string
          actief?: boolean
          created_at?: string
          email?: string
          id?: string
          organisatie_id?: string
          telefoon_mobiel?: string | null
          updated_at?: string
          voornaam?: string
        }
        Relationships: [
          {
            foreignKeyName: "ouder_profielen_organisatie_id_fkey"
            columns: ["organisatie_id"]
            isOneToOne: false
            referencedRelation: "organisaties"
            referencedColumns: ["id"]
          },
        ]
      }
      plaatsingen: {
        Row: {
          aanvraag_id: string | null
          actief: boolean
          created_at: string
          dagen: number[]
          einddatum: string | null
          geboortedatum: string
          groep_id: string
          id: string
          kind_naam: string
          locatie_id: string
          ouder_email: string | null
          ouder_naam: string
          ouder_telefoon: string | null
          startdatum: string
          updated_at: string
        }
        Insert: {
          aanvraag_id?: string | null
          actief?: boolean
          created_at?: string
          dagen?: number[]
          einddatum?: string | null
          geboortedatum: string
          groep_id: string
          id?: string
          kind_naam: string
          locatie_id: string
          ouder_email?: string | null
          ouder_naam?: string
          ouder_telefoon?: string | null
          startdatum: string
          updated_at?: string
        }
        Update: {
          aanvraag_id?: string | null
          actief?: boolean
          created_at?: string
          dagen?: number[]
          einddatum?: string | null
          geboortedatum?: string
          groep_id?: string
          id?: string
          kind_naam?: string
          locatie_id?: string
          ouder_email?: string | null
          ouder_naam?: string
          ouder_telefoon?: string | null
          startdatum?: string
          updated_at?: string
        }
        Relationships: []
      }
      placements: {
        Row: {
          contract_id: string
          created_at: string
          einddatum: string | null
          groep_id: string
          id: string
          kind_id: string
          organisatie_id: string
          startdatum: string
          updated_at: string
        }
        Insert: {
          contract_id: string
          created_at?: string
          einddatum?: string | null
          groep_id: string
          id?: string
          kind_id: string
          organisatie_id: string
          startdatum: string
          updated_at?: string
        }
        Update: {
          contract_id?: string
          created_at?: string
          einddatum?: string | null
          groep_id?: string
          id?: string
          kind_id?: string
          organisatie_id?: string
          startdatum?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "placements_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracten"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "placements_groep_id_fkey"
            columns: ["groep_id"]
            isOneToOne: false
            referencedRelation: "groepen"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "placements_kind_id_fkey"
            columns: ["kind_id"]
            isOneToOne: false
            referencedRelation: "kinderen"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "placements_organisatie_id_fkey"
            columns: ["organisatie_id"]
            isOneToOne: false
            referencedRelation: "organisaties"
            referencedColumns: ["id"]
          },
        ]
      }
      planned_attendance: {
        Row: {
          bron: Database["public"]["Enums"]["bron_type"]
          contract_id: string
          created_at: string
          datum: string
          eindtijd: string
          groep_id: string
          id: string
          kind_id: string
          organisatie_id: string
          placement_id: string
          starttijd: string
          updated_at: string
        }
        Insert: {
          bron?: Database["public"]["Enums"]["bron_type"]
          contract_id: string
          created_at?: string
          datum: string
          eindtijd: string
          groep_id: string
          id?: string
          kind_id: string
          organisatie_id: string
          placement_id: string
          starttijd: string
          updated_at?: string
        }
        Update: {
          bron?: Database["public"]["Enums"]["bron_type"]
          contract_id?: string
          created_at?: string
          datum?: string
          eindtijd?: string
          groep_id?: string
          id?: string
          kind_id?: string
          organisatie_id?: string
          placement_id?: string
          starttijd?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "planned_attendance_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracten"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planned_attendance_groep_id_fkey"
            columns: ["groep_id"]
            isOneToOne: false
            referencedRelation: "groepen"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planned_attendance_kind_id_fkey"
            columns: ["kind_id"]
            isOneToOne: false
            referencedRelation: "kinderen"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planned_attendance_organisatie_id_fkey"
            columns: ["organisatie_id"]
            isOneToOne: false
            referencedRelation: "organisaties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planned_attendance_placement_id_fkey"
            columns: ["placement_id"]
            isOneToOne: false
            referencedRelation: "placements"
            referencedColumns: ["id"]
          },
        ]
      }
      profiel_locaties: {
        Row: {
          created_at: string | null
          deleted_at: string | null
          id: string
          locatie_id: string
          organisatie_id: string
          profiel_id: string
        }
        Insert: {
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          locatie_id: string
          organisatie_id: string
          profiel_id: string
        }
        Update: {
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          locatie_id?: string
          organisatie_id?: string
          profiel_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiel_locaties_locatie_id_fkey"
            columns: ["locatie_id"]
            isOneToOne: false
            referencedRelation: "locaties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiel_locaties_organisatie_id_fkey"
            columns: ["organisatie_id"]
            isOneToOne: false
            referencedRelation: "organisaties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiel_locaties_profiel_id_fkey"
            columns: ["profiel_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiel_rollen: {
        Row: {
          created_at: string | null
          deleted_at: string | null
          id: string
          organisatie_id: string
          profiel_id: string
          rol_naam: string
        }
        Insert: {
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          organisatie_id: string
          profiel_id: string
          rol_naam: string
        }
        Update: {
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          organisatie_id?: string
          profiel_id?: string
          rol_naam?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiel_rollen_organisatie_id_fkey"
            columns: ["organisatie_id"]
            isOneToOne: false
            referencedRelation: "organisaties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiel_rollen_profiel_id_fkey"
            columns: ["profiel_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          actief: boolean
          created_at: string
          email: string
          id: string
          naam: string
          organisatie_id: string | null
          updated_at: string
        }
        Insert: {
          actief?: boolean
          created_at?: string
          email?: string
          id: string
          naam?: string
          organisatie_id?: string | null
          updated_at?: string
        }
        Update: {
          actief?: boolean
          created_at?: string
          email?: string
          id?: string
          naam?: string
          organisatie_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_organisatie_id_fkey"
            columns: ["organisatie_id"]
            isOneToOne: false
            referencedRelation: "organisaties"
            referencedColumns: ["id"]
          },
        ]
      }
      rol_rechten: {
        Row: {
          created_at: string | null
          id: string
          kan_aanmaken: boolean | null
          kan_lezen: boolean | null
          kan_verwijderen: boolean | null
          kan_wijzigen: boolean | null
          module_sleutel: string
          rol_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          kan_aanmaken?: boolean | null
          kan_lezen?: boolean | null
          kan_verwijderen?: boolean | null
          kan_wijzigen?: boolean | null
          module_sleutel: string
          rol_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          kan_aanmaken?: boolean | null
          kan_lezen?: boolean | null
          kan_verwijderen?: boolean | null
          kan_wijzigen?: boolean | null
          module_sleutel?: string
          rol_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rol_rechten_module_sleutel_fkey"
            columns: ["module_sleutel"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["sleutel"]
          },
          {
            foreignKeyName: "rol_rechten_rol_id_fkey"
            columns: ["rol_id"]
            isOneToOne: false
            referencedRelation: "rollen"
            referencedColumns: ["id"]
          },
        ]
      }
      rollen: {
        Row: {
          created_at: string | null
          deleted_at: string | null
          id: string
          is_systeem_rol: boolean | null
          kleur: string | null
          naam: string
          omschrijving: string | null
          organisatie_id: string
        }
        Insert: {
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          is_systeem_rol?: boolean | null
          kleur?: string | null
          naam: string
          omschrijving?: string | null
          organisatie_id: string
        }
        Update: {
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          is_systeem_rol?: boolean | null
          kleur?: string | null
          naam?: string
          omschrijving?: string | null
          organisatie_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rollen_organisatie_id_fkey"
            columns: ["organisatie_id"]
            isOneToOne: false
            referencedRelation: "organisaties"
            referencedColumns: ["id"]
          },
        ]
      }
      siblings: {
        Row: {
          created_at: string | null
          id: string
          kind_id_a: string
          kind_id_b: string
          organisatie_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          kind_id_a: string
          kind_id_b: string
          organisatie_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          kind_id_a?: string
          kind_id_b?: string
          organisatie_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "siblings_kind_id_a_fkey"
            columns: ["kind_id_a"]
            isOneToOne: false
            referencedRelation: "kinderen"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "siblings_kind_id_b_fkey"
            columns: ["kind_id_b"]
            isOneToOne: false
            referencedRelation: "kinderen"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "siblings_organisatie_id_fkey"
            columns: ["organisatie_id"]
            isOneToOne: false
            referencedRelation: "organisaties"
            referencedColumns: ["id"]
          },
        ]
      }
      tariefsets: {
        Row: {
          contract_type_id: string
          created_at: string
          deleted_at: string | null
          id: string
          ingangsdatum: string
          jaar: number
          max_overheidsuurprijs: number | null
          merk_id: string
          opvangtype: Database["public"]["Enums"]["opvangtype"]
          organisatie_id: string
          status: Database["public"]["Enums"]["tarief_status"]
          updated_at: string
          uurtarief: number
        }
        Insert: {
          contract_type_id: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          ingangsdatum: string
          jaar: number
          max_overheidsuurprijs?: number | null
          merk_id: string
          opvangtype: Database["public"]["Enums"]["opvangtype"]
          organisatie_id: string
          status?: Database["public"]["Enums"]["tarief_status"]
          updated_at?: string
          uurtarief: number
        }
        Update: {
          contract_type_id?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          ingangsdatum?: string
          jaar?: number
          max_overheidsuurprijs?: number | null
          merk_id?: string
          opvangtype?: Database["public"]["Enums"]["opvangtype"]
          organisatie_id?: string
          status?: Database["public"]["Enums"]["tarief_status"]
          updated_at?: string
          uurtarief?: number
        }
        Relationships: [
          {
            foreignKeyName: "tariefsets_contract_type_id_fkey"
            columns: ["contract_type_id"]
            isOneToOne: false
            referencedRelation: "contracttypen"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tariefsets_merk_id_fkey"
            columns: ["merk_id"]
            isOneToOne: false
            referencedRelation: "merken"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tariefsets_organisatie_id_fkey"
            columns: ["organisatie_id"]
            isOneToOne: false
            referencedRelation: "organisaties"
            referencedColumns: ["id"]
          },
        ]
      }
      user_locatie_toegang: {
        Row: {
          alle_locaties: boolean
          created_at: string
          id: string
          locatie_id: string | null
          user_id: string
        }
        Insert: {
          alle_locaties?: boolean
          created_at?: string
          id?: string
          locatie_id?: string | null
          user_id: string
        }
        Update: {
          alle_locaties?: boolean
          created_at?: string
          id?: string
          locatie_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_locatie_toegang_locatie_id_fkey"
            columns: ["locatie_id"]
            isOneToOne: false
            referencedRelation: "locaties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_locatie_toegang_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      wachtlijst: {
        Row: {
          aangemeld_op: string | null
          created_at: string | null
          gewenste_dagen: number[] | null
          gewenste_startdatum: string | null
          id: string
          kind_id: string
          notities: string | null
          opvangtype: Database["public"]["Enums"]["opvangtype"]
          organisatie_id: string
          prioriteit: number | null
          status: Database["public"]["Enums"]["wachtlijst_status"] | null
          updated_at: string | null
        }
        Insert: {
          aangemeld_op?: string | null
          created_at?: string | null
          gewenste_dagen?: number[] | null
          gewenste_startdatum?: string | null
          id?: string
          kind_id: string
          notities?: string | null
          opvangtype: Database["public"]["Enums"]["opvangtype"]
          organisatie_id: string
          prioriteit?: number | null
          status?: Database["public"]["Enums"]["wachtlijst_status"] | null
          updated_at?: string | null
        }
        Update: {
          aangemeld_op?: string | null
          created_at?: string | null
          gewenste_dagen?: number[] | null
          gewenste_startdatum?: string | null
          id?: string
          kind_id?: string
          notities?: string | null
          opvangtype?: Database["public"]["Enums"]["opvangtype"]
          organisatie_id?: string
          prioriteit?: number | null
          status?: Database["public"]["Enums"]["wachtlijst_status"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wachtlijst_kind_id_fkey"
            columns: ["kind_id"]
            isOneToOne: false
            referencedRelation: "kinderen"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wachtlijst_organisatie_id_fkey"
            columns: ["organisatie_id"]
            isOneToOne: false
            referencedRelation: "organisaties"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_maand_facturen: {
        Args: { p_jaar: number; p_maand: number; p_organisatie_id: string }
        Returns: {
          aantal_regels: number
          factuurnummer: string
          invoice_id: string
          parent_email: string
          parent_naam: string
          totaal_bedrag: number
          uitkomst: string
        }[]
      }
      generate_planned_attendance: {
        Args: {
          p_allow_past?: boolean
          p_contract_id: string
          p_future_only?: boolean
        }
        Returns: number
      }
      get_organisatie_id: { Args: never; Returns: string }
      get_ouder_kind_ids: { Args: never; Returns: string[] }
      get_toegankelijke_locatie_ids: { Args: never; Returns: string[] }
      has_any_role: {
        Args: { _roles: Database["public"]["Enums"]["app_role"][] }
        Returns: boolean
      }
      has_role: {
        Args: { _role: Database["public"]["Enums"]["app_role"] }
        Returns: boolean
      }
      is_ouder: { Args: never; Returns: boolean }
      is_staff: { Args: never; Returns: boolean }
      next_factuurnummer: {
        Args: { p_jaar: number; p_organisatie_id: string }
        Returns: string
      }
      validate_placement_organisatie: {
        Args: {
          p_contract_id: string
          p_groep_id: string
          p_kind_id: string
          p_organisatie_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      aanbieding_status:
        | "openstaand"
        | "geaccepteerd"
        | "geweigerd"
        | "verlopen"
      app_role:
        | "klantadviseur"
        | "vestigingsmanager"
        | "personeelsplanner"
        | "regiomanager"
        | "directie"
        | "beheerder"
      bron_type: "contract" | "flex_override" | "manual"
      cao_type: "kinderopvang" | "sociaal_werk" | "overig"
      contactpersoon_rol: "ouder1" | "ouder2" | "voogd" | "noodcontact"
      contract_status:
        | "actief"
        | "wachtlijst"
        | "beëindigd"
        | "concept"
        | "opgeschort"
        | "te_beeindigen"
        | "geannuleerd"
        | "facturatie_fout"
      contracttype: "vast" | "flex" | "tijdelijk"
      contractvorm: "schoolweken" | "standaard" | "super_flexibel" | "flexibel"
      dagdeel_enum:
        | "ochtend"
        | "middag"
        | "hele_dag"
        | "na_school"
        | "voor_school"
        | "studiedag_bso"
      factuur_status: "draft" | "sent" | "paid" | "overdue"
      groep_status: "actief" | "gesloten" | "alleen_wachtlijst"
      inspectie_oordeel: "goed" | "voldoende" | "onvoldoende"
      kortings_grondslag: "op_uurtarief" | "op_maandprijs" | "op_uren_per_maand"
      kortings_type_enum: "percentage" | "vast_bedrag"
      leeftijdscategorie: "baby" | "dreumes" | "peuter" | "bso"
      locatie_status: "actief" | "inactief" | "in_opbouw"
      locatie_type:
        | "kdv"
        | "bso"
        | "peuterspeelzaal"
        | "gastouder"
        | "combinatie"
      opvangtype: "kdv" | "bso" | "peuteropvang" | "gastouder"
      tarief_status: "concept" | "actief" | "vervallen"
      user_type: "staff" | "ouder"
      wachtlijst_status:
        | "wachtend"
        | "aangeboden"
        | "geplaatst"
        | "vervallen"
        | "geannuleerd"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      aanbieding_status: [
        "openstaand",
        "geaccepteerd",
        "geweigerd",
        "verlopen",
      ],
      app_role: [
        "klantadviseur",
        "vestigingsmanager",
        "personeelsplanner",
        "regiomanager",
        "directie",
        "beheerder",
      ],
      bron_type: ["contract", "flex_override", "manual"],
      cao_type: ["kinderopvang", "sociaal_werk", "overig"],
      contactpersoon_rol: ["ouder1", "ouder2", "voogd", "noodcontact"],
      contract_status: [
        "actief",
        "wachtlijst",
        "beëindigd",
        "concept",
        "opgeschort",
        "te_beeindigen",
        "geannuleerd",
        "facturatie_fout",
      ],
      contracttype: ["vast", "flex", "tijdelijk"],
      contractvorm: ["schoolweken", "standaard", "super_flexibel", "flexibel"],
      dagdeel_enum: [
        "ochtend",
        "middag",
        "hele_dag",
        "na_school",
        "voor_school",
        "studiedag_bso",
      ],
      factuur_status: ["draft", "sent", "paid", "overdue"],
      groep_status: ["actief", "gesloten", "alleen_wachtlijst"],
      inspectie_oordeel: ["goed", "voldoende", "onvoldoende"],
      kortings_grondslag: [
        "op_uurtarief",
        "op_maandprijs",
        "op_uren_per_maand",
      ],
      kortings_type_enum: ["percentage", "vast_bedrag"],
      leeftijdscategorie: ["baby", "dreumes", "peuter", "bso"],
      locatie_status: ["actief", "inactief", "in_opbouw"],
      locatie_type: [
        "kdv",
        "bso",
        "peuterspeelzaal",
        "gastouder",
        "combinatie",
      ],
      opvangtype: ["kdv", "bso", "peuteropvang", "gastouder"],
      tarief_status: ["concept", "actief", "vervallen"],
      user_type: ["staff", "ouder"],
      wachtlijst_status: [
        "wachtend",
        "aangeboden",
        "geplaatst",
        "vervallen",
        "geannuleerd",
      ],
    },
  },
} as const

// Enum type aliases
export type Opvangtype = 'kdv' | 'bso' | 'peuteropvang' | 'gastouder'
export type FactuurStatus = 'draft' | 'sent' | 'paid' | 'overdue'
export type Leeftijdscategorie = 'baby' | 'dreumes' | 'peuter' | 'bso'
export type Contracttype = 'vast' | 'flex' | 'tijdelijk'
export type ContractStatus = 'actief' | 'wachtlijst' | 'beëindigd' | 'concept' | 'opgeschort' | 'te_beeindigen' | 'geannuleerd' | 'facturatie_fout'
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
export type UserType = 'staff' | 'ouder'

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
type _Tables = Database['public']['Tables']
type organisaties = _Tables['organisaties']
type locaties = _Tables['locaties']
type groepen = _Tables['groepen']
type kinderen = _Tables['kinderen']
type contracten = _Tables['contracten']
type placements = _Tables['placements']
type flex_dagen = _Tables['flex_dagen']
type groepsoverdrachten = _Tables['groepsoverdrachten']
type kind_notities = _Tables['kind_notities']
type capaciteit_overrides = _Tables['capaciteit_overrides']
type profiles = _Tables['profiles']
type user_roles = _Tables['user_roles']
type wachtlijst = _Tables['wachtlijst']
type locatievoorkeuren = _Tables['locatievoorkeuren']
type aanbiedingen = _Tables['aanbiedingen']
type adressen = _Tables['adressen']
type contactpersonen = _Tables['contactpersonen']
type medisch_gegevens = _Tables['medisch_gegevens']
type siblings = _Tables['siblings']
type invoices = _Tables['invoices']
type invoice_lines = _Tables['invoice_lines']
type merken = _Tables['merken']
type contracttypen = _Tables['contracttypen']
type tariefsets = _Tables['tariefsets']
type dagdeel_configuraties = _Tables['dagdeel_configuraties']
type feestdagen = _Tables['feestdagen']
type kortings_typen = _Tables['kortings_typen']
type contract_events = _Tables['contract_events']
type kind_contract_kortingen = _Tables['kind_contract_kortingen']
type dagverslagen = _Tables['dagverslagen']
type dagverslag_media = _Tables['dagverslag_media']
type ouder_profielen = _Tables['ouder_profielen']
type ouder_kind = _Tables['ouder_kind']

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
export type ContractTypeNieuw = contracttypen['Row']
export type TariefSet = tariefsets['Row']
export type DagdeelConfiguratie = dagdeel_configuraties['Row']
export type Feestdag = feestdagen['Row']
export type KortingsType = kortings_typen['Row']
export type ContractEvent = contract_events['Row']
export type KindContractKorting = kind_contract_kortingen['Row']
export type Dagverslag = dagverslagen['Row']
export type DagverslagMedia = dagverslag_media['Row']
export type OuderProfiel = ouder_profielen['Row']
export type OuderKind = ouder_kind['Row']

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
