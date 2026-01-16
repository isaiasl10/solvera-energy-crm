/*
  # Add Subcontracting Support

  ## Overview
  Adds support for subcontracted jobs that are isolated from internal customer pipeline
  but share the same calendar and ticket system.

  ## Changes

  1. Add Subcontracting Fields to Customers Table
    - `job_source` (text, default 'internal') - Distinguishes internal vs subcontract jobs
    - `contractor_name` (text, nullable) - Name of external contractor
    - `contractor_job_ref` (text, nullable) - Contractor's reference number
    - `subcontract_rate` (numeric, nullable) - Payment rate for subcontracted work
    - `subcontract_notes` (text, nullable) - Additional notes for subcontract jobs

  2. Make Fields Optional for Subcontract Jobs
    - Several customer-specific fields become nullable for subcontract jobs
    - Subcontract jobs only need: address, system_size_kw, job_source

  3. Indexing & Constraints
    - Add index on job_source for efficient filtering
    - Add check constraint to ensure job_source is 'internal' or 'subcontract'
    - Add indexes for contractor fields

  ## Security
    - Existing RLS policies apply to all job types
    - Admin/office roles can manage subcontract jobs
    - Technicians see assigned jobs regardless of source
*/

-- Add job_source field with default 'internal' for existing records
ALTER TABLE customers
ADD COLUMN IF NOT EXISTS job_source text NOT NULL DEFAULT 'internal';

-- Add subcontracting-specific fields
ALTER TABLE customers
ADD COLUMN IF NOT EXISTS contractor_name text,
ADD COLUMN IF NOT EXISTS contractor_job_ref text,
ADD COLUMN IF NOT EXISTS subcontract_rate numeric(10,2),
ADD COLUMN IF NOT EXISTS subcontract_notes text;

-- Add check constraint for job_source
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'customers_job_source_check'
  ) THEN
    ALTER TABLE customers
    ADD CONSTRAINT customers_job_source_check
    CHECK (job_source IN ('internal', 'subcontract'));
  END IF;
END $$;

-- Make certain fields nullable for subcontract jobs
-- Subcontract jobs may not have all internal customer details
ALTER TABLE customers
ALTER COLUMN full_name DROP NOT NULL,
ALTER COLUMN phone DROP NOT NULL,
ALTER COLUMN email DROP NOT NULL,
ALTER COLUMN panel_quantity DROP NOT NULL,
ALTER COLUMN panel_brand DROP NOT NULL,
ALTER COLUMN panel_wattage DROP NOT NULL,
ALTER COLUMN inverter_option DROP NOT NULL,
ALTER COLUMN racking_type DROP NOT NULL;

-- Create indexes for efficient filtering
CREATE INDEX IF NOT EXISTS idx_customers_job_source ON customers(job_source);
CREATE INDEX IF NOT EXISTS idx_customers_contractor_name ON customers(contractor_name);
CREATE INDEX IF NOT EXISTS idx_customers_contractor_job_ref ON customers(contractor_job_ref);

-- Add comment to table for clarity
COMMENT ON COLUMN customers.job_source IS 'Source of the job: internal (standard customer flow) or subcontract (external contractor job)';
COMMENT ON COLUMN customers.contractor_name IS 'Name of external contractor (subcontract jobs only)';
COMMENT ON COLUMN customers.contractor_job_ref IS 'Contractor reference/job number (subcontract jobs only)';
COMMENT ON COLUMN customers.subcontract_rate IS 'Payment rate for subcontracted work';
COMMENT ON COLUMN customers.subcontract_notes IS 'Additional notes for subcontract jobs';