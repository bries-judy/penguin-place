-- ═══════════════════════════════════════════════════════════════
-- PENGUIN PLACE — Migratie 027: Supabase Storage voor Media
-- ═══════════════════════════════════════════════════════════════
--
-- Maakt een private Storage bucket aan voor foto's en video's.
-- Padconventie: {organisatie_id}/{kind_id}/{dagverslag_id}/{uuid}.{ext}
--
-- Storage policies:
--   - Staff: upload, lezen, verwijderen binnen eigen organisatie
--   - Ouder: alleen lezen van media van eigen kinderen
--
-- Alle media is private (geen publieke URLs).
-- Toegang via signed URLs (supabase.storage.createSignedUrl).
-- ═══════════════════════════════════════════════════════════════


-- ─────────────────────────────────────────────────────
-- 1. Bucket aanmaken
-- ─────────────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'media',
  'media',
  false,
  10485760,  -- 10 MB
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'video/mp4',
    'video/quicktime'
  ]
);


-- ─────────────────────────────────────────────────────
-- 2. Storage policies: staff
-- ─────────────────────────────────────────────────────

-- Staff kan uploaden naar eigen organisatie-folder
CREATE POLICY "staff_upload_media"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'media'
    AND public.is_staff()
    AND (storage.foldername(name))[1] = public.get_organisatie_id()::text
  );

-- Staff kan media lezen van eigen organisatie
CREATE POLICY "staff_read_media"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'media'
    AND public.is_staff()
    AND (storage.foldername(name))[1] = public.get_organisatie_id()::text
  );

-- Staff kan media verwijderen van eigen organisatie
CREATE POLICY "staff_delete_media"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'media'
    AND public.is_staff()
    AND (storage.foldername(name))[1] = public.get_organisatie_id()::text
  );


-- ─────────────────────────────────────────────────────
-- 3. Storage policies: ouder
-- ─────────────────────────────────────────────────────

-- Ouder kan media lezen van eigen kinderen
-- Pad: {organisatie_id}/{kind_id}/...
-- kind_id is het tweede pad-segment
CREATE POLICY "ouder_read_media"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'media'
    AND public.is_ouder()
    AND (storage.foldername(name))[2]::uuid = ANY(public.get_ouder_kind_ids())
  );
