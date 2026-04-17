# Ouder CRM — Fase 1: 360° Ouder-Detailpagina + Memo's

> **Volledige feature spec:** zie `Penguin Place — Domein 4 Ouder CRM & 360° Klantbeeld.md` in de workspace root (buiten de codebase).
> **UI-referentie:** zie `Mockup-Ouder-360-Klantbeeld.html` in dezelfde map. Design-tokens en componentkeuzes staan onderin de mockup-notitie.
> **Status:** Fase 1 — bouw dit. Fase 2 t/m 4 staan in het domein-doc, maar zijn nu out of scope.

---

## Scope fase 1

**Bouwen:**
- Routes `/dashboard/ouders` (lijst) en `/dashboard/ouders/[id]` (detail)
- Migraties `034_ouder_memos.sql` en `035_ouder_audit.sql`
- Server action `ouderMemos.ts` (aanmaken, aanpassen, soft-delete)
- Server action uitbreiding `ouders.ts`: `ouderDetailOphalen(id)` aggregate query
- 7 tabs op de ouder-detailpagina: Overzicht · Kinderen · Planning · Communicatie · Documenten · Financieel · Gegevens
- Communicatie-tab: alleen memo's + portaalberichten (`conversation_messages`). Nog geen `ouder_emails`.
- Openstaand-saldo: inline query via `ouder_kind.contactpersoon_id → invoices.parent_id`, geen aparte view-migratie.
- Metric-kop: 4 tiles (openstaand, laatste contact, open taken, actieve contracten)

**Niet bouwen (later):**
- `ouder_emails` tabel en e-mail-integratie (fase 2a/3)
- `jaaropgaves` tabel (fase 2b)
- `sepa_machtigingen` tabel (fase 2b)
- VoIP / `ouder_telefoongesprekken` (fase 4)
- `v_ouder_saldo` als aparte view-migratie (komt later als fase 2b er is)

---

## Migraties

### 034_ouder_memos.sql

```sql
-- Enum
CREATE TYPE public.ouder_memo_type AS ENUM ('telefoon', 'gesprek', 'notitie', 'taak');
CREATE TYPE public.ouder_memo_zichtbaar AS ENUM ('alle_staff', 'alleen_auteur', 'team_locatie');
CREATE TYPE public.follow_up_status AS ENUM ('open', 'afgerond', 'geannuleerd');

-- Tabel
CREATE TABLE public.ouder_memos (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisatie_id   UUID NOT NULL REFERENCES public.organisaties(id),
  ouder_id         UUID NOT NULL REFERENCES public.ouder_profielen(id) ON DELETE CASCADE,
  auteur_id        UUID NOT NULL REFERENCES public.profiles(id),
  type             public.ouder_memo_type NOT NULL DEFAULT 'notitie',
  onderwerp        TEXT NOT NULL,
  inhoud           TEXT NOT NULL DEFAULT '',
  datum            TIMESTAMPTZ NOT NULL DEFAULT now(),
  kind_id          UUID REFERENCES public.kinderen(id) ON DELETE SET NULL,
  follow_up_datum  DATE,
  follow_up_status public.follow_up_status,
  zichtbaar_voor   public.ouder_memo_zichtbaar NOT NULL DEFAULT 'alle_staff',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at       TIMESTAMPTZ
);

-- Indexen
CREATE INDEX idx_ouder_memos_ouder_datum ON public.ouder_memos(ouder_id, datum DESC)
  WHERE deleted_at IS NULL;
CREATE INDEX idx_ouder_memos_organisatie ON public.ouder_memos(organisatie_id)
  WHERE deleted_at IS NULL;
CREATE INDEX idx_ouder_memos_follow_up ON public.ouder_memos(organisatie_id, follow_up_status)
  WHERE deleted_at IS NULL AND type = 'taak';

-- Updated_at trigger
CREATE TRIGGER handle_updated_at_ouder_memos
  BEFORE UPDATE ON public.ouder_memos
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- RLS
ALTER TABLE public.ouder_memos ENABLE ROW LEVEL SECURITY;

-- Lezen: alle staff binnen eigen org, rekening houdend met zichtbaar_voor
CREATE POLICY ouder_memos_select ON public.ouder_memos
  FOR SELECT TO authenticated
  USING (
    is_staff()
    AND organisatie_id = get_organisatie_id()
    AND deleted_at IS NULL
    AND (
      zichtbaar_voor = 'alle_staff'
      OR auteur_id = auth.uid()
      OR has_any_role(ARRAY['beheerder'])
    )
  );

-- Aanmaken
CREATE POLICY ouder_memos_insert ON public.ouder_memos
  FOR INSERT TO authenticated
  WITH CHECK (
    is_staff()
    AND organisatie_id = get_organisatie_id()
    AND auteur_id = auth.uid()
  );

-- Bijwerken: auteur of beheerder
CREATE POLICY ouder_memos_update ON public.ouder_memos
  FOR UPDATE TO authenticated
  USING (
    is_staff()
    AND (auteur_id = auth.uid() OR has_any_role(ARRAY['beheerder']))
  );
```

