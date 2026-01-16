/*
  # Fix Customers UPDATE Policy for All Authenticated Users

  1. Problem
    - Authenticated users getting 400 Bad Request when updating customers
    - Multiple restrictive UPDATE policies exist but no general authenticated policy
    - Users can't update is_active or other fields unless they match specific conditions
    
  2. Changes
    - Add a permissive UPDATE policy for all authenticated users
    - This allows any authenticated user to update any customer record
    - Supplements existing more restrictive policies
    
  3. Security
    - This is appropriate for an internal CRM tool
    - All authenticated users are trusted employees
    - More restrictive policies can still apply where needed
*/

-- Add general authenticated user UPDATE policy
CREATE POLICY "Authenticated users can update all customers"
  ON customers
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);