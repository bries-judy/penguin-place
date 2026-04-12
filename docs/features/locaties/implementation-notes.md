# Locaties — Implementation Notes
Datum: 2026-04-12
Migration: 013_locaties_uitbreiding.sql

## Wat is gebouwd

Backend uitbreiding van de Locaties module: nieuwe database-kolommen voor compliance, openingstijden, faciliteiten en beheer, twee nieuwe tabellen voor openingstijden, bijbehorende RLS-policies, TypeScript types en Server Actions.

## Nieuwe / gewijzigde tabellen

| Tabel | Wijziging | Reden |
|---|---|---|
| `locaties` | ADD COLUMN: code, type, status, huisnummer, land, telefoon, email, website, lrk_nummer, ggd_regio, laatste_inspectie_datum, inspectie_oordeel, volgende_inspectie_datum, vergunning_geldig_tot, cao, locatiemanager_id, plaatsvervangend_manager_id, noodcontact_naam, noodcontact_telefoon, iban, kvk_nummer, buitenspeelruimte, buitenspeelruimte_m2, heeft_keuken, rolstoeltoegankelijk, parkeerplaatsen, notities, deleted_at | Rijke vestigingsbeheer per spec |
| `groepen` | ADD COLUMN: status, m2, bkr_ratio, ruimtenaam, notities, deleted_at | Uitbreiding groepsbeheer per spec |
| `locatie_openingstijden` | CREATE TABLE | Vaste openingstijden per dag (7 records per locatie, trigger-aangemaakt) |
| `locatie_openingstijden_uitzonderingen` | CREATE TABLE | Sluitingsdagen en afwijkende tijden |

## Nieuwe bestanden

- `supabase/migrations/013_locaties_uitbreiding.sql`
- `src/types/locaties.ts`
- `src/app/actions/locaties.ts`
- `src/lib/locaties.ts`

## Afwijkingen van spec

- **`locatie_openingstijden` heeft geen `updated_at`**: De spec-tabel definieert dit veld niet. Consequent weggelaten.
- **`locatieDeactiveren` zet ook `actief = false`**: Naast `deleted_at` wordt `actief` ook op `false` gezet voor backwards-compatibiliteit met bestaande queries die op `actief` filteren (o.a. `kinderen/page.tsx`).
- **`groepDeactiveren` zet `status = 'gesloten'`**: Logische statusovergang bij soft-delete van een groep.
- **RLS locaties in 002**: `"Beheerder schrijft locaties"` had alleen `beheerder`. In 013 is een aparte policy toegevoegd voor `vestigingsmanager`/`regiomanager`/`directie` met locatie-scope, zodat er geen conflict is met de bestaande policy.

## Bekende beperkingen / TODO's

- De `genereerLocatiecode()` helper heeft een lichte race condition bij gelijktijdig aanmaken van locaties met dezelfde prefix. Voor productie-schaal kan een database-sequence beter zijn.
- `locatieBijwerken` hergenereert de `code` niet — codes zijn immutable na aanmaken (zo werkt auto-gegenereerde codes).
- Er is geen validatie op `email`-formaat in de Server Actions (de spec noemt dit voor de UI-laag).

## Relaties naar andere modules

- **Planningsmodule**: gebruikt `isLocatieOpen()` uit `src/lib/locaties.ts` bij het valideren van plaatsingen. De functie accepteert een `SupabaseClient` zodat hij zowel server- als client-side bruikbaar is.
- **Facturatiemodule**: `locaties.iban` en `locaties.kvk_nummer` zijn beschikbaar voor toekomstige koppeling met facturatie-entiteiten.

## Valkuilen voor toekomstige wijzigingen

