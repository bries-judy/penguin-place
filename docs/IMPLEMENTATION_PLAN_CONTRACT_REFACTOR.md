# Contract Management Refactor — Implementatieplan

> **Versie**: 1.0 | **Datum**: April 2026
> **Bron**: PenguinPlace_ContractManagement_UserStories_v1.1.docx
> **Doel**: Stap-voor-stap plan voor implementatie met Claude Code, geoptimaliseerd voor minimaal tokengebruik.

---

## Strategie: Minimaal Tokengebruik

Elk "stap" hieronder is een **zelfstandige Claude Code prompt**. Principes:

1. **Eén concern per prompt** — mix geen database + UI + business logic
2. **Verwijs naar bestanden** — geef exacte paden mee, niet "zoek het op"
3. **Geef het datamodel mee** — kopieer relevante types/schema als context
4. **Kleine migrations** — één migration per logische wijziging
5. **Test tussendoor** — draai `npm run build` na elke stap

---

## Overzicht Fases

| Fase | Modules | Wat | Geschatte stappen |
|------|---------|-----|-------------------|
| 0 | Prep | CLAUDE.md + types bijwerken | 2 |
| 1 | Module 1 | Merk + ContractType entiteiten | 5 |
| 2 | Module 5 | DagdeelConfiguratie + Feestdagen | 4 |
| 3 | Module 2 | Tariefbeheer (TariefSet per merk) | 4 |
| 4 | Module 3 | Kortingsbeheer | 4 |
| 5 | Module 4 | Kindcontract refactor + facturatie-event | 6 |
| 6 | Facturatie | generate_maand_facturen() herschrijven | 3 |
| 7 | Schoolkalender | Simpele BSO schoolkalender | 3 |
| 8 | Integratie | End-to-end flow testen + bugfixes | 2 |

**Totaal: ~33 stappen**

---

## Fase 0: Voorbereiding

### Stap 0.1 — CLAUDE.md bijwerken met project-specifieke context

> **Achtergrond**: CLAUDE.md bevat nu alleen `@AGENTS.md`. Het conventions bestand staat in `docs/architecture/conventions.md` en is compleet. We hoeven conventies NIET te dupliceren — Claude Code kan conventions.md direct lezen.

```
Prompt voor Claude Code:
────────────────────────
Lees docs/architecture/conventions.md (dit is het bestaande conventies-bestand).

Herschrijf CLAUDE.md zodat het bruikbaar is als project-context. Inhoud:

1. Verwijzing: "Lees docs/architecture/conventions.md voor alle naamgevings- en codepatronen."
2. Migratie-status: "Laatste migration: 014_locaties_seed.sql. Volgende nummering start bij 015."
3. Contract refactor context: "Zie docs/IMPLEMENTATION_PLAN_CONTRACT_REFACTOR.md voor het stappenplan van de contract management refactor."
4. Belangrijke bestandspaden:
   - Server actions: src/app/actions/
   - Components: src/components/
   - Types: src/lib/supabase/types.ts
   - Migrations: supabase/migrations/
5. Database regels reminder: soft deletes (deleted_at), RLS via get_organisatie_id() en has_role(), elke tabel heeft id/created_at/updated_at/deleted_at.

Houd het kort — max 30 regels. Dit bestand wordt bij elke Claude Code sessie geladen.
```

### Stap 0.2 — TypeScript types voorbereiden

```
Prompt voor Claude Code:
────────────────────────
Lees src/lib/supabase/types.ts.
Voeg deze nieuwe interfaces toe (nog GEEN bestaande wijzigen):

- Merk {id, organisatie_id, code, naam, beschrijving, actief, created_at, updated_at}
- Locatie uitbreiden met: merk_id (optioneel, FK naar merken)
- ContractTypeNieuw {id, organisatie_id, merk_id, naam, code, opvangtype, contractvorm, beschrijving, min_uren_maand, min_dagdelen_week, geldig_in_vakanties, opvang_op_inschrijving, annuleringstermijn_uren, actief, created_at, updated_at}
- TariefSet {id, organisatie_id, merk_id, contract_type_id, jaar, opvangtype, uurtarief, max_overheidsuurprijs, ingangsdatum, status, created_at, updated_at}
- DagdeelConfiguratie {id, organisatie_id, locatie_id?, groep_id?, dagdeel_enum, starttijd, eindtijd, uren, ingangsdatum, created_at}
- Feestdag {id, organisatie_id, datum, naam, locatie_id?, created_at}
- KortingsType {id, organisatie_id, code, naam, type_enum, waarde, grondslag_enum, max_kortingsbedrag?, stapelbaar, vereist_documentatie, actief, created_at, updated_at}
- KindContractKorting {id, kind_contract_id, kortings_type_id, startdatum, einddatum?, berekend_bedrag, created_at}

Enums:
- Contractvorm = 'schoolweken' | 'standaard' | 'super_flexibel' | 'flexibel'
- DagdeelEnum = 'ochtend' | 'middag' | 'hele_dag' | 'na_school' | 'voor_school' | 'studiedag_bso'
- TariefStatus = 'concept' | 'actief' | 'vervallen'
- KortingsTypeEnum = 'percentage' | 'vast_bedrag'
- KortingsGrondslag = 'op_uurtarief' | 'op_maandprijs' | 'op_uren_per_maand'
- ContractStatusNieuw = 'concept' | 'actief' | 'te_beeindigen' | 'beeindigd' | 'geannuleerd' | 'facturatie_fout'

Volg exact de stijl van bestaande types in het bestand.
```

