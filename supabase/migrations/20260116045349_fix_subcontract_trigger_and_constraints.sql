/*
  # Fix Subcontract Trigger and Constraints

  ## Overview
  Fixes issues with subcontract job creation by making triggers more defensive
  and ensuring constraints only apply to relevant rows.

  ## Changes

  1. Update subcontract_status constraint to only apply to subcontract jobs
  2. Fix revenue calculation trigger to handle NULL and 0 values safely
  3. Ensure invoice generation only happens when appropriate

  ## Security
    - No changes to RLS policies
*/

-- Drop and recreate the status constraint to only apply to subcontract jobs
ALTER TABLE customers DROP CONSTRAINT IF EXISTS customers_subcontract_status_check;

ALTER TABLE customers
ADD CONSTRAINT customers_subcontract_status_check
CHECK (
  job_source != 'subcontract' OR 
  subcontract_status IN ('install_scheduled', 'install_complete', 'install_complete_pending_payment')
);

-- Update the revenue calculation function to be more defensive
CREATE OR REPLACE FUNCTION calculate_subcontract_revenue()
RETURNS TRIGGER AS $$
BEGIN
  -- Only calculate for subcontract jobs
  IF NEW.job_source = 'subcontract' THEN
    -- Calculate gross revenue: PPW * system_size_kw * 1000
    IF NEW.ppw IS NOT NULL AND NEW.ppw > 0 AND NEW.system_size_kw IS NOT NULL AND NEW.system_size_kw > 0 THEN
      NEW.gross_revenue := NEW.ppw * NEW.system_size_kw * 1000;
    ELSE
      NEW.gross_revenue := 0;
    END IF;
    
    -- Calculate net revenue: gross - labor - expenses - adders
    NEW.net_revenue := COALESCE(NEW.gross_revenue, 0);
    
    IF NEW.total_labor IS NOT NULL AND NEW.total_labor > 0 THEN
      NEW.net_revenue := NEW.net_revenue - NEW.total_labor;
    END IF;
    
    IF NEW.expenses IS NOT NULL AND NEW.expenses > 0 THEN
      NEW.net_revenue := NEW.net_revenue - NEW.expenses;
    END IF;
    
    -- Subtract adders if they exist
    IF NEW.subcontract_adders IS NOT NULL AND jsonb_array_length(NEW.subcontract_adders) > 0 THEN
      NEW.net_revenue := NEW.net_revenue - (
        SELECT COALESCE(SUM((value->>'amount')::numeric), 0)
        FROM jsonb_array_elements(NEW.subcontract_adders)
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update invoice generation function to be more defensive
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TRIGGER AS $$
DECLARE
  next_number INTEGER;
BEGIN
  -- Only generate for subcontract jobs without an invoice number
  IF NEW.job_source = 'subcontract' AND (NEW.invoice_number IS NULL OR NEW.invoice_number = '') THEN
    -- Get the highest invoice number
    SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM 'INV-([0-9]+)') AS INTEGER)), 0) + 1
    INTO next_number
    FROM customers
    WHERE invoice_number LIKE 'INV-%' AND invoice_number IS NOT NULL;
    
    -- Generate invoice number
    NEW.invoice_number := 'INV-' || LPAD(next_number::TEXT, 6, '0');
    NEW.invoice_generated_at := NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;