### 035_ouder_audit.sql

```sql
-- Audit tabel voor wijzigingen aan ouder_profielen
CREATE TABLE public.ouder_audit (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ouder_id     UUID NOT NULL REFERENCES public.ouder_profielen(id) ON DELETE CASCADE,
  staff_id     UUID REFERENCES public.profiles(id),
  veld         TEXT NOT NULL,
  oude_waarde  TEXT,
  nieuwe_waarde TEXT,
  at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ouder_audit_ouder ON public.ouder_audit(ouder_id, at DESC);

ALTER TABLE public.ouder_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY ouder_audit_select ON public.ouder_audit
  FOR SELECT TO authenticated
  USING (is_staff() AND has_any_role(ARRAY['beheerder', 'vestigingsmanager']));

-- Trigger
CREATE OR REPLACE FUNCTION public.log_ouder_profiel_wijziging()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF OLD.voornaam IS DISTINCT FROM NEW.voornaam THEN
    INSERT INTO public.ouder_audit(ouder_id, staff_id, veld, oude_waarde, nieuwe_waarde)
    VALUES (NEW.id, auth.uid(), 'voornaam', OLD.voornaam, NEW.voornaam);
  END IF;
  IF OLD.achternaam IS DISTINCT FROM NEW.achternaam THEN
    INSERT INTO public.ouder_audit(ouder_id, staff_id, veld, oude_waarde, nieuwe_waarde)
    VALUES (NEW.id, auth.uid(), 'achternaam', OLD.achternaam, NEW.achternaam);
  END IF;
  IF OLD.email IS DISTINCT FROM NEW.email THEN
    INSERT INTO public.ouder_audit(ouder_id, staff_id, veld, oude_waarde, nieuwe_waarde)
    VALUES (NEW.id, auth.uid(), 'email', OLD.email, NEW.email);
  END IF;
  IF OLD.telefoon_mobiel IS DISTINCT FROM NEW.telefoon_mobiel THEN
    INSERT INTO public.ouder_audit(ouder_id, staff_id, veld, oude_waarde, nieuwe_waarde)
    VALUES (NEW.id, auth.uid(), 'telefoon_mobiel', OLD.telefoon_mobiel, NEW.telefoon_mobiel);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER ouder_profiel_audit
  AFTER UPDATE ON public.ouder_profielen
  FOR EACH ROW EXECUTE FUNCTION log_ouder_profiel_wijziging();
```

---

## TypeScript types

Maak `src/types/ouders.ts`:

```typescript
export type OuderMemoType = 'telefoon' | 'gesprek' | 'notitie' | 'taak'
export type OuderMemoZichtbaar = 'alle_staff' | 'alleen_auteur' | 'team_locatie'
export type FollowUpStatus = 'open' | 'afgerond' | 'geannuleerd'

export interface OuderMemo {
  id: string
  ouder_id: string
  auteur_id: string
  type: OuderMemoType
  onderwerp: string
  inhoud: string
  datum: string
  kind_id: string | null
  follow_up_datum: string | null
  follow_up_status: FollowUpStatus | null
  zichtbaar_voor: OuderMemoZichtbaar
  created_at: string
  updated_at: string
  deleted_at: string | null
  // joins
  auteur?: { naam: string }
  kind?: { voornaam: string; achternaam: string } | null
}

export interface OuderDetail {
  id: string
  voornaam: string
  achternaam: string
  email: string
  telefoon_mobiel: string | null
  actief: boolean
  created_at: string
  // aggregate
  kinderen: OuderKindRij[]
  openstaand_bedrag: number
  aantal_open_taken: number
  laatste_contact_datum: string | null
  laatste_contact_type: string | null
  actieve_contracten_count: number
  audit_log: { veld: string; oude_waarde: string | null; nieuwe_waarde: string | null; at: string }[]
}

export interface OuderKindRij {
  kind_id: string
  voornaam: string
  achternaam: string
  geboortedatum: string | null
  geslacht: string | null
  relatie: string
  contactpersoon_id: string | null
  contracten: {
    id: string
    opvangtype: string
    status: string
    startdatum: string
    locatie_naam: string | null
    groep_naam: string | null
    dagen_per_week: number | null
  }[]
  planned_days: string[] // bv. ['maandag', 'dinsdag', 'donderdag']
}

export interface OuderLijstRij {
  id: string
  voornaam: string
  achternaam: string
  email: string
  telefoon_mobiel: string | null
  actief: boolean
  aantal_kinderen: number
  openstaand_bedrag: number
}
```

