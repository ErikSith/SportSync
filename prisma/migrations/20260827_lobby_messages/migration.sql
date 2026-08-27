-- Private match lobby chat (participants + host only)
CREATE OR REPLACE FUNCTION public.is_lobby_member(p_lobby_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM lobby_participants
    WHERE lobby_id = p_lobby_id AND user_id = p_user_id
  ) OR EXISTS (
    SELECT 1 FROM lobbies
    WHERE id = p_lobby_id AND host_id = p_user_id
  );
$$;

CREATE TABLE IF NOT EXISTS public.lobby_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lobby_id uuid NOT NULL REFERENCES public.lobbies(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (char_length(body) >= 1 AND char_length(body) <= 2000),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS lobby_messages_lobby_created_idx
  ON public.lobby_messages (lobby_id, created_at DESC);

ALTER TABLE public.lobby_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY lobby_messages_select ON public.lobby_messages
  FOR SELECT
  USING (is_lobby_member(lobby_id, auth.uid()));

CREATE POLICY lobby_messages_insert ON public.lobby_messages
  FOR INSERT
  WITH CHECK (
    is_lobby_member(lobby_id, auth.uid())
    AND author_id = auth.uid()
  );

CREATE POLICY lobby_messages_delete ON public.lobby_messages
  FOR DELETE
  USING (
    is_lobby_member(lobby_id, auth.uid())
    AND author_id = auth.uid()
  );
