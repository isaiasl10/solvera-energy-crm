/*
  # Fix Infinite Recursion in app_users RLS Policy

  1. Problem
    - The policy "Sales reps can view technicians" causes infinite recursion
    - It queries app_users table from within an app_users policy
    - This prevents all users from logging in

  2. Solution
    - Drop the problematic policy that causes infinite recursion
    - The anonymous policies are sufficient for application functionality

  3. Security
    - Anonymous policies remain in place for authentication flow
    - Users can still read their own profile via "Users can read own profile" policy
*/

-- Drop the problematic policy that causes infinite recursion
DROP POLICY IF EXISTS "Sales reps can view technicians" ON app_users;
