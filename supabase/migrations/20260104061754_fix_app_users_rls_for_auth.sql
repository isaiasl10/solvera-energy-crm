/*
  # Fix app_users RLS Policies for Authentication

  1. Problem
    - Authenticated users cannot read their own record from app_users
    - This causes infinite login loop as the app signs users out when query fails
  
  2. Changes
    - Drop existing overly restrictive policies
    - Add policy allowing authenticated users to read their own data by matching email
    - Add policy allowing authenticated users to read their own data by auth_user_id
  
  3. Security
    - Users can only read their own records
    - Matches by both email and auth_user_id for reliability
*/

-- Drop existing restrictive SELECT policies
DROP POLICY IF EXISTS "Allow anon and authenticated to read app_users" ON app_users;
DROP POLICY IF EXISTS "Users can view own profile" ON app_users;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON app_users;

-- Create new policy allowing authenticated users to read their own data
CREATE POLICY "Authenticated users can read own profile by email"
  ON app_users FOR SELECT
  TO authenticated
  USING (
    email = auth.jwt()->>'email'
    OR id = auth.uid()
    OR auth_user_id = auth.uid()
  );
