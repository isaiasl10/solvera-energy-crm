/*
  # Fix Gross Revenue to Include Adders

  ## Overview
  Updates the gross revenue calculation to include adders, so gross revenue shows the total amount
  billed to the contractor (base system + adders). Net revenue then subtracts costs (labor + expenses).

  ## Changes

  1. Update calculate_subcontract_revenue function:
     - gross_revenue = (PPW * system_size * 1000) + adders
     - net_revenue = gross_revenue - labor - expenses

  ## Rationale
    - Gross revenue should be the total amount billed to the contractor
    - This includes both the base system price AND any adders
    - Net revenue is then the profit after subtracting our costs

  ## Security
    - No changes to RLS policies
*/

-- Update the revenue calculation function
CREATE OR REPLACE FUNCTION calculate_subcontract_revenue()
RETURNS TRIGGER AS $$
BEGIN
  -- Only calculate for subcontract jobs
  IF NEW.job_source = 'subcontract' THEN
    -- Calculate base gross revenue: PPW * system_size_kw * 1000
    IF NEW.ppw IS NOT NULL AND NEW.ppw > 0 AND NEW.system_size_kw IS NOT NULL AND NEW.system_size_kw > 0 THEN
      NEW.gross_revenue := NEW.ppw * NEW.system_size_kw * 1000;
    ELSE
      NEW.gross_revenue := 0;
    END IF;

    -- Add adders to gross revenue (these are amounts the contractor pays us)
    IF NEW.subcontract_adders IS NOT NULL AND jsonb_array_length(NEW.subcontract_adders) > 0 THEN
      NEW.gross_revenue := COALESCE(NEW.gross_revenue, 0) + (
        SELECT COALESCE(SUM((value->>'amount')::numeric), 0)
        FROM jsonb_array_elements(NEW.subcontract_adders)
      );
    END IF;

    -- Calculate net revenue: gross - labor - expenses
    NEW.net_revenue := COALESCE(NEW.gross_revenue, 0);

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

COMMENT ON FUNCTION calculate_subcontract_revenue IS 'Calculates revenue for subcontract jobs. Gross revenue = (PPW*watts) + adders. Net revenue = gross - labor - expenses';
