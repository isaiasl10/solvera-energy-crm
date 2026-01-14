/*
  # Fix Documents RLS Policies for Authenticated Users

  1. Changes
    - Add RLS policies for authenticated users on documents table
    - Add storage policies for authenticated users on customer-documents bucket
    
  2. Security
    - Allow authenticated users to view all documents
    - Allow authenticated users to insert documents
    - Allow authenticated users to update documents
    - Allow authenticated users to delete documents
    - Apply same policies to storage bucket
*/

-- Add authenticated user policies for documents table
CREATE POLICY "Authenticated users can view documents"
  ON documents FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert documents"
  ON documents FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update documents"
  ON documents FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete documents"
  ON documents FOR DELETE
  TO authenticated
  USING (true);

-- Add authenticated user policies for storage bucket
CREATE POLICY "Authenticated users can upload documents"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'customer-documents');

CREATE POLICY "Authenticated users can view storage documents"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'customer-documents');

CREATE POLICY "Authenticated users can update storage documents"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'customer-documents')
  WITH CHECK (bucket_id = 'customer-documents');

CREATE POLICY "Authenticated users can delete storage documents"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'customer-documents');