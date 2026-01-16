/*
  # Fix PPW to be Per Kilowatt (not per watt)

  ## Overview
  Changes PPW from $/W to $/kW to fix calculation showing millions.
  Removes the *1000 multiplier from revenue calculation.

  ## Changes

  1. Update calculate_subcontract_revenue function:
     - gross_revenue = PPW * system_size_kw (NO *1000)
     - PPW is now interpreted as $/kW (e.g., $300 per kW = $0.30/W)

  ## Rationale
    - Simpler calculation without unit conversion
    - PPW stored as $/kW (e.g., 300 means $300/kW)
    - Avoids "millions" display issue

  ## Example
    - System: 14.35 kW
    - Contractor pays: $300 per kW (equivalent to $0.30/W)
    - Expected revenue: $4,305
    - Calculation: 14.35 * 300 = $4,305 ✓

  ## Security
    - No changes to RLS policies
*/

-- Update the revenue calculation function
CREATE OR REPLACE FUNCTION calculate_subcontract_revenue()
RETURNS TRIGGER AS $$
BEGIN
  -- Only calculate for subcontract jobs
  IF NEW.job_source = 'subcontract' THEN
    -- Calculate gross revenue: PPW * system_size_kw (PPW is $/kW, no multiplier needed)
    IF NEW.ppw IS NOT NULL AND NEW.ppw > 0 AND NEW.system_size_kw IS NOT NULL AND NEW.system_size_kw > 0 THEN
      NEW.gross_revenue := NEW.ppw * NEW.system_size_kw;
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

COMMENT ON FUNCTION calculate_subcontract_revenue IS 'Calculates revenue for subcontract jobs. PPW is $/kW. Net revenue = (PPW*kW) + adders - labor - expenses';