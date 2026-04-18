-- ═══════════════════════════════════════════════════════════════
-- PENGUIN PLACE — Migratie 026: RLS Policies voor Ouders
-- ═══════════════════════════════════════════════════════════════
--
-- Twee soorten policies:
--
-- A) RLS op NIEUWE tabellen (024 + 025):
--    ouder_profielen, ouder_kind, dagverslagen, dagverslag_media
--
-- B) ADDITIEVE SELECT-policies op BESTAANDE tabellen:
--    Ouders krijgen leestoegang tot data van eigen kinderen.
--    PostgreSQL evalueert same-operation policies met OR:
--    als de bestaande staff-policy OF de nieuwe ouder-policy
--    slaagt, is de rij zichtbaar. Geen bestaande policies
--    worden gewijzigd.
--
-- Alle ouder-policies filteren via get_ouder_kind_ids()
-- (de ouder_kind koppeltabel als autorisatie-spine).
-- ═══════════════════════════════════════════════════════════════


-- ─────────────────────────────────────────────────────
-- A1. OUDER_PROFIELEN
-- ─────────────────────────────────────────────────────

ALTER TABLE public.ouder_profielen ENABLE ROW LEVEL SECURITY;

-- Ouder leest eigen profiel
CREATE POLICY "ouder_profielen_select_eigen"
  ON public.ouder_profielen FOR SELECT TO authenticated
  USING (id = auth.uid());

-- Staff leest ouder-profielen van eigen organisatie
CREATE POLICY "ouder_profielen_select_staff"
  ON public.ouder_profielen FOR SELECT TO authenticated
  USING (
    organisatie_id = public.get_organisatie_id()
    AND public.has_any_role('beheerder', 'vestigingsmanager', 'klantadviseur')
  );

-- Ouder update eigen profiel
CREATE POLICY "ouder_profielen_update_eigen"
  ON public.ouder_profielen FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Staff beheert ouder-profielen (insert/update/delete)
CREATE POLICY "ouder_profielen_write_staff"
  ON public.ouder_profielen FOR ALL TO authenticated
  USING (
    organisatie_id = public.get_organisatie_id()
    AND public.has_any_role('beheerder', 'vestigingsmanager', 'klantadviseur')
  )
  WITH CHECK (
    organisatie_id = public.get_organisatie_id()
    AND public.has_any_role('beheerder', 'vestigingsmanager', 'klantadviseur')
  );


-- ─────────────────────────────────────────────────────
-- A2. OUDER_KIND
-- ─────────────────────────────────────────────────────

ALTER TABLE public.ouder_kind ENABLE ROW LEVEL SECURITY;

-- Ouder leest eigen koppelingen
CREATE POLICY "ouder_kind_select_eigen"
  ON public.ouder_kind FOR SELECT TO authenticated
  USING (ouder_id = auth.uid());

-- Staff leest koppelingen voor kinderen van eigen organisatie
CREATE POLICY "ouder_kind_select_staff"
  ON public.ouder_kind FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.kinderen k
      WHERE k.id = kind_id
        AND k.organisatie_id = public.get_organisatie_id()
    )
    AND public.has_any_role('beheerder', 'vestigingsmanager', 'klantadviseur')
  );

-- Staff beheert koppelingen
CREATE POLICY "ouder_kind_write_staff"
  ON public.ouder_kind FOR ALL TO authenticated
  USING (
    public.has_any_role('beheerder', 'vestigingsmanager', 'klantadviseur')
  )
  WITH CHECK (
    public.has_any_role('beheerder', 'vestigingsmanager', 'klantadviseur')
  );


-- ─────────────────────────────────────────────────────
-- A3. DAGVERSLAGEN
-- ─────────────────────────────────────────────────────

ALTER TABLE public.dagverslagen ENABLE ROW LEVEL SECURITY;

-- Staff leest dagverslagen van eigen organisatie
CREATE POLICY "dagverslagen_select_staff"
  ON public.dagverslagen FOR SELECT TO authenticated
  USING (
    organisatie_id = public.get_organisatie_id()
    AND deleted_at IS NULL
  );

-- Staff schrijft dagverslagen
CREATE POLICY "dagverslagen_write_staff"
  ON public.dagverslagen FOR ALL TO authenticated
  USING (
    organisatie_id = public.get_organisatie_id()
    AND public.has_any_role('beheerder', 'vestigingsmanager', 'klantadviseur')
  )
  WITH CHECK (
    organisatie_id = public.get_organisatie_id()
  );

-- Ouder leest gepubliceerde dagverslagen van eigen kinderen
CREATE POLICY "dagverslagen_select_ouder"
  ON public.dagverslagen FOR SELECT TO authenticated
  USING (
    kind_id = ANY(public.get_ouder_kind_ids())
    AND gepubliceerd = true
    AND deleted_at IS NULL
  );


