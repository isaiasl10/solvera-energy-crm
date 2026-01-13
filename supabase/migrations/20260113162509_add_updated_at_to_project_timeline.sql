/*
  # Add updated_at Column to Project Timeline

  1. Overview
    - Adds missing updated_at timestamp column
    - This column is referenced by an existing trigger
    
  2. New Column
    - `updated_at` - Automatically updated timestamp for tracking changes
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'project_timeline' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE project_timeline ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
END $$;