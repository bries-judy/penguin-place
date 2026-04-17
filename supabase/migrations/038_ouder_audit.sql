-- ═══════════════════════════════════════════════════════════════
-- PENGUIN PLACE — Migratie 038: Ouder Audit-Trail
-- ═══════════════════════════════════════════════════════════════
--
-- Introduceert: ouder_audit tabel + trigger op ouder_profielen
-- Doel: AVG-verantwoording — wie wijzigde welk veld, wanneer.
--
-- RLS: alleen beheerder / vestigingsmanager mag auditlog lezen.
--      Inserts gebeuren door de trigger (SECURITY DEFINER).
-- ═══════════════════════════════════════════════════════════════


-- ─────────────────────────────────────────────────────
-- 1. Tabel
-- ─────────────────────────────────────────────────────

CREATE TABLE public.ouder_audit (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ouder_id      UUID NOT NULL REFERENCES public.ouder_profielen(id) ON DELETE CASCADE,
  staff_id      UUID REFERENCES public.profiles(id),
  veld          TEXT NOT NULL,
  oude_waarde   TEXT,
  nieuwe_waarde TEXT,
  at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ouder_audit_ouder ON public.ouder_audit(ouder_id, at DESC);


-- ─────────────────────────────────────────────────────
-- 2. RLS
-- ─────────────────────────────────────────────────────

ALTER TABLE public.ouder_audit ENABLE ROW LEVEL SECURITY;

-- Alleen beheerder of vestigingsmanager mag het auditlog lezen.
CREATE POLICY "ouder_audit_select"
  ON public.ouder_audit FOR SELECT TO authenticated
  USING (
    public.is_staff()
    AND public.has_any_role('beheerder', 'vestigingsmanager')
  );


-- ─────────────────────────────────────────────────────
-- 3. Trigger: log wijzigingen op ouder_profielen
-- ─────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.log_ouder_profiel_wijziging()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF OLD.voornaam IS DISTINCT FROM NEW.voornaam THEN
    INSERT INTO public.ouder_audit(ouder_id, staff_id, veld, oude_waarde, nieuwe_waarde)
    VALUES (NEW.id, auth.uid(), 'voornaam', OLD.voornaam, NEW.voornaam);
  END IF;

  IF OLD.achternaam IS DISTINCT FROM NEW.achternaam THEN
    INSERT INTO public.ouder_audit(ouder_id, staff_id, veld, oude_waarde, nieuwe_waarde)
    VALUES (NEW.id, auth.uid(), 'achternaam', OLD.achternaam, NEW.achternaam);
  END IF;

  IF OLD.email IS DISTINCT FROM NEW.email THEN
    INSERT INTO public.ouder_audit(ouder_id, staff_id, veld, oude_waarde, nieuwe_waarde)
    VALUES (NEW.id, auth.uid(), 'email', OLD.email, NEW.email);
  END IF;

  IF OLD.telefoon_mobiel IS DISTINCT FROM NEW.telefoon_mobiel THEN
    INSERT INTO public.ouder_audit(ouder_id, staff_id, veld, oude_waarde, nieuwe_waarde)
    VALUES (NEW.id, auth.uid(), 'telefoon_mobiel', OLD.telefoon_mobiel, NEW.telefoon_mobiel);
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER ouder_profiel_audit
  AFTER UPDATE ON public.ouder_profielen
  FOR EACH ROW EXECUTE FUNCTION public.log_ouder_profiel_wijziging();
