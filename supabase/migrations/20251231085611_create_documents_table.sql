/*
  # Create documents table for customer file uploads

  1. New Tables
    - `documents`
      - `id` (uuid, primary key)
      - `customer_id` (uuid, foreign key to customers table)
      - `document_type` (text) - Type of document: contract, utility_bill, identification, permit, plans, approved_plans_and_letter
      - `identification_type` (text, nullable) - For identification documents: passport, drivers_license_front, drivers_license_back, state_id_front, state_id_back
      - `file_name` (text) - Original filename
      - `file_path` (text) - Storage path in Supabase Storage
      - `file_size` (bigint) - File size in bytes
      - `mime_type` (text) - MIME type of the file
      - `uploaded_at` (timestamptz) - When the file was uploaded
      
  2. Security
    - Enable RLS on `documents` table
    - Add policy for anyone to read documents
    - Add policy for anyone to insert documents
    - Add policy for anyone to update documents
    - Add policy for anyone to delete documents
    
  3. Storage
    - Create storage bucket for customer documents
    - Enable public access for document viewing
*/

-- Create documents table
CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
  document_type text NOT NULL,
  identification_type text,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size bigint NOT NULL,
  mime_type text NOT NULL,
  uploaded_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Create policies for public access
CREATE POLICY "Anyone can view documents"
  ON documents FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anyone can insert documents"
  ON documents FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anyone can update documents"
  ON documents FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete documents"
  ON documents FOR DELETE
  TO anon
  USING (true);

-- Create storage bucket for documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('customer-documents', 'customer-documents', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for public access
CREATE POLICY "Anyone can upload documents"
  ON storage.objects FOR INSERT
  TO anon
  WITH CHECK (bucket_id = 'customer-documents');

CREATE POLICY "Anyone can view documents"
  ON storage.objects FOR SELECT
  TO anon
  USING (bucket_id = 'customer-documents');

CREATE POLICY "Anyone can update documents"
  ON storage.objects FOR UPDATE
  TO anon
  USING (bucket_id = 'customer-documents')
  WITH CHECK (bucket_id = 'customer-documents');

CREATE POLICY "Anyone can delete documents"
  ON storage.objects FOR DELETE
  TO anon
  USING (bucket_id = 'customer-documents');