-- Profile Sports Success: user goals, goal logs, event results

CREATE TABLE IF NOT EXISTS user_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  template_key TEXT NOT NULL,
  title TEXT NOT NULL,
  sport TEXT,
  metric_type TEXT NOT NULL,
  target_value NUMERIC NOT NULL,
  target_meta JSONB NOT NULL DEFAULT '{}',
  current_value NUMERIC NOT NULL DEFAULT 0,
  tracking_mode TEXT NOT NULL DEFAULT 'manual',
  deadline TIMESTAMPTZ,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS user_goals_user_id_idx ON user_goals(user_id);
CREATE INDEX IF NOT EXISTS user_goals_user_status_idx ON user_goals(user_id, status);

CREATE TABLE IF NOT EXISTS user_goal_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES user_goals(id) ON DELETE CASCADE,
  value NUMERIC NOT NULL DEFAULT 1,
  note TEXT,
  logged_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS user_goal_logs_goal_id_idx ON user_goal_logs(goal_id);

CREATE TABLE IF NOT EXISTS event_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'registered',
  placement INT,
  total_participants INT,
  finish_time TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (event_id, user_id)
);

CREATE INDEX IF NOT EXISTS event_results_user_id_idx ON event_results(user_id);

-- RLS
ALTER TABLE user_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_goal_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_goals_select_own ON user_goals
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY user_goals_insert_own ON user_goals
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY user_goals_update_own ON user_goals
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY user_goals_delete_own ON user_goals
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY user_goal_logs_select_own ON user_goal_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_goals g WHERE g.id = goal_id AND g.user_id = auth.uid())
  );

CREATE POLICY user_goal_logs_insert_own ON user_goal_logs
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM user_goals g WHERE g.id = goal_id AND g.user_id = auth.uid())
  );

CREATE POLICY user_goal_logs_delete_own ON user_goal_logs
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM user_goals g WHERE g.id = goal_id AND g.user_id = auth.uid())
  );

CREATE POLICY event_results_select_own ON event_results
  FOR SELECT USING (auth.uid() = user_id);
