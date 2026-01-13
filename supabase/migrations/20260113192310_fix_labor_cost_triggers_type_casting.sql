/*
  # Fix Labor Cost Triggers Type Casting

  1. Changes
    - Update all trigger functions to properly cast customer_id to text
    - Ensure triggers work with uuid customer_id fields
*/

-- Recreate trigger function for scheduling changes with proper casting
CREATE OR REPLACE FUNCTION trigger_update_labor_on_scheduling()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Handle INSERT and UPDATE
  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
    IF NEW.customer_id IS NOT NULL THEN
      PERFORM calculate_customer_labor_costs(NEW.customer_id::text);
    END IF;
  END IF;

  -- Handle DELETE
  IF (TG_OP = 'DELETE') THEN
    IF OLD.customer_id IS NOT NULL THEN
      PERFORM calculate_customer_labor_costs(OLD.customer_id::text);
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Recreate trigger function for time clock changes with proper casting
CREATE OR REPLACE FUNCTION trigger_update_labor_on_time_clock()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Handle INSERT and UPDATE
  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
    IF NEW.customer_id IS NOT NULL AND NEW.clock_out IS NOT NULL THEN
      PERFORM calculate_customer_labor_costs(NEW.customer_id::text);
    END IF;
  END IF;

  -- Handle DELETE
  IF (TG_OP = 'DELETE') THEN
    IF OLD.customer_id IS NOT NULL THEN
      PERFORM calculate_customer_labor_costs(OLD.customer_id::text);
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Recreate trigger function for customer changes with proper casting
CREATE OR REPLACE FUNCTION trigger_update_labor_on_customer()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only recalculate if relevant fields changed
  IF (TG_OP = 'UPDATE' AND (
    NEW.system_size_kw IS DISTINCT FROM OLD.system_size_kw OR
    NEW.battery_quantity IS DISTINCT FROM OLD.battery_quantity
  )) THEN
    PERFORM calculate_customer_labor_costs(NEW.id::text);
  END IF;

  RETURN NEW;
END;
$$;
