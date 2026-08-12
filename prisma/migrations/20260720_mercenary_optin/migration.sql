-- Mercenary opt-in: players can volunteer as "mercenaries" for specific sports.
-- When a lobby/crew is missing a player (mercenary_mode / open_to_mercenaries),
-- the matching engine broadcasts an SOS to nearby players whose
-- mercenary_sports overlap the needed sport.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS mercenary_sports TEXT[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_profiles_mercenary_sports ON profiles USING GIN (mercenary_sports);