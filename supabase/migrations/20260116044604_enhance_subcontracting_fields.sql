/*
  # Enhance Subcontracting Fields

  ## Overview
  Adds comprehensive financial tracking, status management, and invoicing support
  for subcontracted jobs.

  ## Changes

  1. Add Financial Tracking Fields
    - `subcontract_customer_name` (text) - The actual homeowner/customer name
    - `install_date` (date) - Date of installation
    - `ppw` (numeric) - Price per watt
    - `gross_revenue` (numeric) - PPW * system size (auto-calculated)
    - `net_revenue` (numeric) - Gross - labor - expenses (auto-calculated)
    - `total_labor` (numeric) - Total labor costs
    - `expenses` (numeric) - Additional expenses

  2. Add Status Management
    - `subcontract_status` (text) - Status for subcontract workflow
    - Default: 'install_scheduled'
    - Options: 'install_scheduled', 'install_complete', 'install_complete_pending_payment'

  3. Add Adders Support
    - `subcontract_adders` (jsonb) - Array of additional cost items
    - Each adder: {name: string, amount: number}

  4. Add Invoicing Support
    - `invoice_number` (text) - Auto-generated invoice number
    - `invoice_generated_at` (timestamptz) - When invoice was generated

  ## Security
    - Existing RLS policies apply to all new fields
*/

-- Add customer name field for subcontract jobs
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'subcontract_customer_name'
  ) THEN
    ALTER TABLE customers ADD COLUMN subcontract_customer_name text;
  END IF;
END $$;

-- Add install date
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'install_date'
  ) THEN
    ALTER TABLE customers ADD COLUMN install_date date;
  END IF;
END $$;

-- Add financial tracking fields
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'ppw'
  ) THEN
    ALTER TABLE customers ADD COLUMN ppw numeric(10,2);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'gross_revenue'
  ) THEN
    ALTER TABLE customers ADD COLUMN gross_revenue numeric(12,2);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'net_revenue'
  ) THEN
    ALTER TABLE customers ADD COLUMN net_revenue numeric(12,2);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'total_labor'
  ) THEN
    ALTER TABLE customers ADD COLUMN total_labor numeric(12,2);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'expenses'
  ) THEN
    ALTER TABLE customers ADD COLUMN expenses numeric(12,2);
  END IF;
END $$;

-- Add status field with constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'subcontract_status'
  ) THEN
    ALTER TABLE customers ADD COLUMN subcontract_status text DEFAULT 'install_scheduled';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'customers_subcontract_status_check'
  ) THEN
    ALTER TABLE customers
    ADD CONSTRAINT customers_subcontract_status_check
    CHECK (subcontract_status IN ('install_scheduled', 'install_complete', 'install_complete_pending_payment'));
  END IF;
END $$;

-- Add adders support
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'subcontract_adders'
  ) THEN
    ALTER TABLE customers ADD COLUMN subcontract_adders jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;

-- Add invoicing fields
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'invoice_number'
  ) THEN
    ALTER TABLE customers ADD COLUMN invoice_number text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'invoice_generated_at'
  ) THEN
    ALTER TABLE customers ADD COLUMN invoice_generated_at timestamptz;
  END IF;
END $$;

-- Create function to auto-calculate revenues
CREATE OR REPLACE FUNCTION calculate_subcontract_revenue()
RETURNS TRIGGER AS $$
BEGIN
  -- Only calculate for subcontract jobs
  IF NEW.job_source = 'subcontract' THEN
    -- Calculate gross revenue: PPW * system_size_kw * 1000
    IF NEW.ppw IS NOT NULL AND NEW.system_size_kw IS NOT NULL THEN
      NEW.gross_revenue := NEW.ppw * NEW.system_size_kw * 1000;
    END IF;
    
    -- Calculate net revenue: gross - labor - expenses - adders
    IF NEW.gross_revenue IS NOT NULL THEN
      NEW.net_revenue := NEW.gross_revenue;
      
      IF NEW.total_labor IS NOT NULL THEN
        NEW.net_revenue := NEW.net_revenue - NEW.total_labor;
      END IF;
      
      IF NEW.expenses IS NOT NULL THEN
        NEW.net_revenue := NEW.net_revenue - NEW.expenses;
      END IF;
      
      -- Subtract adders if they exist
      IF NEW.subcontract_adders IS NOT NULL THEN
        NEW.net_revenue := NEW.net_revenue - (
          SELECT COALESCE(SUM((value->>'amount')::numeric), 0)
          FROM jsonb_array_elements(NEW.subcontract_adders)
        );
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-calculation
DROP TRIGGER IF EXISTS trigger_calculate_subcontract_revenue ON customers;
CREATE TRIGGER trigger_calculate_subcontract_revenue
  BEFORE INSERT OR UPDATE ON customers
  FOR EACH ROW
  EXECUTE FUNCTION calculate_subcontract_revenue();

-- Create function to auto-generate invoice numbers
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TRIGGER AS $$
DECLARE
  next_number INTEGER;
BEGIN
  -- Only generate for subcontract jobs without an invoice number
  IF NEW.job_source = 'subcontract' AND NEW.invoice_number IS NULL THEN
    -- Get the highest invoice number
    SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM 'INV-([0-9]+)') AS INTEGER)), 0) + 1
    INTO next_number
    FROM customers
    WHERE invoice_number LIKE 'INV-%';
    
    -- Generate invoice number
    NEW.invoice_number := 'INV-' || LPAD(next_number::TEXT, 6, '0');
    NEW.invoice_generated_at := NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for invoice number generation
DROP TRIGGER IF EXISTS trigger_generate_invoice_number ON customers;
CREATE TRIGGER trigger_generate_invoice_number
  BEFORE INSERT ON customers
  FOR EACH ROW
  EXECUTE FUNCTION generate_invoice_number();

-- Add indexes for new fields
CREATE INDEX IF NOT EXISTS idx_customers_subcontract_status ON customers(subcontract_status) WHERE job_source = 'subcontract';
CREATE INDEX IF NOT EXISTS idx_customers_invoice_number ON customers(invoice_number) WHERE job_source = 'subcontract';
CREATE INDEX IF NOT EXISTS idx_customers_install_date ON customers(install_date) WHERE job_source = 'subcontract';

-- Add comments
COMMENT ON COLUMN customers.subcontract_customer_name IS 'Name of the actual homeowner/customer (for subcontract jobs)';
COMMENT ON COLUMN customers.ppw IS 'Price per watt for subcontract jobs';
COMMENT ON COLUMN customers.gross_revenue IS 'Total revenue (PPW * system size) for subcontract jobs';
COMMENT ON COLUMN customers.net_revenue IS 'Net revenue after labor, expenses, and adders';
COMMENT ON COLUMN customers.subcontract_status IS 'Status of subcontract job workflow';
COMMENT ON COLUMN customers.subcontract_adders IS 'Additional cost items for subcontract jobs';
COMMENT ON COLUMN customers.invoice_number IS 'Auto-generated invoice number';