-- ═══════════════════════════════════════════
-- PENGUIN PLACE — Domein 3: Kindplanning & Capaciteit
-- Migratie 001: Core schema
-- ═══════════════════════════════════════════

-- ───────────────────────────────────────────
-- ENUMS
-- ───────────────────────────────────────────

CREATE TYPE public.opvangtype AS ENUM ('kdv', 'bso', 'peuteropvang', 'gastouder');

CREATE TYPE public.leeftijdscategorie AS ENUM ('baby', 'dreumes', 'peuter', 'bso');

CREATE TYPE public.contracttype AS ENUM ('vast', 'flex', 'tijdelijk');

CREATE TYPE public.contract_status AS ENUM ('actief', 'wachtlijst', 'beëindigd');

CREATE TYPE public.app_role AS ENUM (
  'klantadviseur',
  'vestigingsmanager',
  'personeelsplanner',
  'regiomanager',
  'directie',
  'beheerder'
);

-- ───────────────────────────────────────────
-- ORGANISATIES (multi-tenant root)
-- ───────────────────────────────────────────

CREATE TABLE public.organisaties (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  naam        TEXT NOT NULL,
  actief      BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ───────────────────────────────────────────
-- LOCATIES
-- ───────────────────────────────────────────

CREATE TABLE public.locaties (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisatie_id  UUID NOT NULL REFERENCES public.organisaties(id) ON DELETE CASCADE,
  naam            TEXT NOT NULL,
  adres           TEXT DEFAULT '',
  postcode        TEXT DEFAULT '',
  plaats          TEXT DEFAULT '',
  label           TEXT DEFAULT '',  -- bijv. "WiedeWij" (merk binnen grotere org)
  actief          BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ───────────────────────────────────────────
-- GROEPEN
-- ───────────────────────────────────────────

CREATE TABLE public.groepen (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  locatie_id            UUID NOT NULL REFERENCES public.locaties(id) ON DELETE CASCADE,
  naam                  TEXT NOT NULL,
  opvangtype            public.opvangtype NOT NULL,
  leeftijdscategorie    public.leeftijdscategorie NOT NULL,
  min_leeftijd_maanden  INTEGER NOT NULL DEFAULT 0,
  max_leeftijd_maanden  INTEGER NOT NULL DEFAULT 48,
  max_capaciteit        INTEGER NOT NULL DEFAULT 12,
  actief                BOOLEAN NOT NULL DEFAULT true,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ───────────────────────────────────────────
-- KINDEREN
-- ───────────────────────────────────────────

CREATE TABLE public.kinderen (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisatie_id  UUID NOT NULL REFERENCES public.organisaties(id) ON DELETE CASCADE,
  voornaam        TEXT NOT NULL,
  achternaam      TEXT NOT NULL,
  geboortedatum   DATE NOT NULL,
  actief          BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ───────────────────────────────────────────
-- CONTRACTEN
-- ───────────────────────────────────────────

-- weekdag: 0=ma, 1=di, 2=wo, 3=do, 4=vr
CREATE TABLE public.contracten (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind_id         UUID NOT NULL REFERENCES public.kinderen(id) ON DELETE CASCADE,
  locatie_id      UUID NOT NULL REFERENCES public.locaties(id),
  groep_id        UUID REFERENCES public.groepen(id),  -- null = nog niet aan groep gekoppeld
  opvangtype      public.opvangtype NOT NULL,
  contracttype    public.contracttype NOT NULL DEFAULT 'vast',
  status          public.contract_status NOT NULL DEFAULT 'actief',
  zorgdagen       INTEGER[] NOT NULL DEFAULT '{}',  -- [0,2,4] = ma,wo,vr
  uren_per_dag    DECIMAL(4,2) NOT NULL DEFAULT 8.5,
  startdatum      DATE NOT NULL,
  einddatum       DATE,  -- null = open einde
  flexpool        BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ───────────────────────────────────────────
-- FLEX DAGEN (incidentele plaatsingen)
-- ───────────────────────────────────────────

CREATE TABLE public.flex_dagen (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id     UUID NOT NULL REFERENCES public.contracten(id) ON DELETE CASCADE,
  groep_id        UUID NOT NULL REFERENCES public.groepen(id),
  datum           DATE NOT NULL,
  geannuleerd     BOOLEAN NOT NULL DEFAULT false,
  aangemaakt_door UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(contract_id, datum)
);

-- ───────────────────────────────────────────
-- GROEPSOVERDRACHTEN
-- ───────────────────────────────────────────

CREATE TABLE public.groepsoverdrachten (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind_id           UUID NOT NULL REFERENCES public.kinderen(id) ON DELETE CASCADE,
  van_groep_id      UUID NOT NULL REFERENCES public.groepen(id),
  naar_groep_id     UUID NOT NULL REFERENCES public.groepen(id),
  overdrachtsdatum  DATE NOT NULL,
  uitgevoerd        BOOLEAN NOT NULL DEFAULT false,
  aangemaakt_door   UUID REFERENCES auth.users(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ───────────────────────────────────────────
-- KIND NOTITIES
-- ───────────────────────────────────────────

CREATE TABLE public.kind_notities (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind_id     UUID NOT NULL REFERENCES public.kinderen(id) ON DELETE CASCADE,
  tekst       TEXT NOT NULL CHECK (char_length(tekst) <= 500),
  user_id     UUID NOT NULL REFERENCES auth.users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ───────────────────────────────────────────
-- CAPACITEIT OVERRIDES (tijdelijke aanpassingen)
-- ───────────────────────────────────────────

CREATE TABLE public.capaciteit_overrides (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  groep_id        UUID NOT NULL REFERENCES public.groepen(id) ON DELETE CASCADE,
  max_capaciteit  INTEGER NOT NULL,
  start_datum     DATE NOT NULL,
  eind_datum      DATE NOT NULL,
  reden           TEXT DEFAULT '',
  aangemaakt_door UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ───────────────────────────────────────────
-- AUTH: PROFIELEN & ROLLEN
-- ───────────────────────────────────────────

CREATE TABLE public.profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organisatie_id  UUID REFERENCES public.organisaties(id),
  naam            TEXT NOT NULL DEFAULT '',
  email           TEXT NOT NULL DEFAULT '',
  actief          BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.user_roles (
  id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role     public.app_role NOT NULL,
  UNIQUE(user_id, role)
);

CREATE TABLE public.user_locatie_toegang (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  locatie_id      UUID REFERENCES public.locaties(id) ON DELETE CASCADE,
  alle_locaties   BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, locatie_id)
);

-- ───────────────────────────────────────────
-- AUDIT LOG
-- ───────────────────────────────────────────

CREATE TABLE public.audit_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  actie       TEXT NOT NULL,
  tabel       TEXT,
  record_id   TEXT,
  details     JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_logs_created_at ON public.audit_logs (created_at DESC);
CREATE INDEX idx_audit_logs_tabel ON public.audit_logs (tabel, record_id);

-- ───────────────────────────────────────────
-- INDEXEN (performance)
-- ───────────────────────────────────────────

CREATE INDEX idx_contracten_kind_id ON public.contracten (kind_id);
CREATE INDEX idx_contracten_groep_id ON public.contracten (groep_id);
CREATE INDEX idx_contracten_status ON public.contracten (status);
CREATE INDEX idx_flex_dagen_groep_datum ON public.flex_dagen (groep_id, datum);
CREATE INDEX idx_groepsoverdrachten_datum ON public.groepsoverdrachten (overdrachtsdatum);
CREATE INDEX idx_kinderen_organisatie ON public.kinderen (organisatie_id);

-- ───────────────────────────────────────────
-- UPDATED_AT TRIGGER
-- ───────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.locaties FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.groepen FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.kinderen FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.contracten FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ───────────────────────────────────────────
-- AUTO-CREATE PROFILE ON SIGNUP
-- ───────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, naam)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'naam', NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
