/*
  # Create Financing System Tables

  1. New Tables
    - `financiers`
      - `id` (uuid, primary key)
      - `name` (text) - Name of the financing company (e.g., Mosaic, Sunlight, GoodLeap)
      - `active` (boolean) - Whether this financier is active
      - `created_at` (timestamp)
    
    - `financing_products`
      - `id` (uuid, primary key)
      - `financier_id` (uuid, foreign key to financiers)
      - `product_name` (text) - Name of the loan/lease/PPA product
      - `product_type` (text) - 'LOAN', 'LEASE', or 'PPA'
      - `term_months` (integer) - Term length in months
      - `apr` (numeric) - Annual percentage rate
      - `active` (boolean) - Whether this product is active
      - `created_at` (timestamp)
    
    - `customer_financing`
      - `id` (uuid, primary key)
      - `customer_id` (uuid, foreign key to customers)
      - `contract_type` (text) - 'CASH', 'LOAN', 'LEASE', or 'PPA'
      - `financing_product_id` (uuid, nullable, foreign key to financing_products)
      - `deposit_amount` (numeric) - For CASH contracts
      - `deposit_received` (boolean) - Whether deposit has been received
      - `deposit_received_date` (timestamp)
      - `pre_install_payment_amount` (numeric) - For CASH contracts
      - `pre_install_payment_received` (boolean)
      - `pre_install_payment_received_date` (timestamp)
      - `final_payment_amount` (numeric) - For CASH contracts
      - `final_payment_received` (boolean)
      - `final_payment_received_date` (timestamp)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for public access (since we're using anon key)
*/

-- Create financiers table
CREATE TABLE IF NOT EXISTS financiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE financiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to financiers"
  ON financiers FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow public insert access to financiers"
  ON financiers FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow public update access to financiers"
  ON financiers FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete access to financiers"
  ON financiers FOR DELETE
  TO anon
  USING (true);

-- Create financing_products table
CREATE TABLE IF NOT EXISTS financing_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  financier_id uuid REFERENCES financiers(id) ON DELETE CASCADE,
  product_name text NOT NULL,
  product_type text NOT NULL CHECK (product_type IN ('LOAN', 'LEASE', 'PPA')),
  term_months integer NOT NULL,
  apr numeric(5,2) DEFAULT 0,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE financing_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to financing_products"
  ON financing_products FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow public insert access to financing_products"
  ON financing_products FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow public update access to financing_products"
  ON financing_products FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete access to financing_products"
  ON financing_products FOR DELETE
  TO anon
  USING (true);

-- Create customer_financing table
CREATE TABLE IF NOT EXISTS customer_financing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE,
  contract_type text NOT NULL CHECK (contract_type IN ('CASH', 'LOAN', 'LEASE', 'PPA')),
  financing_product_id uuid REFERENCES financing_products(id) ON DELETE SET NULL,
  deposit_amount numeric(10,2) DEFAULT 0,
  deposit_received boolean DEFAULT false,
  deposit_received_date timestamptz,
  pre_install_payment_amount numeric(10,2) DEFAULT 0,
  pre_install_payment_received boolean DEFAULT false,
  pre_install_payment_received_date timestamptz,
  final_payment_amount numeric(10,2) DEFAULT 0,
  final_payment_received boolean DEFAULT false,
  final_payment_received_date timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE customer_financing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to customer_financing"
  ON customer_financing FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow public insert access to customer_financing"
  ON customer_financing FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow public update access to customer_financing"
  ON customer_financing FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete access to customer_financing"
  ON customer_financing FOR DELETE
  TO anon
  USING (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_financing_products_financier ON financing_products(financier_id);
CREATE INDEX IF NOT EXISTS idx_customer_financing_customer ON customer_financing(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_financing_product ON customer_financing(financing_product_id);