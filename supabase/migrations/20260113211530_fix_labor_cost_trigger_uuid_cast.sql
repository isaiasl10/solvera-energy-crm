/*
  # Fix Labor Cost Trigger UUID Cast

  1. Changes
    - Update trigger functions to cast UUID to text when calling calculate_customer_labor_costs
    - Fixes error: function calculate_customer_labor_costs(uuid) does not exist

  2. Notes
    - The calculate_customer_labor_costs function expects text parameter
    - customer_id columns in tables are UUID type
    - Need explicit cast for compatibility
*/

-- Trigger function for time clock changes
CREATE OR REPLACE FUNCTION trigger_update_labor_on_time_clock()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
    IF NEW.customer_id IS NOT NULL AND NEW.clock_out_time IS NOT NULL THEN
      PERFORM calculate_customer_labor_costs(NEW.customer_id::text);
    END IF;
  END IF;

  IF (TG_OP = 'DELETE') THEN
    IF OLD.customer_id IS NOT NULL THEN
      PERFORM calculate_customer_labor_costs(OLD.customer_id::text);
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Trigger function for scheduling changes
CREATE OR REPLACE FUNCTION trigger_update_labor_on_scheduling()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
    IF NEW.customer_id IS NOT NULL THEN
      PERFORM calculate_customer_labor_costs(NEW.customer_id::text);
    END IF;
  END IF;

  IF (TG_OP = 'DELETE') THEN
    IF OLD.customer_id IS NOT NULL THEN
      PERFORM calculate_customer_labor_costs(OLD.customer_id::text);
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Trigger function for customer changes
CREATE OR REPLACE FUNCTION trigger_update_labor_on_customer()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'UPDATE' AND (
    NEW.system_size_kw IS DISTINCT FROM OLD.system_size_kw OR
    NEW.battery_quantity IS DISTINCT FROM OLD.battery_quantity
  )) THEN
    PERFORM calculate_customer_labor_costs(NEW.id::text);
  END IF;

  RETURN NEW;
END;
$$;
