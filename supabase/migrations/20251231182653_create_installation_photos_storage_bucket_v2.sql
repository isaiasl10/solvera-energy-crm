/*
  # Create Installation Photos Storage Bucket

  1. Storage Setup
    - Create a storage bucket for installation photos
    - Allow public access for authenticated users
    - Enable file uploads up to 10MB per file
    
  2. Security
    - Allow authenticated and anonymous users to upload
    - Allow public read access to photos
*/

-- Create storage bucket for installation photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'installation-photos',
  'installation-photos',
  true,
  10485760,
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/heic', 'image/heif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public can view installation photos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload installation photos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can update installation photos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete installation photos" ON storage.objects;

-- Allow public access to view photos
CREATE POLICY "Public can view installation photos"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'installation-photos');

-- Allow authenticated and anonymous users to upload
CREATE POLICY "Anyone can upload installation photos"
  ON storage.objects
  FOR INSERT
  TO public
  WITH CHECK (bucket_id = 'installation-photos');

-- Allow users to update their own uploads
CREATE POLICY "Anyone can update installation photos"
  ON storage.objects
  FOR UPDATE
  TO public
  USING (bucket_id = 'installation-photos')
  WITH CHECK (bucket_id = 'installation-photos');

-- Allow users to delete photos
CREATE POLICY "Anyone can delete installation photos"
  ON storage.objects
  FOR DELETE
  TO public
  USING (bucket_id = 'installation-photos');