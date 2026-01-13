/*
  # Add City Inspection Tracking Columns

  1. Overview
    - Adds missing city inspection tracking columns to project_timeline
    
  2. New Columns
    - `city_inspection_status` - Status of city inspection (passed/failed)
    - `city_inspection_notes` - Notes about the inspection
*/

DO $$
BEGIN
  -- Add city_inspection_status if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'project_timeline' AND column_name = 'city_inspection_status'
  ) THEN
    ALTER TABLE project_timeline ADD COLUMN city_inspection_status text;
  END IF;

  -- Add city_inspection_notes if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'project_timeline' AND column_name = 'city_inspection_notes'
  ) THEN
    ALTER TABLE project_timeline ADD COLUMN city_inspection_notes text;
  END IF;
END $$;