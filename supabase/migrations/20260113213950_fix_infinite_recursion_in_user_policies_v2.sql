/*
  # Fix infinite recursion in app_users RLS policies

  1. Changes
    - Create a security definer function to get current user's role without triggering RLS
    - Drop the problematic policies
    - Recreate policies using the helper function
    
  2. Security
    - Function runs with security definer to bypass RLS
    - Policies properly enforce role-based access control
*/

-- Create a security definer function to get the current user's role without triggering RLS
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role
  FROM app_users
  WHERE id = auth.uid();
  
  RETURN user_role;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_current_user_role() TO authenticated;

-- Drop all the problematic policies
DROP POLICY IF EXISTS "Admins can read all users" ON app_users;
DROP POLICY IF EXISTS "Admins can insert any user" ON app_users;
DROP POLICY IF EXISTS "Admins can update any user" ON app_users;
DROP POLICY IF EXISTS "Admins can delete any user" ON app_users;
DROP POLICY IF EXISTS "Sales managers can read their sales reps" ON app_users;
DROP POLICY IF EXISTS "Sales managers can insert sales reps" ON app_users;
DROP POLICY IF EXISTS "Sales managers can update their sales reps" ON app_users;
DROP POLICY IF EXISTS "Sales managers can delete their sales reps" ON app_users;
DROP POLICY IF EXISTS "Project managers can read employee category" ON app_users;
DROP POLICY IF EXISTS "Project managers can insert employee category" ON app_users;
DROP POLICY IF EXISTS "Project managers can update employee category" ON app_users;
DROP POLICY IF EXISTS "Project managers can delete employee category" ON app_users;

-- Recreate policies using the helper function

-- Admin policies
CREATE POLICY "Admins can read all users"
  ON app_users FOR SELECT
  TO authenticated
  USING (public.get_current_user_role() = 'admin');

CREATE POLICY "Admins can insert any user"
  ON app_users FOR INSERT
  TO authenticated
  WITH CHECK (public.get_current_user_role() = 'admin');

CREATE POLICY "Admins can update any user"
  ON app_users FOR UPDATE
  TO authenticated
  USING (public.get_current_user_role() = 'admin')
  WITH CHECK (public.get_current_user_role() = 'admin');

CREATE POLICY "Admins can delete any user"
  ON app_users FOR DELETE
  TO authenticated
  USING (public.get_current_user_role() = 'admin');

-- Sales manager policies
CREATE POLICY "Sales managers can read their sales reps"
  ON app_users FOR SELECT
  TO authenticated
  USING (
    public.get_current_user_role() = 'sales_manager'
    AND reporting_manager_id = auth.uid()
    AND role = 'sales_rep'
  );

CREATE POLICY "Sales managers can insert sales reps"
  ON app_users FOR INSERT
  TO authenticated
  WITH CHECK (
    public.get_current_user_role() = 'sales_manager'
    AND role = 'sales_rep'
    AND reporting_manager_id = auth.uid()
  );

CREATE POLICY "Sales managers can update their sales reps"
  ON app_users FOR UPDATE
  TO authenticated
  USING (
    public.get_current_user_role() = 'sales_manager'
    AND reporting_manager_id = auth.uid()
    AND role = 'sales_rep'
  )
  WITH CHECK (
    public.get_current_user_role() = 'sales_manager'
    AND reporting_manager_id = auth.uid()
    AND role = 'sales_rep'
  );

CREATE POLICY "Sales managers can delete their sales reps"
  ON app_users FOR DELETE
  TO authenticated
  USING (
    public.get_current_user_role() = 'sales_manager'
    AND reporting_manager_id = auth.uid()
    AND role = 'sales_rep'
  );

-- Project manager policies
CREATE POLICY "Project managers can read employee category"
  ON app_users FOR SELECT
  TO authenticated
  USING (
    public.get_current_user_role() = 'project_manager'
    AND role_category = 'employee'
    AND role != 'sales_rep'
  );

CREATE POLICY "Project managers can insert employee category"
  ON app_users FOR INSERT
  TO authenticated
  WITH CHECK (
    public.get_current_user_role() = 'project_manager'
    AND role_category = 'employee'
    AND role != 'sales_rep'
  );

CREATE POLICY "Project managers can update employee category"
  ON app_users FOR UPDATE
  TO authenticated
  USING (
    public.get_current_user_role() = 'project_manager'
    AND role_category = 'employee'
    AND role != 'sales_rep'
  )
  WITH CHECK (
    public.get_current_user_role() = 'project_manager'
    AND role_category = 'employee'
    AND role != 'sales_rep'
  );

CREATE POLICY "Project managers can delete employee category"
  ON app_users FOR DELETE
  TO authenticated
  USING (
    public.get_current_user_role() = 'project_manager'
    AND role_category = 'employee'
    AND role != 'sales_rep'
  );
