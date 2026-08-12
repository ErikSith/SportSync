-- SportSync Cover Factory bucket: rights-safe generated covers only
-- (never third-party venue / athlete photography)
-- Public bucket: objects are reachable by direct URL; do NOT add broad SELECT
-- policies for anon/authenticated (that enables listing all files).

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'event-covers',
  'event-covers',
  true,
  5242880,
  ARRAY['image/webp', 'image/png', 'image/jpeg']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Remove listing-friendly policies if re-applied
DROP POLICY IF EXISTS "event_covers_public_read" ON storage.objects;
DROP POLICY IF EXISTS "event_covers_authenticated_read" ON storage.objects;

-- Cover Factory (service role admin client)
DROP POLICY IF EXISTS "event_covers_service_insert" ON storage.objects;
CREATE POLICY "event_covers_service_insert"
  ON storage.objects
  FOR INSERT
  TO service_role
  WITH CHECK (bucket_id = 'event-covers');

DROP POLICY IF EXISTS "event_covers_service_update" ON storage.objects;
CREATE POLICY "event_covers_service_update"
  ON storage.objects
  FOR UPDATE
  TO service_role
  USING (bucket_id = 'event-covers')
  WITH CHECK (bucket_id = 'event-covers');

DROP POLICY IF EXISTS "event_covers_service_select" ON storage.objects;
CREATE POLICY "event_covers_service_select"
  ON storage.objects
  FOR SELECT
  TO service_role
  USING (bucket_id = 'event-covers');
