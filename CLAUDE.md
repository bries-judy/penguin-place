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
- **RLS**: elke tabel. Helpers: `get_organisatie_id()`, `has_role()`, `has_any_role()`, `get_toegankelijke_locatie_ids()`
- **Migrations**: immutable — nooit kolommen hernoemen/verwijderen, alleen `ADD COLUMN IF NOT EXISTS`

## Migratie-status

Laatste genummerd: `014_locaties_seed.sql` (+ timestamped `20260412*`). Volgende: `015_xxx.sql`.

## Belangrijke paden

- Server actions: `src/app/actions/`
- Components: `src/components/[feature]/`
- Types: `src/types/` + `src/lib/supabase/types.ts`
- Migrations: `supabase/migrations/`
- Conventies: `docs/architecture/conventions.md`

## Contract refactor

Zie `docs/IMPLEMENTATION_PLAN_CONTRACT_REFACTOR.md` voor het stappenplan (8 fases, ~33 stappen).
