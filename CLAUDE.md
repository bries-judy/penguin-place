@AGENTS.md

# Penguin Place — Projectcontext

Lees `docs/architecture/conventions.md` voor alle naamgevings- en codepatronen.

## Kernconventies

- **Database**: snake_case, Nederlands, meervoud (`locaties`, `groepen`). Enums: lowercase Nederlands (`actief`, `in_opbouw`). FK: `[tabel_enkelvoud]_id`.
- **Componenten**: PascalCase, Nederlands (`LocatiesLijst`, `NieuweGroepForm`)
- **Server Actions**: camelCase (`locatieAanmaken`). Patroon: `FormData` → `createClient()` → auth check → validatie → insert → `revalidatePath()`
- **Routes**: kebab-case (`/dashboard/locaties/nieuw`)
- **Types**: PascalCase (`Locatie`, `GroepStatus`). Constanten: `UPPER_SNAKE_CASE`
- **Soft deletes**: `deleted_at = now()`, nooit fysiek verwijderen. Queries filteren altijd `.is('deleted_at', null)`
- **RLS**: elke tabel. Helpers: `get_organisatie_id()`, `has_role()`, `has_any_role()`, `get_toegankelijke_locatie_ids()`, `is_ouder()`, `is_staff()`, `get_ouder_kind_ids()`
- **Migrations**: immutable — nooit kolommen hernoemen/verwijderen, alleen `ADD COLUMN IF NOT EXISTS`

## Migratie-status

Laatste genummerd: `038_ouder_audit.sql` (+ timestamped `20260412*`). Volgende: `039_xxx.sql`.

## Ouder-entiteit (Fase 0 + Fase 1 Ouderportaal)

- `ouder_profielen`: first-class entiteit, apart van `profiles` (staff). id = auth.users.id.
- `ouder_kind`: autorisatie-spine (many-to-many ouder ↔ kind). Elke ouder-RLS-policy filtert via `get_ouder_kind_ids()`.
- User type in `auth.users.raw_app_meta_data.user_type` ('staff' | 'ouder'). `handle_new_user()` trigger maakt conditioneel `profiles` of `ouder_profielen` aan.
- `get_organisatie_id()` retourneert NULL voor ouders → staff-policies evalueren false → ouders zien data alleen via additieve ouder-policies.
- Admin client: `src/lib/supabase/admin.ts` (service_role key, alleen server-side).
- Supabase Storage bucket `media` (private). Pad: `{org_id}/{kind_id}/{dagverslag_id}/{uuid}.{ext}`.
- Fase 1 Ouderportaal-tabellen: `conversations`, `conversation_messages`, `inbox_read_status`, `absence_requests`.
- Helper: `get_or_create_conversation(p_kind_id, p_groep_id)` — atomisch conversatie ophalen/aanmaken.
- Enums: `bericht_afzender_type`, `afmelding_status`, `afmelding_dagdeel`.
- Ouder-app: apart Expo project in `../penguin-place-ouder-app/`.

## Ouder CRM (Fase 1 — staff-zijde)

- `ouder_memos` (migratie 037): staff-notities over ouders (telefoon/gesprek/notitie/taak) met optionele follow-up en zichtbaarheidsregels. Soft-delete via `deleted_at`.
- `ouder_audit` (migratie 038): wijzigingen aan `ouder_profielen` worden automatisch gelogd via trigger `ouder_profiel_audit` → `log_ouder_profiel_wijziging()` (voornaam/achternaam/email/telefoon_mobiel).
- Enums: `ouder_memo_type`, `ouder_memo_zichtbaar`, `follow_up_status`.
- Routes: `/dashboard/ouders` (lijst), `/dashboard/ouders/[id]` (7-tab 360° detail).
- Server actions: `ouderDetailOphalen`, `oudersOphalen`, `ouderBijwerken`, `portaalberichtenOphalen`, `ouderFacturenOphalen` in `src/app/actions/ouders.ts`; memo-CRUD in `src/app/actions/ouderMemos.ts`.

## Belangrijke paden

- Server actions: `src/app/actions/`
- Components: `src/components/[feature]/`
- Types: `src/types/` + `src/lib/supabase/types.ts`
- Migrations: `supabase/migrations/`
- Conventies: `docs/architecture/conventions.md`

## Contract refactor

Zie `docs/IMPLEMENTATION_PLAN_CONTRACT_REFACTOR.md` voor het stappenplan (8 fases, ~33 stappen).
