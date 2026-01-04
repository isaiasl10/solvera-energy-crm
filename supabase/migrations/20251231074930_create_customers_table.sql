/*
  # Create Solvera Energy CRM Schema

  ## Overview
  This migration creates the initial database structure for Solvera Energy's CRM system
  to manage solar installation projects from initial customer intake through completion.

  ## New Tables
  
  ### `customers`
  Main customer and project information table containing:
  - `id` (uuid, primary key) - Unique identifier for each customer/project
  - `created_at` (timestamptz) - Record creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp
  - `full_name` (text) - Customer's full name
  - `address` (text) - Installation address
  - `phone` (text) - Contact phone number
  - `email` (text) - Contact email address
  - `system_size_kw` (numeric) - Solar system size in kilowatts
  - `panel_quantity` (integer) - Number of solar panels
  - `panel_brand` (text) - Brand of solar panels
  - `panel_wattage` (integer) - Wattage per panel
  - `inverter_option` (text) - Selected inverter type/model
  - `racking_type` (text) - Type of racking system
  - `status` (text) - Current project status (defaults to 'New Lead')
  
  ## Security
  - Enable Row Level Security (RLS) on `customers` table
  - Add policy for authenticated users to read all customer records
  - Add policy for authenticated users to insert new customer records
  - Add policy for authenticated users to update customer records
  - Add policy for authenticated users to delete customer records
  
  ## Notes
  - All monetary and measurement fields use appropriate numeric types
  - Timestamps are automatically managed with triggers
  - Status field allows tracking project progression through workflow stages
*/

-- Create customers table
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  full_name text NOT NULL,
  address text NOT NULL,
  phone text NOT NULL,
  email text NOT NULL,
  system_size_kw numeric(10,2) NOT NULL,
  panel_quantity integer NOT NULL,
  panel_brand text NOT NULL,
  panel_wattage integer NOT NULL,
  inverter_option text NOT NULL,
  racking_type text NOT NULL,
  status text DEFAULT 'New Lead'
);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Add trigger to automatically update updated_at
CREATE TRIGGER update_customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY "Authenticated users can view all customers"
  ON customers
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert customers"
  ON customers
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update customers"
  ON customers
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete customers"
  ON customers
  FOR DELETE
  TO authenticated
  USING (true);