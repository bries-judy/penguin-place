-- ═══════════════════════════════════════════════════════════════
-- PENGUIN PLACE — Migratie 039: Ouder E-mails (Fase 2a)
-- ═══════════════════════════════════════════════════════════════
--
-- Introduceert: ouder_emails, ouder_email_bijlagen + 2 enums.
-- Doel: staff-zichtbare e-mail-timeline per ouder.
--
-- In Fase 2a worden rijen via een seed-script gevuld (bron='seed').
-- In Fase 3 wordt bron='m365' gevuld door een Graph-API sync-worker;
-- het schema blijft identiek.
--
-- RLS: staff-only, binnen eigen organisatie. Ouders krijgen geen
-- additieve policy — deze tabel is Domein 4 / staff-only.
-- ═══════════════════════════════════════════════════════════════


-- ─────────────────────────────────────────────────────
-- 1. Enums
-- ─────────────────────────────────────────────────────

CREATE TYPE public.ouder_email_bron     AS ENUM ('handmatig', 'm365', 'gmail', 'imap', 'seed');
CREATE TYPE public.ouder_email_richting AS ENUM ('inbound', 'outbound');


-- ─────────────────────────────────────────────────────
-- 2. Tabel: ouder_emails
-- ─────────────────────────────────────────────────────

CREATE TABLE public.ouder_emails (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisatie_id  UUID NOT NULL REFERENCES public.organisaties(id),
  ouder_id        UUID NOT NULL REFERENCES public.ouder_profielen(id) ON DELETE CASCADE,
  bron            public.ouder_email_bron NOT NULL DEFAULT 'handmatig',
  richting        public.ouder_email_richting NOT NULL,
  message_id      TEXT,                       -- RFC-822; uniek per org indien aanwezig
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


-- ─────────────────────────────────────────────────────
-- 3. Indexen
-- ─────────────────────────────────────────────────────

-- Dedup van inbound-mails op message_id binnen een org.
-- Partial: seed/handmatig kunnen NULL message_id hebben.
CREATE UNIQUE INDEX idx_ouder_emails_org_message_id
  ON public.ouder_emails(organisatie_id, message_id)
  WHERE message_id IS NOT NULL;

-- Timeline-performance (default query-order)
CREATE INDEX idx_ouder_emails_ouder_verzonden
  ON public.ouder_emails(ouder_id, verzonden_op DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_ouder_emails_organisatie
  ON public.ouder_emails(organisatie_id)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_ouder_emails_thread
  ON public.ouder_emails(thread_id)
  WHERE thread_id IS NOT NULL AND deleted_at IS NULL;


-- ─────────────────────────────────────────────────────
-- 4. Updated_at trigger
-- ─────────────────────────────────────────────────────

CREATE TRIGGER handle_updated_at_ouder_emails
  BEFORE UPDATE ON public.ouder_emails
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();


-- ─────────────────────────────────────────────────────
-- 5. RLS: staff-only, eigen organisatie
-- ─────────────────────────────────────────────────────

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

-- Update: herkoppeling (ouder_id) + soft-delete. Breed toegestaan voor
-- klantadviseur-workflow. Gedifferentieerde audit volgt in 2b.
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


-- ─────────────────────────────────────────────────────
-- 6. Tabel: ouder_email_bijlagen
-- ─────────────────────────────────────────────────────

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


-- ─────────────────────────────────────────────────────
-- 7. RLS: bijlagen volgen de e-mail
-- ─────────────────────────────────────────────────────

ALTER TABLE public.ouder_email_bijlagen ENABLE ROW LEVEL SECURITY;

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
