-- AI Event Factory: structured extraction fields + dynamic theme (VISION.md pillar 3).
-- Adds a SportType enum and structured columns to `events` so the AI parser can
-- persist precise pricing/timing/sport-family data and a per-event visual theme.

-- 1. SportType enum (sport "family" driving the dynamic, sport-specific UI).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SportType') THEN
    CREATE TYPE "SportType" AS ENUM ('PADEL', 'TENNIS', 'FOOTBALL', 'BASKETBALL', 'ATLETIKA', 'OTHER');
  END IF;
END$$;

-- 2. New structured columns on events.
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS sport_type "SportType" NOT NULL DEFAULT 'OTHER',
  ADD COLUMN IF NOT EXISTS price_cents INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'EUR',
  ADD COLUMN IF NOT EXISTS event_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS start_time TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS end_time TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS max_participants INTEGER,
  ADD COLUMN IF NOT EXISTS entry_requirements TEXT,
  ADD COLUMN IF NOT EXISTS theme_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS sponsors_json JSONB NOT NULL DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_events_sport_type ON events (sport_type);