/*
  # Fix Sales Manager RLS Policies
  
  1. Problem
    - Sales managers cannot access their team's data because RLS policies use auth.uid() which returns auth.users.id
    - The reporting_manager_id column stores app_users.id, not auth.users.id
    - This causes a mismatch and blocks legitimate access
    
  2. Changes
    - Drop existing sales manager RLS policies for app_users table
    - Recreate policies using a subquery to properly match app_users.id
    - Add helper function to get current app_user id from auth.uid()
    
  3. Security
    - Sales managers can only access users who report directly to them
    - All policies check both role and reporting relationship
    - Only applies to sales_rep role, not other employee types
*/

-- Create helper function to get app_users.id from auth.uid()
CREATE OR REPLACE FUNCTION get_current_app_user_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT id FROM app_users WHERE auth_user_id = auth.uid() LIMIT 1;
$$;

-- Drop existing sales manager policies
DROP POLICY IF EXISTS "Sales managers can read their sales reps" ON app_users;
DROP POLICY IF EXISTS "Sales managers can insert sales reps" ON app_users;
DROP POLICY IF EXISTS "Sales managers can update their sales reps" ON app_users;
DROP POLICY IF EXISTS "Sales managers can delete their sales reps" ON app_users;

-- Recreate policies with correct condition
CREATE POLICY "Sales managers can read their sales reps"
  ON app_users
  FOR SELECT
  TO authenticated
  USING (
    get_current_user_role() = 'sales_manager'
    AND role = 'sales_rep'
    AND reporting_manager_id = get_current_app_user_id()
  );

CREATE POLICY "Sales managers can insert sales reps"
  ON app_users
  FOR INSERT
  TO authenticated
  WITH CHECK (
    get_current_user_role() = 'sales_manager'
    AND role = 'sales_rep'
    AND reporting_manager_id = get_current_app_user_id()
  );

CREATE POLICY "Sales managers can update their sales reps"
  ON app_users
  FOR UPDATE
  TO authenticated
  USING (
    get_current_user_role() = 'sales_manager'
    AND role = 'sales_rep'
    AND reporting_manager_id = get_current_app_user_id()
  )
  WITH CHECK (
    get_current_user_role() = 'sales_manager'
    AND role = 'sales_rep'
    AND reporting_manager_id = get_current_app_user_id()
  );

CREATE POLICY "Sales managers can delete their sales reps"
  ON app_users
  FOR DELETE
  TO authenticated
  USING (
    get_current_user_role() = 'sales_manager'
    AND role = 'sales_rep'
    AND reporting_manager_id = get_current_app_user_id()
  );

-- Also fix sales_commissions policies to use app_users.id correctly
DROP POLICY IF EXISTS "Users can view sales commissions" ON sales_commissions;

CREATE POLICY "Users can view sales commissions"
  ON sales_commissions
  FOR SELECT
  TO authenticated
  USING (
    sales_rep_id = get_current_app_user_id()
    OR sales_manager_id = get_current_app_user_id()
    OR EXISTS (
      SELECT 1 FROM app_users
      WHERE auth_user_id = auth.uid()
      AND role IN ('admin', 'project_manager')
    )
  );
