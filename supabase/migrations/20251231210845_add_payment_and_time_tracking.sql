/*
  # Add Payment Preferences and Time Tracking

  1. Changes to app_users table
    - Add hourly_rate (numeric) - hourly pay rate for non-salary employees
    - Add is_salary (boolean) - whether employee is salaried
    - Add payment_method (text) - 'check' or 'direct_deposit'
    - Add check_address (text) - mailing address for check payments
    - Add bank_name (text) - bank name for direct deposit
    - Add account_name (text) - account holder name for direct deposit
    - Add routing_number (text) - bank routing number
    - Add account_number_encrypted (text) - encrypted account number

  2. New Tables
    - `time_clock`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to app_users)
      - `clock_in_time` (timestamptz)
      - `clock_in_latitude` (numeric)
      - `clock_in_longitude` (numeric)
      - `clock_out_time` (timestamptz, nullable)
      - `clock_out_latitude` (numeric, nullable)
      - `clock_out_longitude` (numeric, nullable)
      - `total_hours` (numeric, nullable)
      - `created_at` (timestamptz)

  3. Security
    - Enable RLS on time_clock table
    - Users can only view and manage their own time clock entries
    - Admins can view all entries
*/

-- Add payment and hourly rate fields to app_users
ALTER TABLE app_users
ADD COLUMN IF NOT EXISTS hourly_rate numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_salary boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS payment_method text,
ADD COLUMN IF NOT EXISTS check_address text,
ADD COLUMN IF NOT EXISTS bank_name text,
ADD COLUMN IF NOT EXISTS account_name text,
ADD COLUMN IF NOT EXISTS routing_number text,
ADD COLUMN IF NOT EXISTS account_number_encrypted text;

-- Add constraint for payment_method
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'app_users_payment_method_check'
  ) THEN
    ALTER TABLE app_users
    ADD CONSTRAINT app_users_payment_method_check
    CHECK (payment_method IN ('check', 'direct_deposit') OR payment_method IS NULL);
  END IF;
END $$;

-- Create time_clock table
CREATE TABLE IF NOT EXISTS time_clock (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  clock_in_time timestamptz NOT NULL DEFAULT now(),
  clock_in_latitude numeric,
  clock_in_longitude numeric,
  clock_out_time timestamptz,
  clock_out_latitude numeric,
  clock_out_longitude numeric,
  total_hours numeric,
  created_at timestamptz DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_time_clock_user_id ON time_clock(user_id);
CREATE INDEX IF NOT EXISTS idx_time_clock_clock_in_time ON time_clock(clock_in_time);

-- Enable RLS
ALTER TABLE time_clock ENABLE ROW LEVEL SECURITY;

-- RLS Policies for time_clock
CREATE POLICY "Users can view own time clock entries"
  ON time_clock FOR SELECT
  TO authenticated
  USING (user_id = (SELECT id FROM app_users WHERE email = auth.email()));

CREATE POLICY "Users can insert own time clock entries"
  ON time_clock FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT id FROM app_users WHERE email = auth.email()));

CREATE POLICY "Users can update own time clock entries"
  ON time_clock FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT id FROM app_users WHERE email = auth.email()))
  WITH CHECK (user_id = (SELECT id FROM app_users WHERE email = auth.email()));

CREATE POLICY "Admins can view all time clock entries"
  ON time_clock FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.email = auth.email()
      AND app_users.role_category IN ('admin', 'management')
    )
  );