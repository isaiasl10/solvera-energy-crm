/*
  # Fix Subcontract Revenue Calculation

  ## Overview
  Fixes the revenue calculation to correctly add adders to revenue instead of subtracting them.
  Adders are amounts the contractor pays us, so they increase revenue, not decrease it.

  ## Changes

  1. Update calculate_subcontract_revenue function to:
     - gross_revenue = PPW * system_size * 1000 (base system price)
     - net_revenue = gross_revenue + adders - labor - expenses

  ## Rationale
    - Contractors pay us for the base system (PPW * watts) PLUS adders
    - Our profit = what we bill them - our costs (labor + expenses)
    - Previous calculation incorrectly subtracted adders from revenue

  ## Security
    - No changes to RLS policies
*/

-- Update the revenue calculation function
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
    
    -- Calculate net revenue: gross + adders - labor - expenses
    -- Adders INCREASE revenue because the contractor pays us for them
    NEW.net_revenue := COALESCE(NEW.gross_revenue, 0);
    
    -- Add adders (these are amounts the contractor pays us)
    IF NEW.subcontract_adders IS NOT NULL AND jsonb_array_length(NEW.subcontract_adders) > 0 THEN
      NEW.net_revenue := NEW.net_revenue + (
        SELECT COALESCE(SUM((value->>'amount')::numeric), 0)
        FROM jsonb_array_elements(NEW.subcontract_adders)
      );
    END IF;
    
    -- Subtract our costs
    IF NEW.total_labor IS NOT NULL AND NEW.total_labor > 0 THEN
      NEW.net_revenue := NEW.net_revenue - NEW.total_labor;
    END IF;
    
    IF NEW.expenses IS NOT NULL AND NEW.expenses > 0 THEN
      NEW.net_revenue := NEW.net_revenue - NEW.expenses;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_subcontract_revenue IS 'Calculates revenue for subcontract jobs. Net revenue = (PPW*watts) + adders - labor - expenses';