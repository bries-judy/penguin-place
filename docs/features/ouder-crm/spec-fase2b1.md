# Ouder CRM — Fase 2b.1: Saldo-view + openstaand bedrag op lijst

> **Context:** zie `Penguin Place — Domein 4 Ouder CRM & 360° Klantbeeld.md`, sectie 1.7 (Afgeleid / View: `v_ouder_saldo`).
> **Status:** Fase 2b.1 — eerste kleine increment van Fase 2b.
> **Doel:** saldo-berekening centraliseren in een view. Dit maakt:
>   - `ouderDetailOphalen` simpeler (geen inline join meer)
>   - `oudersOphalen` rijk (kan nu openstaand_bedrag per ouder tonen zonder zware join)
>   - Fase 2b.2 (SEPA), 2b.3 (jaaropgave) enzovoort makkelijker (saldo is één lookup)

---

## Scope Fase 2b.1

**Bouwen:**
- Migratie `042_v_ouder_saldo.sql` — view die openstaand saldo per ouder aggregeert
- Refactor `ouderDetailOphalen` → gebruikt de view
- Refactor `oudersOphalen` → haalt saldo mee (was hardcoded 0)
- UI: `OudersLijst` toont saldo-kolom (rood als > 0)

**Niet bouwen (later):**
- Betaalhistorie timeline — Fase 2b.3 bij jaaropgave
- SEPA-mandaten — Fase 2b.2
- Audit-uitbreiding (generiek trigger-pattern) — uitgesteld, evalueer of nodig na 2b.2/2b.3

---

## View

### 042_v_ouder_saldo.sql

```sql
-- ═══════════════════════════════════════════════════════════════
-- PENGUIN PLACE — Migratie 042: view v_ouder_saldo
-- ═══════════════════════════════════════════════════════════════
--
-- Aggregeert openstaand saldo per ouder via de bridge:
--   ouder_profielen.id → ouder_kind.ouder_id
--   ouder_kind.contactpersoon_id → invoices.parent_id
--   invoices.status IN ('sent', 'overdue') → openstaand
--
-- Eén rij per ouder, ook als er 0 openstaande facturen zijn (dan 0).
--
-- RLS: views in Postgres gebruiken de security-context van de aanroeper.
-- De onderliggende tabellen (invoices, ouder_kind, contactpersonen,
-- ouder_profielen) hebben RLS; de view erft die via de query-execution.
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW public.v_ouder_saldo AS
SELECT
  o.id                                                    AS ouder_id,
  o.organisatie_id                                        AS organisatie_id,
  COALESCE(SUM(
    CASE WHEN i.status IN ('sent', 'overdue')
         THEN i.totaal_bedrag ELSE 0 END
  ), 0)::DECIMAL(12,2)                                    AS openstaand_bedrag,
  COUNT(*) FILTER (WHERE i.status IN ('sent', 'overdue')) AS aantal_openstaand,
  MIN(i.created_at) FILTER (
    WHERE i.status IN ('sent', 'overdue')
  )                                                       AS oudste_openstaande_datum,
  MAX(i.created_at) FILTER (WHERE i.status = 'paid')      AS laatste_betaling_op
FROM public.ouder_profielen o
LEFT JOIN public.ouder_kind ok  ON ok.ouder_id = o.id AND ok.actief = true
LEFT JOIN public.invoices   i   ON i.parent_id = ok.contactpersoon_id
GROUP BY o.id, o.organisatie_id;

COMMENT ON VIEW public.v_ouder_saldo IS
  'Aggregate openstaand saldo per ouder. Sent + overdue facturen via '
  'ouder_kind.contactpersoon_id → invoices.parent_id. Zie Fase 2b.1.';
```

**Keuzes in deze view:**
- `LEFT JOIN`: elke ouder krijgt een rij (0 saldo) zodat de join in `oudersOphalen` niet rijen laat vallen.
- `COALESCE(SUM..., 0)`: geen NULL's in `openstaand_bedrag`.
- `FILTER`-clausule: cleaner dan `CASE WHEN` bij de aggregates.
- `organisatie_id` meegenomen voor toekomstige queries die per-org aggregaten willen zonder extra join.
- `incassofase` uit het domein-doc laat ik buiten deze view — dat hangt af van business rules die nog ingevuld moeten worden en is makkelijk achteraf af te leiden uit `oudste_openstaande_datum`.

