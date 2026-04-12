-- ============================================================
-- Migratie: Gebruikers, Rollen en Rechten
-- ============================================================

-- ─── Tabel: rollen ───────────────────────────────────────────────────────────

CREATE TABLE rollen (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisatie_id  uuid NOT NULL REFERENCES organisaties(id),
  naam            text NOT NULL,
  omschrijving    text,
  kleur           text DEFAULT '#6366F1',
  is_systeem_rol  boolean DEFAULT false,
  created_at      timestamptz DEFAULT now(),
  deleted_at      timestamptz,
  UNIQUE(organisatie_id, naam)
);

-- ─── Tabel: modules ──────────────────────────────────────────────────────────

CREATE TABLE modules (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sleutel      text UNIQUE NOT NULL,
  naam         text NOT NULL,
  omschrijving text,
  icoon        text,
  volgorde     int DEFAULT 0
);

-- ─── Tabel: rol_rechten ──────────────────────────────────────────────────────

CREATE TABLE rol_rechten (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rol_id           uuid NOT NULL REFERENCES rollen(id) ON DELETE CASCADE,
  module_sleutel   text NOT NULL REFERENCES modules(sleutel),
  kan_lezen        boolean DEFAULT false,
  kan_aanmaken     boolean DEFAULT false,
  kan_wijzigen     boolean DEFAULT false,
  kan_verwijderen  boolean DEFAULT false,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now(),
  UNIQUE(rol_id, module_sleutel)
);

-- ─── Tabel: profiel_rollen ───────────────────────────────────────────────────
-- Koppelt een profiel (auth user) aan een rol via rol_naam (text, geen FK),
-- zodat de bestaande has_role() RLS helpers via user_roles blijven werken.

CREATE TABLE profiel_rollen (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profiel_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rol_naam       text NOT NULL,
  organisatie_id uuid NOT NULL REFERENCES organisaties(id),
  created_at     timestamptz DEFAULT now(),
  deleted_at     timestamptz,
  UNIQUE(profiel_id, rol_naam, organisatie_id)
);

-- ─── Tabel: profiel_locaties ─────────────────────────────────────────────────
-- Koppelt een profiel aan specifieke locaties.
-- Complement op user_locatie_toegang (bestaand) — actions houden beide in sync.

CREATE TABLE profiel_locaties (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profiel_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  locatie_id     uuid NOT NULL REFERENCES locaties(id) ON DELETE CASCADE,
  organisatie_id uuid NOT NULL REFERENCES organisaties(id),
  created_at     timestamptz DEFAULT now(),
  deleted_at     timestamptz,
  UNIQUE(profiel_id, locatie_id)
);

-- ─── RLS: rollen ─────────────────────────────────────────────────────────────

ALTER TABLE rollen ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rollen_select" ON rollen
  FOR SELECT USING (organisatie_id = get_organisatie_id() AND deleted_at IS NULL);

CREATE POLICY "rollen_insert" ON rollen
  FOR INSERT WITH CHECK (organisatie_id = get_organisatie_id() AND has_role('beheerder'));

CREATE POLICY "rollen_update" ON rollen
  FOR UPDATE USING (organisatie_id = get_organisatie_id() AND has_role('beheerder'));

-- ─── RLS: modules ────────────────────────────────────────────────────────────

ALTER TABLE modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "modules_select" ON modules
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- ─── RLS: rol_rechten ────────────────────────────────────────────────────────

ALTER TABLE rol_rechten ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rol_rechten_select" ON rol_rechten
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM rollen r
      WHERE r.id = rol_rechten.rol_id
        AND r.organisatie_id = get_organisatie_id()
        AND r.deleted_at IS NULL
    )
  );

CREATE POLICY "rol_rechten_write" ON rol_rechten
  FOR ALL USING (has_role('beheerder'))
  WITH CHECK (has_role('beheerder'));

-- ─── RLS: profiel_rollen ─────────────────────────────────────────────────────

ALTER TABLE profiel_rollen ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiel_rollen_select" ON profiel_rollen
  FOR SELECT USING (
    organisatie_id = get_organisatie_id()
    AND deleted_at IS NULL
    AND (
      profiel_id = auth.uid()
      OR has_any_role(VARIADIC ARRAY['beheerder', 'directie']::app_role[])
    )
  );

