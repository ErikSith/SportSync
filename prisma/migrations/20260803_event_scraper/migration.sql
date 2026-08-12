-- Event aggregator scrape metadata + spectator vs participate
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS source TEXT,
  ADD COLUMN IF NOT EXISTS external_id TEXT,
  ADD COLUMN IF NOT EXISTS source_url TEXT,
  ADD COLUMN IF NOT EXISTS ticket_url TEXT,
  ADD COLUMN IF NOT EXISTS scraped_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS participation_mode TEXT NOT NULL DEFAULT 'participate';

ALTER TABLE venues
  ADD COLUMN IF NOT EXISTS website_url TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS events_source_external_id_uidx
  ON events (source, external_id)
  WHERE source IS NOT NULL AND external_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS events_city_starts_at_idx ON events (city, starts_at);
CREATE INDEX IF NOT EXISTS events_participation_mode_idx ON events (participation_mode);

COMMENT ON COLUMN events.participation_mode IS 'spectator = watch only; participate = join/book/register';
