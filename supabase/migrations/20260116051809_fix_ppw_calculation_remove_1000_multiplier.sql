/*
  # Fix PPW Calculation - Remove 1000 Multiplier

  ## Overview
  Fixes the revenue calculation to interpret PPW as dollars per kilowatt instead of
  dollars per watt, removing the multiplication by 1000.

  ## Changes

  1. Update calculate_subcontract_revenue function to:
     - gross_revenue = PPW * system_size_kw (no 1000 multiplier)
     - PPW is now interpreted as $/kW instead of $/W

  ## Rationale
    - For subcontracting, contractors typically quote prices like "$300/kW" not "$0.30/W"
    - The previous formula with *1000 was causing values to show in millions
    - New formula: 10 kW system * $300/kW = $3,000 (correct)
    - Old formula: 10 kW * $300/W * 1000 = $3,000,000 (wrong)

  ## Example
    - System: 10 kW
    - Contractor pays: $300 per kW
    - Expected revenue: $3,000
    - New calculation: 10 * 300 = $3,000 ✓

  ## Security
    - No changes to RLS policies
*/

-- Update the revenue calculation function
CREATE OR REPLACE FUNCTION calculate_subcontract_revenue()
RETURNS TRIGGER AS $$
BEGIN
  -- Only calculate for subcontract jobs
  IF NEW.job_source = 'subcontract' THEN
    -- Calculate gross revenue: PPW * system_size_kw (PPW is $/kW)
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