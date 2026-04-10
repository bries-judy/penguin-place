-- ═══════════════════════════════════════════
-- PENGUIN PLACE — Migratie 002: RLS Policies
-- ═══════════════════════════════════════════

-- ───────────────────────────────────────────
-- HELPER FUNCTIES (security definer)
-- ───────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_organisatie_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT organisatie_id FROM public.profiles WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.has_role(_role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.has_any_role(VARIADIC _roles public.app_role[])
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = ANY(_roles)
  )
$$;

CREATE OR REPLACE FUNCTION public.get_toegankelijke_locatie_ids()
RETURNS UUID[] LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE
    WHEN EXISTS (
      SELECT 1 FROM public.user_locatie_toegang
      WHERE user_id = auth.uid() AND alle_locaties = true
    ) THEN (
      SELECT array_agg(id) FROM public.locaties
      WHERE organisatie_id = public.get_organisatie_id()
    )
    ELSE (
      SELECT COALESCE(array_agg(locatie_id), '{}')
      FROM public.user_locatie_toegang
      WHERE user_id = auth.uid() AND locatie_id IS NOT NULL
    )
  END
$$;

-- ───────────────────────────────────────────
-- RLS INSCHAKELEN
-- ───────────────────────────────────────────

ALTER TABLE public.organisaties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locaties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groepen ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kinderen ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracten ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flex_dagen ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groepsoverdrachten ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kind_notities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.capaciteit_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_locatie_toegang ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ───────────────────────────────────────────
-- ORGANISATIES
-- ───────────────────────────────────────────

CREATE POLICY "Gebruiker ziet eigen organisatie" ON public.organisaties
  FOR SELECT TO authenticated
  USING (id = public.get_organisatie_id());

-- ───────────────────────────────────────────
-- LOCATIES
-- ───────────────────────────────────────────

CREATE POLICY "Lees eigen locaties" ON public.locaties
  FOR SELECT TO authenticated
  USING (id = ANY(public.get_toegankelijke_locatie_ids()));

CREATE POLICY "Beheerder schrijft locaties" ON public.locaties
  FOR ALL TO authenticated
  USING (public.has_role('beheerder'))
  WITH CHECK (public.has_role('beheerder'));

-- ───────────────────────────────────────────
-- GROEPEN
-- ───────────────────────────────────────────

CREATE POLICY "Lees groepen van eigen locaties" ON public.groepen
  FOR SELECT TO authenticated
  USING (locatie_id = ANY(public.get_toegankelijke_locatie_ids()));

CREATE POLICY "Manager en beheerder schrijven groepen" ON public.groepen
  FOR ALL TO authenticated
  USING (public.has_any_role('beheerder', 'vestigingsmanager'))
  WITH CHECK (public.has_any_role('beheerder', 'vestigingsmanager'));

-- ───────────────────────────────────────────
-- KINDEREN
-- ───────────────────────────────────────────

CREATE POLICY "Lees kinderen van eigen organisatie" ON public.kinderen
  FOR SELECT TO authenticated
  USING (organisatie_id = public.get_organisatie_id());

CREATE POLICY "Klantadviseur en hoger schrijven kinderen" ON public.kinderen
  FOR ALL TO authenticated
  USING (public.has_any_role('beheerder', 'vestigingsmanager', 'klantadviseur'))
  WITH CHECK (public.has_any_role('beheerder', 'vestigingsmanager', 'klantadviseur'));

-- ───────────────────────────────────────────
-- CONTRACTEN
-- ───────────────────────────────────────────

CREATE POLICY "Lees contracten van eigen locaties" ON public.contracten
  FOR SELECT TO authenticated
  USING (locatie_id = ANY(public.get_toegankelijke_locatie_ids()));

CREATE POLICY "Klantadviseur en hoger schrijven contracten" ON public.contracten
  FOR ALL TO authenticated
  USING (public.has_any_role('beheerder', 'vestigingsmanager', 'klantadviseur'))
  WITH CHECK (public.has_any_role('beheerder', 'vestigingsmanager', 'klantadviseur'));

-- ───────────────────────────────────────────
-- FLEX DAGEN
-- ───────────────────────────────────────────

