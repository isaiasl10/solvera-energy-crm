/*
  # Revert PPW to Dollars Per Watt

  ## Overview
  Reverts the PPW calculation to use dollars per watt ($/W) instead of dollars per kilowatt ($/kW).
  This restores the *1000 multiplier in the calculation.

  ## Changes

  1. Update calculate_subcontract_revenue function to:
     - gross_revenue = PPW * system_size_kw * 1000 (back to $/W)
     - PPW is now interpreted as $/W (e.g., $0.30 per watt)

  ## Rationale
    - Standard industry practice uses $/W (e.g., $0.30/W)
    - Calculation: 10 kW * $0.30/W * 1000 W/kW = $3,000
    - This matches how contractors typically quote prices

  ## Example
    - System: 10 kW
    - Contractor pays: $0.30 per watt
    - Expected revenue: $3,000
    - Calculation: 10 * 0.30 * 1000 = $3,000 ✓

  ## Security
    - No changes to RLS policies
*/

-- Update the revenue calculation function
CREATE OR REPLACE FUNCTION calculate_subcontract_revenue()
RETURNS TRIGGER AS $$
BEGIN
  -- Only calculate for subcontract jobs
  IF NEW.job_source = 'subcontract' THEN
    -- Calculate gross revenue: PPW * system_size_kw * 1000 (PPW is $/W)
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

COMMENT ON FUNCTION calculate_subcontract_revenue IS 'Calculates revenue for subcontract jobs. PPW is $/W. Net revenue = (PPW*kW*1000) + adders - labor - expenses';