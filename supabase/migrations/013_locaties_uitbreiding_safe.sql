-- ═══════════════════════════════════════════
-- PENGUIN PLACE — Migratie 013 (safe/idempotent versie)
-- Gebruik deze versie als 013 eerder deels is uitgevoerd.
-- ═══════════════════════════════════════════

-- ───────────────────────────────────────────
-- ENUMS (veilig: skip als al bestaat)
-- ───────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE public.locatie_type AS ENUM ('kdv','bso','peuterspeelzaal','gastouder','combinatie');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.locatie_status AS ENUM ('actief','inactief','in_opbouw');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.groep_status AS ENUM ('actief','gesloten','alleen_wachtlijst');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.inspectie_oordeel AS ENUM ('goed','voldoende','onvoldoende');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.cao_type AS ENUM ('kinderopvang','sociaal_werk','overig');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ───────────────────────────────────────────
-- ALTER TABLE locaties
-- ───────────────────────────────────────────

ALTER TABLE public.locaties
  ADD COLUMN IF NOT EXISTS code                         TEXT,
  ADD COLUMN IF NOT EXISTS type                         public.locatie_type,
  ADD COLUMN IF NOT EXISTS status                       public.locatie_status NOT NULL DEFAULT 'actief',
  ADD COLUMN IF NOT EXISTS huisnummer                   TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS land                         TEXT NOT NULL DEFAULT 'NL',
  ADD COLUMN IF NOT EXISTS telefoon                     TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS email                        TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS website                      TEXT,
  ADD COLUMN IF NOT EXISTS lrk_nummer                   TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS ggd_regio                    TEXT,
  ADD COLUMN IF NOT EXISTS laatste_inspectie_datum      DATE,
  ADD COLUMN IF NOT EXISTS inspectie_oordeel            public.inspectie_oordeel,
  ADD COLUMN IF NOT EXISTS volgende_inspectie_datum     DATE,
  ADD COLUMN IF NOT EXISTS vergunning_geldig_tot        DATE,
  ADD COLUMN IF NOT EXISTS cao                          public.cao_type,
  ADD COLUMN IF NOT EXISTS locatiemanager_id            UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS plaatsvervangend_manager_id  UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS noodcontact_naam             TEXT,
  ADD COLUMN IF NOT EXISTS noodcontact_telefoon         TEXT,
  ADD COLUMN IF NOT EXISTS iban                         TEXT,
  ADD COLUMN IF NOT EXISTS kvk_nummer                   TEXT,
  ADD COLUMN IF NOT EXISTS buitenspeelruimte            BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS buitenspeelruimte_m2         NUMERIC(8,2),
  ADD COLUMN IF NOT EXISTS heeft_keuken                 BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS rolstoeltoegankelijk         BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS parkeerplaatsen              INTEGER,
  ADD COLUMN IF NOT EXISTS notities                     TEXT,
  ADD COLUMN IF NOT EXISTS deleted_at                   TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS locaties_code_per_org
  ON public.locaties(organisatie_id, code)
  WHERE deleted_at IS NULL;

-- ───────────────────────────────────────────
-- ALTER TABLE groepen
-- ───────────────────────────────────────────

ALTER TABLE public.groepen
  ADD COLUMN IF NOT EXISTS status      public.groep_status NOT NULL DEFAULT 'actief',
  ADD COLUMN IF NOT EXISTS m2          NUMERIC(8,2),
  ADD COLUMN IF NOT EXISTS bkr_ratio   TEXT,
  ADD COLUMN IF NOT EXISTS ruimtenaam  TEXT,
  ADD COLUMN IF NOT EXISTS notities    TEXT,
  ADD COLUMN IF NOT EXISTS deleted_at  TIMESTAMPTZ;

-- ───────────────────────────────────────────
-- NIEUWE TABELLEN (veilig: skip als al bestaat)
-- ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.locatie_openingstijden (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  locatie_id    UUID NOT NULL REFERENCES public.locaties(id) ON DELETE CASCADE,
  dag_van_week  TEXT NOT NULL CHECK (dag_van_week IN ('ma','di','wo','do','vr','za','zo')),
  is_open       BOOLEAN NOT NULL DEFAULT false,
  open_tijd     TIME,
  sluit_tijd    TIME,
  CONSTRAINT openingstijden_dag_uniek UNIQUE (locatie_id, dag_van_week),
  CONSTRAINT open_voor_sluit CHECK (
    open_tijd IS NULL OR sluit_tijd IS NULL OR open_tijd < sluit_tijd
  )
);

