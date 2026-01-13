/*
  # Fix Time Clock Trigger Column Name

  1. Changes
    - Fix trigger function to use correct column name `clock_out_time` instead of `clock_out`
    - The time_clock table uses `clock_out_time`, not `clock_out`

  2. Notes
    - This was causing errors when trying to clock out
*/

-- Fix trigger function for time clock changes
CREATE OR REPLACE FUNCTION trigger_update_labor_on_time_clock()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Handle INSERT and UPDATE
  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
    IF NEW.customer_id IS NOT NULL AND NEW.clock_out_time IS NOT NULL THEN
      PERFORM calculate_customer_labor_costs(NEW.customer_id);
    END IF;
  END IF;

  -- Handle DELETE
  IF (TG_OP = 'DELETE') THEN
    IF OLD.customer_id IS NOT NULL THEN
      PERFORM calculate_customer_labor_costs(OLD.customer_id);
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;