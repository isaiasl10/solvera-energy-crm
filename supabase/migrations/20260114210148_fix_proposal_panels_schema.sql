/*
  # Fix proposal_panels Schema

  1. Changes
    - Drop the `orientation` column (if it exists)
    - Add `is_portrait` boolean column (if not exists) with default true
    - This aligns the database schema with the application code

  2. Notes
    - The application code expects `is_portrait` (boolean)
    - The table currently has `orientation` (text)
    - This migration ensures compatibility
*/

DO $$
BEGIN
  -- Drop orientation column if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'proposal_panels' AND column_name = 'orientation'
  ) THEN
    ALTER TABLE proposal_panels DROP COLUMN orientation;
  END IF;

  -- Add is_portrait column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'proposal_panels' AND column_name = 'is_portrait'
  ) THEN
    ALTER TABLE proposal_panels ADD COLUMN is_portrait boolean DEFAULT true;
  END IF;
END $$;