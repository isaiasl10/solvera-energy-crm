/*
  # Add System Details Fields to Proposals

  1. New Columns
    - `inverter_type` (text) - Type/brand of inverter
    - `racking_type` (text) - Type/brand of racking system
    - `roof_type` (text) - Type of roof (composition, tile, metal, flat)
    - `battery_brand` (text) - Brand of battery
    - `battery_quantity` (integer) - Number of batteries

  2. Purpose
    - Enable proposal workspace to save system details
    - Match fields available in customers table
*/

ALTER TABLE proposals
ADD COLUMN IF NOT EXISTS inverter_type text,
ADD COLUMN IF NOT EXISTS racking_type text,
ADD COLUMN IF NOT EXISTS roof_type text,
ADD COLUMN IF NOT EXISTS battery_brand text,
ADD COLUMN IF NOT EXISTS battery_quantity integer DEFAULT 0;