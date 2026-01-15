/*
  # Add Second Homeowner Fields

  1. Purpose
    - Add fields for a second homeowner (co-owner/spouse) to customers table

  2. New Columns
    - `second_homeowner_name` (text, nullable)
    - `second_homeowner_email` (text, nullable)
    - `second_homeowner_phone` (text, nullable)

  3. Notes
    - These fields are optional and can be used for joint ownership situations
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'second_homeowner_name'
  ) THEN
    ALTER TABLE customers ADD COLUMN second_homeowner_name text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'second_homeowner_email'
  ) THEN
    ALTER TABLE customers ADD COLUMN second_homeowner_email text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'second_homeowner_phone'
  ) THEN
    ALTER TABLE customers ADD COLUMN second_homeowner_phone text;
  END IF;
END $$;