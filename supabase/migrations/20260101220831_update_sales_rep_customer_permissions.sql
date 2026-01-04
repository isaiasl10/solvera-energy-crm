/*
  # Update Sales Rep Permissions for Customer Management

  1. Security Changes
    - Add INSERT policy for sales reps to create new customers
    - Update UPDATE policy to allow sales reps to edit all customer fields
    - Sales reps can now fully manage customer records they create

  2. Changes
    - Drop and recreate UPDATE policy with broader permissions
    - Add INSERT policy for customer creation
*/

-- Drop existing restrictive UPDATE policy
DROP POLICY IF EXISTS "Sales reps can update customer signature and adders" ON customers;

-- Create new UPDATE policy allowing sales reps to edit all fields
CREATE POLICY "Sales reps can update customers"
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

-- Add INSERT policy for sales reps to create new customers
CREATE POLICY "Sales reps can create customers"
  ON customers
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.email = auth.jwt()->>'email'
      AND app_users.role = 'sales_rep'
    )
  );
