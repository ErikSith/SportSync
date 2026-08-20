-- Profile edit fields used by PATCH /api/profile + ProfileEditSheet.
-- Applied remotely when columns were missing from production.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS cover_url TEXT,
  ADD COLUMN IF NOT EXISTS preferred_sports TEXT[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS mercenary_sports TEXT[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS sport_skills jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_profiles_mercenary_sports ON profiles USING GIN (mercenary_sports);
CREATE INDEX IF NOT EXISTS idx_profiles_preferred_sports ON profiles USING GIN (preferred_sports);
