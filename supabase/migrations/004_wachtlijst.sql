-- ═══════════════════════════════════════════════════════
-- PENGUIN PLACE — Migratie 004: Wachtlijstbeheer
-- ═══════════════════════════════════════════════════════

-- Status enums
CREATE TYPE wachtlijst_status AS ENUM ('wachtend', 'aangeboden', 'geplaatst', 'vervallen', 'geannuleerd');
CREATE TYPE aanbieding_status  AS ENUM ('openstaand', 'geaccepteerd', 'geweigerd', 'verlopen');

-- ─────────────────────────────────────────────────────
-- wachtlijst: één rij per kind-aanmelding
-- ─────────────────────────────────────────────────────
CREATE TABLE public.wachtlijst (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organisatie_id        UUID NOT NULL REFERENCES public.organisaties(id) ON DELETE CASCADE,
  kind_id               UUID NOT NULL REFERENCES public.kinderen(id) ON DELETE CASCADE,
  opvangtype            opvangtype NOT NULL,
  gewenste_startdatum   DATE,
  gewenste_dagen        INT[] DEFAULT '{}',   -- 0=ma … 4=vr
  prioriteit            INT  DEFAULT 0,        -- hogere waarde = hogere prio (override)
  status                wachtlijst_status DEFAULT 'wachtend',
  notities              TEXT,
  aangemeld_op          TIMESTAMPTZ DEFAULT now(),
  created_at            TIMESTAMPTZ DEFAULT now(),
  updated_at            TIMESTAMPTZ DEFAULT now()
);

-- ─────────────────────────────────────────────────────
-- locatievoorkeuren: welke locaties wil het gezin?
-- ─────────────────────────────────────────────────────
CREATE TABLE public.locatievoorkeuren (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  wachtlijst_id     UUID NOT NULL REFERENCES public.wachtlijst(id) ON DELETE CASCADE,
  locatie_id        UUID NOT NULL REFERENCES public.locaties(id) ON DELETE CASCADE,
  voorkeur_volgorde INT  DEFAULT 1,
  created_at        TIMESTAMPTZ DEFAULT now(),
  UNIQUE (wachtlijst_id, locatie_id)
);

-- ─────────────────────────────────────────────────────
-- aanbiedingen: formele plaatsingaanbiedingen aan ouder
-- ─────────────────────────────────────────────────────
CREATE TABLE public.aanbiedingen (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  wachtlijst_id    UUID NOT NULL REFERENCES public.wachtlijst(id) ON DELETE CASCADE,
  locatie_id       UUID NOT NULL REFERENCES public.locaties(id),
  groep_id         UUID          REFERENCES public.groepen(id),
  aangeboden_op    TIMESTAMPTZ DEFAULT now(),
  verloopdatum     TIMESTAMPTZ,
  status           aanbieding_status DEFAULT 'openstaand',
  notities         TEXT,
  aangemaakt_door  UUID REFERENCES auth.users(id),
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now()
);

-- ─────────────────────────────────────────────────────
-- Triggers updated_at
-- ─────────────────────────────────────────────────────
CREATE TRIGGER handle_updated_at_wachtlijst
  BEFORE UPDATE ON public.wachtlijst
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER handle_updated_at_aanbiedingen
  BEFORE UPDATE ON public.aanbiedingen
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- ─────────────────────────────────────────────────────
-- Row Level Security
-- ─────────────────────────────────────────────────────
ALTER TABLE public.wachtlijst          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locatievoorkeuren   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aanbiedingen        ENABLE ROW LEVEL SECURITY;

-- Wachtlijst
CREATE POLICY "wachtlijst_select" ON public.wachtlijst FOR SELECT
  USING (organisatie_id = get_organisatie_id());
CREATE POLICY "wachtlijst_insert" ON public.wachtlijst FOR INSERT
  WITH CHECK (organisatie_id = get_organisatie_id());
CREATE POLICY "wachtlijst_update" ON public.wachtlijst FOR UPDATE
  USING (organisatie_id = get_organisatie_id());

-- Locatievoorkeuren (via wachtlijst)
CREATE POLICY "locatievoorkeuren_select" ON public.locatievoorkeuren FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.wachtlijst w
    WHERE w.id = wachtlijst_id AND w.organisatie_id = get_organisatie_id()
  ));
CREATE POLICY "locatievoorkeuren_insert" ON public.locatievoorkeuren FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.wachtlijst w
    WHERE w.id = wachtlijst_id AND w.organisatie_id = get_organisatie_id()
  ));
CREATE POLICY "locatievoorkeuren_update" ON public.locatievoorkeuren FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.wachtlijst w
    WHERE w.id = wachtlijst_id AND w.organisatie_id = get_organisatie_id()
  ));
CREATE POLICY "locatievoorkeuren_delete" ON public.locatievoorkeuren FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.wachtlijst w
    WHERE w.id = wachtlijst_id AND w.organisatie_id = get_organisatie_id()
  ));

-- Aanbiedingen (via wachtlijst)
CREATE POLICY "aanbiedingen_select" ON public.aanbiedingen FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.wachtlijst w
    WHERE w.id = wachtlijst_id AND w.organisatie_id = get_organisatie_id()
  ));
CREATE POLICY "aanbiedingen_insert" ON public.aanbiedingen FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.wachtlijst w
    WHERE w.id = wachtlijst_id AND w.organisatie_id = get_organisatie_id()
  ));
CREATE POLICY "aanbiedingen_update" ON public.aanbiedingen FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.wachtlijst w
    WHERE w.id = wachtlijst_id AND w.organisatie_id = get_organisatie_id()
  ));
