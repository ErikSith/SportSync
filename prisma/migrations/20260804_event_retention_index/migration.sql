-- Speeds hard-delete retention scans: is_aggregated = true AND starts_at < threshold
CREATE INDEX IF NOT EXISTS events_aggregated_starts_at_idx
  ON events (starts_at)
  WHERE is_aggregated = true;
