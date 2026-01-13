/*
  # Fix Authenticated User Insert Policy

  1. Problem
    - Anonymous users can insert into app_users (has policy)
    - Authenticated users CANNOT insert into app_users (no policy)
    - Admins are authenticated, so they're blocked from creating users

  2. Solution
    - Add INSERT policy for authenticated users
    - Allow all authenticated users to insert (can be restricted later to admins only if needed)

  3. Security
    - This allows logged-in users to create other users
    - In production, you may want to restrict this to admin role only
*/

-- Drop policy if it exists and recreate
DROP POLICY IF EXISTS "Authenticated users can insert users" ON app_users;

-- Add INSERT policy for authenticated users
CREATE POLICY "Authenticated users can insert users"
  ON app_users
  FOR INSERT
  TO authenticated
  WITH CHECK (true);
