/*
  # Create Subcontract Jobs Tables

  1. New Tables
    - `subcontract_jobs`
      - Core table for ALL subcontract work (detach/reset, service, new installs)
      - Completely separate from internal customers pipeline
      - Links to contractors table
      - Tracks job-specific workflow status
      - Includes pricing fields (panel_qty, price_per_panel, gross, labor, material, net)
      - Includes invoice tracking (invoice_number, sent_date, paid_date, payment_type, check_number)
      - Includes job-specific dates (scheduled_date, detach_date, reset_date)
      
  2. Security
    - Enable RLS on subcontract_jobs table
    - Add policies for authenticated users to read/write
    - Auto-generate invoice numbers
    - Auto-calculate gross_amount and net_revenue
    
  3. Important Notes
    - This table is SEPARATE from customers table
    - Customers table remains for internal new install pipeline only
    - subcontract_jobs handles ALL external contractor work
    - Links to scheduling via subcontract_job_id (added in next migration)
*/

-- Create subcontract_jobs table
CREATE TABLE IF NOT EXISTS subcontract_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id uuid REFERENCES contractors(id) ON DELETE RESTRICT,
  job_type text NOT NULL CHECK (job_type IN ('new_install', 'detach_reset', 'service')),
  
  -- Customer/Job Info
  customer_name text NOT NULL,
  address text NOT NULL,
  phone_number text,
  email text,
  
  -- System Details (varies by job_type)
  system_size_kw numeric,  -- For new_install
  panel_qty integer,  -- For detach_reset
  price_per_panel numeric,  -- For detach_reset
  
  -- Pricing (auto-calculated where applicable)
  gross_amount numeric DEFAULT 0,
  labor_cost numeric DEFAULT 0,
  material_cost numeric DEFAULT 0,
  net_revenue numeric DEFAULT 0,
  
  -- Workflow Status (job-type specific)
  workflow_status text NOT NULL DEFAULT 'pending',
  
  -- Scheduling
  scheduled_date date,
  detach_date date,  -- For detach_reset jobs
  reset_date date,   -- For detach_reset jobs
  
  -- Invoice & Payment Tracking
  invoice_number text UNIQUE,
  invoice_sent_date timestamptz,
  invoice_paid_date timestamptz,
  payment_type text CHECK (payment_type IN ('CHECK', 'ACH', 'WIRE')),
  check_number text,
  
  -- Additional Info
  notes text,
  contractor_job_ref text,  -- Contractor's internal reference
  
  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_subcontract_jobs_contractor ON subcontract_jobs(contractor_id);
CREATE INDEX IF NOT EXISTS idx_subcontract_jobs_type ON subcontract_jobs(job_type);
CREATE INDEX IF NOT EXISTS idx_subcontract_jobs_status ON subcontract_jobs(workflow_status);
CREATE INDEX IF NOT EXISTS idx_subcontract_jobs_scheduled ON subcontract_jobs(scheduled_date);

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_subcontract_jobs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER subcontract_jobs_updated_at
  BEFORE UPDATE ON subcontract_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_subcontract_jobs_updated_at();

-- Auto-calculate gross_amount and net_revenue
CREATE OR REPLACE FUNCTION calculate_subcontract_job_pricing()
RETURNS TRIGGER AS $$
BEGIN
  -- For detach_reset jobs: gross = panel_qty * price_per_panel
  IF NEW.job_type = 'detach_reset' AND NEW.panel_qty IS NOT NULL AND NEW.price_per_panel IS NOT NULL THEN
    NEW.gross_amount := NEW.panel_qty * NEW.price_per_panel;
  END IF;
  
  -- For all jobs: net_revenue = gross_amount - labor_cost - material_cost
  NEW.net_revenue := COALESCE(NEW.gross_amount, 0) - COALESCE(NEW.labor_cost, 0) - COALESCE(NEW.material_cost, 0);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER subcontract_jobs_pricing
  BEFORE INSERT OR UPDATE ON subcontract_jobs
  FOR EACH ROW
  EXECUTE FUNCTION calculate_subcontract_job_pricing();

-- Auto-generate invoice numbers
CREATE OR REPLACE FUNCTION generate_subcontract_invoice_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.invoice_number IS NULL THEN
    NEW.invoice_number := 'SUB-' || TO_CHAR(now(), 'YYYYMMDD') || '-' || LPAD(NEXTVAL('subcontract_invoice_seq')::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create sequence for invoice numbers
CREATE SEQUENCE IF NOT EXISTS subcontract_invoice_seq START 1;

CREATE TRIGGER subcontract_jobs_invoice_number
  BEFORE INSERT ON subcontract_jobs
  FOR EACH ROW
  EXECUTE FUNCTION generate_subcontract_invoice_number();

-- Enable RLS
ALTER TABLE subcontract_jobs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for authenticated users
CREATE POLICY "Authenticated users can read all subcontract jobs"
  ON subcontract_jobs
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert subcontract jobs"
  ON subcontract_jobs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update subcontract jobs"
  ON subcontract_jobs
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete subcontract jobs"
  ON subcontract_jobs
  FOR DELETE
  TO authenticated
  USING (true);