/*
  # Create Contractors Table

  ## Overview
  Creates a table to manage subcontractor profiles with their payment terms,
  contact information, and which adders they pay for.

  ## New Tables
    - `contractors`
      - `id` (uuid, primary key) - Unique contractor ID
      - `company_name` (text, required) - Contractor's company name
      - `address` (text) - Contractor's billing address
      - `phone_number` (text) - Contact phone number
      - `email` (text) - Contact email address
      - `ppw` (numeric) - Price per watt this contractor pays
      - `adders` (jsonb) - Array of adder names this contractor pays for
      - `notes` (text) - Additional notes about contractor
      - `created_at` (timestamptz) - Record creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp

  ## Changes to Existing Tables
    - Add `contractor_id` (uuid) to `customers` table to link subcontract jobs to contractors

  ## Security
    - Enable RLS on contractors table
    - Allow authenticated users to read all contractors
    - Allow authenticated users to create/update/delete contractors

  ## Indexes
    - Index on contractor company_name for search
    - Index on contractor_id in customers table
*/

-- Create contractors table
CREATE TABLE IF NOT EXISTS contractors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL,
  address text,
  phone_number text,
  email text,
  ppw numeric(10,2),
  adders jsonb DEFAULT '[]'::jsonb,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add contractor_id to customers table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'contractor_id'
  ) THEN
    ALTER TABLE customers ADD COLUMN contractor_id uuid REFERENCES contractors(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Enable RLS
ALTER TABLE contractors ENABLE ROW LEVEL SECURITY;

-- RLS Policies for contractors
CREATE POLICY "Authenticated users can view all contractors"
  ON contractors FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert contractors"
  ON contractors FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update contractors"
  ON contractors FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete contractors"
  ON contractors FOR DELETE
  TO authenticated
  USING (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_contractors_company_name ON contractors(company_name);
CREATE INDEX IF NOT EXISTS idx_customers_contractor_id ON customers(contractor_id) WHERE job_source = 'subcontract';

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_contractors_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_contractors_updated_at ON contractors;
CREATE TRIGGER trigger_update_contractors_updated_at
  BEFORE UPDATE ON contractors
  FOR EACH ROW
  EXECUTE FUNCTION update_contractors_updated_at();

-- Add comments
COMMENT ON TABLE contractors IS 'Subcontractor profiles with payment terms and contact info';
COMMENT ON COLUMN contractors.company_name IS 'Contractor company/business name';
COMMENT ON COLUMN contractors.ppw IS 'Price per watt this contractor pays us';
COMMENT ON COLUMN contractors.adders IS 'Array of adder names (e.g., ["FSU", "MBE"]) that this contractor pays for';
COMMENT ON COLUMN customers.contractor_id IS 'Links subcontract job to contractor profile';