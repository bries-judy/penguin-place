# Ouder CRM — Implementation Notes (Fase 1 · Backend)
Datum: 2026-04-17
Migraties: `037_ouder_memos.sql`, `038_ouder_audit.sql`

## Wat is gebouwd

De server-side fundering voor de 360° ouder-pagina:

- Twee migraties met het domeinmodel voor staff-memo's over ouders + een
  audit-trail op wijzigingen van `ouder_profielen`.
- TypeScript-types in `src/types/ouders.ts` die exact matchen met de
  responses van de server actions.
- Uitbreiding van `src/app/actions/ouders.ts` met twee aggregate-queries:
  `oudersOphalen()` (lijst) en `ouderDetailOphalen(id)` (detail met kinderen,
  contracten, saldo, open taken, actieve contracten, audit-log, laatste
  contactmoment).
- Nieuw bestand `src/app/actions/ouderMemos.ts` met CRUD-achtige acties
  voor memo's: `memoAanmaken`, `memoAfvinken`, `memoVerwijderen` en
  `memosOphalen`. Memo's worden soft-deleted via `deleted_at`.
- Server Components `/dashboard/ouders/page.tsx` en
  `/dashboard/ouders/[id]/page.tsx` die de data ophalen en doorgeven aan
  (nog te bouwen) client components `OudersLijst` en `OuderDetail`.

## Nieuwe / gewijzigde tabellen

| Tabel | Wijziging | Reden |
|---|---|---|
| `ouder_memos` | Nieuw | Staff-notities over ouders (telefoon/gesprek/notitie/taak) met follow-up en zichtbaarheidsregels |
| `ouder_audit` | Nieuw | AVG-verantwoording: wie wijzigde welk veld op `ouder_profielen` wanneer |
| `ouder_memo_type` | Nieuwe enum | `telefoon` / `gesprek` / `notitie` / `taak` |
| `ouder_memo_zichtbaar` | Nieuwe enum | `alle_staff` / `alleen_auteur` / `team_locatie` |
| `follow_up_status` | Nieuwe enum | `open` / `afgerond` / `geannuleerd` |
| `ouder_profielen` | AFTER UPDATE trigger `ouder_profiel_audit` | Logt wijzigingen naar `ouder_audit` |

Geen bestaande kolommen hernoemd of verwijderd — migraties zijn additief.

## Nieuwe bestanden

- `supabase/migrations/037_ouder_memos.sql`
- `supabase/migrations/038_ouder_audit.sql`
- `src/types/ouders.ts`
- `src/app/actions/ouderMemos.ts`
- `src/app/dashboard/ouders/page.tsx`
- `src/app/dashboard/ouders/[id]/page.tsx`

## Gewijzigde bestanden

- `src/app/actions/ouders.ts` — twee nieuwe exports: `ouderDetailOphalen`,
  `oudersOphalen`. Bestaande `ouderUitnodigen` en `ouderKindKoppelen`
  blijven ongewijzigd.

## Afwijkingen van spec

1. **Migratienummers 037/038 i.p.v. 034/035.** Spec noemt 034 en 035, maar
   die nummers waren al in gebruik (`034_extra_day_requests.sql`,
   `035_mededelingen_bookmarks.sql`). Migraties zijn immutable volgens de
   projectregels, dus opgeschoven naar eerstvolgende vrije nummers. De
   CLAUDE.md verwees nog naar "Laatste genummerd: 029" — die is nu ook
   achterhaald, maar laat ik voor deze prompt buiten scope.

2. **`has_any_role('beheerder')` i.p.v. `has_any_role(ARRAY['beheerder'])`.**
   De helper is VARIADIC gedefinieerd in `002_rls.sql`. `026_ouder_rls.sql`
   gebruikt de varargs-vorm. Ik volg dat bestaande patroon voor
   consistentie; functioneel identiek.

3. **`ouder_memos_update` policy heeft ook org-check en `WITH CHECK`.** De
   spec toont alleen `USING (is_staff() AND (auteur_id = auth.uid() OR
   has_any_role('beheerder')))`. Ik heb `organisatie_id =
   get_organisatie_id()` toegevoegd aan zowel `USING` als `WITH CHECK` om
   te voorkomen dat een beheerder memo's uit een andere organisatie zou
   kunnen aanpassen. Past bij het patroon elders in `026_ouder_rls.sql`.

