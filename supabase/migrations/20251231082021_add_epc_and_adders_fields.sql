/*
  # Add EPC PPW and Adders fields

  1. Changes
    - Add `epc_ppw` column to store the EPC price per watt (numeric)
    - Add `adders` column to store adder prices as JSON object (jsonb)
  
  2. Details
    - `epc_ppw`: Price per watt for EPC calculation (e.g., 2.50)
    - `adders`: JSON object storing various adder prices
      Example: {"steep_roof": 1500, "metal_roof": 2000, "tile_roof": 2500, ...}
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'epc_ppw'
  ) THEN
    ALTER TABLE customers ADD COLUMN epc_ppw numeric(10, 2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'adders'
  ) THEN
    ALTER TABLE customers ADD COLUMN adders jsonb DEFAULT '{}'::jsonb;
  END IF;
END $$;