CREATE POLICY "Lees flex_dagen van eigen locaties" ON public.flex_dagen
  FOR SELECT TO authenticated
  USING (groep_id IN (
    SELECT id FROM public.groepen
    WHERE locatie_id = ANY(public.get_toegankelijke_locatie_ids())
  ));

CREATE POLICY "Klantadviseur en hoger schrijven flex_dagen" ON public.flex_dagen
  FOR ALL TO authenticated
  USING (public.has_any_role('beheerder', 'vestigingsmanager', 'klantadviseur'))
  WITH CHECK (public.has_any_role('beheerder', 'vestigingsmanager', 'klantadviseur'));

-- ───────────────────────────────────────────
-- GROEPSOVERDRACHTEN
-- ───────────────────────────────────────────

CREATE POLICY "Lees overdrachten van eigen locaties" ON public.groepsoverdrachten
  FOR SELECT TO authenticated
  USING (van_groep_id IN (
    SELECT id FROM public.groepen
    WHERE locatie_id = ANY(public.get_toegankelijke_locatie_ids())
  ));

CREATE POLICY "Manager en beheerder schrijven overdrachten" ON public.groepsoverdrachten
  FOR ALL TO authenticated
  USING (public.has_any_role('beheerder', 'vestigingsmanager'))
  WITH CHECK (public.has_any_role('beheerder', 'vestigingsmanager'));

-- ───────────────────────────────────────────
-- KIND NOTITIES
-- ───────────────────────────────────────────

CREATE POLICY "Lees notities van eigen organisatie" ON public.kind_notities
  FOR SELECT TO authenticated
  USING (kind_id IN (
    SELECT id FROM public.kinderen
    WHERE organisatie_id = public.get_organisatie_id()
  ));

CREATE POLICY "Iedereen met toegang kan notities toevoegen" ON public.kind_notities
  FOR INSERT TO authenticated
  WITH CHECK (kind_id IN (
    SELECT id FROM public.kinderen
    WHERE organisatie_id = public.get_organisatie_id()
  ));

-- ───────────────────────────────────────────
-- CAPACITEIT OVERRIDES
-- ───────────────────────────────────────────

CREATE POLICY "Lees capaciteit_overrides van eigen locaties" ON public.capaciteit_overrides
  FOR SELECT TO authenticated
  USING (groep_id IN (
    SELECT id FROM public.groepen
    WHERE locatie_id = ANY(public.get_toegankelijke_locatie_ids())
  ));

CREATE POLICY "Manager en beheerder schrijven capaciteit_overrides" ON public.capaciteit_overrides
  FOR ALL TO authenticated
  USING (public.has_any_role('beheerder', 'vestigingsmanager'))
  WITH CHECK (public.has_any_role('beheerder', 'vestigingsmanager'));

-- ───────────────────────────────────────────
-- PROFILES
-- ───────────────────────────────────────────

CREATE POLICY "Gebruiker ziet eigen profiel" ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.has_role('beheerder'));

CREATE POLICY "Gebruiker update eigen profiel" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.has_role('beheerder'));

CREATE POLICY "Beheerder maakt profielen aan" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role('beheerder') OR id = auth.uid());

-- ───────────────────────────────────────────
-- USER ROLES & LOCATIE TOEGANG
-- ───────────────────────────────────────────

CREATE POLICY "Gebruiker ziet eigen rollen" ON public.user_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role('beheerder'));

CREATE POLICY "Beheerder beheert rollen" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role('beheerder'))
  WITH CHECK (public.has_role('beheerder'));

CREATE POLICY "Gebruiker ziet eigen locatietoegang" ON public.user_locatie_toegang
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role('beheerder'));

CREATE POLICY "Beheerder beheert locatietoegang" ON public.user_locatie_toegang
  FOR ALL TO authenticated
  USING (public.has_role('beheerder'))
  WITH CHECK (public.has_role('beheerder'));

-- ───────────────────────────────────────────
-- AUDIT LOGS
-- ───────────────────────────────────────────

CREATE POLICY "Beheerder leest audit logs" ON public.audit_logs
  FOR SELECT TO authenticated
  USING (public.has_role('beheerder'));
