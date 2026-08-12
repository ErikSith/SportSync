-- Add locality fields to tournaments table for 20km feed support
-- without requiring a venue reference.

ALTER TABLE tournaments
  ADD COLUMN IF NOT EXISTS city      TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS latitude  DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

CREATE INDEX IF NOT EXISTS tournaments_lat_lng_idx ON tournaments (latitude, longitude);