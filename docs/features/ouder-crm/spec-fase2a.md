# Ouder CRM — Fase 2a: E-mail-timeline (gesimuleerd)

> **Context:** zie `Penguin Place — Domein 4 Ouder CRM & 360° Klantbeeld.md` in de workspace-root.
> **Status:** Fase 2a — bouw dit. Fase 2b (jaaropgave/SEPA) en Fase 3 (echte M365-integratie) zijn out of scope.
> **Doel:** UI + UX voor e-mail-communicatie met ouders valideren **zonder** Graph-integratie te hoeven bouwen. Seed-data met `bron='seed'` maakt de timeline levensecht. In Fase 3 vervangen we `'seed'` door `'m365'`-rijen zonder schema-wijziging.

---

## Scope Fase 2a

**Bouwen:**
- Migratie `039_ouder_emails.sql` + `040_ouder_email_storage.sql` (Storage bucket + policies)
- Enums `ouder_email_bron`, `ouder_email_richting`
- Tabellen `ouder_emails`, `ouder_email_bijlagen`
- Server actions: `emailsOphalen`, `emailHerkoppelen`, `bijlageSignedUrl`
- Uitbreiding `OuderCommunicatieTab` met een derde bron (e-mail naast memo + portaal)
- Nieuw component `EmailHerkoppelMenu` (staff kan e-mail aan andere ouder hangen)
- Bijlagen-chip met download-link (signed URL via Storage)
- Seed-uitbreiding: ~20 realistische demo-mails + 3 PDF-bijlagen voor demo-ouder Sanne Bakker

**Niet bouwen (later):**
- Microsoft Graph API / OAuth / delta-sync — **Fase 3**
- Gmail / IMAP — Fase 6
- Outbound-e-mails vanuit de app (staff stuurt mail) — Fase 3
- Unassigned-emails-bucket voor mails zonder ouder-match — Fase 3

---

## Migraties

### 039_ouder_emails.sql

```sql
-- Enums
CREATE TYPE public.ouder_email_bron     AS ENUM ('handmatig', 'm365', 'gmail', 'imap', 'seed');
CREATE TYPE public.ouder_email_richting AS ENUM ('inbound', 'outbound');

-- Tabel: ouder_emails
CREATE TABLE public.ouder_emails (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisatie_id  UUID NOT NULL REFERENCES public.organisaties(id),
  ouder_id        UUID NOT NULL REFERENCES public.ouder_profielen(id) ON DELETE CASCADE,
  bron            public.ouder_email_bron NOT NULL DEFAULT 'handmatig',
  richting        public.ouder_email_richting NOT NULL,
  message_id      TEXT,                         -- RFC-822 Message-ID; uniek per org indien aanwezig
  van_adres       TEXT NOT NULL,
  aan_adressen    TEXT[] NOT NULL DEFAULT '{}',
  cc_adressen     TEXT[] NOT NULL DEFAULT '{}',
  onderwerp       TEXT NOT NULL,
  body_plain      TEXT,
  body_html       TEXT,
  verzonden_op    TIMESTAMPTZ NOT NULL,
  staff_id        UUID REFERENCES public.profiles(id),
  thread_id       TEXT,
  heeft_bijlagen  BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ
);

-- Uniqueness: dedup van inbound-mails op basis van message_id binnen een org.
-- Partial index omdat message_id NULL kan zijn voor seed/handmatig.
CREATE UNIQUE INDEX idx_ouder_emails_org_message_id
  ON public.ouder_emails(organisatie_id, message_id)
  WHERE message_id IS NOT NULL;

-- Timeline-performance
CREATE INDEX idx_ouder_emails_ouder_verzonden
  ON public.ouder_emails(ouder_id, verzonden_op DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_ouder_emails_organisatie
  ON public.ouder_emails(organisatie_id)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_ouder_emails_thread
  ON public.ouder_emails(thread_id)
  WHERE thread_id IS NOT NULL AND deleted_at IS NULL;

-- Updated_at trigger
CREATE TRIGGER handle_updated_at_ouder_emails
  BEFORE UPDATE ON public.ouder_emails
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- RLS: staff-only, eigen organisatie
ALTER TABLE public.ouder_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ouder_emails_select"
  ON public.ouder_emails FOR SELECT TO authenticated
  USING (
    public.is_staff()
    AND organisatie_id = public.get_organisatie_id()
    AND deleted_at IS NULL
  );

CREATE POLICY "ouder_emails_insert"
  ON public.ouder_emails FOR INSERT TO authenticated
  WITH CHECK (
    public.is_staff()
    AND organisatie_id = public.get_organisatie_id()
  );

-- Bijwerken: alleen voor herkoppel-actie (ouder_id) of soft-delete.
-- Geen aparte beheerder-restrictie in 2a; bredere scope past bij
-- klantadviseur workflow. Audit-trail op ouder_emails zit in 2b.
CREATE POLICY "ouder_emails_update"
  ON public.ouder_emails FOR UPDATE TO authenticated
  USING (
    public.is_staff()
    AND organisatie_id = public.get_organisatie_id()
  )
  WITH CHECK (
    public.is_staff()
    AND organisatie_id = public.get_organisatie_id()
  );

-- Tabel: ouder_email_bijlagen
CREATE TABLE public.ouder_email_bijlagen (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_id         UUID NOT NULL REFERENCES public.ouder_emails(id) ON DELETE CASCADE,
  bestandsnaam     TEXT NOT NULL,
  mime_type        TEXT NOT NULL,
  storage_path     TEXT NOT NULL,    -- {org_id}/{ouder_id}/{email_id}/{uuid}.{ext}
  grootte_bytes    BIGINT,
  volgorde         INTEGER NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ouder_email_bijlagen_email
  ON public.ouder_email_bijlagen(email_id, volgorde);

ALTER TABLE public.ouder_email_bijlagen ENABLE ROW LEVEL SECURITY;

-- Bijlagen volgen de RLS van de bijbehorende e-mail.
CREATE POLICY "ouder_email_bijlagen_select"
  ON public.ouder_email_bijlagen FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.ouder_emails e
      WHERE e.id = email_id
        AND public.is_staff()
        AND e.organisatie_id = public.get_organisatie_id()
        AND e.deleted_at IS NULL
    )
  );

CREATE POLICY "ouder_email_bijlagen_insert"
  ON public.ouder_email_bijlagen FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.ouder_emails e
      WHERE e.id = email_id
        AND public.is_staff()
        AND e.organisatie_id = public.get_organisatie_id()
    )
  );
```

