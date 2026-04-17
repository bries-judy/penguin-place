-- ═══════════════════════════════════════════════════════════════
-- Migratie 021: Kortingstypes + Kind-contract-kortingen
-- ═══════════════════════════════════════════════════════════════

-- ─── Enums ──────────────────────────────────────────────────

CREATE TYPE public.kortings_type_enum AS ENUM (
  'percentage',
  'vast_bedrag'
);

CREATE TYPE public.kortings_grondslag AS ENUM (
  'op_uurtarief',
  'op_maandprijs',
  'op_uren_per_maand'
);

-- ─── Tabel: kortings_typen ──────────────────────────────────

CREATE TABLE public.kortings_typen (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisatie_id         UUID NOT NULL REFERENCES public.organisaties(id) ON DELETE CASCADE,
  code                   TEXT NOT NULL,
  naam                   TEXT NOT NULL,
  type_enum              public.kortings_type_enum NOT NULL,
  waarde                 DECIMAL(8,2) NOT NULL,
  grondslag_enum         public.kortings_grondslag NOT NULL,
  max_kortingsbedrag     DECIMAL(8,2),
  stapelbaar             BOOLEAN NOT NULL DEFAULT true,
  vereist_documentatie   BOOLEAN NOT NULL DEFAULT false,
  actief                 BOOLEAN NOT NULL DEFAULT true,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at             TIMESTAMPTZ,

  UNIQUE(organisatie_id, code)
);

-- ─── Tabel: kind_contract_kortingen ─────────────────────────

CREATE TABLE public.kind_contract_kortingen (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind_contract_id       UUID NOT NULL REFERENCES public.contracten(id) ON DELETE CASCADE,
  kortings_type_id       UUID NOT NULL REFERENCES public.kortings_typen(id) ON DELETE RESTRICT,
  startdatum             DATE NOT NULL,
  einddatum              DATE,
  berekend_bedrag        DECIMAL(8,2) NOT NULL,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Indexes ────────────────────────────────────────────────

CREATE INDEX idx_kortings_typen_organisatie
  ON public.kortings_typen (organisatie_id);

CREATE INDEX idx_kortings_typen_actief
  ON public.kortings_typen (organisatie_id, actief)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_kind_contract_kortingen_contract
  ON public.kind_contract_kortingen (kind_contract_id);

CREATE INDEX idx_kind_contract_kortingen_type
  ON public.kind_contract_kortingen (kortings_type_id);

-- ─── Trigger: updated_at ────────────────────────────────────

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.kortings_typen
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ─── Trigger: max 1 niet-stapelbare korting per contract ────

CREATE OR REPLACE FUNCTION public.check_stapelbaarheid()
RETURNS TRIGGER AS $$
DECLARE
  v_stapelbaar BOOLEAN;
  v_bestaand_niet_stapelbaar INTEGER;
BEGIN
  -- Controleer of het nieuwe kortingstype stapelbaar is
  SELECT stapelbaar INTO v_stapelbaar
  FROM public.kortings_typen
  WHERE id = NEW.kortings_type_id;

  -- Als het niet stapelbaar is, check of er al een niet-stapelbare korting is
  IF NOT v_stapelbaar THEN
    SELECT COUNT(*) INTO v_bestaand_niet_stapelbaar
    FROM public.kind_contract_kortingen kck
    JOIN public.kortings_typen kt ON kt.id = kck.kortings_type_id
    WHERE kck.kind_contract_id = NEW.kind_contract_id
      AND kt.stapelbaar = false
      AND kck.id IS DISTINCT FROM NEW.id;

    IF v_bestaand_niet_stapelbaar > 0 THEN
      RAISE EXCEPTION 'Er is al een niet-stapelbare korting aan dit contract gekoppeld.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_stapelbaarheid_trigger
  BEFORE INSERT OR UPDATE ON public.kind_contract_kortingen
  FOR EACH ROW EXECUTE FUNCTION public.check_stapelbaarheid();

-- ─── RLS ────────────────────────────────────────────────────

ALTER TABLE public.kortings_typen ENABLE ROW LEVEL SECURITY;

CREATE POLICY "kortings_typen_select_eigen_org" ON public.kortings_typen
  FOR SELECT TO authenticated
  USING (organisatie_id = public.get_organisatie_id());

CREATE POLICY "kortings_typen_write_beheerder" ON public.kortings_typen
  FOR ALL TO authenticated
  USING (
    organisatie_id = public.get_organisatie_id()
    AND public.has_role('beheerder')
  )
  WITH CHECK (
    organisatie_id = public.get_organisatie_id()
    AND public.has_role('beheerder')
  );

ALTER TABLE public.kind_contract_kortingen ENABLE ROW LEVEL SECURITY;

CREATE POLICY "kind_contract_kortingen_select_eigen_org" ON public.kind_contract_kortingen
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.contracten c
      JOIN public.kinderen k ON k.id = c.kind_id
      WHERE c.id = kind_contract_id
        AND k.organisatie_id = public.get_organisatie_id()
    )
  );

CREATE POLICY "kind_contract_kortingen_write_beheerder" ON public.kind_contract_kortingen
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.contracten c
      JOIN public.kinderen k ON k.id = c.kind_id
      WHERE c.id = kind_contract_id
        AND k.organisatie_id = public.get_organisatie_id()
    )
    AND public.has_role('beheerder')
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.contracten c
      JOIN public.kinderen k ON k.id = c.kind_id
      WHERE c.id = kind_contract_id
        AND k.organisatie_id = public.get_organisatie_id()
    )
    AND public.has_role('beheerder')
  );