---

## Server Actions

### src/app/actions/ouders.ts — uitbreiding

Voeg toe aan het bestaande bestand:

```typescript
export async function ouderDetailOphalen(ouderId: string): Promise<OuderDetail | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Basis-profiel
  const { data: ouder } = await supabase
    .from('ouder_profielen')
    .select('id, voornaam, achternaam, email, telefoon_mobiel, actief, created_at')
    .eq('id', ouderId)
    .single()
  if (!ouder) return null

  // Kinderen + contracten via ouder_kind
  const { data: koppelingen } = await supabase
    .from('ouder_kind')
    .select(`
      kind_id, relatie, contactpersoon_id,
      kinderen (
        id, voornaam, achternaam, geboortedatum, geslacht,
        contracten (
          id, opvangtype, status, startdatum,
          locaties (naam),
          groepen (naam),
          dagdelen_configuraties (dag)
        )
      )
    `)
    .eq('ouder_id', ouderId)
    .eq('actief', true)

  // Openstaand saldo via contactpersoon_id → invoices
  const contactpersoonIds = (koppelingen ?? [])
    .map(k => k.contactpersoon_id)
    .filter(Boolean)

  let openstaand_bedrag = 0
  if (contactpersoonIds.length > 0) {
    const { data: facturen } = await supabase
      .from('invoices')
      .select('totaal_bedrag')
      .in('parent_id', contactpersoonIds)
      .in('status', ['sent', 'overdue'])

    openstaand_bedrag = (facturen ?? []).reduce((sum, f) => sum + Number(f.totaal_bedrag), 0)
  }

  // Aantal open taken
  const { count: open_taken } = await supabase
    .from('ouder_memos')
    .select('id', { count: 'exact', head: true })
    .eq('ouder_id', ouderId)
    .eq('type', 'taak')
    .eq('follow_up_status', 'open')
    .is('deleted_at', null)

  // Actieve contracten
  const actieve_contracten_count = (koppelingen ?? [])
    .flatMap(k => (k.kinderen as any)?.contracten ?? [])
    .filter((c: any) => c.status === 'actief').length

  // Audit log
  const { data: audit } = await supabase
    .from('ouder_audit')
    .select('veld, oude_waarde, nieuwe_waarde, at')
    .eq('ouder_id', ouderId)
    .order('at', { ascending: false })
    .limit(10)

  // Laatste contact (union van memo's en portaalberichten)
  const { data: laatste_memo } = await supabase
    .from('ouder_memos')
    .select('datum, type')
    .eq('ouder_id', ouderId)
    .is('deleted_at', null)
    .order('datum', { ascending: false })
    .limit(1)
    .maybeSingle()

  return {
    ...ouder,
    kinderen: (koppelingen ?? []).map(k => ({
      kind_id: k.kind_id,
      relatie: k.relatie,
      contactpersoon_id: k.contactpersoon_id,
      voornaam: (k.kinderen as any)?.voornaam ?? '',
      achternaam: (k.kinderen as any)?.achternaam ?? '',
      geboortedatum: (k.kinderen as any)?.geboortedatum ?? null,
      geslacht: (k.kinderen as any)?.geslacht ?? null,
      contracten: ((k.kinderen as any)?.contracten ?? []).map((c: any) => ({
        id: c.id,
        opvangtype: c.opvangtype,
        status: c.status,
        startdatum: c.startdatum,
        locatie_naam: c.locaties?.naam ?? null,
        groep_naam: c.groepen?.naam ?? null,
        dagen_per_week: c.dagdelen_configuraties?.length ?? null,
      })),
      planned_days: [],
    })),
    openstaand_bedrag,
    aantal_open_taken: open_taken ?? 0,
    actieve_contracten_count,
    laatste_contact_datum: laatste_memo?.datum ?? null,
    laatste_contact_type: laatste_memo?.type ?? null,
    audit_log: audit ?? [],
  }
}

export async function oudersOphalen(): Promise<OuderLijstRij[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data: ouders } = await supabase
    .from('ouder_profielen')
    .select(`
      id, voornaam, achternaam, email, telefoon_mobiel, actief,
      ouder_kind (kind_id, contactpersoon_id)
    `)
    .eq('actief', true)
    .order('achternaam')
    .order('voornaam')

  if (!ouders) return []

  return ouders.map(o => ({
    id: o.id,
    voornaam: o.voornaam,
    achternaam: o.achternaam,
    email: o.email,
    telefoon_mobiel: o.telefoon_mobiel,
    actief: o.actief,
    aantal_kinderen: o.ouder_kind?.length ?? 0,
    openstaand_bedrag: 0, // TODO: aggregeren in fase 2 (join te zwaar voor lijst)
  }))
}
```

