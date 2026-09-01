-- Profile contact & verification fields for Verified Player badge + 2FA state.
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS phone_number TEXT,
  ADD COLUMN IF NOT EXISTS is_phone_verified BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_email_verified BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_2fa_enabled BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_profiles_verified_player
  ON profiles (is_email_verified, is_phone_verified)
  WHERE is_email_verified = true AND is_phone_verified = true;