---

## Fase 1: Module 1 — Merk & ContractType Configuratie

### Stap 1.1 — Migration: Merken tabel + merk_id op locaties

> **STATUS: DONE** — 015_merken.sql is aangemaakt maar moet nog aangepast (zie fixstap hieronder).

```
Prompt voor Claude Code:
────────────────────────
Maak supabase/migrations/015_merken.sql met:

1. CREATE TABLE merken (id uuid PK default gen_random_uuid(), organisatie_id uuid FK NOT NULL, code text NOT NULL, naam text NOT NULL, beschrijving text, actief boolean DEFAULT true, deleted_at timestamptz, created_at/updated_at timestamps, UNIQUE(organisatie_id, code))
2. ALTER TABLE locaties ADD COLUMN merk_id uuid REFERENCES merken(id) — GEEN NOT NULL (bestaande locaties hebben nog geen merk)
3. GEEN merk_locaties koppeltabel — merk_id zit direct op locaties (1:N relatie)
4. RLS policies: SELECT voor alle authenticated users in org, INSERT/UPDATE/DELETE alleen voor beheerder
5. Index op merken(organisatie_id, actief) en locaties(merk_id)

Volg het patroon van 001_core_schema.sql en 002_rls.sql voor RLS helper functies (get_organisatie_id(), has_role()).
```

### Stap 1.2 — Migration: ContractTypen tabel (nieuw)

> **STATUS: DONE** — 016_contracttypen.sql is aangemaakt maar RLS moet nog aangepast (alleen beheerder).

```
Prompt voor Claude Code:
────────────────────────
Maak supabase/migrations/016_contracttypen.sql met:

1. Enum contractvorm_enum: 'schoolweken', 'standaard', 'super_flexibel', 'flexibel'
2. CREATE TABLE contracttypen (id uuid PK, organisatie_id FK, merk_id FK merken, naam text, code text NOT NULL, opvangtype opvangtype (bestaande enum), contractvorm contractvorm_enum, beschrijving text, min_uren_maand integer, min_dagdelen_week integer, geldig_in_vakanties boolean DEFAULT true, opvang_op_inschrijving boolean DEFAULT false, annuleringstermijn_uren integer, actief boolean DEFAULT true, deleted_at timestamptz, created_at/updated_at)
3. Index op (merk_id, opvangtype) voor filtering
4. RLS: SELECT voor alle authenticated in org, INSERT/UPDATE/DELETE alleen voor beheerder
5. UNIQUE constraint op (organisatie_id, code)
```

### Stap 1.3 — Server actions: Merken CRUD

```
Prompt voor Claude Code:
────────────────────────
Maak src/app/actions/merken.ts met:

- merkAanmaken(formData: FormData) — insert in merken
- merkBijwerken(merkId: string, formData: FormData) — update merken, maar code is IMMUTABLE na aanmaken
- merkDeactiveren(merkId: string) — set actief=false, check of er actieve contracttypen aan hangen (warn)
- getMerken() — SELECT alle merken voor organisatie met count locaties (via locaties.merk_id)
- koppelLocatiesAanMerk(merkId: string, locatieIds: string[]) — UPDATE locaties SET merk_id = merkId WHERE id IN (...)

Volg exact het patroon van src/app/actions/contracten.ts:
- createClient() aanroep
- FormData parsing
- { success: true } / { error: string } return type
- revalidatePath('/dashboard/contracten')
```

### Stap 1.4 — Server actions: ContractTypen CRUD

```
Prompt voor Claude Code:
────────────────────────
Maak src/app/actions/contracttypen.ts met:

- contractTypeAanmaken(formData: FormData)
- contractTypeBijwerken(id: string, formData: FormData)
- contractTypeDeactiveren(id: string) — waarschuwing bij actieve kindcontracten
- getContractTypen(locatieId?: string) — als locatieId meegegeven: filter via locaties.merk_id
- getContractType(id: string)

Belangrijk: bij ophalen voor kindcontractformulier, filter op merk van de locatie:
SELECT ct.* FROM contracttypen ct
JOIN locaties l ON l.merk_id = ct.merk_id
WHERE l.id = $locatieId AND ct.actief = true

Volg patroon van src/app/actions/contracten.ts.
```

### Stap 1.5 — UI: Merk & ContractType beheer

