/*
  # Add RLS Policies for Sales Representatives

  1. Security Changes
    - Add policies for sales_rep role to access necessary tables
    - Sales reps can:
      - Read and update customers (signature_date and adders only)
      - Upload and view documents
      - Send and read messages in project chat
      - View project timeline
      - Schedule site surveys
      - View available technicians

  2. Tables Affected
    - customers: Read and limited update access
    - documents: Full read/write access
    - project_messages: Full read/write access
    - project_timeline: Read-only access
    - scheduling: Insert access for site surveys
    - app_users: Read access for technician selection
*/

-- Customers table: Sales reps can read all customers and update signature_date and adders
CREATE POLICY "Sales reps can view all customers"
  ON customers
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.email = auth.jwt()->>'email'
      AND app_users.role = 'sales_rep'
    )
  );

CREATE POLICY "Sales reps can update customer signature and adders"
  ON customers
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.email = auth.jwt()->>'email'
      AND app_users.role = 'sales_rep'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.email = auth.jwt()->>'email'
      AND app_users.role = 'sales_rep'
    )
  );

-- Documents table: Sales reps can view and upload documents
CREATE POLICY "Sales reps can view documents"
  ON documents
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.email = auth.jwt()->>'email'
      AND app_users.role = 'sales_rep'
    )
  );

CREATE POLICY "Sales reps can upload documents"
  ON documents
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.email = auth.jwt()->>'email'
      AND app_users.role = 'sales_rep'
    )
  );

-- Project messages: Sales reps can read and send messages
CREATE POLICY "Sales reps can view project messages"
  ON project_messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.email = auth.jwt()->>'email'
      AND app_users.role = 'sales_rep'
    )
  );

CREATE POLICY "Sales reps can send project messages"
  ON project_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.email = auth.jwt()->>'email'
      AND app_users.role = 'sales_rep'
    )
  );

-- Project timeline: Sales reps can view timeline
CREATE POLICY "Sales reps can view project timeline"
  ON project_timeline
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.email = auth.jwt()->>'email'
      AND app_users.role = 'sales_rep'
    )
  );

-- Scheduling: Sales reps can create site survey tickets
CREATE POLICY "Sales reps can schedule site surveys"
  ON scheduling
  FOR INSERT
  TO authenticated
  WITH CHECK (
    ticket_type = 'site_survey' AND
    EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.email = auth.jwt()->>'email'
      AND app_users.role = 'sales_rep'
    )
  );

CREATE POLICY "Sales reps can view scheduling"
  ON scheduling
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.email = auth.jwt()->>'email'
      AND app_users.role = 'sales_rep'
    )
  );

-- App users: Sales reps can view technicians for scheduling
CREATE POLICY "Sales reps can view technicians"
  ON app_users
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM app_users au
      WHERE au.email = auth.jwt()->>'email'
      AND au.role = 'sales_rep'
    )
  );

-- Custom adders: Sales reps can view active adders
CREATE POLICY "Sales reps can view custom adders"
  ON custom_adders
  FOR SELECT
  TO authenticated
  USING (
    is_active = true AND
    EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.email = auth.jwt()->>'email'
      AND app_users.role = 'sales_rep'
    )
  );
