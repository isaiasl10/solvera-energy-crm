/*
  # Add Sales Manager Customer Access
  
  1. Problem
    - Sales managers cannot view customers from their sales reps
    - Missing RLS policies for sales managers on customers table
    - This causes the Sales Manager Dashboard to show blank
    
  2. Changes
    - Add RLS policy allowing sales managers to view customers from their team
    - Add RLS policy allowing sales managers to view all related data (documents, timeline, etc.)
    
  3. Security
    - Sales managers can only access customers where sales_rep_id matches their team members
    - Uses existing helper functions for proper auth matching
*/

-- Allow sales managers to view customers from their sales reps
CREATE POLICY "Sales managers can view team customers"
  ON customers
  FOR SELECT
  TO authenticated
  USING (
    get_current_user_role() = 'sales_manager'
    AND EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.id = customers.sales_rep_id
      AND app_users.reporting_manager_id = get_current_app_user_id()
      AND app_users.role = 'sales_rep'
    )
  );

-- Allow sales managers to update customers from their sales reps
CREATE POLICY "Sales managers can update team customers"
  ON customers
  FOR UPDATE
  TO authenticated
  USING (
    get_current_user_role() = 'sales_manager'
    AND EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.id = customers.sales_rep_id
      AND app_users.reporting_manager_id = get_current_app_user_id()
      AND app_users.role = 'sales_rep'
    )
  )
  WITH CHECK (
    get_current_user_role() = 'sales_manager'
    AND EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.id = customers.sales_rep_id
      AND app_users.reporting_manager_id = get_current_app_user_id()
      AND app_users.role = 'sales_rep'
    )
  );

-- Allow sales managers to view project timeline for their team's customers
CREATE POLICY "Sales managers can view team project timelines"
  ON project_timeline
  FOR SELECT
  TO authenticated
  USING (
    get_current_user_role() = 'sales_manager'
    AND EXISTS (
      SELECT 1 FROM customers
      JOIN app_users ON app_users.id = customers.sales_rep_id
      WHERE customers.id = project_timeline.customer_id
      AND app_users.reporting_manager_id = get_current_app_user_id()
      AND app_users.role = 'sales_rep'
    )
  );

-- Allow sales managers to view documents for their team's customers
CREATE POLICY "Sales managers can view team documents"
  ON documents
  FOR SELECT
  TO authenticated
  USING (
    get_current_user_role() = 'sales_manager'
    AND EXISTS (
      SELECT 1 FROM customers
      JOIN app_users ON app_users.id = customers.sales_rep_id
      WHERE customers.id = documents.customer_id
      AND app_users.reporting_manager_id = get_current_app_user_id()
      AND app_users.role = 'sales_rep'
    )
  );

-- Allow sales managers to view project messages for their team's customers
CREATE POLICY "Sales managers can view team project messages"
  ON project_messages
  FOR SELECT
  TO authenticated
  USING (
    get_current_user_role() = 'sales_manager'
    AND EXISTS (
      SELECT 1 FROM customers
      JOIN app_users ON app_users.id = customers.sales_rep_id
      WHERE customers.id = project_messages.customer_id
      AND app_users.reporting_manager_id = get_current_app_user_id()
      AND app_users.role = 'sales_rep'
    )
  );

-- Allow sales managers to insert project messages for their team's customers
CREATE POLICY "Sales managers can send team project messages"
  ON project_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    get_current_user_role() = 'sales_manager'
    AND EXISTS (
      SELECT 1 FROM customers
      JOIN app_users ON app_users.id = customers.sales_rep_id
      WHERE customers.id = project_messages.customer_id
      AND app_users.reporting_manager_id = get_current_app_user_id()
      AND app_users.role = 'sales_rep'
    )
  );

-- Allow sales managers to view activity log for their team's customers
CREATE POLICY "Sales managers can view team activity log"
  ON project_activity_log
  FOR SELECT
  TO authenticated
  USING (
    get_current_user_role() = 'sales_manager'
    AND EXISTS (
      SELECT 1 FROM customers
      JOIN app_users ON app_users.id = customers.sales_rep_id
      WHERE customers.id = project_activity_log.customer_id
      AND app_users.reporting_manager_id = get_current_app_user_id()
      AND app_users.role = 'sales_rep'
    )
  );

-- Allow sales managers to view financing for their team's customers
CREATE POLICY "Sales managers can view team financing"
  ON customer_financing
  FOR SELECT
  TO authenticated
  USING (
    get_current_user_role() = 'sales_manager'
    AND EXISTS (
      SELECT 1 FROM customers
      JOIN app_users ON app_users.id = customers.sales_rep_id
      WHERE customers.id = customer_financing.customer_id
      AND app_users.reporting_manager_id = get_current_app_user_id()
      AND app_users.role = 'sales_rep'
    )
  );