### src/app/actions/ouderMemos.ts — nieuw bestand

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { OuderMemoType, OuderMemoZichtbaar, FollowUpStatus } from '@/types/ouders'

export async function memoAanmaken(formData: FormData): Promise<{ error?: string; id?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Niet ingelogd' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('organisatie_id')
    .eq('id', user.id)
    .single()
  if (!profile?.organisatie_id) return { error: 'Geen organisatie gevonden' }

  const ouder_id     = formData.get('ouder_id') as string
  const type         = (formData.get('type') ?? 'notitie') as OuderMemoType
  const onderwerp    = formData.get('onderwerp') as string
  const inhoud       = (formData.get('inhoud') ?? '') as string
  const datum        = (formData.get('datum') as string) || new Date().toISOString()
  const kind_id      = (formData.get('kind_id') as string) || null
  const zichtbaar    = (formData.get('zichtbaar_voor') ?? 'alle_staff') as OuderMemoZichtbaar
  const follow_up_datum   = (formData.get('follow_up_datum') as string) || null
  const follow_up_status  = type === 'taak' ? 'open' as FollowUpStatus : null

  if (!ouder_id || !onderwerp) return { error: 'Ouder en onderwerp zijn verplicht' }

  const { data, error } = await supabase
    .from('ouder_memos')
    .insert({
      ouder_id,
      auteur_id: user.id,
      organisatie_id: profile.organisatie_id,
      type,
      onderwerp,
      inhoud,
      datum,
      kind_id,
      zichtbaar_voor: zichtbaar,
      follow_up_datum,
      follow_up_status,
    })
    .select('id')
    .single()

  if (error) return { error: error.message }

  revalidatePath(`/dashboard/ouders/${ouder_id}`)
  return { id: data.id }
}

export async function memoAfvinken(memoId: string, ouder_id: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Niet ingelogd' }

  const { error } = await supabase
    .from('ouder_memos')
    .update({ follow_up_status: 'afgerond' })
    .eq('id', memoId)

  if (error) return { error: error.message }
  revalidatePath(`/dashboard/ouders/${ouder_id}`)
  return {}
}

export async function memoVerwijderen(memoId: string, ouder_id: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Niet ingelogd' }

  const { error } = await supabase
    .from('ouder_memos')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', memoId)

  if (error) return { error: error.message }
  revalidatePath(`/dashboard/ouders/${ouder_id}`)
  return {}
}