---

## Type-uitbreiding

`src/types/ouders.ts`:

```typescript
export interface OuderSaldo {
  ouder_id: string
  openstaand_bedrag: number
  aantal_openstaand: number
  oudste_openstaande_datum: string | null
  laatste_betaling_op: string | null
}
```

---

## Server action refactors

### `ouderDetailOphalen` (src/app/actions/ouders.ts)

**Vervangen:** de huidige inline-berekening van `openstaand_bedrag` (via contactpersoon_ids → invoices) door één lookup op `v_ouder_saldo`.

```typescript
// Vóór:
//   1. haal contactpersoon_ids op uit koppelingen
//   2. selecteer invoices WHERE parent_id IN (...) AND status IN ('sent','overdue')
//   3. som totaal_bedrag
//
// Na:
const { data: saldo } = await supabase
  .from('v_ouder_saldo')
  .select('openstaand_bedrag, aantal_openstaand, oudste_openstaande_datum, laatste_betaling_op')
  .eq('ouder_id', ouderId)
  .maybeSingle()
```

Scheelt een query en enkele regels mapping-code.

### `oudersOphalen` (src/app/actions/ouders.ts)

**Vervangen:** de TODO-regel `openstaand_bedrag: 0` door een view-query die alle saldo-rijen in één keer ophaalt en client-side mapt naar de ouders-lijst.

```typescript
const { data: saldos } = await supabase
  .from('v_ouder_saldo')
  .select('ouder_id, openstaand_bedrag')
  .eq('organisatie_id', profile.organisatie_id)

const saldoMap = Object.fromEntries(
  (saldos ?? []).map(s => [s.ouder_id, Number(s.openstaand_bedrag)])
)

return ouders.map(o => ({
  // ...
  openstaand_bedrag: saldoMap[o.id] ?? 0,
}))
```

Twee queries i.p.v. één join, maar eenvoudiger en veilig onder RLS.

---

## UI

### `OudersLijst.tsx`

Nieuwe kolom **"Openstaand"** rechts van "Kinderen":

- Bedrag in euro-format (`€ 1.730,00`)
- Rood (`color: #ba1a1a`, bold) als > 0
- Grijs em-dash (`—`) als 0

Kolom-volgorde: Naam · E-mail · Telefoon · Kinderen · Openstaand · Status.

Geen sortering nu — kan later. Judy's lijst heeft momenteel 1 ouder (Sanne), dus het maakt nog niet uit.

---

## Migratie-reeks kwestie

Migratie 041 verwijderde Kibeo. Migratie 042 is de eerste "nieuwe werk"-migratie van Fase 2b. Nummer klopt (vrij, volgend beschikbaar).

Een `CREATE OR REPLACE VIEW` is veilig opnieuw te draaien — als Fase 2b.3 de view uitbreidt (bijv. `incassofase`), is een nieuwe migratie met `CREATE OR REPLACE VIEW` genoeg.

---

## Definition of Done Fase 2b.1

- [ ] Migratie 042 toegepast
- [ ] `ouderDetailOphalen` leunt op `v_ouder_saldo`, oude inline-query weg
- [ ] `oudersOphalen` toont juiste `openstaand_bedrag` per ouder
- [ ] `/dashboard/ouders` toont saldo-kolom (rood bij > 0)
- [ ] Detail-pagina blijft correct (€ 1.730 voor Sanne)
- [ ] TypeScript compileert
- [ ] RLS-check: staff ziet alleen saldos van eigen org (via onderliggende tabellen)

---

## Voorbereiding voor vervolg-fases

Met `v_ouder_saldo` als centrale lookup wordt Fase 2b.2 (SEPA) en 2b.3 (jaaropgave) makkelijker:
- SEPA-automatische incasso: picks openstaand bedrag direct uit de view.
- Jaaropgave: gebruikt `laatste_betaling_op` + historie, niet de view zelf, maar de view is een handig referentiepunt.
