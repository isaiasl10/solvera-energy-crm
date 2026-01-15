/*
  # Add Missing Pricing and Utility Columns to Proposals

  1. New Columns
    - `utility_company` (text) - Name of the utility company
    - `electricity_rate` (numeric) - Current electricity rate per kWh
    - `price_per_watt` (numeric) - System price per watt
    - `total_price` (numeric) - Total system price
    - `system_price` (numeric) - System price (duplicate of total_price for compatibility)
    - `annual_consumption` (numeric) - Annual energy consumption (duplicate of annual_kwh for compatibility)
    - `annual_production_estimate` (numeric) - Estimated annual production from PVWatts
    - `cash_down_payment` (numeric) - Down payment amount (duplicate of cash_deposit for compatibility)

  2. Notes
    - These columns are needed for the CustomerPricing component to save data properly
    - Some are duplicates for backward compatibility
    - All are nullable to allow gradual migration
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'proposals' AND column_name = 'utility_company'
  ) THEN
    ALTER TABLE proposals ADD COLUMN utility_company text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'proposals' AND column_name = 'electricity_rate'
  ) THEN
    ALTER TABLE proposals ADD COLUMN electricity_rate numeric;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'proposals' AND column_name = 'price_per_watt'
  ) THEN
    ALTER TABLE proposals ADD COLUMN price_per_watt numeric;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'proposals' AND column_name = 'total_price'
  ) THEN
    ALTER TABLE proposals ADD COLUMN total_price numeric;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'proposals' AND column_name = 'system_price'
  ) THEN
    ALTER TABLE proposals ADD COLUMN system_price numeric;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'proposals' AND column_name = 'annual_consumption'
  ) THEN
    ALTER TABLE proposals ADD COLUMN annual_consumption numeric;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'proposals' AND column_name = 'annual_production_estimate'
  ) THEN
    ALTER TABLE proposals ADD COLUMN annual_production_estimate numeric;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'proposals' AND column_name = 'cash_down_payment'
  ) THEN
    ALTER TABLE proposals ADD COLUMN cash_down_payment numeric;
  END IF;
END $$;
