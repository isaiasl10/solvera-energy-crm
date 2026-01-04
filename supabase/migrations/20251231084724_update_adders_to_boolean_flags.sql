/*
  # Update Adders System to Boolean Flags

  1. Changes
    - Remove the old JSONB adders column
    - Add individual boolean columns for each adder type
    - Adders are now selected per job with automatic price calculation
  
  2. New Columns
    - `adder_steep_roof` (boolean) - $0.10 × system size
    - `adder_metal_roof` (boolean) - $0.10 × system size
    - `adder_tile_roof` (boolean) - $0.15 × system size
    - `adder_small_system` (boolean) - $1,000 flat
    - `adder_fsu` (boolean) - $3,500 flat
    - `adder_mpu` (boolean) - $2,500 flat
    - `adder_critter_guard` (boolean) - $50 × panel quantity
*/

DO $$
BEGIN
  -- Drop old adders column if exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'adders'
  ) THEN
    ALTER TABLE customers DROP COLUMN adders;
  END IF;

  -- Add new boolean columns for each adder
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'adder_steep_roof'
  ) THEN
    ALTER TABLE customers ADD COLUMN adder_steep_roof BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'adder_metal_roof'
  ) THEN
    ALTER TABLE customers ADD COLUMN adder_metal_roof BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'adder_tile_roof'
  ) THEN
    ALTER TABLE customers ADD COLUMN adder_tile_roof BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'adder_small_system'
  ) THEN
    ALTER TABLE customers ADD COLUMN adder_small_system BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'adder_fsu'
  ) THEN
    ALTER TABLE customers ADD COLUMN adder_fsu BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'adder_mpu'
  ) THEN
    ALTER TABLE customers ADD COLUMN adder_mpu BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'adder_critter_guard'
  ) THEN
    ALTER TABLE customers ADD COLUMN adder_critter_guard BOOLEAN DEFAULT false;
  END IF;
END $$;