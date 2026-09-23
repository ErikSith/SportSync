-- Venue follows (user bookmarks a sports centre for homepage "Tvoje obľúbené")

CREATE TABLE IF NOT EXISTS venue_follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, venue_id)
);

CREATE INDEX IF NOT EXISTS venue_follows_user_idx ON venue_follows(user_id);
CREATE INDEX IF NOT EXISTS venue_follows_venue_idx ON venue_follows(venue_id);

ALTER TABLE venue_follows ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'venue_follows_select_own' AND tablename = 'venue_follows'
  ) THEN
    CREATE POLICY venue_follows_select_own ON venue_follows
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'venue_follows_insert_own' AND tablename = 'venue_follows'
  ) THEN
    CREATE POLICY venue_follows_insert_own ON venue_follows
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'venue_follows_delete_own' AND tablename = 'venue_follows'
  ) THEN
    CREATE POLICY venue_follows_delete_own ON venue_follows
      FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;