```
Prompt voor Claude Code:
────────────────────────
Lees src/components/kinderen/KindProfiel.tsx voor UI-patronen (modals, forms, tabs).
Lees src/app/dashboard/locaties/page.tsx voor dashboard page patronen.

Maak:
1. src/app/dashboard/contracten/page.tsx — server component met tabs: "Contracttypen", "Merken"
2. src/components/contracten/MerkenBeheer.tsx — client component:
   - Tabel met merken (naam, code, #locaties, actief status)
   - Modal voor aanmaken/bewerken
   - Locatie multi-select (alleen locaties met merk_id IS NULL of eigen locaties van dit merk)
3. src/components/contracten/ContractTypenBeheer.tsx — client component:
   - Filter op merk dropdown
   - Tabel met contracttypen
   - Modal met alle velden uit de specificatie

Gebruik bestaande shadcn/ui componenten en Tailwind stijl van het project.
```

---

## Fase 2: Module 5 — DagdeelConfiguratie

### Stap 2.1 — Migration: DagdeelConfiguratie + Feestdagen

```
Prompt voor Claude Code:
────────────────────────
Maak supabase/migrations/017_dagdeel_configuratie.sql met:

1. Enum dagdeel_enum: 'ochtend', 'middag', 'hele_dag', 'na_school', 'voor_school', 'studiedag_bso'
2. CREATE TABLE dagdeel_configuraties (id uuid PK, organisatie_id FK, locatie_id FK nullable, groep_id FK nullable, dagdeel dagdeel_enum, starttijd time NOT NULL, eindtijd time NOT NULL, uren decimal(4,2) GENERATED ALWAYS AS (EXTRACT(EPOCH FROM eindtijd - starttijd)/3600) STORED, ingangsdatum date NOT NULL, created_at/updated_at)
3. CHECK constraint: (locatie_id IS NOT NULL OR groep_id IS NOT NULL)
4. CHECK constraint: eindtijd > starttijd
5. CREATE TABLE feestdagen (id uuid PK, organisatie_id FK, datum date NOT NULL, naam text NOT NULL, locatie_id FK nullable, created_at)
6. UNIQUE op feestdagen(organisatie_id, datum, locatie_id)
7. RLS policies voor beide tabellen
8. Seed standaard dagdeel-tijden: Ochtend 07:30-13:15, Middag 12:30-18:00, Hele dag 07:30-18:00, Na school 15:00-18:00, Voor school 07:30-08:30
```

### Stap 2.2 — Server actions: Dagdelen + Feestdagen

```
Prompt voor Claude Code:
────────────────────────
Maak src/app/actions/dagdelen.ts met:

- getDagdeelConfiguratie(locatieId: string, groepId?: string) — prioriteitslogica: groep-override > locatie-default
- dagdeelConfigBijwerken(formData: FormData) — upsert per locatie/groep + dagdeel
- getFeestdagen(jaar: number) — alle feestdagen voor het jaar
- feestdagToevoegen(formData: FormData)
- feestdagVerwijderen(id: string)

Prioriteitslogica voor dagdeel lookup:
SELECT * FROM dagdeel_configuraties
WHERE (groep_id = $groepId OR (groep_id IS NULL AND locatie_id = $locatieId))
AND ingangsdatum <= CURRENT_DATE
ORDER BY groep_id DESC NULLS LAST, ingangsdatum DESC
LIMIT 1

Volg patroon van bestaande server actions.
```

### Stap 2.3 — UI: Dagdeel configuratie in locatie-pagina

```
Prompt voor Claude Code:
────────────────────────
Lees src/app/dashboard/locaties/page.tsx en src/components/locaties/ voor bestaande UI.

Voeg een "Dagdelen" tab toe aan de locatie detail view:
- Tabel per dagdeel-type met starttijd, eindtijd, berekende uren
- Inline edit (time inputs)
- Per groep: toggle "Afwijkende tijden" met eigen rij
- Ingangsdatum veld voor historische tracking
- Validatie: eindtijd > starttijd

Maak src/components/locaties/DagdeelConfigPanel.tsx als client component.
```

### Stap 2.4 — UI: Feestdagenbeheer

```
Prompt voor Claude Code:
────────────────────────
Voeg een "Feestdagen" sectie toe aan de locatie-instellingen of als sub-tab.

Maak src/components/locaties/FeestdagenBeheer.tsx:
- Jaarselector
- Lijst feestdagen met datum + naam
- Toevoegen/verwijderen knoppen
- Optioneel: "Kopieer naar volgend jaar" knop
- Org-brede feestdagen (locatie_id = null) vs locatie-specifiek

Houd het simpel — geen kalender-widget nodig, gewoon een tabel met date inputs.
```

---

## Fase 3: Module 2 — Tariefbeheer

### Stap 3.1 — Migration: TariefSets

