/*
  # Add PPW Redline for Sales Rep Commission Calculation

  1. Changes
    - Add ppw_redline (Price Per Watt) field to app_users table
    - This field stores the commission rate per watt for sales representatives
    - Used to calculate commission: PPW * System Size - EPC Gross Total
  
  2. Notes
    - Only applicable to sales_rep role
    - Required field for sales rep commission calculations
*/

-- Add PPW redline field to app_users table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'app_users' AND column_name = 'ppw_redline'
  ) THEN
    ALTER TABLE app_users ADD COLUMN ppw_redline numeric(10,4) DEFAULT NULL;
  END IF;
END $$;
