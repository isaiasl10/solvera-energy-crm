/*
  # Fix Time Clock RLS Policies

  1. Changes
    - Replace complex email-based RLS policies with direct auth.uid() checks
    - Simplify policies for better performance and reliability
    - app_users.id matches auth.users.id, so we can use auth.uid() directly

  2. Security
    - Users can only insert/update/view their own time clock entries
    - Admins and management can view all entries
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can insert own time clock entries" ON time_clock;
DROP POLICY IF EXISTS "Users can update own time clock entries" ON time_clock;
DROP POLICY IF EXISTS "Users can view time clock entries" ON time_clock;

-- Create simplified policies using auth.uid()
CREATE POLICY "Users can insert own time entries"
  ON time_clock
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own time entries"
  ON time_clock
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view own time entries"
  ON time_clock
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() 
    OR 
    EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.id = auth.uid()
      AND app_users.role_category IN ('admin', 'management')
    )
  );