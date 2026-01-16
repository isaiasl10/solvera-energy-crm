/*
  # Fix Gross Revenue Calculation - Correct Formula

  ## Overview
  Fixes the gross revenue calculation to properly include adders in gross revenue.
  Previous migration incorrectly multiplied by 1000.

  ## Changes

  1. Update calculate_subcontract_revenue function:
     - gross_revenue = (PPW * system_size_kw) + adders
     - net_revenue = gross_revenue - labor - expenses
     - PPW is $/kW (e.g., $300/kW), NO multiplication by 1000 needed

  ## Rationale
    - Gross revenue = total amount billed to contractor (base system + adders)
    - Net revenue = profit after subtracting costs (labor + expenses)
    - PPW is already in $/kW format, no conversion needed

  ## Example
    - System: 10 kW, PPW: $300/kW, Adders: $500
    - Gross: (10 * 300) + 500 = $3,500
    - Net (if labor $200, expenses $100): $3,500 - $200 - $100 = $3,200

  ## Security
    - No changes to RLS policies
*/

-- Update the revenue calculation function
CREATE OR REPLACE FUNCTION calculate_subcontract_revenue()
RETURNS TRIGGER AS $$
BEGIN
  -- Only calculate for subcontract jobs
  IF NEW.job_source = 'subcontract' THEN
    -- Calculate base gross revenue: PPW * system_size_kw (PPW is $/kW)
    IF NEW.ppw IS NOT NULL AND NEW.ppw > 0 AND NEW.system_size_kw IS NOT NULL AND NEW.system_size_kw > 0 THEN
      NEW.gross_revenue := NEW.ppw * NEW.system_size_kw;
    ELSE
      NEW.gross_revenue := 0;
    END IF;

    -- Add adders to gross revenue (total amount billed to contractor)
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

COMMENT ON FUNCTION calculate_subcontract_revenue IS 'Calculates subcontract revenue. Gross = (PPW * kW) + adders. Net = Gross - labor - expenses';
