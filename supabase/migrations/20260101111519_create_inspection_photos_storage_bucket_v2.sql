/*
  # Create Inspection Photos Storage Bucket

  ## Storage Configuration
  
  1. Creates storage bucket 'inspection-photos'
    - Public bucket for easy access
    - Used to store:
      - Passed inspection photos
      - Failed inspection photos
      - Correction photos for failed inspections
  
  2. Storage Policies
    - Public read access for all users
    - Authenticated users can upload/update/delete
  
  ## Notes
  - Photos organized by ticket ID folders
  - Supports common image formats (jpg, png, webp)
*/

-- Create storage bucket for inspection photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('inspection-photos', 'inspection-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public read access for inspection photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload inspection photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update inspection photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete inspection photos" ON storage.objects;

-- Policy: Allow public read access
CREATE POLICY "Public read access for inspection photos"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'inspection-photos');

-- Policy: Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload inspection photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'inspection-photos');

-- Policy: Allow authenticated users to update
CREATE POLICY "Authenticated users can update inspection photos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'inspection-photos')
  WITH CHECK (bucket_id = 'inspection-photos');

-- Policy: Allow authenticated users to delete
CREATE POLICY "Authenticated users can delete inspection photos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'inspection-photos');