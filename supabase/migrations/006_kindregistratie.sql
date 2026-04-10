-- ═══════════════════════════════════════════════════════════════
-- PENGUIN PLACE — Migratie 006: Kindregistratie & Contractbeheer
-- ═══════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────
-- 1. Uitbreiden kinderen tabel
-- ─────────────────────────────────────────────────────
ALTER TABLE public.kinderen
  ADD COLUMN IF NOT EXISTS tussenvoegsel          TEXT,
  ADD COLUMN IF NOT EXISTS verwachte_geboortedatum DATE,
  ADD COLUMN IF NOT EXISTS bsn                    TEXT,     -- encrypted at app layer
  ADD COLUMN IF NOT EXISTS geslacht               TEXT CHECK (geslacht IN ('man', 'vrouw', 'onbekend')),
  ADD COLUMN IF NOT EXISTS datum_uitschrijving    DATE,
  ADD COLUMN IF NOT EXISTS reden_uitschrijving    TEXT,
  ADD COLUMN IF NOT EXISTS aangemeld_op           TIMESTAMPTZ DEFAULT now();

-- ─────────────────────────────────────────────────────
-- 2. Contract statussen uitbreiden
-- ─────────────────────────────────────────────────────
ALTER TYPE contract_status ADD VALUE IF NOT EXISTS 'concept';
ALTER TYPE contract_status ADD VALUE IF NOT EXISTS 'opgeschort';

-- ─────────────────────────────────────────────────────
-- 3. Uitbreiden contracten tabel
-- ─────────────────────────────────────────────────────
ALTER TABLE public.contracten
  ADD COLUMN IF NOT EXISTS uurtarief          DECIMAL(6,2),
  ADD COLUMN IF NOT EXISTS maandprijs         DECIMAL(8,2),
  ADD COLUMN IF NOT EXISTS ondertekend_op     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ondertekend_door   TEXT,
  ADD COLUMN IF NOT EXISTS notities           TEXT,
  ADD COLUMN IF NOT EXISTS vorige_contract_id UUID REFERENCES public.contracten(id);

-- ─────────────────────────────────────────────────────
-- 4. Adressen
-- ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.adressen (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  kind_id     UUID NOT NULL REFERENCES public.kinderen(id) ON DELETE CASCADE,
  straat      TEXT NOT NULL,
  huisnummer  TEXT NOT NULL,
  postcode    TEXT NOT NULL,
  woonplaats  TEXT NOT NULL,
  land        TEXT NOT NULL DEFAULT 'NL',
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE (kind_id)   -- één adres per kind
);

CREATE TRIGGER handle_updated_at_adressen
  BEFORE UPDATE ON public.adressen
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- ─────────────────────────────────────────────────────
-- 5. Contactpersonen
-- ─────────────────────────────────────────────────────
CREATE TYPE contactpersoon_rol AS ENUM ('ouder1', 'ouder2', 'voogd', 'noodcontact');

