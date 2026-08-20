-- Exclusive audience flags for scraped events and tournaments.
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS for_women BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS events_for_women_idx ON events (for_women)
  WHERE for_women = true;

COMMENT ON COLUMN events.for_women IS 'True when the activity is exclusively for women (pre zeny, ladies only, W4W).';

ALTER TABLE tournaments
  ADD COLUMN IF NOT EXISTS for_kids BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS for_women BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS tournaments_for_kids_idx ON tournaments (for_kids)
  WHERE for_kids = true;

CREATE INDEX IF NOT EXISTS tournaments_for_women_idx ON tournaments (for_women)
  WHERE for_women = true;

COMMENT ON COLUMN tournaments.for_kids IS 'True when the tournament is exclusively for children.';
COMMENT ON COLUMN tournaments.for_women IS 'True when the tournament is exclusively for women.';
