-- Anonymous / guest signup: auth.users.email can be NULL. The previous
-- handle_new_user() inserted new.email directly into profiles.email (NOT NULL)
-- and collapsed username to 'guest' for everyone, which aborted signup and
-- broke silent mobile lobby/crew creation.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  requested_role text;
  profile_email text;
  profile_username text;
BEGIN
  requested_role := lower(coalesce(new.raw_user_meta_data->>'role', 'player'));
  IF requested_role NOT IN ('player', 'venue_owner', 'coach') THEN
    requested_role := 'player';
  END IF;

  profile_email := nullif(trim(coalesce(new.email, '')), '');
  IF profile_email IS NULL THEN
    profile_email := new.id::text || '@anonymous.sportsync.demo';
  END IF;

  profile_username := nullif(trim(coalesce(new.raw_user_meta_data->>'username', '')), '');
  IF profile_username IS NULL OR lower(profile_username) = 'guest' THEN
    profile_username := nullif(split_part(profile_email, '@', 1), '');
  END IF;
  IF profile_username IS NULL OR profile_username = '' THEN
    profile_username := 'guest_' || substr(replace(new.id::text, '-', ''), 1, 12);
  END IF;

  INSERT INTO public.profiles (id, email, username, full_name, avatar_url, role)
  VALUES (
    new.id,
    profile_email,
    profile_username,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url',
    upper(requested_role)::"Role"
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN new;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'profiles'
      AND policyname = 'Users can insert their own profile'
  ) THEN
    CREATE POLICY "Users can insert their own profile"
      ON public.profiles
      FOR INSERT
      TO public
      WITH CHECK ((SELECT auth.uid()) = id);
  END IF;
END $$;
