/*
  # Add Password Reset Tracking

  1. Changes
    - Add `first_login` boolean to `app_users` table
      - Defaults to true for new users
      - Set to false after first password change
    - Add `password_last_changed` timestamp
      - Tracks when user last updated their password
      - Used for password age policies
    
  2. Security
    - Existing users set to first_login = false (don't force reset)
    - New users will be forced to reset on first login
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'app_users' AND column_name = 'first_login'
  ) THEN
    ALTER TABLE app_users ADD COLUMN first_login BOOLEAN DEFAULT true;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'app_users' AND column_name = 'password_last_changed'
  ) THEN
    ALTER TABLE app_users ADD COLUMN password_last_changed TIMESTAMPTZ;
  END IF;
END $$;

UPDATE app_users SET first_login = false WHERE first_login IS NULL;
