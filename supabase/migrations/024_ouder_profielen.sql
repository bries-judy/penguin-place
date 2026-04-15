-- ═══════════════════════════════════════════════════════════════
-- PENGUIN PLACE — Migratie 024: Ouder Profielen & Koppelingen
-- ═══════════════════════════════════════════════════════════════
--
-- Introduceert: ouder_profielen, ouder_kind, RLS-helpers
-- Doel: ouders als first-class entiteit in het platform
--
-- ouder_profielen is bewust gescheiden van profiles:
--   - profiles = medewerkers (gekoppeld aan user_roles, user_locatie_toegang)
--   - ouder_profielen = ouders (gekoppeld aan ouder_kind)
--   - get_organisatie_id() retourneert NULL voor ouders → staff-policies
--     evalueren automatisch false → ouders zien data alleen via
--     ouder-specifieke policies (additief, OR-evaluatie in PostgreSQL)
--
-- ⚠️  handle_new_user() trigger wordt herschreven:
--     maakt conditioneel profiles (staff) of ouder_profielen (ouder) aan
--     op basis van raw_app_meta_data->>'user_type'
-- ═══════════════════════════════════════════════════════════════


-- ─────────────────────────────────────────────────────
-- 1. User type enum
-- ─────────────────────────────────────────────────────

CREATE TYPE public.user_type AS ENUM ('staff', 'ouder');


-- ─────────────────────────────────────────────────────
-- 2. Ouder profielen (first-class entiteit)
-- ─────────────────────────────────────────────────────

CREATE TABLE public.ouder_profielen (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organisatie_id  UUID NOT NULL REFERENCES public.organisaties(id),
  voornaam        TEXT NOT NULL DEFAULT '',
  achternaam      TEXT NOT NULL DEFAULT '',
  email           TEXT NOT NULL DEFAULT '',
  telefoon_mobiel TEXT,
  actief          BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ouder_profielen_organisatie_id
  ON public.ouder_profielen(organisatie_id);

CREATE TRIGGER handle_updated_at_ouder_profielen
  BEFORE UPDATE ON public.ouder_profielen
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();


-- ─────────────────────────────────────────────────────
-- 3. Koppeltabel ouder ↔ kind (autorisatie-spine)
-- ─────────────────────────────────────────────────────
--
-- Elke ouder-RLS-policy filtert via deze tabel.
-- contactpersoon_id is de brug naar het bestaande factuursysteem
-- (invoices.parent_id → contactpersonen.id) voor latere migratie.

CREATE TABLE public.ouder_kind (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ouder_id          UUID NOT NULL REFERENCES public.ouder_profielen(id) ON DELETE CASCADE,
  kind_id           UUID NOT NULL REFERENCES public.kinderen(id) ON DELETE CASCADE,
  contactpersoon_id UUID REFERENCES public.contactpersonen(id) ON DELETE SET NULL,
  relatie           public.contactpersoon_rol NOT NULL DEFAULT 'ouder1',
  actief            BOOLEAN NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(ouder_id, kind_id)
);

CREATE INDEX idx_ouder_kind_ouder_id ON public.ouder_kind(ouder_id);
CREATE INDEX idx_ouder_kind_kind_id ON public.ouder_kind(kind_id);


-- ─────────────────────────────────────────────────────
-- 4. RLS-helpers voor ouders
-- ─────────────────────────────────────────────────────

-- Is de ingelogde gebruiker een ouder?
CREATE OR REPLACE FUNCTION public.is_ouder()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE(
    (auth.jwt() -> 'app_metadata' ->> 'user_type') = 'ouder',
    false
  )
$$;

-- Is de ingelogde gebruiker een medewerker?
-- Default true voor backward compat: bestaande users hebben geen user_type
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE(
    (auth.jwt() -> 'app_metadata' ->> 'user_type') != 'ouder',
    true
  )
$$;

-- Kind-IDs waartoe de ingelogde ouder toegang heeft
CREATE OR REPLACE FUNCTION public.get_ouder_kind_ids()
RETURNS UUID[]
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE(
    array_agg(kind_id),
    '{}'::uuid[]
  )
  FROM public.ouder_kind
  WHERE ouder_id = auth.uid() AND actief = true
$$;


-- ─────────────────────────────────────────────────────
-- 5. Updated handle_new_user() trigger
-- ─────────────────────────────────────────────────────
--
-- Maakt conditioneel een profiles-rij (staff) of
-- ouder_profielen-rij (ouder) aan bij registratie.
-- user_type wordt meegegeven via raw_app_meta_data
-- bij het aanmaken van het account (server-side).

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _user_type TEXT;
BEGIN
  _user_type := COALESCE(NEW.raw_app_meta_data->>'user_type', 'staff');

  IF _user_type = 'ouder' THEN
    INSERT INTO public.ouder_profielen (id, email, voornaam, achternaam, organisatie_id)
    VALUES (
      NEW.id,
      COALESCE(NEW.email, ''),
      COALESCE(NEW.raw_user_meta_data->>'voornaam', ''),
      COALESCE(NEW.raw_user_meta_data->>'achternaam', ''),
      (NEW.raw_app_meta_data->>'organisatie_id')::UUID
    );
  ELSE
    INSERT INTO public.profiles (id, email, naam)
    VALUES (
      NEW.id,
      COALESCE(NEW.email, ''),
      COALESCE(NEW.raw_user_meta_data->>'naam', NEW.raw_user_meta_data->>'full_name', '')
    );
  END IF;

  RETURN NEW;
END;
$$;
