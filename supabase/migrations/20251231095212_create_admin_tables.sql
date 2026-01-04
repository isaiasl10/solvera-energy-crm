/*
  # Create Administration Tables

  1. New Tables
    - `custom_adders`
      - `id` (uuid, primary key)
      - `name` (text) - Name of the adder
      - `description` (text) - Description of what the adder is for
      - `calculation_type` (text) - 'per_kw', 'per_panel', 'flat_rate'
      - `rate` (decimal) - The rate/cost per unit
      - `is_active` (boolean) - Whether the adder is currently active
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `inverters`
      - `id` (uuid, primary key)
      - `brand` (text) - Inverter brand
      - `model` (text) - Inverter model
      - `capacity_kw` (decimal) - Capacity in kW
      - `type` (text) - 'string', 'micro', 'hybrid'
      - `cost` (decimal) - Cost of the inverter
      - `warranty_years` (integer) - Warranty period
      - `is_active` (boolean)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `optimizers`
      - `id` (uuid, primary key)
      - `brand` (text)
      - `model` (text)
      - `max_power_w` (integer) - Max power in watts
      - `cost` (decimal)
      - `warranty_years` (integer)
      - `is_active` (boolean)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `batteries`
      - `id` (uuid, primary key)
      - `brand` (text)
      - `model` (text)
      - `capacity_kwh` (decimal) - Capacity in kWh
      - `power_output_kw` (decimal) - Power output in kW
      - `cost` (decimal)
      - `warranty_years` (integer)
      - `is_active` (boolean)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `racking`
      - `id` (uuid, primary key)
      - `brand` (text)
      - `model` (text)
      - `roof_type` (text) - 'composition', 'tile', 'metal', 'flat'
      - `cost_per_panel` (decimal)
      - `warranty_years` (integer)
      - `is_active` (boolean)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `panels`
      - `id` (uuid, primary key)
      - `brand` (text)
      - `model` (text)
      - `wattage` (integer) - Panel wattage
      - `efficiency` (decimal) - Panel efficiency percentage
      - `cost` (decimal) - Cost per panel
      - `warranty_years` (integer)
      - `dimensions_length` (decimal) - Length in inches
      - `dimensions_width` (decimal) - Width in inches
      - `is_active` (boolean)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for public access (matching existing pattern)
*/

CREATE TABLE IF NOT EXISTS custom_adders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  calculation_type text NOT NULL CHECK (calculation_type IN ('per_kw', 'per_panel', 'flat_rate')),
  rate decimal NOT NULL DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS inverters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand text NOT NULL,
  model text NOT NULL,
  capacity_kw decimal NOT NULL DEFAULT 0,
  type text NOT NULL CHECK (type IN ('string', 'micro', 'hybrid')),
  cost decimal DEFAULT 0,
  warranty_years integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS optimizers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand text NOT NULL,
  model text NOT NULL,
  max_power_w integer NOT NULL DEFAULT 0,
  cost decimal DEFAULT 0,
  warranty_years integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS batteries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand text NOT NULL,
  model text NOT NULL,
  capacity_kwh decimal NOT NULL DEFAULT 0,
  power_output_kw decimal DEFAULT 0,
  cost decimal DEFAULT 0,
  warranty_years integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS racking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand text NOT NULL,
  model text NOT NULL,
  roof_type text NOT NULL CHECK (roof_type IN ('composition', 'tile', 'metal', 'flat')),
  cost_per_panel decimal DEFAULT 0,
  warranty_years integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS panels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand text NOT NULL,
  model text NOT NULL,
  wattage integer NOT NULL DEFAULT 0,
  efficiency decimal DEFAULT 0,
  cost decimal DEFAULT 0,
  warranty_years integer DEFAULT 0,
  dimensions_length decimal DEFAULT 0,
  dimensions_width decimal DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE custom_adders ENABLE ROW LEVEL SECURITY;
ALTER TABLE inverters ENABLE ROW LEVEL SECURITY;
ALTER TABLE optimizers ENABLE ROW LEVEL SECURITY;
ALTER TABLE batteries ENABLE ROW LEVEL SECURITY;
ALTER TABLE racking ENABLE ROW LEVEL SECURITY;
ALTER TABLE panels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public access to custom_adders"
  ON custom_adders
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public access to inverters"
  ON inverters
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public access to optimizers"
  ON optimizers
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public access to batteries"
  ON batteries
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public access to racking"
  ON racking
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public access to panels"
  ON panels
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);