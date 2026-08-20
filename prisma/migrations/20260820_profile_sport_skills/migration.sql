-- Per-sport skill levels (1–4) for profile "Moje Športy" bars.
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS sport_skills jsonb NOT NULL DEFAULT '{}'::jsonb;
