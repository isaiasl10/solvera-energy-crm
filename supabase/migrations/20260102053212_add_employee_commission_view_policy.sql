/*
  # Add Employee Commission View Policy

  1. Changes
    - Add policy allowing authenticated employees to view all sales commissions
    - This enables the CustomerProject view to display commission data for all employee roles
  
  2. Security
    - Only authenticated users can access commission data
    - Maintains existing admin, sales manager, and sales rep policies
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'sales_commissions' 
    AND policyname = 'Employees can view all commissions'
  ) THEN
    CREATE POLICY "Employees can view all commissions"
      ON sales_commissions
      FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM app_users
          WHERE app_users.id = auth.uid()
        )
      );
  END IF;
END $$;
