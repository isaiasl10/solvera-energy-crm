/*
  # Fix Authentication User Link

  1. Changes
    - Add auth_user_id column to app_users table to link with auth.users
    - Update existing users to link their auth records
    - Add constraint to ensure data integrity
  
  2. Security
    - Maintain existing RLS policies
*/

-- Add auth_user_id column to app_users
ALTER TABLE app_users 
ADD COLUMN IF NOT EXISTS auth_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_app_users_auth_user_id ON app_users(auth_user_id);

-- Update existing user to link auth record
UPDATE app_users
SET auth_user_id = (
  SELECT id FROM auth.users WHERE auth.users.email = app_users.email
)
WHERE auth_user_id IS NULL AND EXISTS (
  SELECT 1 FROM auth.users WHERE auth.users.email = app_users.email
);

-- Add name column (used by AuthContext) if it doesn't exist
ALTER TABLE app_users 
ADD COLUMN IF NOT EXISTS name text;

-- Update name from full_name for existing records
UPDATE app_users SET name = full_name WHERE name IS NULL;
