/*
  # Add Sales Representative Assignment to Customers

  1. Changes
    - Add sales_rep_id field to customers table
    - Create foreign key relationship to app_users table
    - This allows tracking which sales rep is assigned to each customer/project
  
  2. Security
    - No RLS policy changes needed (inherits existing customer table policies)
  
  3. Notes
    - Field is nullable to support projects without assigned sales reps
    - Cascades on delete set to NULL to preserve customer records if sales rep is deleted
*/

-- Add sales_rep_id field to customers table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'sales_rep_id'
  ) THEN
    ALTER TABLE customers ADD COLUMN sales_rep_id uuid REFERENCES app_users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_customers_sales_rep_id ON customers(sales_rep_id);
