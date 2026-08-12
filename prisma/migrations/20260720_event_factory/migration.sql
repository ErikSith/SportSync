-- AI-Driven Event Factory (VISION.md pillar 3): enrichment fields on events
-- plus a sponsors table so venue owners can attach brand sponsors to the
-- AI-generated professional event page.

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS raw_brief TEXT,
  ADD COLUMN IF NOT EXISTS photos TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS ai_enriched BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS event_sponsors (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  logo_url    TEXT,
  website_url TEXT,
  tier        TEXT NOT NULL DEFAULT 'partner',   -- 'gold' | 'silver' | 'bronze' | 'partner'
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_event_sponsors_event ON event_sponsors (event_id);