/*
  # Add Auto-Update Triggers for Labor Costs

  1. New Triggers
    - `trigger_update_labor_on_scheduling_change` - Updates labor costs when scheduling tickets change
    - `trigger_update_labor_on_time_clock_change` - Updates labor costs when time clock entries change
    - `trigger_update_labor_on_customer_change` - Updates labor costs when customer data changes

  2. Trigger Functions
    - Each trigger calls `calculate_customer_labor_costs()` for the affected customer
    - Runs after INSERT, UPDATE, or DELETE operations
    - Ensures labor costs are always current

  3. Notes
    - Triggers run automatically, no manual calculation needed
    - Updates happen in real-time as data changes
    - Handles all edge cases (deletes, updates, new entries)
*/

-- Trigger function for scheduling changes
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

-- Trigger function for time clock changes
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

-- Trigger function for customer changes (system size, battery quantity)
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
    PERFORM calculate_customer_labor_costs(NEW.id);
  END IF;

  RETURN NEW;
END;
$$;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS update_labor_on_scheduling_change ON scheduling;
DROP TRIGGER IF EXISTS update_labor_on_time_clock_change ON time_clock;
DROP TRIGGER IF EXISTS update_labor_on_customer_change ON customers;

-- Create triggers
CREATE TRIGGER update_labor_on_scheduling_change
AFTER INSERT OR UPDATE OR DELETE ON scheduling
FOR EACH ROW
EXECUTE FUNCTION trigger_update_labor_on_scheduling();

CREATE TRIGGER update_labor_on_time_clock_change
AFTER INSERT OR UPDATE OR DELETE ON time_clock
FOR EACH ROW
EXECUTE FUNCTION trigger_update_labor_on_time_clock();

CREATE TRIGGER update_labor_on_customer_change
AFTER UPDATE ON customers
FOR EACH ROW
EXECUTE FUNCTION trigger_update_labor_on_customer();
