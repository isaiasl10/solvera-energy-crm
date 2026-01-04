/*
  # Commission Tracking System

  1. New Tables
    - `sales_commissions`
      - `id` (uuid, primary key)
      - `customer_id` (uuid, references customers)
      - `sales_rep_id` (uuid, references app_users)
      - `sales_manager_id` (uuid, references app_users, nullable)
      - `total_commission` (decimal) - Total commission amount calculated from sale
      - `sales_manager_override_amount` (decimal, nullable) - Override amount if applicable
      - `m1_payment_amount` (decimal, default 1000) - First milestone payment
      - `m1_payment_status` (text) - 'pending', 'eligible', 'paid'
      - `m1_eligibility_date` (date) - Signature date + 3 days
      - `m1_paid_date` (date, nullable)
      - `m1_payroll_period_end` (date, nullable) - Which payroll period this was paid in
      - `m2_payment_amount` (decimal) - Remaining commission (total - m1)
      - `m2_payment_status` (text) - 'pending', 'eligible', 'paid'
      - `m2_paid_date` (date, nullable)
      - `m2_payroll_period_end` (date, nullable)
      - `site_survey_complete_date` (date, nullable)
      - `install_complete_date` (date, nullable)
      - `signature_date` (date)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `sales_commissions` table
    - Policies for authenticated users to read their own commission data
    - Policies for sales managers and admins to read all commission data
    - Policies for admins/payroll to update payment status
*/

CREATE TABLE IF NOT EXISTS sales_commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
  sales_rep_id uuid REFERENCES app_users(id) ON DELETE CASCADE NOT NULL,
  sales_manager_id uuid REFERENCES app_users(id) ON DELETE SET NULL,
  total_commission decimal(10,2) DEFAULT 0 NOT NULL,
  sales_manager_override_amount decimal(10,2),
  m1_payment_amount decimal(10,2) DEFAULT 1000 NOT NULL,
  m1_payment_status text DEFAULT 'pending' CHECK (m1_payment_status IN ('pending', 'eligible', 'paid')) NOT NULL,
  m1_eligibility_date date,
  m1_paid_date date,
  m1_payroll_period_end date,
  m2_payment_amount decimal(10,2) DEFAULT 0 NOT NULL,
  m2_payment_status text DEFAULT 'pending' CHECK (m2_payment_status IN ('pending', 'eligible', 'paid')) NOT NULL,
  m2_paid_date date,
  m2_payroll_period_end date,
  site_survey_complete_date date,
  install_complete_date date,
  signature_date date NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(customer_id)
);

-- Enable RLS
ALTER TABLE sales_commissions ENABLE ROW LEVEL SECURITY;

-- Sales reps can view their own commissions
CREATE POLICY "Sales reps can view own commissions"
  ON sales_commissions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.id = auth.uid()
      AND app_users.role = 'sales_rep'
      AND sales_commissions.sales_rep_id = auth.uid()
    )
  );

-- Sales managers can view all commissions for their team
CREATE POLICY "Sales managers can view team commissions"
  ON sales_commissions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.id = auth.uid()
      AND app_users.role = 'sales_manager'
    )
  );

-- Admins can view all commissions
CREATE POLICY "Admins can view all commissions"
  ON sales_commissions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.id = auth.uid()
      AND app_users.role = 'admin'
    )
  );

-- Admins and sales managers can insert commissions
CREATE POLICY "Admins and managers can insert commissions"
  ON sales_commissions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.id = auth.uid()
      AND app_users.role IN ('admin', 'sales_manager')
    )
  );

-- Admins and sales managers can update commissions
CREATE POLICY "Admins and managers can update commissions"
  ON sales_commissions
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.id = auth.uid()
      AND app_users.role IN ('admin', 'sales_manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.id = auth.uid()
      AND app_users.role IN ('admin', 'sales_manager')
    )
  );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_sales_commissions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS set_sales_commissions_updated_at ON sales_commissions;
CREATE TRIGGER set_sales_commissions_updated_at
  BEFORE UPDATE ON sales_commissions
  FOR EACH ROW
  EXECUTE FUNCTION update_sales_commissions_updated_at();

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_sales_commissions_sales_rep_id ON sales_commissions(sales_rep_id);
CREATE INDEX IF NOT EXISTS idx_sales_commissions_customer_id ON sales_commissions(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_commissions_m1_status ON sales_commissions(m1_payment_status);
CREATE INDEX IF NOT EXISTS idx_sales_commissions_m2_status ON sales_commissions(m2_payment_status);