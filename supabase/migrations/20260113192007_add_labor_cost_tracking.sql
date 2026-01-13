/*
  # Add Labor Cost Tracking to EPC Costs

  1. New Fields
    - Add labor cost breakdown fields to customers table:
      - `labor_battery_pay` (numeric) - Total battery installation pay
      - `labor_hourly_pay` (numeric) - Total hourly labor costs from time clock
      - `labor_per_watt_pay` (numeric) - Per watt installation pay
      - `labor_total` (numeric) - Total of all labor costs
      - `labor_breakdown` (jsonb) - Detailed breakdown by worker and ticket

  2. Changes
    - These fields will auto-calculate based on:
      - Time clock entries for the customer
      - Scheduling tickets (installations with batteries)
      - System size and installer PPW rates
      - Hourly rates from time clock entries

  3. Notes
    - Labor costs are tracked per customer to show true cost per job
    - Allows calculation of net profit per project
    - Updates automatically when time entries or tickets are modified
*/

-- Add labor cost fields to customers table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'labor_battery_pay'
  ) THEN
    ALTER TABLE customers ADD COLUMN labor_battery_pay numeric(10,2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'labor_hourly_pay'
  ) THEN
    ALTER TABLE customers ADD COLUMN labor_hourly_pay numeric(10,2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'labor_per_watt_pay'
  ) THEN
    ALTER TABLE customers ADD COLUMN labor_per_watt_pay numeric(10,2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'labor_total'
  ) THEN
    ALTER TABLE customers ADD COLUMN labor_total numeric(10,2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'labor_breakdown'
  ) THEN
    ALTER TABLE customers ADD COLUMN labor_breakdown jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;