```
Prompt voor Claude Code:
────────────────────────
Maak supabase/migrations/018_tariefsets.sql met:

1. Enum tarief_status_enum: 'concept', 'actief', 'vervallen'
2. CREATE TABLE tariefsets (id uuid PK, organisatie_id FK, merk_id FK merken, contract_type_id FK contracttypen, jaar integer NOT NULL, opvangtype opvangtype, uurtarief decimal(5,2) NOT NULL, max_overheidsuurprijs decimal(5,2), ingangsdatum date NOT NULL, status tarief_status_enum DEFAULT 'concept', created_at/updated_at)
3. UNIQUE constraint op (merk_id, contract_type_id, jaar)
4. Validatie: contract_type_id moet behoren tot hetzelfde merk als merk_id (trigger of check)
5. RLS policies
6. Index op (merk_id, jaar, status)
```

### Stap 3.2 — Server actions: Tarieven CRUD

```
Prompt voor Claude Code:
────────────────────────
Maak src/app/actions/tarieven.ts met:

- tariefsetAanmaken(formData: FormData)
- tariefsetBijwerken(id: string, formData: FormData)
- tariefsetActiveren(id: string) — set status 'actief'
- getTariefsets(merkId?: string, jaar?: number) — gefilterd
- getTariefVoorContract(contractTypeId: string, merkId: string, datum: string) — resolve actief tarief:
  SELECT uurtarief FROM tariefsets
  WHERE contract_type_id = $contractTypeId AND merk_id = $merkId
  AND ingangsdatum <= $datum AND status = 'actief'
  ORDER BY ingangsdatum DESC LIMIT 1
- kopieerTariefsets(merkId: string, vanJaar: number, naarJaar: number, indexatiePercentage: number) — dupliceer alle actieve sets met berekening: ROUND(oud * (1 + pct/100), 2), status 'concept'

Volg bestaande action patronen.
```

### Stap 3.3 — UI: Tariefbeheer pagina

```
Prompt voor Claude Code:
────────────────────────
Voeg een "Tarieven" tab toe aan src/app/dashboard/contracten/page.tsx.

Maak src/components/contracten/TariefBeheer.tsx:
- Filters: Merk dropdown + Jaar selector
- Tabel: contracttype naam, opvangtype, uurtarief, max overheidsuurprijs, status badge
- Waarschuwingsicoon als uurtarief > max_overheidsuurprijs
- Modal voor aanmaken/bewerken
- Status transitie knoppen (concept → actief)
- Tariefhistorie: per contracttype alle jaren tonen

Volg stijl van FacturenDashboard.tsx voor tabel + filter patronen.
```

### Stap 3.4 — UI: Kopieer & Indexeer functionaliteit

```
Prompt voor Claude Code:
────────────────────────
Voeg aan TariefBeheer.tsx toe:

- "Kopieer naar nieuw jaar" knop (zichtbaar als er actieve sets zijn voor geselecteerd jaar)
- Modal: doeljaar + indexatiepercentage input
- Preview tabel: oud tarief → nieuw tarief per contracttype (before/after vergelijking)
- Bevestigingsknop die kopieerTariefsets() aanroept
- Na kopiëren: automatisch switchen naar het nieuwe jaar in de filter

Gebruik bestaande modal patronen uit het project.
```

---

## Fase 4: Module 3 — Kortingsbeheer

### Stap 4.1 — Migration: KortingsType + KindContractKorting

```
Prompt voor Claude Code:
────────────────────────
Maak supabase/migrations/019_kortingen.sql met:

1. Enum kortings_type_enum: 'percentage', 'vast_bedrag'
2. Enum kortings_grondslag_enum: 'op_uurtarief', 'op_maandprijs', 'op_uren_per_maand'
3. CREATE TABLE kortingstypes (id uuid PK, organisatie_id FK, code text UNIQUE NOT NULL, naam text NOT NULL, type kortings_type_enum NOT NULL, waarde decimal(8,2) NOT NULL, grondslag kortings_grondslag_enum NOT NULL, max_kortingsbedrag decimal(8,2), stapelbaar boolean DEFAULT true, vereist_documentatie boolean DEFAULT false, actief boolean DEFAULT true, created_at/updated_at)
4. CREATE TABLE kind_contract_kortingen (id uuid PK, kind_contract_id uuid FK contracten, kortings_type_id uuid FK kortingstypes, startdatum date, einddatum date, berekend_bedrag decimal(8,2) NOT NULL, created_at)
5. RLS policies
6. Constraint: maximaal 1 niet-stapelbare korting per kindcontract (via trigger of application logic)
```

### Stap 4.2 — Server actions: Kortingen CRUD

```
Prompt voor Claude Code:
────────────────────────
Maak src/app/actions/kortingen.ts met:

- kortingsTypeAanmaken(formData: FormData)
- kortingsTypeBijwerken(id: string, formData: FormData)
- kortingsTypeDeactiveren(id: string) — bestaande koppelingen blijven actief
- getKortingsTypes() — alle actieve voor organisatie
- berekenKorting(kortingsTypeId: string, grondslag: number) — berekeningslogica:
  * percentage: korting = grondslag * (waarde/100), cap op max_kortingsbedrag
  * vast_bedrag: korting = waarde
  Return: berekend bedrag

- voegKortingToeAanContract(contractId: string, kortingsTypeId: string, startdatum: string) — valideer stapelbaarheid, bereken bedrag, insert
- verwijderKortingVanContract(kindContractKortingId: string)

Volg bestaande action patronen.
```

