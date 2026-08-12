-- Lobby stack card fields for redesigned /lobby feed
ALTER TABLE "lobbies" ADD COLUMN IF NOT EXISTS "title" TEXT;
ALTER TABLE "lobbies" ADD COLUMN IF NOT EXISTS "lobby_type" TEXT;
ALTER TABLE "lobbies" ADD COLUMN IF NOT EXISTS "cover_url" TEXT;
ALTER TABLE "lobbies" ADD COLUMN IF NOT EXISTS "has_3d_effect" BOOLEAN NOT NULL DEFAULT true;
