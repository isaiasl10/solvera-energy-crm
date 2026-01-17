/*
  # Fix App Users Login Access

  1. Problem
    - Users cannot login because they can't read their app_users record after authentication
    - The optimized RLS policies are preventing profile lookup by email

  2. Solution
    - Simplify the "Authenticated users can read own profile by email" policy
    - Ensure authenticated users can always read their own app_users record

  3. Security
    - Still maintains security by checking user's email matches their auth email
    - Uses proper SELECT wrapper for performance
*/

-- Drop and recreate the policy with simpler logic
DROP POLICY IF EXISTS "Authenticated users can read own profile by email" ON app_users;

-- Authenticated users can read their own profile by matching email
CREATE POLICY "Authenticated users can read own profile by email"
  ON app_users
  FOR SELECT
  TO authenticated
  USING (
    email = (SELECT email FROM auth.users WHERE id = (SELECT auth.uid()))
  );
