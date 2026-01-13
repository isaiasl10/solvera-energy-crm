/*
  # Add UPDATE policy to scheduling table

  1. Changes
    - Add UPDATE policy for authenticated users on the scheduling table
    - This allows field techs and other users to update ticket progress
    
  2. Security
    - Policy restricts updates to authenticated users only
    - Allows updates to all scheduling records (no ownership check needed for field operations)
*/

-- Add UPDATE policy for scheduling table
CREATE POLICY "Users can update scheduling"
  ON scheduling
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);
