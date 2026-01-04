/*
  # Add Combiner Serial Number to Installation Photos

  1. Changes
    - Add `combiner_serial_number` column to `installation_photos` table
      - Used for storing Enphase combiner panel serial numbers
      - Text field, optional (can be NULL)
  
  2. Notes
    - This field is specific to Enphase installations
    - SolarEdge installations will use the existing `rgm_serial_number` field
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'installation_photos' AND column_name = 'combiner_serial_number'
  ) THEN
    ALTER TABLE installation_photos ADD COLUMN combiner_serial_number text;
  END IF;
END $$;
