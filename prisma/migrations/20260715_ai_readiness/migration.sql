-- SportSync AI-readiness migration
-- Run via Supabase SQL editor or: npx prisma db push

CREATE TABLE IF NOT EXISTS event_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'confirmed',
  registered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (event_id, user_id)
);
CREATE INDEX IF NOT EXISTS event_registrations_user_id_idx ON event_registrations(user_id);

CREATE TABLE IF NOT EXISTS tournament_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  round INT NOT NULL,
  slot INT NOT NULL,
  participant1_id UUID,
  participant2_id UUID,
  winner_id UUID,
  status TEXT NOT NULL DEFAULT 'pending',
  score TEXT,
  scheduled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tournament_id, round, slot)
);
CREATE INDEX IF NOT EXISTS tournament_matches_tournament_id_idx ON tournament_matches(tournament_id);

CREATE TABLE IF NOT EXISTS match_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sport TEXT NOT NULL,
  context_type TEXT NOT NULL,
  context_id UUID NOT NULL,
  participant_ids UUID[] NOT NULL DEFAULT '{}',
  winner_id UUID,
  score JSONB NOT NULL DEFAULT '{}',
  recorded_by_id UUID REFERENCES profiles(id),
  status TEXT NOT NULL DEFAULT 'confirmed',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS match_results_context_idx ON match_results(context_type, context_id);
CREATE INDEX IF NOT EXISTS match_results_sport_idx ON match_results(sport);

CREATE TABLE IF NOT EXISTS platform_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  event_name TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS platform_signals_event_name_idx ON platform_signals(event_name);
CREATE INDEX IF NOT EXISTS platform_signals_created_at_idx ON platform_signals(created_at);

CREATE TABLE IF NOT EXISTS ai_management_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  tasks JSONB NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'pending',
  last_run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ai_management_tasks_entity_idx ON ai_management_tasks(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS ai_management_tasks_status_idx ON ai_management_tasks(status);

-- Extend booking status for paid lesson flow (ignore if already exists)
DO $$ BEGIN
  ALTER TYPE "BookingStatus" ADD VALUE IF NOT EXISTS 'PENDING';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Atomic event registration RPC
CREATE OR REPLACE FUNCTION register_for_event(p_event_id UUID, p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_event RECORD;
  v_existing RECORD;
BEGIN
  SELECT id, status, capacity, registered_count INTO v_event
  FROM events WHERE id = p_event_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Event not found');
  END IF;

  IF v_event.status NOT IN ('open', 'live') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Registration is not open');
  END IF;

  SELECT id, status INTO v_existing
  FROM event_registrations
  WHERE event_id = p_event_id AND user_id = p_user_id;

  IF FOUND AND v_existing.status != 'cancelled' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Already registered');
  END IF;

  IF v_event.capacity IS NOT NULL AND v_event.registered_count >= v_event.capacity THEN
    INSERT INTO event_registrations (event_id, user_id, status)
    VALUES (p_event_id, p_user_id, 'waitlisted')
    ON CONFLICT (event_id, user_id) DO UPDATE SET status = 'waitlisted';
    RETURN jsonb_build_object('ok', true, 'status', 'waitlisted');
  END IF;

  INSERT INTO event_registrations (event_id, user_id, status)
  VALUES (p_event_id, p_user_id, 'confirmed')
  ON CONFLICT (event_id, user_id) DO UPDATE SET status = 'confirmed';

  UPDATE events
  SET registered_count = registered_count + 1,
      status = CASE WHEN capacity IS NOT NULL AND registered_count + 1 >= capacity THEN 'full' ELSE status END
  WHERE id = p_event_id;

  RETURN jsonb_build_object('ok', true, 'status', 'confirmed');
END;
$$;
