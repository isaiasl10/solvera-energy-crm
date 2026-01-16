/*
  # Add Utility Bill Upload Support
  
  1. Purpose
    - Add fields to track utility bill uploads for proposals
    - Create storage bucket for utility bill files
  
  2. New Columns
    - `utility_bill_path` (text) - Storage path to uploaded utility bill
    - `utility_bill_name` (text) - Original filename of uploaded bill
    - `utility_bill_uploaded_at` (timestamptz) - Upload timestamp
    - `usage_data_source` (text) - Source of usage data: 'annual', 'monthly', 'utility_bill'
  
  3. Storage Bucket
    - `utility-bills` - Stores uploaded utility bill files (PDF, JPG, PNG)
  
  4. Notes
    - usage_data_source replaces implicit mode detection
    - Allows tracking which method user chose for entering usage data
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'proposals' AND column_name = 'utility_bill_path'
  ) THEN
    ALTER TABLE proposals ADD COLUMN utility_bill_path text DEFAULT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'proposals' AND column_name = 'utility_bill_name'
  ) THEN
    ALTER TABLE proposals ADD COLUMN utility_bill_name text DEFAULT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'proposals' AND column_name = 'utility_bill_uploaded_at'
  ) THEN
    ALTER TABLE proposals ADD COLUMN utility_bill_uploaded_at timestamptz DEFAULT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'proposals' AND column_name = 'usage_data_source'
  ) THEN
    ALTER TABLE proposals ADD COLUMN usage_data_source text DEFAULT 'annual';
  END IF;
END $$;

INSERT INTO storage.buckets (id, name, public)
VALUES ('utility-bills', 'utility-bills', false)
ON CONFLICT (id) DO NOTHING;