### 040_ouder_email_storage.sql

```sql
-- Storage bucket voor e-mailbijlagen (private; alleen staff via signed URL).
INSERT INTO storage.buckets (id, name, public)
VALUES ('ouder_email_bijlagen', 'ouder_email_bijlagen', false)
ON CONFLICT (id) DO NOTHING;

-- Policy: staff kan lezen als het pad begint met een org_id waar staff
-- toegang toe heeft. Pad-conventie: {org_id}/{ouder_id}/{email_id}/{uuid}.{ext}
CREATE POLICY "ouder_email_bijlagen_storage_select"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'ouder_email_bijlagen'
    AND public.is_staff()
    AND split_part(name, '/', 1)::uuid = public.get_organisatie_id()
  );

CREATE POLICY "ouder_email_bijlagen_storage_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'ouder_email_bijlagen'
    AND public.is_staff()
    AND split_part(name, '/', 1)::uuid = public.get_organisatie_id()
  );
```

---

## TypeScript types

Uitbreiden in `src/types/ouders.ts`:

```typescript
export type OuderEmailBron     = 'handmatig' | 'm365' | 'gmail' | 'imap' | 'seed'
export type OuderEmailRichting = 'inbound' | 'outbound'

export interface OuderEmailBijlage {
  id: string
  email_id: string
  bestandsnaam: string
  mime_type: string
  storage_path: string
  grootte_bytes: number | null
  volgorde: number
}

export interface OuderEmail {
  id: string
  ouder_id: string
  bron: OuderEmailBron
  richting: OuderEmailRichting
  message_id: string | null
  van_adres: string
  aan_adressen: string[]
  cc_adressen: string[]
  onderwerp: string
  body_plain: string | null
  body_html: string | null
  verzonden_op: string
  staff_id: string | null
  thread_id: string | null
  heeft_bijlagen: boolean
  created_at: string
  // joins
  staff?: { naam: string } | null
  bijlagen?: OuderEmailBijlage[]
}
```

