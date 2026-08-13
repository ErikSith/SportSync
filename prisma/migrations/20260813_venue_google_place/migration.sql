-- Google Places discovery: stable place id + GPS index for map pins.
ALTER TABLE venues ADD COLUMN IF NOT EXISTS google_place_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS venues_google_place_id_key
  ON venues (google_place_id)
  WHERE google_place_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS venues_lat_lng_idx
  ON venues (latitude, longitude);