export async function memosOphalen(ouder_id: string) {
  const supabase = await createClient()

  const { data } = await supabase
    .from('ouder_memos')
    .select(`
      id, type, onderwerp, inhoud, datum, kind_id,
      follow_up_datum, follow_up_status, zichtbaar_voor,
      created_at,
      auteur:profiles!auteur_id(naam),
      kind:kinderen!kind_id(voornaam, achternaam)
    `)
    .eq('ouder_id', ouder_id)
    .is('deleted_at', null)
    .order('datum', { ascending: false })

  return data ?? []
}
```

---

## Routes & pagina's

### src/app/dashboard/ouders/page.tsx
Server Component. Haalt ouders op via `oudersOphalen()`. Geeft door aan `OudersLijst`.

### src/app/dashboard/ouders/[id]/page.tsx
Server Component. Haalt ouder-detail op via `ouderDetailOphalen(params.id)` + memo's via `memosOphalen(params.id)`. Redirect naar `/dashboard/ouders` als ouder niet gevonden. Geeft alles door als props aan `OuderDetail`.

---

## Componenten

Maak in `src/components/ouders/`:

| Component | Beschrijving |
|---|---|
| `OudersLijst.tsx` | Client, tabel met zoekbalk + filter actief/inactief |
| `OuderDetail.tsx` | Client, bevat shadcn `<Tabs>` met alle tab-componenten. Gebruik exact het patroon van `LocatieDetail.tsx`. |
| `OuderHeader.tsx` | Header met avatar, naam, contact + 4 metric-tiles. Onderdeel van OuderDetail, buiten de tabs. |
| `OuderOverzichtTab.tsx` | Recente activiteit (5 items union memo+portaal) + rechterkolom (kinderen, open taak, co-ouder) |
| `OuderKinderenTab.tsx` | Lijst van kind-kaarten (zie mockup) |
| `OuderPlanningTab.tsx` | Weekrooster per kind. Hergebruik planning-data uit props. |
| `OuderCommunicatieTab.tsx` | Unified timeline: memo's + portaalberichten. Filters, "Nieuwe memo"-knop opent NieuweMemoForm. |
| `NieuweMemoForm.tsx` | Inline quick-form voor memo's. Type-select, onderwerp, inhoud, datum (default=nu). Server Action memoAanmaken. |
| `OuderDocumentenTab.tsx` | Lijst van contracten per kind (read-only, link naar /dashboard/contracten/[id]) |
| `OuderFinancieelTab.tsx` | Openstaand saldo, facturen-tabel (read-only). Jaaropgaves en SEPA: placeholder "Komt in fase 2". |
| `OuderGegevensTab.tsx` | Persoonsgegevens (editbaar), AVG-checkboxen, audit-trail |

**Tab-definitie in OuderDetail:**
```typescript
const tabs = [
  { value: 'overzicht',      label: 'Overzicht' },
  { value: 'kinderen',       label: 'Kinderen' },
  { value: 'planning',       label: 'Planning' },
  { value: 'communicatie',   label: 'Communicatie' },
  { value: 'financieel',     label: 'Financieel' },
  { value: 'documenten',     label: 'Documenten' },
  { value: 'gegevens',       label: 'Gegevens' },
]
```

---

## Design tokens — gebruik altijd de bestaande PP-tokens

```
Primair accent:     #9B8FCE  (lavender)
Brand button:       #6B5B95  (donker paars)
Tekst:              #2D2540
Secundaire tekst:   #5A5278
Muted:              #8B82A8
Achtergrond:        #F5F3F0  (cream)
Layout-bg:          #ECEAE7
Border:             #C8C2D8
Lichte lavender:    #EDE9F8

Status-badges (inline stijl, identiek aan FacturenDashboard.tsx):
  draft/concept:  background #F0EDFF, color #6B5B95
  sent/verzonden: background #E8F4FD, color #1976D2
  paid/betaald:   background #E8F5E9, color #388E3C
  overdue:        background #FFF3E0, color #E65100
  actief:         background #D8F0E4, color #1a6b40

Fonts: 'Manrope' (koppen, font-weight 700/800), 'Inter' (body)
UI-components: shadcn/ui Tabs, Button, Badge — zie src/components/ui/
Iconen: lucide-react
```

**Kijk naar `LocatieDetail.tsx` voor het tab-patroon. Kijk naar `FacturenDashboard.tsx` voor status-badge-stijlen.**

---

## Navigatie toevoegen

Voeg toe aan `src/components/layout/Sidebar.tsx` navigatiegroep **Klanten**:
```typescript
{ href: '/dashboard/ouders', icon: Users, label: 'Ouders' }
```
Zet dit boven "Kinderen & Contracten" in.

---

## Definition of Done fase 1

- [ ] Migraties 034 + 035 toegepast
- [ ] `/dashboard/ouders` toont lijst van alle ouders in de organisatie
- [ ] `/dashboard/ouders/[id]` toont 7-tabs detail met correcte data
- [ ] Memo aanmaken werkt (form, server action, revalidate, zichtbaar in timeline)
- [ ] Memo afvinken werkt (taak → afgerond)
- [ ] Metric-tiles in header tonen correcte waarden
- [ ] Audit-trail in Gegevens-tab toont wijzigingen
- [ ] RLS: staff ziet alleen ouders van eigen org
- [ ] TypeScript compileert zonder errors
- [ ] Alle server actions checken auth + organisatie_id
