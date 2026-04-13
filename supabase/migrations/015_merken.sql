-- ═══════════════════════════════════════════════════════════════
-- Migratie 015: Merken + merk_id op locaties
-- ═══════════════════════════════════════════════════════════════

-- ─── Tabel: merken ───────────────────────────────────────────

CREATE TABLE public.merken (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisatie_id  UUID NOT NULL REFERENCES public.organisaties(id) ON DELETE CASCADE,
  code            TEXT NOT NULL,
  naam            TEXT NOT NULL,
  beschrijving    TEXT,
  actief          BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ,

  UNIQUE(organisatie_id, code)
);

COMMENT ON TABLE public.merken IS
  'Merken binnen een organisatie. Een merk groepeert locaties en bepaalt contracttypen en tarieven.';

-- ─── Locaties uitbreiden met merk_id ────────────────────────

ALTER TABLE public.locaties
  ADD COLUMN IF NOT EXISTS merk_id UUID REFERENCES public.merken(id);

COMMENT ON COLUMN public.locaties.merk_id IS
  'Merk waaronder deze locatie valt. Nullable voor backward compatibility met bestaande locaties.';

-- ─── Indexes ─────────────────────────────────────────────────

CREATE INDEX idx_merken_organisatie_actief ON public.merken (organisatie_id, actief);
CREATE INDEX idx_locaties_merk_id ON public.locaties (merk_id);

-- ─── Triggers ────────────────────────────────────────────────

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.merken
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ─── RLS: merken ─────────────────────────────────────────────

ALTER TABLE public.merken ENABLE ROW LEVEL SECURITY;

CREATE POLICY "merken_select_eigen_org" ON public.merken
  FOR SELECT TO authenticated
  USING (organisatie_id = public.get_organisatie_id());

CREATE POLICY "merken_write_beheerder" ON public.merken
  FOR ALL TO authenticated
  USING (
    organisatie_id = public.get_organisatie_id()
    AND public.has_role('beheerder')
  )
  WITH CHECK (
    organisatie_id = public.get_organisatie_id()
    AND public.has_role('beheerder')
  );
