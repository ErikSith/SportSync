-- Pin a crew session as a weekly sticky slot (rolls forward instead of creating new rows).
ALTER TABLE sport_group_activities
  ADD COLUMN IF NOT EXISTS is_pinned boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS sport_group_activities_group_pinned_idx
  ON sport_group_activities (group_id)
  WHERE is_pinned = true;
