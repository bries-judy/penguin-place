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

Laatste genummerd: `028_seed_ouder_test.sql` (+ timestamped `20260412*`). Volgende: `029_xxx.sql`.

## Ouder-entiteit (Fase 0 Ouderportaal)

- `ouder_profielen`: first-class entiteit, apart van `profiles` (staff). id = auth.users.id.
- `ouder_kind`: autorisatie-spine (many-to-many ouder ↔ kind). Elke ouder-RLS-policy filtert via `get_ouder_kind_ids()`.
- User type in `auth.users.raw_app_meta_data.user_type` ('staff' | 'ouder'). `handle_new_user()` trigger maakt conditioneel `profiles` of `ouder_profielen` aan.
- `get_organisatie_id()` retourneert NULL voor ouders → staff-policies evalueren false → ouders zien data alleen via additieve ouder-policies.
- Admin client: `src/lib/supabase/admin.ts` (service_role key, alleen server-side).
- Supabase Storage bucket `media` (private). Pad: `{org_id}/{kind_id}/{dagverslag_id}/{uuid}.{ext}`.

## Belangrijke paden

- Server actions: `src/app/actions/`
- Components: `src/components/[feature]/`
- Types: `src/types/` + `src/lib/supabase/types.ts`
- Migrations: `supabase/migrations/`
- Conventies: `docs/architecture/conventions.md`

## Contract refactor

Zie `docs/IMPLEMENTATION_PLAN_CONTRACT_REFACTOR.md` voor het stappenplan (8 fases, ~33 stappen).
