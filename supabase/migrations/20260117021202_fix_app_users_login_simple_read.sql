/*
  # Fix App Users Login - Allow Authenticated Read Access

  1. Problem
    - The previous policy tried to query auth.users which causes permission errors
    - Users need to read app_users records to complete login

  2. Solution
    - Allow all authenticated users to read from app_users table
    - This is safe because app_users doesn't contain sensitive private data
    - Write operations remain protected with other policies

  3. Security
    - Read access is safe - users need to see each other for mentions, assignments, etc.
    - Write operations are still protected by existing INSERT/UPDATE/DELETE policies
*/

-- Drop the problematic policy
DROP POLICY IF EXISTS "Authenticated users can read own profile by email" ON app_users;

-- Allow authenticated users to read all app_users records
CREATE POLICY "Authenticated users can read app_users"
  ON app_users
  FOR SELECT
  TO authenticated
  USING (true);
