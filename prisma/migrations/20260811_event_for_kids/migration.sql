-- Kids audience flag for event discovery ("Pre deti")
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS for_kids BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS events_for_kids_idx ON events (for_kids)
  WHERE for_kids = true;

COMMENT ON COLUMN events.for_kids IS 'True when the activity is oriented toward children (Kidstown, pre deti, etc.)';
