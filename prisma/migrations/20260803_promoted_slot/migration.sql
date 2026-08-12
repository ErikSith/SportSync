-- Paid homepage promoted slot for events & tournaments
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS is_promoted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS promoted_until timestamptz NULL,
  ADD COLUMN IF NOT EXISTS sponsor_logo_url text NULL,
  ADD COLUMN IF NOT EXISTS sponsor_name text NULL,
  ADD COLUMN IF NOT EXISTS badge_text text NULL,
  ADD COLUMN IF NOT EXISTS accent_color text NULL;

ALTER TABLE tournaments
  ADD COLUMN IF NOT EXISTS is_promoted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS promoted_until timestamptz NULL,
  ADD COLUMN IF NOT EXISTS sponsor_logo_url text NULL,
  ADD COLUMN IF NOT EXISTS sponsor_name text NULL,
  ADD COLUMN IF NOT EXISTS badge_text text NULL,
  ADD COLUMN IF NOT EXISTS accent_color text NULL;

CREATE INDEX IF NOT EXISTS events_promoted_active_idx
  ON events (is_promoted, promoted_until DESC)
  WHERE is_promoted = true;

CREATE INDEX IF NOT EXISTS tournaments_promoted_active_idx
  ON tournaments (is_promoted, promoted_until DESC)
  WHERE is_promoted = true;

COMMENT ON COLUMN events.is_promoted IS 'Paid homepage promoted slot flag.';
COMMENT ON COLUMN events.promoted_until IS 'Promotion expires after this timestamp.';
COMMENT ON COLUMN tournaments.is_promoted IS 'Paid homepage promoted slot flag.';
COMMENT ON COLUMN tournaments.promoted_until IS 'Promotion expires after this timestamp.';
