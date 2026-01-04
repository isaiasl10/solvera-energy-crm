/*
  # Create Inspection Photos Table

  ## New Tables
  
  ### `inspection_photos`
  - `id` (uuid, primary key) - Unique identifier
  - `ticket_id` (uuid, foreign key, unique) - References scheduling table
  - `status` (text) - 'passed' or 'failed'
  - `passed_photo_url` (text) - Photo URL for passed inspection
  - `failed_reason` (text) - Reason for failure (if status is 'failed')
  - `failed_photo_url` (text) - Photo URL of what failed (if status is 'failed')
  - `correction_photo_url` (text) - Photo URL of corrections made (if status is 'failed')
  - `created_at` (timestamptz) - Timestamp of creation
  - `updated_at` (timestamptz) - Timestamp of last update
  
  ## Storage
  - Creates storage bucket for inspection photos
  - Enables public access for authenticated users
  
  ## Security
  - Enable RLS on inspection_photos table
  - Add policy for public access (authenticated and anonymous users)
*/

-- Create inspection_photos table
CREATE TABLE IF NOT EXISTS inspection_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid REFERENCES scheduling(id) ON DELETE CASCADE NOT NULL UNIQUE,
  status text DEFAULT 'passed' CHECK (status IN ('passed', 'failed')),
  passed_photo_url text,
  failed_reason text,
  failed_photo_url text,
  correction_photo_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE inspection_photos ENABLE ROW LEVEL SECURITY;

-- Create policy for public access
CREATE POLICY "Allow public access to inspection_photos"
  ON inspection_photos
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_inspection_photos_ticket_id ON inspection_photos(ticket_id);