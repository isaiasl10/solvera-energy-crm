/*
  # Add Project Details Fields

  ## Overview
  Extends the customers table with additional fields for comprehensive project tracking
  including contract pricing, roof details, utility information, and HOA contact details.

  ## Changes
  
  ### New Columns Added to `customers` table:
  - `contract_price` (numeric) - Project contract amount
  - `roof_type` (text) - Type of roof for installation
  - `utility_company` (text, nullable) - Name of the utility company
  - `utility_app_id` (text, nullable) - Utility application ID if applicable
  - `hoa_name` (text, nullable) - Homeowners Association name
  - `hoa_email` (text, nullable) - HOA contact email
  - `hoa_phone` (text, nullable) - HOA contact phone number
  
  ## Notes
  - Utility and HOA fields are optional (nullable) as not all projects require them
  - Contract price uses numeric type for accurate financial calculations
  - All fields support the existing RLS policies
*/

-- Add contract price field
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'contract_price'
  ) THEN
    ALTER TABLE customers ADD COLUMN contract_price numeric(12,2);
  END IF;
END $$;

-- Add roof type field
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'roof_type'
  ) THEN
    ALTER TABLE customers ADD COLUMN roof_type text;
  END IF;
END $$;

-- Add utility company field
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'utility_company'
  ) THEN
    ALTER TABLE customers ADD COLUMN utility_company text;
  END IF;
END $$;

-- Add utility app ID field
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'utility_app_id'
  ) THEN
    ALTER TABLE customers ADD COLUMN utility_app_id text;
  END IF;
END $$;

-- Add HOA name field
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'hoa_name'
  ) THEN
    ALTER TABLE customers ADD COLUMN hoa_name text;
  END IF;
END $$;

-- Add HOA email field
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'hoa_email'
  ) THEN
    ALTER TABLE customers ADD COLUMN hoa_email text;
  END IF;
END $$;

-- Add HOA phone field
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'hoa_phone'
  ) THEN
    ALTER TABLE customers ADD COLUMN hoa_phone text;
  END IF;
END $$;