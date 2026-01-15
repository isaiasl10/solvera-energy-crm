/*
  # Add Meter Fee Field to Proposals

  1. Purpose
    - Add field to track monthly utility meter fee for solar customers

  2. New Columns
    - `meter_fee` (numeric, nullable) - Monthly utility meter connection fee

  3. Notes
    - Default value is NULL (can be set manually per proposal)
    - Used to calculate total monthly costs when solar offset is < 100%
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'proposals' AND column_name = 'meter_fee'
  ) THEN
    ALTER TABLE proposals ADD COLUMN meter_fee numeric(10,2) DEFAULT NULL;
  END IF;
END $$;