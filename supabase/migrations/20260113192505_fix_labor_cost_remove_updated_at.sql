/*
  # Fix Labor Cost Calculation - Remove updated_at

  1. Changes
    - Remove updated_at from the UPDATE statement
    - Customers table doesn't have this column (uses updated_at from supabase.realtime)
*/

-- Drop and recreate function without updated_at
DROP FUNCTION IF EXISTS calculate_customer_labor_costs(text);

CREATE OR REPLACE FUNCTION calculate_customer_labor_costs(p_customer_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_battery_pay numeric := 0;
  v_hourly_pay numeric := 0;
  v_per_watt_pay numeric := 0;
  v_total numeric := 0;
  v_breakdown jsonb := '[]'::jsonb;
  v_customer_record record;
BEGIN
  -- Get customer record with system size and battery quantity
  SELECT system_size_kw, battery_quantity
  INTO v_customer_record
  FROM customers
  WHERE id::text = p_customer_id;

  -- Calculate battery pay from completed installation tickets
  WITH battery_costs AS (
    SELECT 
      u.id as user_id,
      u.full_name,
      u.battery_pay_rates,
      c.battery_quantity,
      CASE 
        WHEN c.battery_quantity > 0 AND u.battery_pay_rates IS NOT NULL THEN
          COALESCE(
            (u.battery_pay_rates->>LEAST(c.battery_quantity, 4)::text)::numeric,
            (u.battery_pay_rates->>'4')::numeric,
            0
          )
        ELSE 0
      END as battery_pay
    FROM scheduling s
    INNER JOIN customers c ON s.customer_id = c.id
    INNER JOIN app_users u ON s.pv_installer_id = u.id
    WHERE c.id::text = p_customer_id
      AND s.ticket_type = 'installation'
      AND s.closed_at IS NOT NULL
      AND c.battery_quantity > 0
  )
  SELECT 
    COALESCE(SUM(battery_pay), 0),
    COALESCE(jsonb_agg(
      jsonb_build_object(
        'user_id', user_id,
        'user_name', full_name,
        'type', 'battery_pay',
        'amount', battery_pay
      )
    ) FILTER (WHERE battery_pay > 0), '[]'::jsonb)
  INTO v_battery_pay, v_breakdown
  FROM battery_costs;

  -- Calculate hourly pay from time clock entries
  WITH hourly_costs AS (
    SELECT 
      tc.user_id,
      u.full_name,
      u.hourly_rate,
      EXTRACT(EPOCH FROM (tc.clock_out_time - tc.clock_in_time)) / 3600 as hours_worked,
      (EXTRACT(EPOCH FROM (tc.clock_out_time - tc.clock_in_time)) / 3600) * COALESCE(u.hourly_rate, 0) as hourly_pay
    FROM time_clock tc
    INNER JOIN app_users u ON tc.user_id = u.id
    WHERE tc.customer_id::text = p_customer_id
      AND tc.clock_out_time IS NOT NULL
  )
  SELECT 
    COALESCE(SUM(hourly_pay), 0),
    v_breakdown || COALESCE(jsonb_agg(
      jsonb_build_object(
        'user_id', user_id,
        'user_name', full_name,
        'type', 'hourly_pay',
        'hours', ROUND(hours_worked::numeric, 2),
        'rate', hourly_rate,
        'amount', ROUND(hourly_pay::numeric, 2)
      )
    ) FILTER (WHERE hourly_pay > 0), '[]'::jsonb)
  INTO v_hourly_pay, v_breakdown
  FROM hourly_costs;

  -- Calculate per watt pay from completed installation tickets
  WITH ppw_costs AS (
    SELECT 
      u.id as user_id,
      u.full_name,
      u.per_watt_rate,
      c.system_size_kw,
      (c.system_size_kw * 1000) * COALESCE(u.per_watt_rate, 0) as ppw_pay
    FROM scheduling s
    INNER JOIN customers c ON s.customer_id = c.id
    INNER JOIN app_users u ON s.pv_installer_id = u.id
    WHERE c.id::text = p_customer_id
      AND s.ticket_type = 'installation'
      AND s.closed_at IS NOT NULL
      AND c.system_size_kw > 0
  )
  SELECT 
    COALESCE(SUM(ppw_pay), 0),
    v_breakdown || COALESCE(jsonb_agg(
      jsonb_build_object(
        'user_id', user_id,
        'user_name', full_name,
        'type', 'per_watt_pay',
        'system_size_kw', system_size_kw,
        'rate', per_watt_rate,
        'amount', ROUND(ppw_pay::numeric, 2)
      )
    ) FILTER (WHERE ppw_pay > 0), '[]'::jsonb)
  INTO v_per_watt_pay, v_breakdown
  FROM ppw_costs;

  -- Calculate total
  v_total := v_battery_pay + v_hourly_pay + v_per_watt_pay;

  -- Update customer record
  UPDATE customers
  SET 
    labor_battery_pay = v_battery_pay,
    labor_hourly_pay = v_hourly_pay,
    labor_per_watt_pay = v_per_watt_pay,
    labor_total = v_total,
    labor_breakdown = v_breakdown
  WHERE id::text = p_customer_id;

END;
$$;
