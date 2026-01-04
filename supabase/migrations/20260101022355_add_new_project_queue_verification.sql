/*
  # Add New Project Queue Verification Fields

  1. New Columns
    - `new_project_status` (text) - Status of new project: 'new', 'in_review', 'approved'
    - `customer_details_verified` (boolean) - All customer details filled out
    - `system_pricing_verified` (boolean) - System size, prices complete
    - `financing_verified` (boolean) - Financing details verified and match contract
    - `contract_id_verified` (boolean) - Contract matches customer ID
    - `adders_verified` (boolean) - Adders properly added to system
    - `solar_contract_uploaded` (boolean) - Solar contract document uploaded
    - `utility_bill_uploaded` (boolean) - Utility bill document uploaded
    - `customer_id_uploaded` (boolean) - Customer ID document uploaded
    - `approved_for_site_survey` (boolean) - All verifications complete, ready for site survey
    - `approved_by` (text) - User who approved the project
    - `approved_at` (timestamptz) - When project was approved
  
  2. Changes
    - Add new fields to project_timeline table to support new project verification workflow
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'project_timeline' AND column_name = 'new_project_status'
  ) THEN
    ALTER TABLE project_timeline ADD COLUMN new_project_status text DEFAULT 'new';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'project_timeline' AND column_name = 'customer_details_verified'
  ) THEN
    ALTER TABLE project_timeline ADD COLUMN customer_details_verified boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'project_timeline' AND column_name = 'system_pricing_verified'
  ) THEN
    ALTER TABLE project_timeline ADD COLUMN system_pricing_verified boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'project_timeline' AND column_name = 'financing_verified'
  ) THEN
    ALTER TABLE project_timeline ADD COLUMN financing_verified boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'project_timeline' AND column_name = 'contract_id_verified'
  ) THEN
    ALTER TABLE project_timeline ADD COLUMN contract_id_verified boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'project_timeline' AND column_name = 'adders_verified'
  ) THEN
    ALTER TABLE project_timeline ADD COLUMN adders_verified boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'project_timeline' AND column_name = 'solar_contract_uploaded'
  ) THEN
    ALTER TABLE project_timeline ADD COLUMN solar_contract_uploaded boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'project_timeline' AND column_name = 'utility_bill_uploaded'
  ) THEN
    ALTER TABLE project_timeline ADD COLUMN utility_bill_uploaded boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'project_timeline' AND column_name = 'customer_id_uploaded'
  ) THEN
    ALTER TABLE project_timeline ADD COLUMN customer_id_uploaded boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'project_timeline' AND column_name = 'approved_for_site_survey'
  ) THEN
    ALTER TABLE project_timeline ADD COLUMN approved_for_site_survey boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'project_timeline' AND column_name = 'approved_by'
  ) THEN
    ALTER TABLE project_timeline ADD COLUMN approved_by text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'project_timeline' AND column_name = 'approved_at'
  ) THEN
    ALTER TABLE project_timeline ADD COLUMN approved_at timestamptz;
  END IF;
END $$;