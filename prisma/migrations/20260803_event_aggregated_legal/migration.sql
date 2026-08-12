-- Aggregator legal-safety fields on events
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS is_aggregated BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS source_name TEXT;

COMMENT ON COLUMN events.is_aggregated IS 'True when event was scraped/aggregated from an external source; app acts as redirector only.';
COMMENT ON COLUMN events.source_name IS 'Human-readable source label (e.g. Oficiálny web športoviska, Instagram).';

-- Backfill existing scraped events (exclude AI factory)
UPDATE events
SET is_aggregated = true
WHERE source IS NOT NULL
  AND source <> 'factory'
  AND is_aggregated = false;

UPDATE events e
SET source_name = CASE e.source
  WHEN 'sk-slovan' THEN 'Oficiálny web ŠK Slovan'
  WHEN 'hc-slovan' THEN 'Oficiálny web HC Slovan'
  WHEN 'gopass-arena' THEN 'Gopass Aréna'
  WHEN 'form-factory' THEN 'Form Factory'
  WHEN 'arena-padel' THEN 'Aurial Padel'
  WHEN 'subdeck' THEN 'Subdeck'
  WHEN 'stz' THEN 'STZ – oficiálny web'
  WHEN 'predpredaj' THEN 'Predpredaj.sk'
  WHEN 'citylife' THEN 'CityLife'
  ELSE COALESCE(e.source_name, 'Oficiálny web športoviska')
END
WHERE e.is_aggregated = true
  AND (e.source_name IS NULL OR e.source_name = '');

CREATE INDEX IF NOT EXISTS events_is_aggregated_idx ON events (is_aggregated);

-- Report incorrect event data (aggregator safety)
CREATE TABLE IF NOT EXISTS event_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  details TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS event_reports_event_id_idx ON event_reports (event_id);
CREATE INDEX IF NOT EXISTS event_reports_status_idx ON event_reports (status);
CREATE INDEX IF NOT EXISTS event_reports_created_at_idx ON event_reports (created_at DESC);

ALTER TABLE event_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS event_reports_insert_authenticated ON event_reports;
CREATE POLICY event_reports_insert_authenticated ON event_reports
  FOR INSERT TO authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

DROP POLICY IF EXISTS event_reports_select_own ON event_reports;
CREATE POLICY event_reports_select_own ON event_reports
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());