CREATE TABLE IF NOT EXISTS public.locatie_openingstijden_uitzonderingen (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  locatie_id    UUID NOT NULL REFERENCES public.locaties(id) ON DELETE CASCADE,
  start_datum   DATE NOT NULL,
  eind_datum    DATE NOT NULL,
  is_gesloten   BOOLEAN NOT NULL DEFAULT true,
  open_tijd     TIME,
  sluit_tijd    TIME,
  omschrijving  TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT eind_na_start CHECK (eind_datum >= start_datum),
  CONSTRAINT open_voor_sluit_uit CHECK (
    open_tijd IS NULL OR sluit_tijd IS NULL OR open_tijd < sluit_tijd
  )
);

DO $$ BEGIN
  CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON public.locatie_openingstijden_uitzonderingen
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ───────────────────────────────────────────
-- RLS NIEUWE TABELLEN
-- ───────────────────────────────────────────

ALTER TABLE public.locatie_openingstijden ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locatie_openingstijden_uitzonderingen ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "openingstijden_select" ON public.locatie_openingstijden;
CREATE POLICY "openingstijden_select" ON public.locatie_openingstijden
  FOR SELECT TO authenticated
  USING (locatie_id = ANY(public.get_toegankelijke_locatie_ids()));

DROP POLICY IF EXISTS "openingstijden_modify" ON public.locatie_openingstijden;
CREATE POLICY "openingstijden_modify" ON public.locatie_openingstijden
  FOR ALL TO authenticated
  USING (
    public.has_any_role('vestigingsmanager','regiomanager','directie','beheerder')
    AND locatie_id = ANY(public.get_toegankelijke_locatie_ids())
  )
  WITH CHECK (
    public.has_any_role('vestigingsmanager','regiomanager','directie','beheerder')
    AND locatie_id = ANY(public.get_toegankelijke_locatie_ids())
  );

DROP POLICY IF EXISTS "uitzonderingen_select" ON public.locatie_openingstijden_uitzonderingen;
CREATE POLICY "uitzonderingen_select" ON public.locatie_openingstijden_uitzonderingen
  FOR SELECT TO authenticated
  USING (locatie_id = ANY(public.get_toegankelijke_locatie_ids()));

DROP POLICY IF EXISTS "uitzonderingen_modify" ON public.locatie_openingstijden_uitzonderingen;
CREATE POLICY "uitzonderingen_modify" ON public.locatie_openingstijden_uitzonderingen
  FOR ALL TO authenticated
  USING (
    public.has_any_role('vestigingsmanager','regiomanager','directie','beheerder')
    AND locatie_id = ANY(public.get_toegankelijke_locatie_ids())
  )
  WITH CHECK (
    public.has_any_role('vestigingsmanager','regiomanager','directie','beheerder')
    AND locatie_id = ANY(public.get_toegankelijke_locatie_ids())
  );

-- ───────────────────────────────────────────
-- RLS UITBREIDINGEN op locaties en groepen
-- ───────────────────────────────────────────

DROP POLICY IF EXISTS "Manager schrijft eigen locaties" ON public.locaties;
CREATE POLICY "Manager schrijft eigen locaties" ON public.locaties
  FOR ALL TO authenticated
  USING (
    public.has_any_role('vestigingsmanager','regiomanager','directie')
    AND id = ANY(public.get_toegankelijke_locatie_ids())
  )
  WITH CHECK (
    public.has_any_role('vestigingsmanager','regiomanager','directie')
    AND id = ANY(public.get_toegankelijke_locatie_ids())
  );

DROP POLICY IF EXISTS "Regiomanager en directie schrijven groepen" ON public.groepen;
CREATE POLICY "Regiomanager en directie schrijven groepen" ON public.groepen
  FOR ALL TO authenticated
  USING (
    public.has_any_role('regiomanager','directie')
    AND locatie_id = ANY(public.get_toegankelijke_locatie_ids())
  )
  WITH CHECK (
    public.has_any_role('regiomanager','directie')
    AND locatie_id = ANY(public.get_toegankelijke_locatie_ids())
  );

-- ───────────────────────────────────────────
-- TRIGGER: standaard openingstijden bij nieuwe locatie
-- ───────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.maak_standaard_openingstijden()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO public.locatie_openingstijden (locatie_id, dag_van_week, is_open, open_tijd, sluit_tijd)
  VALUES
    (NEW.id, 'ma', true,  '07:00', '18:00'),
    (NEW.id, 'di', true,  '07:00', '18:00'),
    (NEW.id, 'wo', true,  '07:00', '18:00'),
    (NEW.id, 'do', true,  '07:00', '18:00'),
    (NEW.id, 'vr', true,  '07:00', '18:00'),
    (NEW.id, 'za', false, NULL,    NULL),
    (NEW.id, 'zo', false, NULL,    NULL);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS locatie_openingstijden_init ON public.locaties;
CREATE TRIGGER locatie_openingstijden_init
  AFTER INSERT ON public.locaties
  FOR EACH ROW EXECUTE FUNCTION public.maak_standaard_openingstijden();
