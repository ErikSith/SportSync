-- Profile extensions + friendships

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS cover_url TEXT,
  ADD COLUMN IF NOT EXISTS preferred_sports TEXT[] NOT NULL DEFAULT '{}';

CREATE TABLE IF NOT EXISTS friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  addressee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT friendships_no_self CHECK (requester_id != addressee_id),
  CONSTRAINT friendships_status_check CHECK (status IN ('pending', 'accepted', 'declined')),
  UNIQUE (requester_id, addressee_id)
);

CREATE INDEX IF NOT EXISTS friendships_requester_idx ON friendships(requester_id);
CREATE INDEX IF NOT EXISTS friendships_addressee_idx ON friendships(addressee_id);
CREATE INDEX IF NOT EXISTS friendships_status_idx ON friendships(status);

ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'friendships_select_participant' AND tablename = 'friendships') THEN
    CREATE POLICY friendships_select_participant ON friendships
      FOR SELECT USING (auth.uid() = requester_id OR auth.uid() = addressee_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'friendships_insert_requester' AND tablename = 'friendships') THEN
    CREATE POLICY friendships_insert_requester ON friendships
      FOR INSERT WITH CHECK (auth.uid() = requester_id AND status = 'pending');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'friendships_update_participant' AND tablename = 'friendships') THEN
    CREATE POLICY friendships_update_participant ON friendships
      FOR UPDATE USING (auth.uid() = requester_id OR auth.uid() = addressee_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'friendships_delete_participant' AND tablename = 'friendships') THEN
    CREATE POLICY friendships_delete_participant ON friendships
      FOR DELETE USING (auth.uid() = requester_id OR auth.uid() = addressee_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'profiles_select_authenticated' AND tablename = 'profiles') THEN
    CREATE POLICY profiles_select_authenticated ON profiles
      FOR SELECT USING (auth.role() = 'authenticated');
  END IF;
END $$;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'profile-media',
  'profile-media',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

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
