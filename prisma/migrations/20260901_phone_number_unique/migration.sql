-- One account per phone number (anti-fake registration). NULLs remain allowed for multiple users without a phone.
CREATE UNIQUE INDEX IF NOT EXISTS profiles_phone_number_unique
  ON profiles (phone_number)
  WHERE phone_number IS NOT NULL;