CREATE POLICY "profiel_rollen_write" ON profiel_rollen
  FOR ALL USING (organisatie_id = get_organisatie_id() AND has_role('beheerder'))
  WITH CHECK (organisatie_id = get_organisatie_id() AND has_role('beheerder'));

-- ─── RLS: profiel_locaties ───────────────────────────────────────────────────

ALTER TABLE profiel_locaties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiel_locaties_select" ON profiel_locaties
  FOR SELECT USING (
    organisatie_id = get_organisatie_id()
    AND deleted_at IS NULL
    AND (
      profiel_id = auth.uid()
      OR has_any_role(VARIADIC ARRAY['beheerder', 'directie', 'vestigingsmanager']::app_role[])
    )
  );

CREATE POLICY "profiel_locaties_write" ON profiel_locaties
  FOR ALL USING (organisatie_id = get_organisatie_id() AND has_role('beheerder'))
  WITH CHECK (organisatie_id = get_organisatie_id() AND has_role('beheerder'));

-- ─── Seed: modules ───────────────────────────────────────────────────────────

INSERT INTO modules (sleutel, naam, omschrijving, icoon, volgorde) VALUES
  ('kinderen',     'Kinderen',         'Kindprofielen en inschrijvingen',  'Baby',        1),
  ('locaties',     'Locaties',         'Vestigingen en opvanglocaties',    'MapPin',      2),
  ('groepen',      'Groepen',          'Opvanggroepen per locatie',        'Users',       3),
  ('medewerkers',  'Medewerkers',      'Personeelsbeheer',                 'UserCheck',   4),
  ('planning',     'Planning',         'Rooster en bezettingsplanning',    'Calendar',    5),
  ('facturatie',   'Facturatie',       'Facturen en betalingen',           'Receipt',     6),
  ('rapportages',  'Rapportages',      'Overzichten en statistieken',      'BarChart2',   7),
  ('instellingen', 'Instellingen',     'Organisatie-instellingen',         'Settings',    8),
  ('gebruikers',   'Gebruikersbeheer', 'Gebruikers, rollen en rechten',    'ShieldCheck', 9)
ON CONFLICT (sleutel) DO NOTHING;

-- ─── Seed: standaardrollen + rechtenmatrix ───────────────────────────────────

DO $$
DECLARE
  org_id                  uuid;
  rol_klantadviseur_id    uuid;
  rol_vestigingsmanager_id uuid;
  rol_personeelsplanner_id uuid;
  rol_regiomanager_id     uuid;
  rol_directie_id         uuid;
  rol_beheerder_id        uuid;