CREATE TABLE IF NOT EXISTS public.contactpersonen (
  id                       UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  kind_id                  UUID NOT NULL REFERENCES public.kinderen(id) ON DELETE CASCADE,
  rol                      contactpersoon_rol NOT NULL DEFAULT 'ouder1',
  voornaam                 TEXT NOT NULL,
  achternaam               TEXT NOT NULL,
  telefoon_mobiel          TEXT,
  telefoon_prive           TEXT,
  telefoon_werk            TEXT,
  email                    TEXT,
  relatie_tot_kind         TEXT,
  machtigt_ophalen         BOOLEAN NOT NULL DEFAULT false,
  ontvangt_factuur         BOOLEAN NOT NULL DEFAULT false,
  ontvangt_correspondentie BOOLEAN NOT NULL DEFAULT false,
  bsn                      TEXT,   -- encrypted at app layer
  created_at               TIMESTAMPTZ DEFAULT now(),
  updated_at               TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER handle_updated_at_contactpersonen
  BEFORE UPDATE ON public.contactpersonen
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- ─────────────────────────────────────────────────────
-- 6. Medische gegevens
-- ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.medisch_gegevens (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  kind_id           UUID NOT NULL REFERENCES public.kinderen(id) ON DELETE CASCADE,
  allergieeen       TEXT,
  medicatie         TEXT,
  dieetwensen       TEXT,
  zorgbehoeften     TEXT,
  huisarts          TEXT,
  zorgverzekering   TEXT,
  foto_toestemming  BOOLEAN NOT NULL DEFAULT false,
  bijzonderheden    TEXT,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now(),
  UNIQUE (kind_id)
);

CREATE TRIGGER handle_updated_at_medisch_gegevens
  BEFORE UPDATE ON public.medisch_gegevens
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- ─────────────────────────────────────────────────────
-- 7. Siblings (broer/zus koppeling)
-- ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.siblings (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  kind_id_a      UUID NOT NULL REFERENCES public.kinderen(id) ON DELETE CASCADE,
  kind_id_b      UUID NOT NULL REFERENCES public.kinderen(id) ON DELETE CASCADE,
  organisatie_id UUID NOT NULL REFERENCES public.organisaties(id) ON DELETE CASCADE,
  created_at     TIMESTAMPTZ DEFAULT now(),
  UNIQUE (kind_id_a, kind_id_b),
  CHECK (kind_id_a <> kind_id_b)
);

-- ─────────────────────────────────────────────────────
-- 8. Row Level Security
-- ─────────────────────────────────────────────────────
ALTER TABLE public.adressen         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contactpersonen  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medisch_gegevens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.siblings         ENABLE ROW LEVEL SECURITY;

-- Adressen (via kinderen)
CREATE POLICY "adressen_select" ON public.adressen FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.kinderen k WHERE k.id = kind_id AND k.organisatie_id = get_organisatie_id()));
CREATE POLICY "adressen_insert" ON public.adressen FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.kinderen k WHERE k.id = kind_id AND k.organisatie_id = get_organisatie_id()));
CREATE POLICY "adressen_update" ON public.adressen FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.kinderen k WHERE k.id = kind_id AND k.organisatie_id = get_organisatie_id()));

-- Contactpersonen (via kinderen)
CREATE POLICY "contactpersonen_select" ON public.contactpersonen FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.kinderen k WHERE k.id = kind_id AND k.organisatie_id = get_organisatie_id()));
CREATE POLICY "contactpersonen_insert" ON public.contactpersonen FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.kinderen k WHERE k.id = kind_id AND k.organisatie_id = get_organisatie_id()));
CREATE POLICY "contactpersonen_update" ON public.contactpersonen FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.kinderen k WHERE k.id = kind_id AND k.organisatie_id = get_organisatie_id()));
CREATE POLICY "contactpersonen_delete" ON public.contactpersonen FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.kinderen k WHERE k.id = kind_id AND k.organisatie_id = get_organisatie_id()));

-- Medisch gegevens (via kinderen)
CREATE POLICY "medisch_select" ON public.medisch_gegevens FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.kinderen k WHERE k.id = kind_id AND k.organisatie_id = get_organisatie_id()));
CREATE POLICY "medisch_insert" ON public.medisch_gegevens FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.kinderen k WHERE k.id = kind_id AND k.organisatie_id = get_organisatie_id()));
CREATE POLICY "medisch_update" ON public.medisch_gegevens FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.kinderen k WHERE k.id = kind_id AND k.organisatie_id = get_organisatie_id()));

-- Siblings
CREATE POLICY "siblings_select" ON public.siblings FOR SELECT
  USING (organisatie_id = get_organisatie_id());
CREATE POLICY "siblings_insert" ON public.siblings FOR INSERT
  WITH CHECK (organisatie_id = get_organisatie_id());
CREATE POLICY "siblings_delete" ON public.siblings FOR DELETE
  USING (organisatie_id = get_organisatie_id());