### Stap 4.3 — UI: Kortingsbeheer pagina

```
Prompt voor Claude Code:
────────────────────────
Voeg een "Kortingen" tab toe aan src/app/dashboard/contracten/page.tsx.

Maak src/components/contracten/KortingsBeheer.tsx:
- Tabel: naam, code, type (%), waarde, grondslag, stapelbaar, actief
- Aanmaken/bewerken modal met alle velden
- Deactiveer knop met waarschuwing bij actieve koppelingen
- Badge voor "Vereist documentatie"

Navigatie: Contracten > Kortingsbeheer als submenu-item.
Houd het simpel en consistent met MerkenBeheer.tsx stijl.
```

### Stap 4.4 — UI: Korting selectie in kindcontract form

```
Prompt voor Claude Code:
────────────────────────
Dit is een voorbereiding voor Fase 5. 

Maak src/components/kinderen/KortingSelectie.tsx als herbruikbaar component:
- Multi-select dropdown van actieve kortingstypes
- Per geselecteerde korting: toon berekend bedrag (via berekenKorting)
- Validatie: blokkeer conflicterende niet-stapelbare kortingen met foutmelding
- Totaal kortingsbedrag weergeven
- Props: grondslag (number), onChange (callback met geselecteerde kortingen + bedragen)

Dit component wordt later ingebouwd in het vernieuwde ContractForm.
```

---

## Fase 5: Module 4 — Kindcontract Refactor

> **Dit is de kern van de refactor.** De bestaande ContractForm en server actions worden herschreven.

### Stap 5.1 — Migration: Contract tabel uitbreiden

```
Prompt voor Claude Code:
────────────────────────
Maak supabase/migrations/020_contract_refactor.sql met:

1. Status enum uitbreiden: voeg 'te_beeindigen', 'geannuleerd', 'facturatie_fout' toe aan contract_status enum
2. ALTER TABLE contracten:
   - ADD COLUMN contract_type_id uuid REFERENCES contracttypen(id)
   - ADD COLUMN dagdelen jsonb DEFAULT '{}' — format: {"0": "hele_dag", "2": "ochtend", "4": "middag"} (weekdag: dagdeel)
   - ADD COLUMN maandprijs_bruto decimal(8,2)
   - ADD COLUMN maandprijs_netto decimal(8,2)
   - Kolom 'contracttype' (bestaande text enum) BEHOUDEN voor backward compatibility
   - Kolom 'uurtarief' en 'maandprijs' BEHOUDEN (worden read-only vanuit TariefSet)
3. Voeg NIET constraint toe dat contract_type_id verplicht is — bestaande contracten hebben dit nog niet
4. Comment: na migratie bestaande data worden uurtarief/maandprijs velden deprecated
```

### Stap 5.2 — Server actions: Nieuw contractAanmaken

```
Prompt voor Claude Code:
────────────────────────
Lees src/app/actions/contracten.ts volledig.

Herschrijf contractAanmaken() in hetzelfde bestand:
- FormData bevat nu: kindId, contractTypeId (FK), locatieId, groepId, zorgdagen (array), dagdelen (object per dag), startdatum, einddatum, notities, kortingIds (array)
- Stap 1: Resolve merk via locatie.merk_id
- Stap 2: Haal contracttype op, valideer dat het bij het merk hoort
- Stap 3: Haal actief tarief op via getTariefVoorContract()
- Stap 4: Haal dagdeel-uren op per zorgdag via getDagdeelConfiguratie()
- Stap 5: Bereken maandprijs_bruto = SOM(uren_per_dag × uurtarief) × 52/12
- Stap 6: Bereken kortingen en maandprijs_netto
- Stap 7: Insert contract met status 'concept', bewaar ook uurtarief en maandprijs in contract rij (voor facturatie)
- Stap 8: Insert kind_contract_kortingen
- Stap 9: revalidatePath

BEWAAR de bestaande functie als contractAanmakenLegacy() voor backward compatibility.
Return type blijft { success: true } | { error: string }.
```

### Stap 5.3 — Server actions: contractActiveren refactor