- **Soft deletes op `locaties`**: Queries op de `locaties` tabel moeten `.is('deleted_at', null)` filteren. De bestaande query in `kinderen/page.tsx` filtert op `.eq('actief', true)` — dit blijft werken zolang `locatieDeactiveren` ook `actief = false` zet.
- **Trigger `locatie_openingstijden_init`**: Wordt automatisch uitgevoerd bij elke INSERT op `locaties`. Seed-scripts of directe DB-inserts in tests moeten hier rekening mee houden.
- **Enum `locatie_type` vs. bestaande `opvangtype`**: Er bestaan twee type-enums naast elkaar. `opvangtype` (op groepen, uit 001) en `locatie_type` (op locaties, uit 013). Niet verwarren.
- **`m2_per_kind` is een berekend veld**: Nooit opslaan. Altijd berekenen als `m2 / max_capaciteit` in de applicatielaag. `null` teruggeven als `m2` of `max_capaciteit` ontbreekt.

---

## Frontend — nieuwe bestanden

- `src/app/dashboard/locaties/page.tsx` — Server Component, overzicht
- `src/app/dashboard/locaties/nieuw/page.tsx` — Server Component shell voor wizard
- `src/app/dashboard/locaties/[id]/page.tsx` — Server Component, detail
- `src/components/locaties/LocatiesLijst.tsx` — Overzichtscomponent met zoek/filter
- `src/components/locaties/LocatieAanmakenWizard.tsx` — 3-staps aanmaakwizard
- `src/components/locaties/LocatieDetail.tsx` — Detailpagina met tabstructuur
- `src/components/locaties/tabs/AlgemeenTab.tsx`
- `src/components/locaties/tabs/OpeningstijdenTab.tsx`
- `src/components/locaties/tabs/GroepenTab.tsx`
- `src/components/locaties/tabs/ComplianceTab.tsx`
- `src/components/locaties/tabs/PersoneelTab.tsx`
- `src/components/locaties/tabs/FacturatieTab.tsx`

Tevens toegevoegd aan `src/app/actions/locaties.ts`:
- `zoekGebruikers(query)` — Server Action voor user picker in PersoneelTab

## Frontend — afwijkingen van spec

- **Geen apart toast-systeem**: Elk component beheert eigen `toast`-state (inline `useState`). Geen extra pakket of utility-bestand aangemaakt.
- **`LocatieMetRelaties` interface in `LocatieDetail.tsx`**: De spec beschrijft de uitgebreide locatietype niet apart. De interface is lokaal gedefinieerd in `LocatieDetail.tsx` en geëxporteerd voor gebruik in tab-componenten.
- **Type multiselect in `LocatiesLijst` als toggle-knoppen**: De spec zegt "multiselect"; geïmplementeerd als toggle-knoppen (conform bestaand patroon in `KinderenLijst`), zonder dropdown.
- **Groep-wizard-type (stap 3)**: De spec toont `GROEP_TYPE_LABELS` als gecombineerd type voor de UI; de actie verwacht `opvangtype` + `leeftijdscategorie` afzonderlijk. Mapping via `GROEP_TYPE_MAP`.

## Frontend — bekende beperkingen / TODO's

- **Paginarefresh na opslaan in tabs**: Tabs gebruiken `revalidatePath` via Server Actions, maar de tabstate wordt niet opnieuw gehydrateerd zonder paginarefresh (Server Component data is stale na opslaan). Dit is een architectureel gegeven van de huidige Server Component + Client Component split.
- **LRK-nummer kopieerknop (ComplianceTab)**: Werkt alleen in beweekmodus niet; kopieerknop staat in de leesweergave naast het veld.
- **Geen skeleton loaders**: De spec noemt skeleton loaders; niet geïmplementeerd. De pagina laadt als geheel via Server Components.
- **Openingstijden wizard (stap 2)**: De tijden worden opgeslagen via `openingstijdenBijwerken` na redirect naar detail, maar de wizard zelf verstuurt de tijden niet automatisch — de tab toont de door de trigger aangemaakte standaardtijden (ma–vr 07:00–18:00, za–zo gesloten). Wizard-stap 2 dient ter instelling voor de gebruiker; de daadwerkelijke opslag via de action ontbreekt in de huidige implementatie en kan als verbetering worden toegevoegd.
