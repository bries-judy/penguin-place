# Penguin Place — Conventies & Patronen
Laatst bijgewerkt: 2026-04-12

---

## Tech Stack

| Onderdeel | Keuze |
|---|---|
| Framework | Next.js 16 App Router + React 19 + TypeScript |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth + RLS |
| Mutaties | Server Actions (`'use server'`, FormData) |
| Data fetching | Server Components (directe Supabase client) |
| Styling | Tailwind CSS v4 |
| UI components | shadcn/ui + @base-ui/react |
| Iconen | lucide-react |
| Taal in code | Nederlands |

---

## Naamgeving

### Database
- Tabellen: `snake_case`, Nederlands, meervoud (`locaties`, `groepen`, `medewerkers`)
- Kolommen: `snake_case`, Nederlands (`organisatie_id`, `deleted_at`, `aangemaakt_op`)
- Enums: `snake_case`, Nederlandse waarden (`actief`, `in_opbouw`, `alleen_wachtlijst`)
- Foreign keys: `[tabel_enkelvoud]_id` (bijv. `locatie_id`, `organisatie_id`)

### Code
- Componenten: `PascalCase`, Nederlands (`LocatiesLijst`, `NieuweGroepForm`)
- Server Actions: camelCase, werkwoord + zelfstandig naamwoord (`locatieAanmaken`, `groepBijwerken`)
- Routes: kebab-case, Nederlands (`/dashboard/locaties/nieuw`)
- Types/interfaces: PascalCase (`Locatie`, `LocatieStatus`, `GroepRij`)
- Constanten: `UPPER_SNAKE_CASE` (`LOCATIE_STATUS_LABELS`, `DAG_LABELS`)

---

## Bestandsstructuur per feature

```
src/
  app/
    actions/
      [feature].ts              ← Server Actions
    dashboard/
      [feature]/
        page.tsx                ← Server Component (data fetching)
        nieuw/
          page.tsx
        [id]/
          page.tsx
  components/
    [feature]/
      [Feature]Lijst.tsx        ← Overzicht (Client Component)
      [Feature]Detail.tsx       ← Detail met tabs (Client Component)
      Nieuw[Feature]Form.tsx    ← Aanmaakformulier
      tabs/
        AlgemeenTab.tsx
        ...
  types/
    [feature].ts                ← TypeScript interfaces + labels

docs/
  features/
    [feature]/
      spec.md                   ← Ontwerp (aangemaakt door Cowork)
      implementation-notes.md   ← Technische notities (aangemaakt door Claude Code)
```

---

## Server Action patroon

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function [naam]Aanmaken(formData: FormData): Promise<{ error?: string; id?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Niet ingelogd' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('organisatie_id')
    .eq('id', user.id)
    .single()
  if (!profile?.organisatie_id) return { error: 'Geen organisatie gevonden' }

  // Validatie
  // ...

  // Insert
  const { data, error } = await supabase
    .from('[tabel]')
    .insert({ organisatie_id: profile.organisatie_id, ... })
    .select('id')
    .single()

  if (error || !data) return { error: error?.message ?? 'Onbekende fout' }

  revalidatePath('/dashboard/[route]')
  return { id: data.id }
}
```

---

## Server Component patroon

```typescript
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import [Component] from '@/components/[feature]/[Component]'

export const dynamic = 'force-dynamic'

export default async function [Naam]Page() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: items } = await supabase
    .from('[tabel]')
    .select('...')
    .is('deleted_at', null)
    .order('[kolom]')

  return <[Component] items={items ?? []} />
}
```

---

## Client Component patroon

```typescript
'use client'

import { useState } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface [Naam]Rij {
  id: string
  // ...
}

interface Props {
  items: [Naam]Rij[]
}

// ─── Helpers / constanten ─────────────────────────────────────────────────────

const STATUS_CONFIG = {
  actief:   { label: 'Actief',   bg: 'bg-[#8df4ed]/40', text: 'text-[#006a66]', dot: 'bg-[#006a66]' },
  inactief: { label: 'Inactief', bg: 'bg-slate-100',    text: 'text-slate-500', dot: 'bg-slate-400' },
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function [Naam]Lijst({ items }: Props) {
  // ...
}
```

---

## Database regels

- Elke tabel heeft: `id UUID PK`, `created_at TIMESTAMPTZ`, `updated_at TIMESTAMPTZ`, `deleted_at TIMESTAMPTZ`
- Soft deletes: zet `deleted_at = now()`, verwijder nooit fysiek
- Query's filteren altijd op `.is('deleted_at', null)`
- Berekende waarden worden **niet** opgeslagen (bijv. m²/kind, bezettingsgraad)
- Migrations: `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` — verwijder of hernoem nooit bestaande kolommen
- Elke nieuwe tabel krijgt RLS die aansluit op bestaande helpers in `002_rls.sql`

---

## Kleurpalet (statusbadges)

```typescript
// Actief / positief
bg: 'bg-[#8df4ed]/40'  text: 'text-[#006a66]'  dot: 'bg-[#006a66]'

// Wachtlijst / informatief
bg: 'bg-[#bee9ff]/60'  text: 'text-[#004d64]'  dot: 'bg-[#006684]'

// Waarschuwing
bg: 'bg-amber-50'      text: 'text-amber-700'   dot: 'bg-amber-500'

// Inactief / grijs
bg: 'bg-slate-100'     text: 'text-slate-500'   dot: 'bg-slate-400'

// Fout / kritiek
bg: 'bg-red-50'        text: 'text-red-700'     dot: 'bg-red-500'
```

---

## Rollen & toegang

| Rol | Scope |
|---|---|
| `klantadviseur` | Eigen organisatie, leesrechten + klantcontact |
| `vestigingsmanager` | Eigen locatie(s), beheer van groepen en planning |
| `personeelsplanner` | Eigen locatie(s), planning en bezetting |
| `regiomanager` | Meerdere locaties binnen organisatie |
| `directie` | Hele organisatie |
| `beheerder` | Alles, inclusief instellingen |

Gebruik in RLS: `has_role('beheerder')` of `has_any_role('directie', 'regiomanager', 'beheerder')`
Locatietoegang: `get_toegankelijke_locatie_ids()` geeft array van toegestane locatie-UUIDs.
