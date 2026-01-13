/*
  # Fix Customer Financing RLS Policies

  1. Changes
    - Add RLS policies for authenticated users on customer_financing table
    - Allow authenticated users to select, insert, update, and delete customer financing records
    
  2. Security
    - Maintains proper access control for authenticated users
    - Keeps existing anon policies intact
*/

-- Drop existing authenticated policies if they exist
DROP POLICY IF EXISTS "Authenticated users can read customer_financing" ON customer_financing;
DROP POLICY IF EXISTS "Authenticated users can insert customer_financing" ON customer_financing;
DROP POLICY IF EXISTS "Authenticated users can update customer_financing" ON customer_financing;
DROP POLICY IF EXISTS "Authenticated users can delete customer_financing" ON customer_financing;

-- Add policies for authenticated users
CREATE POLICY "Authenticated users can read customer_financing"
  ON customer_financing
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert customer_financing"
  ON customer_financing
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update customer_financing"
  ON customer_financing
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete customer_financing"
  ON customer_financing
  FOR DELETE
  TO authenticated
  USING (true);
