/*
  # Allow Anonymous Access to Sales Commissions

  1. Changes
    - Add policies to allow anonymous (unauthenticated) users to view sales commissions
    - This aligns with the existing approach used for other tables in the CRM
    - Maintains RLS enabled for security while allowing public access
  
  2. Security Notes
    - Anonymous users can view all commission data
    - This is suitable for internal tools where authentication is handled via mock users
    - In production, consider implementing proper authentication
*/

-- Add policy for anonymous users to view sales commissions
CREATE POLICY "Allow anonymous users to view sales commissions"
  ON sales_commissions
  FOR SELECT
  TO anon
  USING (true);