```
Prompt voor Claude Code:
────────────────────────
Lees src/app/actions/contracten.ts, specifiek contractActiveren().

Herschrijf contractActiveren():
- Bestaande logica behouden (status → 'actief', genereerPlanning())
- Toevoegen: facturatie-event. Na activering:
  1. Bouw payload: {kind_id, contract_id, contracttype_code, merk_id, startdatum, einddatum, zorgdagen_met_dagdelen, uurtarief, uren_per_dag_per_zorgdag, maandprijs_bruto, kortingen[], maandprijs_netto}
  2. Voor nu: log dit als een rij in een nieuwe 'contract_events' tabel (simpele audit log)
  3. Als insert faalt: rollback contract status, return { error: 'Facturatie-event mislukt' }
- Status bij falen: 'facturatie_fout'

Maak ook een mini-migration 021_contract_events.sql:
CREATE TABLE contract_events (id uuid PK, organisatie_id FK, contract_id FK, event_type text, payload jsonb, created_at)
```

### Stap 5.4 — Server actions: contractWijzigen + contractBeeindigen

```
Prompt voor Claude Code:
────────────────────────
Lees de bestaande contractWijzigen() en contractBeeindigen() in src/app/actions/contracten.ts.

Pas contractWijzigen() aan:
- Zelfde soft-edit patroon behouden (oud beëindigen, nieuw concept aanmaken)
- Nieuw contract krijgt dezelfde contract_type_id, dagdelen, etc.
- Kortingen worden overgenomen naar nieuw contract
- Tarieven worden opnieuw resolved (kunnen gewijzigd zijn)

Pas contractBeeindigen() aan:
- Bestaande logica behouden
- Toevoegen: beëindiging-event in contract_events tabel
- Sluit ook kind_contract_kortingen af (einddatum zetten)
```

### Stap 5.5 — UI: ContractForm herschrijven

```
Prompt voor Claude Code:
────────────────────────
Lees src/components/kinderen/KindProfiel.tsx, specifiek het ContractForm gedeelte.

Herschrijf het ContractForm (in hetzelfde bestand of extract naar src/components/kinderen/ContractForm.tsx):

Flow:
1. Locatie selecteren → resolve merk automatisch (toon merknaam als readonly badge)
2. Contracttype dropdown → gefilterd op merk van locatie, alleen actieve types
3. Groep selecteren (optioneel, verfijnt dagdeel-tijden)
4. Zorgdagen checkboxes (Ma-Vr) → per aangevinkte dag: dagdeel dropdown (Ochtend/Middag/Hele dag)
5. Per dagdeel: toon uren readonly (uit DagdeelConfiguratie)
6. Uurtarief: readonly, ingeladen uit TariefSet
7. Maandprijs bruto: readonly, live berekend
8. Kortingen: KortingSelectie component (uit stap 4.4)
9. Maandprijs netto: readonly, bruto - kortingen
10. Start/einddatum, notities

Alle prijsvelden zijn NIET handmatig aanpasbaar.
Real-time herberekening bij elke wijziging van dagdeel/zorgdag/korting.

BSO-specifiek: dagdeel dropdown toont alleen "Na school" voor reguliere dagen. Toon info-tekst over studiedagen/vakantiedagen.
```

### Stap 5.6 — UI: Contract weergave in KindProfiel

```
Prompt voor Claude Code:
────────────────────────
Lees src/components/kinderen/KindProfiel.tsx, het Contracten tab gedeelte.

Pas de contractweergave aan:
- Toon merknaam + contracttype naam (ipv alleen contracttype enum)
- Toon dagdelen per dag (bijv. "Ma: Hele dag, Wo: Ochtend, Vr: Middag")
- Toon bruto/netto prijs met kortingsoverzicht
- Toon uurtarief bron (TariefSet jaar + merk)
- Bestaande status badges behouden + nieuwe statussen toevoegen (facturatie_fout = rood)
- Contract historie: toon vorige_contract_id keten
```

---

## Fase 6: Facturatie Refactor

> **Kernprincipe facturatie — twee sporen:**
> - **Vaste contracten** (standaard, schoolweken): vast maandbedrag, elke maand hetzelfde. Pro-rata alleen bij eerste/laatste maand. Bij jaarlijkse tariefwijziging wordt de maandprijs herberekend.
> - **Flex contracten** (flexibel, super_flexibel): facturatie op basis van daadwerkelijk ingeplande uren × uurtarief. Wordt per maand berekend.

### Stap 6.1 — Migration: generate_maand_facturen() herschrijven

