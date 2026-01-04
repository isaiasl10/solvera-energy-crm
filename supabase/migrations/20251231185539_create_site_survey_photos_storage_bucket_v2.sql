/*
  # Create Site Survey Photos Storage Bucket

  1. Storage Bucket
    - Creates 'site-survey-photos' bucket for storing site survey photos
    - Sets bucket to public access
    
  2. Security
    - Adds RLS policies for public access to upload and read photos
    - Technicians can upload photos without authentication
*/

-- Create storage bucket for site survey photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('site-survey-photos', 'site-survey-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public to upload files
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Allow public uploads to site-survey-photos'
  ) THEN
    CREATE POLICY "Allow public uploads to site-survey-photos"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'site-survey-photos');
  END IF;
END $$;

-- Allow public to read files
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Allow public read from site-survey-photos'
  ) THEN
    CREATE POLICY "Allow public read from site-survey-photos"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'site-survey-photos');
  END IF;
END $$;

-- Allow public to delete files
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Allow public delete from site-survey-photos'
  ) THEN
    CREATE POLICY "Allow public delete from site-survey-photos"
    ON storage.objects FOR DELETE
    USING (bucket_id = 'site-survey-photos');
  END IF;
END $$;
