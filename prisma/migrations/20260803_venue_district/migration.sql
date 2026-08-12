-- Bratislava borough slug on venues for DB-backed area filters.
ALTER TABLE venues ADD COLUMN IF NOT EXISTS district TEXT;

CREATE INDEX IF NOT EXISTS venues_district_idx ON venues (district);
CREATE INDEX IF NOT EXISTS venues_city_district_idx ON venues (city, district);
