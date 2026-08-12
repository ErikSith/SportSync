-- Link crew sessions to venue/event for external booking (no in-app split pay).
ALTER TABLE sport_group_activities
  ADD COLUMN IF NOT EXISTS venue_id uuid REFERENCES venues(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS event_id uuid REFERENCES events(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS sport_group_activities_venue_id_idx ON sport_group_activities(venue_id);
CREATE INDEX IF NOT EXISTS sport_group_activities_event_id_idx ON sport_group_activities(event_id);
