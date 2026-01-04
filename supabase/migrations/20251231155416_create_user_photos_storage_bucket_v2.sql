/*
  # Create Storage Bucket for User Photos

  1. New Storage Bucket
    - `user-photos` - Stores profile photos for app users

  2. Security
    - Enable public access for reading (anyone can view photos)
    - Allow authenticated users to upload photos
    - Photos should be accessible via public URLs

  3. Configuration
    - File size limit: 5MB
    - Allowed MIME types: image/jpeg, image/png, image/gif, image/webp
*/

-- Create the storage bucket for user photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('user-photos', 'user-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist to avoid conflicts
DO $$
BEGIN
  DROP POLICY IF EXISTS "Public can view user photos" ON storage.objects;
  DROP POLICY IF EXISTS "Authenticated users can upload user photos" ON storage.objects;
  DROP POLICY IF EXISTS "Authenticated users can update user photos" ON storage.objects;
  DROP POLICY IF EXISTS "Authenticated users can delete user photos" ON storage.objects;
END $$;

-- Allow public read access to user photos
CREATE POLICY "Public can view user photos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'user-photos');

-- Allow authenticated users to upload photos
CREATE POLICY "Authenticated users can upload user photos"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'user-photos');

-- Allow authenticated users to update their photos
CREATE POLICY "Authenticated users can update user photos"
ON storage.objects FOR UPDATE
TO public
USING (bucket_id = 'user-photos');

-- Allow authenticated users to delete photos
CREATE POLICY "Authenticated users can delete user photos"
ON storage.objects FOR DELETE
TO public
USING (bucket_id = 'user-photos');