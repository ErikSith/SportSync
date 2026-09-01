-- Phone OTP verification (SportSync-managed SMS flow when Supabase Phone Auth is off).
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS phone_otp_hash TEXT,
  ADD COLUMN IF NOT EXISTS phone_otp_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS phone_otp_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS phone_otp_attempts INT NOT NULL DEFAULT 0;
