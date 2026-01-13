/*
  # Allow authenticated users to read all user profiles

  1. Problem
    - Authenticated users can only see their own profile due to restrictive policy
    - The "Users can read own profile" policy uses auth.uid() = id
    - This prevents users from seeing other users in the system

  2. Solution
    - Add a policy that allows all authenticated users to read all user profiles
    - This is needed for the User Management page and team collaboration features

  3. Security
    - Only authenticated users can see the full user list
    - Anonymous users still cannot access user data (only during auth flow)
*/

-- Drop if exists and recreate to ensure clean state
DROP POLICY IF EXISTS "Authenticated users can read all users" ON app_users;

-- Allow authenticated users to read all user profiles
CREATE POLICY "Authenticated users can read all users"
  ON app_users
  FOR SELECT
  TO authenticated
  USING (true);
