-- Public profile avatar/cover uploads for ProfileEditSheet.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'profile-media',
  'profile-media',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'profile_media_select' AND tablename = 'objects') THEN
    CREATE POLICY profile_media_select ON storage.objects
      FOR SELECT USING (bucket_id = 'profile-media');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'profile_media_insert_own' AND tablename = 'objects') THEN
    CREATE POLICY profile_media_insert_own ON storage.objects
      FOR INSERT WITH CHECK (
        bucket_id = 'profile-media'
        AND auth.uid()::text = (storage.foldername(name))[1]
      );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'profile_media_update_own' AND tablename = 'objects') THEN
    CREATE POLICY profile_media_update_own ON storage.objects
      FOR UPDATE USING (
        bucket_id = 'profile-media'
        AND auth.uid()::text = (storage.foldername(name))[1]
      )
      WITH CHECK (
        bucket_id = 'profile-media'
        AND auth.uid()::text = (storage.foldername(name))[1]
      );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'profile_media_delete_own' AND tablename = 'objects') THEN
    CREATE POLICY profile_media_delete_own ON storage.objects
      FOR DELETE USING (
        bucket_id = 'profile-media'
        AND auth.uid()::text = (storage.foldername(name))[1]
      );
  END IF;
END $$;
