-- ═══════════════════════════════════════════════════════════════
-- Migratie 017: DagdeelConfiguratie + Feestdagen
-- ═══════════════════════════════════════════════════════════════

-- ─── Enum: dagdeel_enum ─────────────────────────────────────

CREATE TYPE public.dagdeel_enum AS ENUM (
  'ochtend',
  'middag',
  'hele_dag',
  'na_school',
  'voor_school',
  'studiedag_bso'
);

-- ─── Tabel: dagdeel_configuraties ───────────────────────────

CREATE TABLE public.dagdeel_configuraties (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisatie_id  UUID NOT NULL REFERENCES public.organisaties(id) ON DELETE CASCADE,
  locatie_id      UUID REFERENCES public.locaties(id),
  groep_id        UUID REFERENCES public.groepen(id),
  dagdeel         public.dagdeel_enum NOT NULL,
  starttijd       TIME NOT NULL,
  eindtijd        TIME NOT NULL,
  uren            DECIMAL(4,2) GENERATED ALWAYS AS (
                    EXTRACT(EPOCH FROM (eindtijd - starttijd)) / 3600
                  ) STORED,
  ingangsdatum    DATE NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT chk_eindtijd_na_starttijd CHECK (eindtijd > starttijd),
  CONSTRAINT chk_locatie_of_groep      CHECK (locatie_id IS NOT NULL OR groep_id IS NOT NULL)
);

COMMENT ON TABLE public.dagdeel_configuraties IS
  'Configuratie van dagdeel-tijden per locatie of groep. Groep-configuratie overschrijft locatie-default.';

-- ─── Tabel: feestdagen ──────────────────────────────────────

CREATE TABLE public.feestdagen (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisatie_id  UUID NOT NULL REFERENCES public.organisaties(id) ON DELETE CASCADE,
  datum           DATE NOT NULL,
  naam            TEXT NOT NULL,
  locatie_id      UUID REFERENCES public.locaties(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(organisatie_id, datum, locatie_id)
);

COMMENT ON TABLE public.feestdagen IS
  'Feestdagen per organisatie, optioneel per locatie. locatie_id = NULL betekent org-breed.';

-- ─── Indexes ────────────────────────────────────────────────

CREATE INDEX idx_dagdeel_config_lookup
  ON public.dagdeel_configuraties (locatie_id, groep_id, ingangsdatum DESC);

CREATE INDEX idx_feestdagen_org_datum
  ON public.feestdagen (organisatie_id, datum);

-- ─── Triggers ───────────────────────────────────────────────

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.dagdeel_configuraties
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ─── RLS: dagdeel_configuraties ─────────────────────────────

ALTER TABLE public.dagdeel_configuraties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dagdeel_config_select_eigen_org" ON public.dagdeel_configuraties
  FOR SELECT TO authenticated
  USING (organisatie_id = public.get_organisatie_id());

CREATE POLICY "dagdeel_config_write_beheerder_vm" ON public.dagdeel_configuraties
  FOR ALL TO authenticated
  USING (
    organisatie_id = public.get_organisatie_id()
    AND public.has_any_role('beheerder', 'vestigingsmanager')
  )
  WITH CHECK (
    organisatie_id = public.get_organisatie_id()
    AND public.has_any_role('beheerder', 'vestigingsmanager')
  );

-- ─── RLS: feestdagen ────────────────────────────────────────

ALTER TABLE public.feestdagen ENABLE ROW LEVEL SECURITY;

CREATE POLICY "feestdagen_select_eigen_org" ON public.feestdagen
  FOR SELECT TO authenticated
  USING (organisatie_id = public.get_organisatie_id());

CREATE POLICY "feestdagen_write_beheerder" ON public.feestdagen
  FOR ALL TO authenticated
  USING (
    organisatie_id = public.get_organisatie_id()
    AND public.has_role('beheerder')
  )
  WITH CHECK (
    organisatie_id = public.get_organisatie_id()
    AND public.has_role('beheerder')
  );

-- ─── Seed data (template) ──────────────────────────────────
-- Pas <ORG_ID> en <LOCATIE_ID> aan voor je organisatie:
--
-- INSERT INTO public.dagdeel_configuraties (organisatie_id, locatie_id, dagdeel, starttijd, eindtijd, ingangsdatum)
-- VALUES
--   ('<ORG_ID>', '<LOCATIE_ID>', 'ochtend',     '07:30', '13:15', '2026-01-01'),
--   ('<ORG_ID>', '<LOCATIE_ID>', 'middag',      '12:30', '18:00', '2026-01-01'),
--   ('<ORG_ID>', '<LOCATIE_ID>', 'hele_dag',     '07:30', '18:00', '2026-01-01'),
--   ('<ORG_ID>', '<LOCATIE_ID>', 'na_school',    '15:00', '18:00', '2026-01-01'),
--   ('<ORG_ID>', '<LOCATIE_ID>', 'voor_school',  '07:30', '08:30', '2026-01-01');
