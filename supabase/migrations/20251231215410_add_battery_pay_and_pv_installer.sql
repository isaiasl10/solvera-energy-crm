/*
  # Add Battery Pay and PV Installer Role

  1. Changes to app_users table
    - Add `battery_pay_rates` (jsonb) - stores battery pay by quantity (e.g., {"1": 500, "2": 700, "3": 800})
    - Add `per_watt_rate` (numeric) - stores per-watt rate for PV installers (e.g., 0.05)
    - Add 'pv_installer' to role enum

  2. Purpose
    - Battery Techs and Electricians get paid based on number of batteries installed per job
    - PV Installers get paid per watt (system size × per_watt_rate)
    - Estimated paycheck = hourly pay + battery/per-watt pay for scheduled jobs

  3. Security
    - Existing RLS policies apply to new fields
*/

-- Add battery pay rates and per-watt rate fields to app_users
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'app_users' AND column_name = 'battery_pay_rates'
  ) THEN
    ALTER TABLE app_users ADD COLUMN battery_pay_rates jsonb DEFAULT '{}'::jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'app_users' AND column_name = 'per_watt_rate'
  ) THEN
    ALTER TABLE app_users ADD COLUMN per_watt_rate numeric DEFAULT 0;
  END IF;
END $$;

-- Drop existing role constraint
ALTER TABLE app_users DROP CONSTRAINT IF EXISTS app_users_role_check;

-- Add updated role constraint including pv_installer
ALTER TABLE app_users ADD CONSTRAINT app_users_role_check 
CHECK (role = ANY (ARRAY[
  'customer_service'::text, 
  'procurement'::text, 
  'scheduling'::text, 
  'field_ops_manager'::text, 
  'office_manager'::text, 
  'project_manager'::text, 
  'procurement_manager'::text, 
  'roof_lead'::text, 
  'foreman'::text, 
  'battery_tech'::text, 
  'service_tech'::text, 
  'journeyman_electrician'::text, 
  'master_electrician'::text, 
  'apprentice_electrician'::text, 
  'residential_wireman'::text,
  'pv_installer'::text,
  'admin'::text, 
  'technician'::text, 
  'manager'::text, 
  'sales_rep'::text
]));