Bestaande `CommunicatieItem`/`FilterKey`-logica in `OuderCommunicatieTab` uitbreiden:
- Nieuwe `FilterKey`-waarde: `'email'`
- `UnifiedItem` krijgt een derde optie (`email?: OuderEmail`)

---

## Server actions

### src/app/actions/ouderEmails.ts — nieuw bestand

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { OuderEmail } from '@/types/ouders'

/**
 * Haalt alle e-mails + bijlagen op voor één ouder. Sorted op
 * verzonden_op DESC.
 */
export async function emailsOphalen(ouderId: string): Promise<OuderEmail[]> {
  // auth + staff-check via RLS
  // select met embed:  ouder_email_bijlagen(...)
  // staff-naam via aparte profiles-lookup (zelfde patroon als memosOphalen)
}

/**
 * Herkoppelt een e-mail aan een andere ouder. Staat toe dat staff
 * een verkeerd gematchte mail verplaatst. Schrijft audit-regel naar
 * ouder_audit (reuse van Fase 1-tabel, veld='email_herkoppel').
 */
export async function emailHerkoppelen(
  emailId: string,
  nieuweOuderId: string,
): Promise<{ error?: string }> {
  // auth + org-check + beide ouders in eigen org
  // update ouder_emails.ouder_id
  // insert in ouder_audit(ouder_id=oud, staff_id, veld='email_herkoppel',
  //                       oude_waarde=email.onderwerp, nieuwe_waarde=nieuweOuderId)
  // revalidate beide ouder-detail pagina's
}

/**
 * Genereert een signed URL voor het downloaden van een bijlage.
 * Geldig voor 5 minuten.
 */
