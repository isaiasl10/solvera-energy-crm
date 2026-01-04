/*
  # Add BOM and Permit/Engineering Cost Fields

  1. Changes
    - Add `bom_cost` column to track Bill of Materials actual costs
    - Add `permit_engineering_cost` column to track actual permit and engineering costs
  
  2. Details
    - Both fields are numeric with 2 decimal precision
    - Both default to 0
    - These represent actual costs that will be deducted from EPC Gross
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'bom_cost'
  ) THEN
    ALTER TABLE customers ADD COLUMN bom_cost NUMERIC(10, 2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'permit_engineering_cost'
  ) THEN
    ALTER TABLE customers ADD COLUMN permit_engineering_cost NUMERIC(10, 2) DEFAULT 0;
  END IF;
END $$;