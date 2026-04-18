-- ═══════════════════════════════════════════════════════════════
-- PENGUIN PLACE — Migratie 040: Storage-bucket voor e-mailbijlagen
-- ═══════════════════════════════════════════════════════════════
--
-- Private bucket voor ouder_email_bijlagen.
-- Staff downloadt via signed URL (via server action bijlageSignedUrl).
-- Pad-conventie: {org_id}/{ouder_id}/{email_id}/{uuid}.{ext}
-- RLS: staff mag lezen/schrijven als het eerste pad-segment gelijk is
-- aan de eigen organisatie_id.
-- ═══════════════════════════════════════════════════════════════


-- Bucket (idempotent)
INSERT INTO storage.buckets (id, name, public)
VALUES ('ouder_email_bijlagen', 'ouder_email_bijlagen', false)
ON CONFLICT (id) DO NOTHING;


-- Storage-policies. Eerste pad-segment moet de org_id van de staff-user zijn.
CREATE POLICY "ouder_email_bijlagen_storage_select"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'ouder_email_bijlagen'
    AND public.is_staff()
    AND split_part(name, '/', 1)::uuid = public.get_organisatie_id()
  );

CREATE POLICY "ouder_email_bijlagen_storage_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'ouder_email_bijlagen'
    AND public.is_staff()
    AND split_part(name, '/', 1)::uuid = public.get_organisatie_id()
  );

CREATE POLICY "ouder_email_bijlagen_storage_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'ouder_email_bijlagen'
    AND public.is_staff()
    AND split_part(name, '/', 1)::uuid = public.get_organisatie_id()
  );

CREATE POLICY "ouder_email_bijlagen_storage_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'ouder_email_bijlagen'
    AND public.is_staff()
    AND split_part(name, '/', 1)::uuid = public.get_organisatie_id()
  );
