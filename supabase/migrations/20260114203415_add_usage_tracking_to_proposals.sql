/*
  # Add Usage Tracking to Proposals

  1. Changes
    - Add `usage_mode` (text) - Either 'annual' or 'monthly'
    - Add `annual_kwh` (numeric) - Annual energy usage in kWh
    - Add `monthly_kwh` (jsonb) - Monthly energy usage as JSON array [jan, feb, ..., dec]
    
  2. Notes
    - These fields allow tracking customer energy usage for offset calculations
    - monthly_kwh stores 12 values for each month
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'proposals' AND column_name = 'usage_mode'
  ) THEN
    ALTER TABLE proposals ADD COLUMN usage_mode text DEFAULT 'annual';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'proposals' AND column_name = 'annual_kwh'
  ) THEN
    ALTER TABLE proposals ADD COLUMN annual_kwh numeric DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'proposals' AND column_name = 'monthly_kwh'
  ) THEN
    ALTER TABLE proposals ADD COLUMN monthly_kwh jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;