```
Prompt voor Claude Code:
────────────────────────
Lees supabase/migrations/011_facturen.sql, specifiek de generate_maand_facturen() functie.
Lees ook 012_facturen_fixes.sql.

Maak supabase/migrations/022_facturen_refactor.sql met een CREATE OR REPLACE FUNCTION generate_maand_facturen():

Er zijn TWEE facturatiepaden afhankelijk van contractvorm:

PAD A — Vaste contracten (contractvorm = 'standaard' of 'schoolweken'):
1. Factuurbedrag = contract.maandprijs_netto (vast maandbedrag, kortingen al verwerkt)
2. Pro-rata ALLEEN bij:
   - Eerste maand: startdatum na 1e → bedrag × (resterende_dagen / dagen_in_maand)
   - Laatste maand: einddatum voor einde → bedrag × (actieve_dagen / dagen_in_maand)
3. GEEN herberekening op basis van werkelijke uren, feestdagen of dagtypes
4. Kortingen zijn al verwerkt in maandprijs_netto — NIET opnieuw berekenen

PAD B — Flex contracten (contractvorm = 'flexibel' of 'super_flexibel'):
1. Haal ingeplande uren op uit planned_attendance voor de facturatieperiode
2. Factuurbedrag = SOM(ingeplande_uren) × contract.uurtarief
3. Kortingen toepassen op het berekende bedrag (JOIN kind_contract_kortingen)
4. Als geen uren ingepland: factuurregel met €0,00 en toelichting

Beide paden:
- Invoice line omschrijving: contracttype naam, merk, contractvorm
- Pad A: toon vast maandbedrag + evt. pro-rata info
- Pad B: toon uren × tarief berekening

Resolve contractvorm via: JOIN contracttypen ct ON ct.id = contract.contract_type_id → ct.contractvorm.
Voor legacy contracten zonder contract_type_id: val terug op bestaand gedrag (PAD A).

Bewaar de oude functie als generate_maand_facturen_legacy() voor rollback.
```

### Stap 6.2 — Jaarlijkse tariefwijziging flow

```
Prompt voor Claude Code:
────────────────────────
Lees src/app/actions/contracten.ts en src/app/actions/tarieven.ts.

Maak een nieuwe functie herbereken_contracten_voor_nieuw_tarief() die:
1. Alle actieve contracten ophaalt voor een bepaald merk + contracttype
2. Het nieuwe uurtarief ophaalt uit de actieve TariefSet voor het nieuwe jaar
3. Per contract herberekent: maandprijs_bruto = uurtarief_nieuw × bestaande uren/dagen formule (uit contract.dagdelen)
4. Kortingen opnieuw toepast → maandprijs_netto
5. De contracten bijwerkt met de nieuwe prijzen
6. Een contract_event logt (type: 'tarief_wijziging')

Dit is een BULK operatie die de beheerder handmatig triggert na het activeren van een nieuwe tariefset.
Vereist expliciete bevestiging — toon preview van oude vs nieuwe maandprijzen voordat wijzigingen worden doorgevoerd.
```

### Stap 6.3 — Server actions + UI: Facturatie bijwerken

```
Prompt voor Claude Code:
────────────────────────
Lees src/app/actions/facturen.ts en src/components/facturen/FacturenDashboard.tsx.

Server actions — minimale wijzigingen:
- genereerMaandFacturen(): geen wijziging nodig (roept RPC aan, SQL functie is al bijgewerkt)
- getFactuurRegels(): voeg joins toe voor contracttype naam, merk naam
- Bestaande functies NIET breken — alleen uitbreiden

UI — factuurdetail view aanpassen:
- Per factuurregel: toon contracttype + merk
- Toon of het een pro-rata berekening is (eerste/laatste maand)
- Toon bruto en netto bedrag
- Kortingen tonen als informatief (al verwerkt in netto)

Houd het compact — geen complexe uren-breakdown nodig want het is een vast maandbedrag.
```

---

## Fase 7: Schoolkalender (Simpele Versie)

### Stap 7.1 — Migration: Schoolkalender basis

```
Prompt voor Claude Code:
────────────────────────
Maak supabase/migrations/023_schoolkalender.sql met:

1. Enum schooldag_type_enum: 'regulier', 'studiedag', 'vakantie', 'feestdag'
2. CREATE TABLE schoolkalender (id uuid PK, organisatie_id FK, locatie_id FK nullable, datum date NOT NULL, dagtype schooldag_type_enum NOT NULL DEFAULT 'regulier', naam text, created_at)
3. UNIQUE op (organisatie_id, locatie_id, datum)
4. RLS policies
5. Index op (organisatie_id, datum, dagtype)

Dit is een simpele lookup-tabel. Per datum staat het dagtype. Reguliere schooldagen hoeven niet per se geregistreerd — alles wat NIET in de tabel staat is regulier.
```

### Stap 7.2 — Server actions: Schoolkalender

```
Prompt voor Claude Code:
────────────────────────
Maak src/app/actions/schoolkalender.ts met:

- getSchoolkalender(jaar: number, locatieId?: string) — alle niet-reguliere dagen
- dagTypeInstellen(formData: FormData) — upsert enkele dag
- vakantiePeriodeInstellen(formData: FormData) — bulk insert voor datum-range
- getDagType(datum: string, locatieId: string) — resolve type voor BSO-berekening:
  1. Check feestdagen tabel eerst
  2. Dan schoolkalender voor locatie
  3. Dan schoolkalender org-breed
  4. Default: 'regulier'

Volg bestaande action patronen.
```

### Stap 7.3 — UI: Schoolkalender beheer

