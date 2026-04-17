# Ouder CRM — Implementation Notes (Fase 1 · Frontend)
Datum: 2026-04-17
Migraties: geen (backend-prompt heeft 037 + 038 al aangemaakt)

## Wat is gebouwd

Complete UI voor Ouder CRM Fase 1, bovenop de backend van de vorige prompt:

- Ouders-lijst (`/dashboard/ouders`) met zoekbalk en actief/inactief-filter.
- Ouder-detail (`/dashboard/ouders/[id]`) met header + 4 metric-tiles en 7 tabs
  conform mockup en spec.
- 7 tab-componenten (Overzicht, Kinderen, Planning, Communicatie, Financieel,
  Documenten, Gegevens).
- Inline `NieuweMemoForm` voor het aanmaken van memo's direct vanuit de
  Communicatie-tab.
- Klanten-groep in de sidebar met `Ouders`-link.
- Server action `ouderBijwerken` + twee helper-actions
  (`portaalberichtenOphalen`, `ouderFacturenOphalen`) voor data die alleen
  in de detail-tabs nodig is.

## Nieuwe bestanden

- `src/components/ouders/OudersLijst.tsx`
- `src/components/ouders/OuderDetail.tsx` (exporteert ook `PortaalBericht` +
  `OuderFactuur` zodat de page en tabs hetzelfde type delen)
- `src/components/ouders/OuderHeader.tsx`
- `src/components/ouders/OuderOverzichtTab.tsx`
- `src/components/ouders/OuderKinderenTab.tsx`
- `src/components/ouders/OuderPlanningTab.tsx`
- `src/components/ouders/OuderCommunicatieTab.tsx`
- `src/components/ouders/NieuweMemoForm.tsx`
- `src/components/ouders/OuderDocumentenTab.tsx`
- `src/components/ouders/OuderFinancieelTab.tsx`
- `src/components/ouders/OuderGegevensTab.tsx`

## Gewijzigde bestanden

- `src/app/actions/ouders.ts` — 3 nieuwe exports: `ouderBijwerken`,
  `portaalberichtenOphalen`, `ouderFacturenOphalen`.