-- ─────────────────────────────────────────────────────
-- A4. DAGVERSLAG_MEDIA
-- ─────────────────────────────────────────────────────

ALTER TABLE public.dagverslag_media ENABLE ROW LEVEL SECURITY;

-- Staff leest media via dagverslag organisatie
CREATE POLICY "dagverslag_media_select_staff"
  ON public.dagverslag_media FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.dagverslagen d
      WHERE d.id = dagverslag_id
        AND d.organisatie_id = public.get_organisatie_id()
        AND d.deleted_at IS NULL
    )
  );

-- Staff schrijft media
CREATE POLICY "dagverslag_media_write_staff"
  ON public.dagverslag_media FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.dagverslagen d
      WHERE d.id = dagverslag_id
        AND d.organisatie_id = public.get_organisatie_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.dagverslagen d
      WHERE d.id = dagverslag_id
        AND d.organisatie_id = public.get_organisatie_id()
    )
  );

-- Ouder leest media van gepubliceerde dagverslagen van eigen kinderen
CREATE POLICY "dagverslag_media_select_ouder"
  ON public.dagverslag_media FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.dagverslagen d
      WHERE d.id = dagverslag_id
        AND d.kind_id = ANY(public.get_ouder_kind_ids())
        AND d.gepubliceerd = true
        AND d.deleted_at IS NULL
    )
  );


-- ═══════════════════════════════════════════════════════════════
-- B. ADDITIEVE SELECT-POLICIES OP BESTAANDE TABELLEN
-- ═══════════════════════════════════════════════════════════════
--
-- Deze policies zijn puur additief: ze voegen een extra
-- SELECT-pad toe naast de bestaande staff-policies.
-- Ouders krijgen hiermee read-only toegang tot data
-- van hun eigen kinderen.
-- ═══════════════════════════════════════════════════════════════


-- ─────────────────────────────────────────────────────
-- B1. KINDEREN — ouder ziet eigen kinderen
-- ─────────────────────────────────────────────────────

CREATE POLICY "ouder_leest_eigen_kinderen"
  ON public.kinderen FOR SELECT TO authenticated
  USING (id = ANY(public.get_ouder_kind_ids()));


-- ─────────────────────────────────────────────────────
-- B2. GROEPEN — ouder ziet groepen van eigen kinderen
-- ─────────────────────────────────────────────────────

CREATE POLICY "ouder_leest_eigen_groepen"
  ON public.groepen FOR SELECT TO authenticated
  USING (
    id IN (
      SELECT p.groep_id FROM public.placements p
      WHERE p.kind_id = ANY(public.get_ouder_kind_ids())
        AND (p.einddatum IS NULL OR p.einddatum >= CURRENT_DATE)
    )
  );


-- ─────────────────────────────────────────────────────
-- B3. LOCATIES — ouder ziet locaties van eigen kinderen
-- ─────────────────────────────────────────────────────

CREATE POLICY "ouder_leest_eigen_locaties"
  ON public.locaties FOR SELECT TO authenticated
  USING (
    id IN (
      SELECT c.locatie_id FROM public.contracten c
      WHERE c.kind_id = ANY(public.get_ouder_kind_ids())
        AND c.status = 'actief'
    )
  );


-- ─────────────────────────────────────────────────────
-- B4. CONTRACTEN — ouder ziet contracten van eigen kinderen
-- ─────────────────────────────────────────────────────

CREATE POLICY "ouder_leest_eigen_contracten"
  ON public.contracten FOR SELECT TO authenticated
  USING (kind_id = ANY(public.get_ouder_kind_ids()));


-- ─────────────────────────────────────────────────────
-- B5. PLACEMENTS — ouder ziet placements van eigen kinderen
-- ─────────────────────────────────────────────────────

CREATE POLICY "ouder_leest_eigen_placements"
  ON public.placements FOR SELECT TO authenticated
  USING (kind_id = ANY(public.get_ouder_kind_ids()));


-- ─────────────────────────────────────────────────────
-- B6. PLANNED_ATTENDANCE — ouder ziet planning van eigen kinderen
-- ─────────────────────────────────────────────────────

CREATE POLICY "ouder_leest_eigen_planning"
  ON public.planned_attendance FOR SELECT TO authenticated
  USING (kind_id = ANY(public.get_ouder_kind_ids()));


-- ─────────────────────────────────────────────────────
-- B7. CONTACTPERSONEN — ouder ziet contactpersonen van eigen kinderen
-- ─────────────────────────────────────────────────────

CREATE POLICY "ouder_leest_eigen_contactpersonen"
  ON public.contactpersonen FOR SELECT TO authenticated
  USING (kind_id = ANY(public.get_ouder_kind_ids()));
