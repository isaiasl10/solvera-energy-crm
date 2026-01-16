/*
  # Add Job Type and Detach & Reset Support
  
  1. Purpose
    - Add job_type field to distinguish between New Install, Detach & Reset, and Service jobs
    - Add Detach & Reset specific fields for pricing, workflow tracking, and payment
    - Add default pricing to contractors table for Detach & Reset jobs
  
  2. Changes to customers table (for subcontract jobs)
    - `job_type` (text) - Type of job: new_install, detach_reset, service
    - `price_per_panel` (numeric) - Price per panel for detach & reset jobs
    - `panel_qty` (integer) - Number of panels for detach & reset
    - `gross_amount` (numeric) - Computed: price_per_panel * panel_qty
    - `labor_cost` (numeric) - Labor costs for detach & reset
    - `material_cost` (numeric) - Material costs for detach & reset
    - `net_revenue` (numeric) - Computed: gross_amount - labor_cost - material_cost
    - `detach_date` (date) - Scheduled detach date
    - `reset_date` (date) - Scheduled reset date
    - `detach_reset_status` (text) - Status for detach & reset workflow
    - `invoice_sent_date` (date) - Date invoice was sent
    - `paid_date` (date) - Date payment was received
    - `payment_method` (text) - Payment method: check, wire, ach, other
    - `check_number` (text) - Check number if payment_method is check
  
  3. Changes to contractors table
    - `default_detach_reset_price_per_panel` (numeric) - Default price per panel for detach & reset jobs
  
  4. Notes
    - job_type defaults to 'new_install' for backward compatibility
    - detach_reset_status has specific allowed values for workflow tracking
    - gross_amount and net_revenue can be computed but also stored for performance
    - All new fields are nullable to avoid breaking existing records
*/

-- Add job_type to customers table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'job_type'
  ) THEN
    ALTER TABLE customers ADD COLUMN job_type text DEFAULT 'new_install';
  END IF;
END $$;

-- Add check constraint for job_type
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'customers_job_type_check'
  ) THEN
    ALTER TABLE customers
    ADD CONSTRAINT customers_job_type_check
    CHECK (job_type IN ('new_install', 'detach_reset', 'service'));
  END IF;
END $$;

-- Add Detach & Reset pricing fields
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'price_per_panel'
  ) THEN
    ALTER TABLE customers ADD COLUMN price_per_panel numeric(10,2);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'panel_qty'
  ) THEN
    ALTER TABLE customers ADD COLUMN panel_qty integer;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'gross_amount'
  ) THEN
    ALTER TABLE customers ADD COLUMN gross_amount numeric(10,2);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'labor_cost'
  ) THEN
    ALTER TABLE customers ADD COLUMN labor_cost numeric(10,2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'material_cost'
  ) THEN
    ALTER TABLE customers ADD COLUMN material_cost numeric(10,2) DEFAULT 0;
  END IF;
END $$;

-- Add workflow date fields
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'detach_date'
  ) THEN
    ALTER TABLE customers ADD COLUMN detach_date date;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'reset_date'
  ) THEN
    ALTER TABLE customers ADD COLUMN reset_date date;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'detach_reset_status'
  ) THEN
    ALTER TABLE customers ADD COLUMN detach_reset_status text;
  END IF;
END $$;

-- Add check constraint for detach_reset_status
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'customers_detach_reset_status_check'
  ) THEN
    ALTER TABLE customers
    ADD CONSTRAINT customers_detach_reset_status_check
    CHECK (detach_reset_status IN ('detach_scheduled', 'detach_complete', 'reset_scheduled', 'reset_complete', 'invoice_sent', 'paid') OR detach_reset_status IS NULL);
  END IF;
END $$;

