# Penguin Place — Technische Documentatie

---

## Structuur

```
docs/
  README.md                        ← Dit bestand (index)
  architecture/
    conventions.md                 ← Naamgeving, patronen, kleurpalet, rollen
  features/
    locaties/
      spec.md                      ← Ontwerp & datamodel (door Cowork)
      implementation-notes.md      ← Technische notities (door Claude Code)
    [volgende feature]/
      spec.md
      implementation-notes.md
```

---

## Geïmplementeerde features

| Feature | Status | Migration | Spec | Notes |
|---|---|---|---|---|
| Locaties module | ✅ Ontworpen | `013_locaties_uitbreiding.sql` | [spec](features/locaties/spec.md) | — |

---

## Workflow

1. **Feature uitwerken** → gebruik `master-prompt-cowork-feature-uitwerken.md` in Cowork
   - Output: `docs/features/[naam]/spec.md`

2. **Code schrijven** → gebruik `master-prompt-claude-code.md` in Claude Code
   - Output: migration + Server Actions + componenten + `docs/features/[naam]/implementation-notes.md`

3. **Na implementatie** → Cowork update deze README (Geïmplementeerde features tabel)

---

## Architectuurbeslissingen

| Beslissing | Reden | Datum |
|---|---|---|
| Geen aparte REST API | Alleen eigen Next.js frontend als consumer; Server Actions volstaan | 2026-04-12 |
| Soft deletes via `deleted_at` | Audit trail behouden, geen data verlies | 2026-04-12 |
| Nederlandstalige naamgeving | Consistentie met domein en eindgebruikers, makkelijker te lezen voor NL-team | 2026-04-12 |
| RLS via Supabase | Security op databaselaag, niet afhankelijk van applicatielogica | 2026-04-12 |
| Berekende waarden niet opslaan | Single source of truth, geen synchronisatieproblemen | 2026-04-12 |
