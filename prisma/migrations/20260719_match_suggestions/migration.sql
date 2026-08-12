-- Auto-generated match suggestions linking players to events/tournaments/lobbies.
-- Created by the auto-match engine after any domain event insert.

CREATE TABLE IF NOT EXISTS match_suggestions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  context_type TEXT NOT NULL,           -- 'event' | 'tournament' | 'lobby'
  context_id  UUID NOT NULL,            -- FK to the suggested entity
  title       TEXT NOT NULL,
  sport       TEXT NOT NULL,
  city        TEXT NOT NULL,
  distance_km DOUBLE PRECISION,
  reason      TEXT NOT NULL DEFAULT 'nearby',
  status      TEXT NOT NULL DEFAULT 'pending',  -- 'pending' | 'seen' | 'joined' | 'dismissed'
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT unique_user_suggestion UNIQUE (user_id, context_type, context_id)
);

CREATE INDEX IF NOT EXISTS idx_match_suggestions_user_status ON match_suggestions (user_id, status);
CREATE INDEX IF NOT EXISTS idx_match_suggestions_created ON match_suggestions (created_at);