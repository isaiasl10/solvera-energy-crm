/*
  # Allow Sales Managers to Read All Active Users
  
  1. Problem
    - Sales managers can only read sales reps who directly report to them
    - When viewing customer projects, they need to see assigned sales rep names
    - They also need to populate dropdowns with available sales reps
    
  2. Changes
    - Add policy allowing sales managers to read all active users
    - This enables them to see assigned sales reps on customer records
    - Allows proper display of user information throughout the application
    
  3. Security
    - Only allows READ access (SELECT)
    - Sales managers still can only INSERT/UPDATE/DELETE their direct reports
    - Read-only access to other users is safe for operational purposes
*/

-- Allow sales managers to read all active users (for viewing assignments and populating dropdowns)
CREATE POLICY "Sales managers can read all active users"
  ON app_users
  FOR SELECT
  TO authenticated
  USING (
    get_current_user_role() = 'sales_manager'
    AND status = 'active'
  );