- `src/app/dashboard/ouders/[id]/page.tsx` — haalt nu parallel 4 bronnen op
  (detail, memo's, portaalberichten, facturen) en geeft ze mee aan
  `OuderDetail`.
- `src/components/layout/Sidebar.tsx` — nieuwe nav-groep "Klanten" met de
  `Ouders`-link boven "Kinderen & Contracten", gebruikt `Users` icoon uit
  `lucide-react`.

## Afwijkingen van spec

1. **OuderHeader "Nieuwe memo"-knop scrolt naar Communicatie-tab i.p.v.
   een eigen dialog.** De spec laat open hoe de knop werkt ("inline of
   dialog"). Ik switch de actieve tab naar Communicatie en laat de gebruiker
   daar de `NieuweMemoForm` openen — minder codeduplicatie en de timeline is
   direct zichtbaar als context. In de header zelf geen losse form.

2. **Tabs zijn controlled via `useState` i.p.v. `defaultValue`.** De spec
   en `LocatieDetail.tsx` gebruiken `defaultValue`. Ik heb de tabs
   controlled gemaakt (`value` + `onValueChange`) zodat `OuderHeader` via
   de callback naar de Communicatie-tab kan navigeren. Functioneel
   verder identiek.

3. **"Nieuwe ouder"-knop in `OudersLijst` is disabled.** Ouders worden nu
   nog uitgenodigd vanuit `/dashboard/kinderen` (bestaande flow met
   `ouderUitnodigen`). De spec noemt geen apart uitnodig-scherm voor fase
   1, dus een disabled-knop met tooltip lijkt me beter dan een
   dode-route-link. Kan in fase 2 worden ingevuld.

4. **Planning-tab leidt planned_days af uit `contract.dagen_per_week`.** De
   backend-query zet `planned_days: []` op elke `OuderKindRij` (zie
   backend-notes). De spec zegt expliciet: "bereken uit contracten als
   `planned_days` leeg is". Ik pak `dagen_per_week` van het eerste actieve
   contract en toon de eerste N weekdagen (ma…). Dit is een benadering —
   echte planning-resolutie komt later uit `planned_attendance`.

5. **Co-ouder-box is placeholder.** De spec vraagt om een co-ouder-link
   "als er een ouder2 is via ouder_kind". De backend stuurt die info nu
   nog niet aggregeerd mee en het uitbreiden van `ouderDetailOphalen`
   daarvoor zou scope creep zijn — in Fase 1 toon ik een nette placeholder
   met "Beschikbaar in fase 2". Eenvoudig toe te voegen als de
   backend-query uitgebreid wordt.

6. **Gegevens-tab bewerkt alleen basisprofiel.** Spec noemt "naam, email,
   telefoon". Ik heb voornaam/achternaam/email/telefoon_mobiel gedaan, met
   de trigger uit migratie 038 die alle vier audit-logt. AVG-checkboxen
   blijven in fase 1 read-only.

7. **`spawn_task`-worthy, niet nu gedaan**: Sidebar heeft nu 7 nav-groepen;
   de groep "Klanten" met één item is visueel wat dun. Eventueel samen te
   voegen met "Kinderen & Contracten" tot één groep "Klanten & contracten"
   — maar dat raakt de IA en hoort niet in deze PR.

## Design-tokens

Alleen PP-tokens gebruikt, geen willekeurige Tailwind-kleuren voor de
ouder-specifieke UI:
- Primair: `#6B5B95` (buttons) / `#9B8FCE` (accent)
- Tekst: `#2D2540` / `#5A5278` / `#8B82A8`
- Achtergrond: `#FFFFFF` (kaarten) / `#F5F3F0` (sidebar-achtig) /
  `#EDE9F8` (lavender accent)
- Border: `#C8C2D8` (forms) / `#E8E4DF` (kaarten) / `#F0EDEA` (tabel-rijen)
- Status: `#D8F0E4/#1a6b40` (actief/betaald) · `#F0EDFF/#6B5B95` (concept)
  · `#E8F4FD/#1976D2` (verzonden) · `#FFF3E0/#E65100` (te laat/taak)
  · `#FDECEA/#ba1a1a` (openstaand > 0)
- Typografie: `Manrope` voor koppen (700/800), `Inter` body (via app-default)
- Borderradius: `rounded-xl` (12px)

Status-badges zijn consistent met `FacturenDashboard.tsx` (inline
`style={}` met `background`/`color`).

## Bekende beperkingen / TODO's

- Geen e-mail-UI (fase 3).
- Co-ouder-link is placeholder tot de backend-query ouder2-info meestuurt.
- Weekplanning geeft geen per-dag opvang — dagen_per_week is een
  benadering.
- Audit-trail toont alleen wijzigingen die via `ouderBijwerken` zijn
  gedaan. Handmatige DB-mutaties worden wel gelogd door de trigger, maar
  zonder `staff_id` (`auth.uid()` is dan NULL).
- "Nieuwe ouder"-knop in lijst is disabled.
- Geen unit/e2e tests — niet binnen scope van deze prompt.
- Preview-verificatie is beperkt gebleven tot TypeScript-compile en
  dev-server-start (geen test-login beschikbaar in deze sessie).

## Relaties naar andere modules

- **Ouder-links**: Kind-profielen (`/dashboard/kinderen/[id]`) en
  contract-detail (`/dashboard/contracten/[id]`) — beide
  bestaande routes.
- **`conversation_messages`** (migratie 029) — alleen-lezen in de
  Communicatie-tab; de tab doet geen inserts (staff-reply via portaal
  komt in fase 2).
- **`invoices`** — alleen-lezen in de Financieel-tab.
- **Audit-trigger** uit migratie 038 vuurt af wanneer `ouderBijwerken`
  de `ouder_profielen`-rij update; audit-log rendert onderin de
  Gegevens-tab.

## Verificatie

- `npx tsc --noEmit` → exit 0 (geen type-errors).
- `npm run dev` start zonder compile-errors; `/login` serveert HTTP 200;
  geauth. routes geven redirect naar login zoals verwacht.

## Definition of Done — frontend-scope

- [x] 11 componenten gebouwd
- [x] 7 tabs werkend, navigeren controlled
- [x] Metric-tiles in header met correcte tone (rood bij saldo > 0, oranje
      bij taken > 0)
- [x] Memo aanmaken: form → `memoAanmaken` → `revalidatePath` →
      `router.refresh()` → verschijnt in timeline
- [x] Memo afvinken: `memoAfvinken` → taak toont `Afgerond`-badge
- [x] Memo soft-deleten via `memoVerwijderen`
- [x] Ouder bijwerken via `ouderBijwerken` (triggert audit)
- [x] Sidebar: "Klanten"-groep met Ouders-link
- [x] Alleen PP design-tokens gebruikt
- [x] TypeScript compileert
- [ ] UI getest met echte data — vereist login; handmatig door Judy te
      doen na deploy van de migraties 037 + 038
