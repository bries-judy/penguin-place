-- ═══════════════════════════════════════════════════════════════
-- Migratie 019: Fix circulaire RLS in get_toegankelijke_locatie_ids
--
-- Probleem: de functie queried public.locaties die zelf RLS heeft
-- die dezelfde functie aanroept → leeg resultaat voor nieuwe locaties.
-- Fix: herschrijf als plpgsql met row_security = off
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.get_toegankelijke_locatie_ids()
RETURNS UUID[]
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  _uid UUID := auth.uid();
  _org_id UUID;
  _result UUID[];
BEGIN
  IF _uid IS NULL THEN
    RETURN '{}';
  END IF;

  -- Haal organisatie_id op
  SELECT organisatie_id INTO _org_id
  FROM public.profiles
  WHERE id = _uid;

  IF _org_id IS NULL THEN
    RETURN '{}';
  END IF;

  -- Check of user alle locaties mag zien
  IF EXISTS (
    SELECT 1 FROM public.user_locatie_toegang
    WHERE user_id = _uid AND alle_locaties = true
  ) THEN
    SELECT COALESCE(array_agg(id), '{}') INTO _result
    FROM public.locaties
    WHERE organisatie_id = _org_id;
  ELSE
    SELECT COALESCE(array_agg(locatie_id), '{}') INTO _result
    FROM public.user_locatie_toegang
    WHERE user_id = _uid AND locatie_id IS NOT NULL;
  END IF;

  RETURN _result;
END;
$$;
