-- ═══════════════════════════════════════════════════════════════
-- Migratie 016: ContractTypen tabel + contractvorm enum
-- ═══════════════════════════════════════════════════════════════

-- ─── Enum ────────────────────────────────────────────────────

CREATE TYPE public.contractvorm AS ENUM (
  'schoolweken',
  'standaard',
  'super_flexibel',
  'flexibel'
);

-- ─── Tabel ───────────────────────────────────────────────────

CREATE TABLE public.contracttypen (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisatie_id           UUID NOT NULL REFERENCES public.organisaties(id) ON DELETE CASCADE,
  merk_id                  UUID NOT NULL REFERENCES public.merken(id) ON DELETE CASCADE,
  naam                     TEXT NOT NULL,
  code                     TEXT NOT NULL,
  opvangtype               public.opvangtype NOT NULL,
  contractvorm             public.contractvorm NOT NULL,
  beschrijving             TEXT,
  min_uren_maand           INTEGER,
  min_dagdelen_week        INTEGER,
  geldig_in_vakanties      BOOLEAN NOT NULL DEFAULT true,
  opvang_op_inschrijving   BOOLEAN NOT NULL DEFAULT false,
  annuleringstermijn_uren  INTEGER,
  actief                   BOOLEAN NOT NULL DEFAULT true,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at               TIMESTAMPTZ,

  UNIQUE(organisatie_id, code)
);

-- ─── Indexes ─────────────────────────────────────────────────

CREATE INDEX idx_contracttypen_merk_opvangtype
  ON public.contracttypen (merk_id, opvangtype);

CREATE INDEX idx_contracttypen_organisatie_actief
  ON public.contracttypen (organisatie_id, actief);

-- ─── Trigger ─────────────────────────────────────────────────

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.contracttypen
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ─── RLS ─────────────────────────────────────────────────────

ALTER TABLE public.contracttypen ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contracttypen_select_eigen_org" ON public.contracttypen
  FOR SELECT TO authenticated
  USING (organisatie_id = public.get_organisatie_id());

CREATE POLICY "contracttypen_write_beheerder" ON public.contracttypen
  FOR ALL TO authenticated
  USING (
    organisatie_id = public.get_organisatie_id()
    AND public.has_role('beheerder')
  )
  WITH CHECK (
    organisatie_id = public.get_organisatie_id()
    AND public.has_role('beheerder')
  );