export async function bijlageSignedUrl(
  bijlageId: string,
): Promise<{ url?: string; error?: string }> {
  // auth check
  // fetch bijlage → RLS blokkeert cross-org
  // createSignedUrl via supabase.storage.from('ouder_email_bijlagen')
}
```

---

## Page-aanpassing

### src/app/dashboard/ouders/[id]/page.tsx

Nieuw parallel fetch: `emailsOphalen(id)`. Data doorgeven als prop aan `OuderDetail`. Doorzet naar `OuderCommunicatieTab`.

---

## Componenten

### `src/components/ouders/OuderCommunicatieTab.tsx` — uitbreiden

**Wijzigingen:**
- Props krijgen extra `emails: OuderEmail[]`
- `FILTERS` krijgt nieuwe entry: `{ key: 'email', label: 'E-mail' }`
- `UnifiedItem` krijgt veld `email?: OuderEmail`
- Nieuwe `EmailRij`-renderer (naast bestaande `MemoRij` en `PortaalRij`):
  - Type-chip "E-mail" in lavender-kleur
  - Pijl-icoon voor richting (↓ inbound / ↑ outbound)
  - Onderwerp als titel, body_plain eerste 2 regels als excerpt
  - Meta: datum · `van_adres → aan_adressen[0]` · staff.naam (bij outbound)
  - `heeft_bijlagen` → paperclip-icoon + aantal
  - Klik om uit te klappen → toon volledige body + bijlagen-lijst (download via `bijlageSignedUrl`)
  - Context-menu "⋯" met optie "Verplaats naar andere ouder" → `EmailHerkoppelMenu`

### `src/components/ouders/EmailHerkoppelMenu.tsx` — nieuw

**Gedrag:**
- Popover met zoek-input (debounce 200ms)
- Lijst van ouders in dezelfde organisatie (query via nieuwe server action `oudersZoeken(q)` of hergebruik `oudersOphalen` + client-side filter voor MVP)
- Klik op ouder → bevestig-dialog "Verplaats \"Onderwerp...\" naar \[Naam\]?" → `emailHerkoppelen`
- Na succes: `router.refresh()` + toast "Verplaatst"

Voor MVP (Fase 2a): client-side filter op de al geladen `oudersOphalen`-lijst als de organisatie < 500 ouders heeft. Server-side search laten we voor Fase 3 als het echt nodig blijkt.

### `src/components/ouders/EmailDetail.tsx` (optioneel) — nieuw

Uitklap-paneel onder de `EmailRij` met volledige body (plain of html-sanitized) + bijlagen als downloadbare cards. Alternatief: inline renderen in `EmailRij` zonder extra component.

---

## Seed-script

### scripts/seed-ouder-crm-demo.mjs (samenvoegen)

Eén script dat idempotent:

1. **Fase 1-data** (demo-ouder Sanne Bakker):
   - Auth user + ouder_profielen
   - 2 kinderen (Tess Bakker @ Middelburg, Bram Bakker @ Vlissingen)
   - Contactpersonen, contracten, ouder_kind-koppelingen
   - 4 facturen (1x paid, 1x sent, 1x paid, 1x overdue → € 1.730 openstaand)
   - 6 ouder-memos (incl. open taak + afgeronde taak)
   - 2 conversations + 6 portaalberichten

2. **Fase 2a-data** (20 e-mails voor Sanne):
   - Mix inbound/outbound (~60% inbound, 40% outbound)
   - Verspreid over laatste 6 maanden
   - Realistische onderwerpen:
     - "Factuur maart 2026 — SB-2026-003" (inbound vraag)
     - "Re: Factuur maart 2026" (outbound antwoord)
     - "Vakantieweken juli door te geven" (inbound)
     - "Welkom bij Penguin Place" (outbound)
     - "Intake Tess — uitnodiging 10-min-gesprek" (outbound)
     - etc.
   - Thread-groepering: gebruik `thread_id` voor reply-chains (3-4 threads)
   - 3 mails met bijlagen:
     - Factuur-PDF (placeholder via picsum of hard-coded mini-PDF)
     - Contract-PDF
     - Intake-formulier PDF
   - Allemaal `bron='seed'`

3. **Storage-upload**: placeholder-PDF's via minimal PDF-bytes (geen externe fetch nodig). Pad `{org_id}/{ouder_id}/{email_id}/{uuid}.pdf`.

Idempotent: vaste UUIDs + upsert + `onConflict`. Meerdere runs herschrijven alles.

---

## Audit-trail uitbreiding

Bij `emailHerkoppelen` schrijven we een rij in de bestaande `ouder_audit`-tabel (Fase 1) — geen nieuwe migratie nodig. Veld: `'email_herkoppel'`, `oude_waarde = email.onderwerp`, `nieuwe_waarde = nieuweOuderId` (of naam).

In Fase 2b breiden we audit uit met een aparte tabel `ouder_audit_email` als dit meer detail vereist; voor 2a is een tekstuele log genoeg.

---

## Definition of Done Fase 2a

- [ ] Migraties 039 + 040 toegepast
- [ ] Seed-script draait idempotent en vult 20 e-mails + 3 bijlagen
- [ ] `/dashboard/ouders/[id]` tab "Communicatie" toont e-mails naast memo's en portaalberichten
- [ ] Filter-checkbox "E-mail" werkt
- [ ] E-mail uitklappen toont volledige body
- [ ] Bijlage-download werkt via signed URL
- [ ] Herkoppel-UI: e-mail kan aan andere ouder in dezelfde org gehangen worden
- [ ] Herkoppel schrijft audit-rij zichtbaar in Gegevens-tab van oude ouder
- [ ] RLS: staff in andere organisatie kan e-mails niet zien (getest met 2e staff-user)
- [ ] TypeScript compileert zonder errors
- [ ] Alle server actions checken auth + organisatie_id

---

## Open punten vóór bouwen

1. **Thread-rendering in timeline**: groeperen we mails op `thread_id` (één item met "3 berichten" badge) of tonen we ze los? **Voorstel:** los in 2a (simpeler), groeperen pas in 2b als de UX vraagt.
2. **HTML-bodies sanitizen**: alleen `body_plain` tonen in 2a, of ook `body_html` met DOMPurify? **Voorstel:** `body_plain` tonen, met fallback naar `body_html → text` via een util. DOMPurify pas in Fase 3 als echte mails binnenkomen.
3. **Bijlagen inline vs. download**: PDF/image inline preview of gewoon download-button? **Voorstel:** download-button voor 2a, inline preview voor Fase 3.
4. **Richting-weergave in filter**: willen we "alleen inbound" of "alleen outbound" als sub-filter, of is de `email`-checkbox genoeg? **Voorstel:** in 2a alleen hoofd-checkbox; sub-filters pas als data-volume het vraagt.

Deze vier aannames zijn mijn defaults; laat weten als iets anders moet.
