/*
  # Create Storage Buckets for Detach, Reset, and Service Photos

  1. Storage Buckets
    - `detach-photos` - Public bucket for detach photos
    - `reset-photos` - Public bucket for reset photos
    - `service-photos` - Public bucket for service photos

  2. Security
    - Allow authenticated users to upload, update, and delete photos
    - Make buckets publicly readable
*/

-- Create detach-photos bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('detach-photos', 'detach-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Create reset-photos bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('reset-photos', 'reset-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Create service-photos bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('service-photos', 'service-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Policies for detach-photos bucket
CREATE POLICY "Authenticated users can upload detach photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'detach-photos');

CREATE POLICY "Authenticated users can update detach photos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'detach-photos')
  WITH CHECK (bucket_id = 'detach-photos');

CREATE POLICY "Authenticated users can delete detach photos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'detach-photos');

CREATE POLICY "Anyone can view detach photos"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'detach-photos');

-- Policies for reset-photos bucket
CREATE POLICY "Authenticated users can upload reset photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'reset-photos');

CREATE POLICY "Authenticated users can update reset photos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'reset-photos')
  WITH CHECK (bucket_id = 'reset-photos');

CREATE POLICY "Authenticated users can delete reset photos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'reset-photos');

CREATE POLICY "Anyone can view reset photos"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'reset-photos');

-- Policies for service-photos bucket
CREATE POLICY "Authenticated users can upload service photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'service-photos');

CREATE POLICY "Authenticated users can update service photos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'service-photos')
  WITH CHECK (bucket_id = 'service-photos');

CREATE POLICY "Authenticated users can delete service photos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'service-photos');

CREATE POLICY "Anyone can view service photos"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'service-photos');