4. **`ouder_audit_select` policy scope-check.** Spec heeft alleen
   `is_staff()` + rollencheck. Audit-rijen hebben zelf geen
   `organisatie_id`-kolom (ze hangen aan `ouder_profielen.id`), dus strikte
   org-scoping gebeurt transitief via RLS op `ouder_profielen` — zolang
   staff alleen eigen-org ouders kan zien, kan ze alleen hun audit ophalen
   via de JOIN-query's die deze backend doet.

5. **`memosOphalen` doet aparte profiles-lookup.** De spec gebruikt
   `auteur:profiles!auteur_id(naam)` als embedded select. In de
   `locaties/[id]/page.tsx` wordt dat patroon bewust vermeden ("cross-schema
   FK werkt niet in PostgREST"). Ik volg dat bewezen patroon en doe een
   aparte `.in('id', auteurIds)` lookup op `profiles`. Resultaat is
   identiek vanuit de caller gezien (`auteur?: { naam: string }`).

6. **`ouderDetailOphalen` doet expliciete org-gate.** Naast de RLS-policy
   check ik ook `organisatie_id = profile.organisatie_id` in de
   `ouder_profielen`-query zelf, zodat een verkeerde ID vroeg `null`
   teruggeeft i.p.v. een leeg object. Defence-in-depth.

## Bekende beperkingen / TODO's

- `OuderLijstRij.openstaand_bedrag` is op de lijstpagina altijd 0 —
  aggregate over alle ouders wordt te zwaar zonder view. Komt terug in
  fase 2b (`v_ouder_saldo` volgens het domeindoc).
- `planned_days` in `OuderKindRij` blijft leeg. De planning-tab moet dit
  later berekenen uit `dagdelen_configuraties` of `planned_attendance`.
- `laatste_contact_datum/laatste_contact_type` kijkt nu alleen naar
  `ouder_memos`. Union met `conversation_messages` gebeurt in de UI (de
  Communicatie-tab krijgt die merge, zodat de tile niet in een
  aparte query hoeft).
- `ouder_emails`, `jaaropgaves`, `sepa_machtigingen`, VoIP — bewust niet
  gebouwd, volgens spec.
- Geen client components in deze PR. `OudersLijst` en `OuderDetail` zijn
  imports die nog niet bestaan — de frontend-prompt bouwt die. Tot die
  tijd faalt build/runtime bij `/dashboard/ouders`.

## Relaties naar andere modules

- **`ouder_profielen` / `ouder_kind`** (migratie 024) — entiteit waar deze
  feature omheen hangt. Audit-trigger staat op `ouder_profielen`.
- **`profiles`** — `auteur_id` van memo's en `staff_id` van audit.
- **`kinderen` / `contracten` / `locaties` / `groepen` /
  `dagdelen_configuraties`** — geneste select in `ouderDetailOphalen`.
- **`invoices` + `contactpersonen`** — openstaand saldo loopt via
  `ouder_kind.contactpersoon_id → invoices.parent_id`.
- **`conversation_messages`** (migratie 029) — gaat via de frontend-tab
  meedoen in de Communicatie-timeline; geen backend-join in deze fase.

## Definition of Done — backend-scope

- [x] Migraties toegepast (037 + 038)
- [x] Types in `src/types/ouders.ts`
- [x] `ouderDetailOphalen` en `oudersOphalen` geïmplementeerd
- [x] `memoAanmaken`, `memoAfvinken`, `memoVerwijderen`, `memosOphalen`
      geïmplementeerd
- [x] Server Components voor `/dashboard/ouders` en
      `/dashboard/ouders/[id]`
- [x] Auth + organisatie_id check in elke server action / server component
- [x] Soft deletes via `deleted_at`
- [x] RLS-policies volgens patroon `026_ouder_rls.sql`
- [ ] TypeScript build — niet geverifieerd in deze sessie; client
      components ontbreken nog, dus een `tsc`-run zal ontbrekende
      `OudersLijst`/`OuderDetail` imports rapporteren tot de frontend er is.