-- Add payment tracking fields
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'invoice_sent_date'
  ) THEN
    ALTER TABLE customers ADD COLUMN invoice_sent_date date;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'paid_date'
  ) THEN
    ALTER TABLE customers ADD COLUMN paid_date date;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'payment_method'
  ) THEN
    ALTER TABLE customers ADD COLUMN payment_method text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'check_number'
  ) THEN
    ALTER TABLE customers ADD COLUMN check_number text;
  END IF;
END $$;

-- Add check constraint for payment_method
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'customers_payment_method_check'
  ) THEN
    ALTER TABLE customers
    ADD CONSTRAINT customers_payment_method_check
    CHECK (payment_method IN ('check', 'wire', 'ach', 'other') OR payment_method IS NULL);
  END IF;
END $$;

-- Add default detach & reset pricing to contractors table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'contractors' AND column_name = 'default_detach_reset_price_per_panel'
  ) THEN
    ALTER TABLE contractors ADD COLUMN default_detach_reset_price_per_panel numeric(10,2);
  END IF;
END $$;

-- Create function to auto-calculate gross_amount and net_revenue for detach & reset jobs
CREATE OR REPLACE FUNCTION calculate_detach_reset_financials()
RETURNS TRIGGER AS $$
BEGIN
  -- Only calculate for detach_reset jobs
  IF NEW.job_type = 'detach_reset' THEN
    -- Calculate gross_amount = price_per_panel * panel_qty
    IF NEW.price_per_panel IS NOT NULL AND NEW.panel_qty IS NOT NULL THEN
      NEW.gross_amount := NEW.price_per_panel * NEW.panel_qty;
    END IF;
    
    -- Calculate net_revenue = gross_amount - labor_cost - material_cost
    IF NEW.gross_amount IS NOT NULL THEN
      NEW.net_revenue := NEW.gross_amount - COALESCE(NEW.labor_cost, 0) - COALESCE(NEW.material_cost, 0);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-calculate on insert/update
DROP TRIGGER IF EXISTS trigger_calculate_detach_reset_financials ON customers;
CREATE TRIGGER trigger_calculate_detach_reset_financials
  BEFORE INSERT OR UPDATE ON customers
  FOR EACH ROW
  EXECUTE FUNCTION calculate_detach_reset_financials();

-- Create indexes for efficient filtering
CREATE INDEX IF NOT EXISTS idx_customers_job_type ON customers(job_type) WHERE job_source = 'subcontract';
CREATE INDEX IF NOT EXISTS idx_customers_detach_reset_status ON customers(detach_reset_status) WHERE job_type = 'detach_reset';

-- Add comments for documentation
COMMENT ON COLUMN customers.job_type IS 'Type of subcontract job: new_install, detach_reset, or service';
COMMENT ON COLUMN customers.price_per_panel IS 'Price per panel for detach & reset jobs';
COMMENT ON COLUMN customers.panel_qty IS 'Number of panels for detach & reset jobs';
COMMENT ON COLUMN customers.gross_amount IS 'Gross revenue: price_per_panel * panel_qty';
COMMENT ON COLUMN customers.labor_cost IS 'Labor costs for detach & reset jobs';
COMMENT ON COLUMN customers.material_cost IS 'Material costs for detach & reset jobs';
COMMENT ON COLUMN customers.detach_date IS 'Scheduled date for panel detachment';
COMMENT ON COLUMN customers.reset_date IS 'Scheduled date for panel reset/reinstallation';
COMMENT ON COLUMN customers.detach_reset_status IS 'Workflow status: detach_scheduled, detach_complete, reset_scheduled, reset_complete, invoice_sent, paid';
COMMENT ON COLUMN customers.invoice_sent_date IS 'Date invoice was sent to customer';
COMMENT ON COLUMN customers.paid_date IS 'Date payment was received';
COMMENT ON COLUMN customers.payment_method IS 'Payment method: check, wire, ach, other';
COMMENT ON COLUMN customers.check_number IS 'Check number if payment_method is check';
COMMENT ON COLUMN contractors.default_detach_reset_price_per_panel IS 'Default price per panel for detach & reset jobs with this contractor';