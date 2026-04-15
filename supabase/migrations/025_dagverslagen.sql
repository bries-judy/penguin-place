-- ═══════════════════════════════════════════════════════════════
-- PENGUIN PLACE — Migratie 025: Dagverslagen & Media
-- ═══════════════════════════════════════════════════════════════
--
-- Introduceert: dagverslagen, dagverslag_media
-- Doel: medewerkers maken dagverslagen aan per kind per dag,
--        ouders lezen deze via de ouder-app tijdlijn.
--
-- Dagverslagen:
--   - Eén verslag per kind per datum (UNIQUE constraint)
--   - gepubliceerd vlag: ouders zien alleen gepubliceerde verslagen
--   - Soft delete via deleted_at (conform conventie)
--
-- Media:
--   - Foto's/video's gekoppeld aan dagverslagen
--   - storage_path verwijst naar Supabase Storage (geen URLs opslaan)
--   - Geen deleted_at: media volgt dagverslag lifecycle via CASCADE
-- ═══════════════════════════════════════════════════════════════


-- ─────────────────────────────────────────────────────
-- 1. Dagverslagen
-- ─────────────────────────────────────────────────────

CREATE TABLE public.dagverslagen (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisatie_id  UUID NOT NULL REFERENCES public.organisaties(id),
  kind_id         UUID NOT NULL REFERENCES public.kinderen(id) ON DELETE CASCADE,
  groep_id        UUID NOT NULL REFERENCES public.groepen(id),
  datum           DATE NOT NULL,
  activiteiten    TEXT,
  eten_drinken    TEXT,
  slaaptijden     TEXT,
  stemming        TEXT,
  bijzonderheden  TEXT,
  auteur_id       UUID NOT NULL REFERENCES auth.users(id),
  gepubliceerd    BOOLEAN NOT NULL DEFAULT false,
  gepubliceerd_op TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ,

  CONSTRAINT dagverslagen_uniek_per_kind_datum UNIQUE(kind_id, datum)
);

CREATE INDEX idx_dagverslagen_kind_datum
  ON public.dagverslagen(kind_id, datum);

CREATE INDEX idx_dagverslagen_groep_id
  ON public.dagverslagen(groep_id);

CREATE INDEX idx_dagverslagen_organisatie_id
  ON public.dagverslagen(organisatie_id);

CREATE INDEX idx_dagverslagen_gepubliceerd
  ON public.dagverslagen(gepubliceerd)
  WHERE gepubliceerd = true AND deleted_at IS NULL;

CREATE TRIGGER handle_updated_at_dagverslagen
  BEFORE UPDATE ON public.dagverslagen
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();


-- ─────────────────────────────────────────────────────
-- 2. Dagverslag media (foto's en video's)
-- ─────────────────────────────────────────────────────

CREATE TABLE public.dagverslag_media (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dagverslag_id   UUID NOT NULL REFERENCES public.dagverslagen(id) ON DELETE CASCADE,
  storage_path    TEXT NOT NULL,
  bestandsnaam    TEXT NOT NULL,
  mime_type       TEXT NOT NULL,
  bestandsgrootte INTEGER,
  volgorde        INTEGER NOT NULL DEFAULT 0,
  uploaded_by     UUID NOT NULL REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_dagverslag_media_dagverslag_id
  ON public.dagverslag_media(dagverslag_id);
