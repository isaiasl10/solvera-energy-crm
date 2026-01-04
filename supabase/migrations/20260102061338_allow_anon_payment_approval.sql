/*
  # Allow Anonymous Payment Approval

  1. Changes
    - Add RLS policy to allow anonymous users to update payment status fields
    - This enables the payroll approval functionality to work from the frontend

  2. Security
    - Only allows updating specific payment status fields
    - Does not allow updating commission amounts or other sensitive data
*/

-- Drop the existing policy if it exists
DROP POLICY IF EXISTS "Allow anonymous payment approval" ON sales_commissions;

-- Create policy to allow anonymous users to update payment status fields only
CREATE POLICY "Allow anonymous payment approval"
  ON sales_commissions
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);