```
Prompt voor Claude Code:
────────────────────────
Maak src/components/locaties/SchoolkalenderBeheer.tsx:

- Jaarselector + locatie filter
- Maandoverzicht als simpele grid (geen kalender-library nodig)
- Per dag: kleur op basis van dagtype (regulier=wit, studiedag=geel, vakantie=blauw, feestdag=rood)
- Klik op dag → dropdown dagtype
- Bulk actie: "Markeer periode als vakantie" met start+einddatum
- Overzicht: telling per dagtype voor het jaar

Voeg toe als tab in de locatie-instellingen, naast "Dagdelen" en "Feestdagen".
```

---

## Fase 8: Integratie & Verificatie

### Stap 8.1 — End-to-end flow test

```
Prompt voor Claude Code:
────────────────────────
Draai npm run build en fix alle TypeScript errors.

Test dan de volgende flow handmatig (beschrijf wat je checkt):
1. Merk aanmaken → locaties koppelen
2. ContractType aanmaken voor dat merk
3. TariefSet aanmaken voor dat contracttype + jaar
4. DagdeelConfiguratie instellen voor de locatie
5. KortingsType aanmaken
6. Kindcontract aanmaken via nieuw formulier → check berekende prijzen
7. Contract activeren → check contract_events tabel
8. Factuur genereren → check of nieuwe berekening klopt
9. Check of bestaande (legacy) contracten nog werken

Rapporteer alle gevonden issues.
```

### Stap 8.2 — Seed data bijwerken

```
Prompt voor Claude Code:
────────────────────────
Lees supabase/migrations/003_seed_demo.sql en 007_kindregistratie_seed.sql.

Maak supabase/migrations/024_contract_refactor_seed.sql met demo data:
- 2 merken: "Standaard" (code: STD) en "Groene Formule" (code: GRN)
- Bestaande locaties koppelen aan merken
- 3-4 contracttypen per merk (KDV vast, KDV flex, BSO vast, BSO flex)
- Tariefsets 2026 voor alle combinaties
- Dagdeel configuraties voor alle locaties
- 2-3 kortingstypes (broer/zuskorting, personeelskorting)
- Schoolkalender 2026 met vakanties + enkele studiedagen
- Bestaande contracten koppelen aan nieuwe contracttypen (waar mogelijk)

Volg stijl en uuid-generatie van bestaande seed files.
```

---

## Navigatie Structuur (Eindsituatie)

```
Dashboard
├── Kinderen
│   └── [kind] → Contracten tab (Module 4 - nieuw formulier)
├── Contracten
│   ├── Contracttypen (Module 1)
│   ├── Merken (Module 1)
│   ├── Tarieven (Module 2)
│   └── Kortingen (Module 3)
├── Locaties
│   └── [locatie]
│       ├── Dagdelen (Module 5)
│       ├── Feestdagen (Module 5)
│       └── Schoolkalender (Fase 7)
├── Facturen (Fase 6 - uitgebreid)
└── ...bestaande menu items
```

---

## Rollenmatrix

| Rol | Merken/CT | Tarieven | Kortingen | Kindcontract | Schoolkalender |
|-----|-----------|----------|-----------|--------------|----------------|
| Beheerder | R+W | R+W | R+W | R+W | R+W |
| Vestigingsmanager | Lezen | Lezen | Lezen | R+W | R+W |
| Klantadviseur | Lezen | Lezen | Lezen | R+W | Lezen |
| Medewerker | Lezen | Lezen | Lezen | R+W | Lezen |

---

## Tips voor Claude Code Gebruik

1. **Start elke sessie met**: "Lees docs/architecture/conventions.md en docs/IMPLEMENTATION_PLAN_CONTRACT_REFACTOR.md, stap X.Y"
2. **Geef bestandspaden mee**: "Lees src/app/actions/contracten.ts" — niet "zoek de contracten actions"
3. **Eén stap per prompt**: mix niet "maak migration + actions + UI"
4. **Build check na elke UI stap**: "Draai npm run build en fix errors"
5. **Verwijs naar patronen**: "Volg het patroon van src/app/actions/kinderen.ts"
6. **Context meegeven**: als een stap afhankelijk is van een vorige, geef de relevante types/schema mee
7. **Kleine commits**: commit na elke fase, niet na elke stap

---

## Afhankelijkheden tussen fases

```
Fase 0 (prep) → alles
Fase 1 (merken) → Fase 3 (tarieven), Fase 5 (kindcontract)
Fase 2 (dagdelen) → Fase 5 (kindcontract), Fase 6 (facturatie)
Fase 3 (tarieven) → Fase 5 (kindcontract)
Fase 4 (kortingen) → Fase 5 (kindcontract), Fase 6 (facturatie)
Fase 5 (kindcontract) → Fase 6 (facturatie)
Fase 7 (schoolkalender) → Fase 6 (BSO deel facturatie)
```

Fase 1, 2, 3, 4 kunnen deels parallel als je met branches werkt.
Fase 5 is de bottleneck — alles komt hier samen.
Fase 7 kan onafhankelijk gebouwd worden, maar BSO-facturatie in Fase 6 heeft het nodig.
