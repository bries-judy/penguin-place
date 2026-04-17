-- ═══════════════════════════════════════════════════════════════
-- Migratie 020: TariefSets tabel + tarief_status enum
-- ═══════════════════════════════════════════════════════════════

-- ─── Enum ────────────────────────────────────────────────────

CREATE TYPE public.tarief_status AS ENUM (
  'concept',
  'actief',
  'vervallen'
);

-- ─── Tabel ───────────────────────────────────────────────────

CREATE TABLE public.tariefsets (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisatie_id         UUID NOT NULL REFERENCES public.organisaties(id) ON DELETE CASCADE,
  merk_id                UUID NOT NULL REFERENCES public.merken(id) ON DELETE CASCADE,
  contract_type_id       UUID NOT NULL REFERENCES public.contracttypen(id) ON DELETE CASCADE,
  jaar                   INTEGER NOT NULL,
  opvangtype             public.opvangtype NOT NULL,
  uurtarief              DECIMAL(5,2) NOT NULL,
  max_overheidsuurprijs  DECIMAL(5,2),
  ingangsdatum           DATE NOT NULL,
  status                 public.tarief_status NOT NULL DEFAULT 'concept',
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at             TIMESTAMPTZ,

  UNIQUE(merk_id, contract_type_id, jaar)
);

-- ─── Indexes ─────────────────────────────────────────────────

CREATE INDEX idx_tariefsets_merk_jaar_status
  ON public.tariefsets (merk_id, jaar, status);

CREATE INDEX idx_tariefsets_organisatie
  ON public.tariefsets (organisatie_id);

-- ─── Trigger ─────────────────────────────────────────────────

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.tariefsets
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ─── RLS ─────────────────────────────────────────────────────

ALTER TABLE public.tariefsets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tariefsets_select_eigen_org" ON public.tariefsets
  FOR SELECT TO authenticated
  USING (organisatie_id = public.get_organisatie_id());

CREATE POLICY "tariefsets_write_beheerder" ON public.tariefsets
  FOR ALL TO authenticated
  USING (
    organisatie_id = public.get_organisatie_id()
    AND public.has_role('beheerder')
  )
  WITH CHECK (
    organisatie_id = public.get_organisatie_id()
    AND public.has_role('beheerder')
  );
