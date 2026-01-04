/*
  # Fix app_users RLS for authenticated users
  
  1. Changes
    - Add policy for authenticated users to read all app_users (needed for user lookups, assignments, etc.)
    - Add policy for authenticated users to update their own data
  
  2. Security
    - Authenticated users can view all users (needed for assignments, mentions, etc.)
    - Users can only update their own profile data
*/

-- Allow authenticated users to read all app_users
CREATE POLICY "Authenticated users can read all app_users"
  ON app_users
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow authenticated users to update their own data
CREATE POLICY "Authenticated users can update own profile"
  ON app_users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = auth_user_id)
  WITH CHECK (auth.uid() = auth_user_id);