BEGIN
  SELECT id INTO org_id FROM organisaties LIMIT 1;

  IF org_id IS NULL THEN
    RAISE NOTICE 'Geen organisatie gevonden — seed van rollen overgeslagen';
    RETURN;
  END IF;

  INSERT INTO rollen (organisatie_id, naam, omschrijving, kleur, is_systeem_rol) VALUES
    (org_id, 'klantadviseur',      'CRM en kindintake',              '#3B82F6', true),
    (org_id, 'vestigingsmanager',  'Beheer van één vestiging',       '#8B5CF6', true),
    (org_id, 'personeelsplanner',  'Rooster en personeelsbeheer',    '#10B981', true),
    (org_id, 'regiomanager',       'Overzicht meerdere vestigingen', '#F59E0B', true),
    (org_id, 'directie',           'Strategisch overzicht',          '#EF4444', true),
    (org_id, 'beheerder',          'Volledige systeemtoegang',       '#1F2937', true)
  ON CONFLICT (organisatie_id, naam) DO NOTHING;

  SELECT id INTO rol_klantadviseur_id     FROM rollen WHERE organisatie_id = org_id AND naam = 'klantadviseur';
  SELECT id INTO rol_vestigingsmanager_id FROM rollen WHERE organisatie_id = org_id AND naam = 'vestigingsmanager';
  SELECT id INTO rol_personeelsplanner_id FROM rollen WHERE organisatie_id = org_id AND naam = 'personeelsplanner';
  SELECT id INTO rol_regiomanager_id      FROM rollen WHERE organisatie_id = org_id AND naam = 'regiomanager';
  SELECT id INTO rol_directie_id          FROM rollen WHERE organisatie_id = org_id AND naam = 'directie';
  SELECT id INTO rol_beheerder_id         FROM rollen WHERE organisatie_id = org_id AND naam = 'beheerder';

  INSERT INTO rol_rechten (rol_id, module_sleutel, kan_lezen, kan_aanmaken, kan_wijzigen, kan_verwijderen) VALUES
    -- klantadviseur
    (rol_klantadviseur_id, 'kinderen',    true,  true,  true,  true),
    (rol_klantadviseur_id, 'locaties',    true,  false, false, false),
    (rol_klantadviseur_id, 'groepen',     true,  false, true,  false),
    (rol_klantadviseur_id, 'medewerkers', true,  false, false, false),
    (rol_klantadviseur_id, 'planning',    true,  false, false, false),
    (rol_klantadviseur_id, 'facturatie',  true,  true,  true,  true),
    (rol_klantadviseur_id, 'rapportages', true,  false, false, false),
    -- vestigingsmanager
    (rol_vestigingsmanager_id, 'kinderen',    true,  true,  true,  true),
    (rol_vestigingsmanager_id, 'locaties',    true,  false, true,  false),
    (rol_vestigingsmanager_id, 'groepen',     true,  true,  true,  true),
    (rol_vestigingsmanager_id, 'medewerkers', true,  false, true,  false),
    (rol_vestigingsmanager_id, 'planning',    true,  false, false, false),
    (rol_vestigingsmanager_id, 'facturatie',  true,  false, false, false),
    (rol_vestigingsmanager_id, 'rapportages', true,  false, false, false),
    -- personeelsplanner
    (rol_personeelsplanner_id, 'kinderen',    true,  false, false, false),
    (rol_personeelsplanner_id, 'locaties',    true,  false, false, false),
    (rol_personeelsplanner_id, 'groepen',     true,  false, false, false),
    (rol_personeelsplanner_id, 'medewerkers', true,  true,  true,  true),
    (rol_personeelsplanner_id, 'planning',    true,  true,  true,  true),
    (rol_personeelsplanner_id, 'rapportages', true,  false, false, false),
    -- regiomanager
    (rol_regiomanager_id, 'kinderen',    true,  false, false, false),
    (rol_regiomanager_id, 'locaties',    true,  false, true,  false),
    (rol_regiomanager_id, 'groepen',     true,  false, false, false),
    (rol_regiomanager_id, 'medewerkers', true,  false, false, false),
    (rol_regiomanager_id, 'planning',    true,  false, false, false),
    (rol_regiomanager_id, 'facturatie',  true,  false, false, false),
    (rol_regiomanager_id, 'rapportages', true,  true,  true,  true),
    -- directie
    (rol_directie_id, 'kinderen',     true,  false, false, false),
    (rol_directie_id, 'locaties',     true,  false, false, false),
    (rol_directie_id, 'groepen',      true,  false, false, false),
    (rol_directie_id, 'medewerkers',  true,  false, false, false),
    (rol_directie_id, 'planning',     true,  false, false, false),
    (rol_directie_id, 'facturatie',   true,  false, false, false),
    (rol_directie_id, 'rapportages',  true,  true,  true,  true),
    (rol_directie_id, 'instellingen', true,  false, false, false),
    (rol_directie_id, 'gebruikers',   true,  false, false, false),
    -- beheerder (volledige toegang)
    (rol_beheerder_id, 'kinderen',     true,  true,  true,  true),
    (rol_beheerder_id, 'locaties',     true,  true,  true,  true),
    (rol_beheerder_id, 'groepen',      true,  true,  true,  true),
    (rol_beheerder_id, 'medewerkers',  true,  true,  true,  true),
    (rol_beheerder_id, 'planning',     true,  true,  true,  true),
    (rol_beheerder_id, 'facturatie',   true,  true,  true,  true),
    (rol_beheerder_id, 'rapportages',  true,  true,  true,  true),
    (rol_beheerder_id, 'instellingen', true,  true,  true,  true),
    (rol_beheerder_id, 'gebruikers',   true,  true,  true,  true)
  ON CONFLICT (rol_id, module_sleutel) DO NOTHING;
END $$;
