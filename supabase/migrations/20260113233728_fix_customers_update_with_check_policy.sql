/*
  # Fix Customers UPDATE Policy WITH CHECK Clause
  
  1. Problem
    - Sales managers getting "An error occurred" when updating customers
    - The UPDATE policy for sales reps/managers has USING clause but no explicit WITH CHECK
    - This causes updates to fail due to RLS policy mismatch
    
  2. Changes
    - Drop existing "Sales reps can update customers" policy
    - Recreate it with explicit WITH CHECK clause matching USING clause
    - Ensures sales managers can both read and write customer records
    
  3. Security
    - WITH CHECK ensures only authenticated sales_rep, sales_manager, or admin can update
    - Maintains same security level as before but explicitly allows updates
*/

-- Drop the existing UPDATE policy
DROP POLICY IF EXISTS "Sales reps can update customers" ON customers;

-- Recreate with explicit WITH CHECK clause
CREATE POLICY "Sales reps can update customers"
  ON customers
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM app_users
      WHERE app_users.auth_user_id = auth.uid()
      AND app_users.role IN ('sales_rep', 'sales_manager', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM app_users
      WHERE app_users.auth_user_id = auth.uid()
      AND app_users.role IN ('sales_rep', 'sales_manager', 'admin')
    )
  );
