/*
  # Add Battery Fields to Customers and Seed Battery Data

  1. Changes to customers table
    - Add `battery_brand` (text, nullable) - stores selected battery brand
    - Add `battery_quantity` (integer, nullable) - stores number of batteries

  2. Seed batteries table
    - Sonnen: 20kW per unit
    - Duracell: 10kW per unit
    - Enphase: 5kW per unit
    - EP Cube: 3.3kW per unit

  3. Notes
    - Total battery capacity is calculated as: battery_quantity × power_output_kw
    - Example: 3 × Sonnen (20kW each) = 60kW total
*/

-- Add battery fields to customers table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'battery_brand'
  ) THEN
    ALTER TABLE customers ADD COLUMN battery_brand text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'battery_quantity'
  ) THEN
    ALTER TABLE customers ADD COLUMN battery_quantity integer DEFAULT 0;
  END IF;
END $$;

-- Seed batteries table with common battery systems
INSERT INTO batteries (brand, model, capacity_kwh, power_output_kw, cost, warranty_years, is_active)
VALUES
  ('Sonnen', 'Sonnen Battery', 20, 20, 15000, 10, true),
  ('Duracell', 'Duracell Power Center', 10, 10, 8000, 10, true),
  ('Enphase', 'Enphase IQ Battery', 5, 5, 5000, 10, true),
  ('EP Cube', 'EP Cube Battery', 3.3, 3.3, 3500, 10, true)
ON CONFLICT DO NOTHING;