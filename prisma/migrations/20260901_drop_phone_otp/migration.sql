-- Remove SportSync SMS OTP columns (2FA is TOTP-only via Supabase MFA).
ALTER TABLE profiles
  DROP COLUMN IF EXISTS phone_otp_hash,
  DROP COLUMN IF EXISTS phone_otp_expires_at,
  DROP COLUMN IF EXISTS phone_otp_sent_at,
  DROP COLUMN IF EXISTS phone_otp_attempts;
