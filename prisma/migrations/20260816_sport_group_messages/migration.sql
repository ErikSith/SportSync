-- Private crew chat messages (Locker Room Talk)
CREATE TABLE IF NOT EXISTS public.sport_group_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.sport_groups(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (char_length(body) >= 1 AND char_length(body) <= 2000),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sport_group_messages_group_created_idx
  ON public.sport_group_messages (group_id, created_at DESC);

ALTER TABLE public.sport_group_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY sport_group_messages_select ON public.sport_group_messages
  FOR SELECT
  USING (is_sport_group_member(group_id, auth.uid()));

CREATE POLICY sport_group_messages_insert ON public.sport_group_messages
  FOR INSERT
  WITH CHECK (
    is_sport_group_member(group_id, auth.uid())
    AND author_id = auth.uid()
  );

CREATE POLICY sport_group_messages_delete ON public.sport_group_messages
  FOR DELETE
  USING (
    is_sport_group_member(group_id, auth.uid())
    AND author_id = auth.uid()
  );
