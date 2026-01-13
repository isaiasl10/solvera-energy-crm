/*
  # Add phone column to app_users table

  1. Changes
    - Add `phone` column to app_users table for storing user phone numbers
    
  2. Details
    - Column is nullable to allow users without phone numbers
    - Text type for flexibility with phone number formats
*/

-- Add phone column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'app_users' AND column_name = 'phone'
  ) THEN
    ALTER TABLE app_users ADD COLUMN phone text;
  END IF;
END $$;
