-- ═══════════════════════════════════════════════════════════════
-- PENGUIN PLACE — Migratie 037: Ouder Memos
-- ═══════════════════════════════════════════════════════════════
--
-- Introduceert: ouder_memos + bijbehorende enums
-- Doel: staff-notities over ouders (telefoon/gesprek/notitie/taak)
--       met optionele follow-up en zichtbaarheidsregels.
--
-- RLS: alleen staff van eigen organisatie. zichtbaar_voor bepaalt
--      of een memo voor alle staff zichtbaar is of alleen voor
--      de auteur (of team-locatie, in latere fase).
-- ═══════════════════════════════════════════════════════════════


-- ─────────────────────────────────────────────────────
-- 1. Enums
-- ─────────────────────────────────────────────────────

CREATE TYPE public.ouder_memo_type      AS ENUM ('telefoon', 'gesprek', 'notitie', 'taak');
CREATE TYPE public.ouder_memo_zichtbaar AS ENUM ('alle_staff', 'alleen_auteur', 'team_locatie');
CREATE TYPE public.follow_up_status     AS ENUM ('open', 'afgerond', 'geannuleerd');


-- ─────────────────────────────────────────────────────
-- 2. Tabel
-- ─────────────────────────────────────────────────────

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


-- ─────────────────────────────────────────────────────
-- 3. Indexen
-- ─────────────────────────────────────────────────────

CREATE INDEX idx_ouder_memos_ouder_datum ON public.ouder_memos(ouder_id, datum DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_ouder_memos_organisatie ON public.ouder_memos(organisatie_id)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_ouder_memos_follow_up ON public.ouder_memos(organisatie_id, follow_up_status)
  WHERE deleted_at IS NULL AND type = 'taak';


-- ─────────────────────────────────────────────────────
-- 4. Updated_at trigger
-- ─────────────────────────────────────────────────────

CREATE TRIGGER handle_updated_at_ouder_memos
  BEFORE UPDATE ON public.ouder_memos
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();


-- ─────────────────────────────────────────────────────
-- 5. RLS
-- ─────────────────────────────────────────────────────

ALTER TABLE public.ouder_memos ENABLE ROW LEVEL SECURITY;

-- Lezen: staff binnen eigen org, rekening houdend met zichtbaar_voor.
-- Ouders zien memo's nooit (geen additieve policy).
CREATE POLICY "ouder_memos_select"
  ON public.ouder_memos FOR SELECT TO authenticated
  USING (
    public.is_staff()
    AND organisatie_id = public.get_organisatie_id()
    AND deleted_at IS NULL
    AND (
      zichtbaar_voor = 'alle_staff'
      OR auteur_id = auth.uid()
      OR public.has_any_role('beheerder')
    )
  );

-- Aanmaken: staff, eigen org, auteur_id = auth.uid()
CREATE POLICY "ouder_memos_insert"
  ON public.ouder_memos FOR INSERT TO authenticated
  WITH CHECK (
    public.is_staff()
    AND organisatie_id = public.get_organisatie_id()
    AND auteur_id = auth.uid()
  );

-- Bijwerken: auteur of beheerder (soft delete + follow-up status updates)
CREATE POLICY "ouder_memos_update"
  ON public.ouder_memos FOR UPDATE TO authenticated
  USING (
    public.is_staff()
    AND organisatie_id = public.get_organisatie_id()
    AND (auteur_id = auth.uid() OR public.has_any_role('beheerder'))
  )
  WITH CHECK (
    public.is_staff()
    AND organisatie_id = public.get_organisatie_id()
  );
