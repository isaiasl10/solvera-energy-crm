/*
  # Add role-based user management policies

  1. Security Updates
    - Add policies to restrict user creation based on role
    - Sales managers can only create/view sales reps under them
    - Project managers can only create/view employee category roles (excluding sales_rep)
    - Admins can create/view all users
    
  2. Changes
    - Drop existing overly permissive policies
    - Add new restrictive policies for user management
    - Ensure proper data isolation between different role types
*/

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Authenticated users can read all users" ON app_users;
DROP POLICY IF EXISTS "Authenticated users can insert users" ON app_users;
DROP POLICY IF EXISTS "Authenticated users can update users" ON app_users;
DROP POLICY IF EXISTS "Users can view app_users" ON app_users;

-- Admin can see and manage all users
CREATE POLICY "Admins can read all users"
  ON app_users FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM app_users au
      WHERE au.id = auth.uid()
      AND au.role = 'admin'
    )
  );

CREATE POLICY "Admins can insert any user"
  ON app_users FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM app_users au
      WHERE au.id = auth.uid()
      AND au.role = 'admin'
    )
  );

CREATE POLICY "Admins can update any user"
  ON app_users FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM app_users au
      WHERE au.id = auth.uid()
      AND au.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM app_users au
      WHERE au.id = auth.uid()
      AND au.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete any user"
  ON app_users FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM app_users au
      WHERE au.id = auth.uid()
      AND au.role = 'admin'
    )
  );

-- Sales managers can only see and manage their sales reps
CREATE POLICY "Sales managers can read their sales reps"
  ON app_users FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM app_users au
      WHERE au.id = auth.uid()
      AND au.role = 'sales_manager'
      AND (
        app_users.reporting_manager_id = au.id
        AND app_users.role = 'sales_rep'
      )
    )
  );

CREATE POLICY "Sales managers can insert sales reps"
  ON app_users FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM app_users au
      WHERE au.id = auth.uid()
      AND au.role = 'sales_manager'
      AND app_users.role = 'sales_rep'
      AND app_users.reporting_manager_id = au.id
    )
  );

CREATE POLICY "Sales managers can update their sales reps"
  ON app_users FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM app_users au
      WHERE au.id = auth.uid()
      AND au.role = 'sales_manager'
      AND app_users.reporting_manager_id = au.id
      AND app_users.role = 'sales_rep'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM app_users au
      WHERE au.id = auth.uid()
      AND au.role = 'sales_manager'
      AND app_users.reporting_manager_id = au.id
      AND app_users.role = 'sales_rep'
    )
  );

CREATE POLICY "Sales managers can delete their sales reps"
  ON app_users FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM app_users au
      WHERE au.id = auth.uid()
      AND au.role = 'sales_manager'
      AND app_users.reporting_manager_id = au.id
      AND app_users.role = 'sales_rep'
    )
  );

-- Project managers can only see and manage employee category (excluding sales_rep)
CREATE POLICY "Project managers can read employee category"
  ON app_users FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM app_users au
      WHERE au.id = auth.uid()
      AND au.role = 'project_manager'
      AND app_users.role_category = 'employee'
      AND app_users.role != 'sales_rep'
    )
  );

CREATE POLICY "Project managers can insert employee category"
  ON app_users FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM app_users au
      WHERE au.id = auth.uid()
      AND au.role = 'project_manager'
      AND app_users.role_category = 'employee'
      AND app_users.role != 'sales_rep'
    )
  );

CREATE POLICY "Project managers can update employee category"
  ON app_users FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM app_users au
      WHERE au.id = auth.uid()
      AND au.role = 'project_manager'
      AND app_users.role_category = 'employee'
      AND app_users.role != 'sales_rep'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM app_users au
      WHERE au.id = auth.uid()
      AND au.role = 'project_manager'
      AND app_users.role_category = 'employee'
      AND app_users.role != 'sales_rep'
    )
  );

CREATE POLICY "Project managers can delete employee category"
  ON app_users FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM app_users au
      WHERE au.id = auth.uid()
      AND au.role = 'project_manager'
      AND app_users.role_category = 'employee'
      AND app_users.role != 'sales_rep'
    )
  );
