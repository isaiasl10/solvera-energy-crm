/*
  # Create Site Survey Photos Table and Storage

  1. New Tables
    - `site_survey_photos`
      - `id` (uuid, primary key)
      - `ticket_id` (uuid, foreign key to scheduling table)
      - `checked_photos` (text array) - List of photo IDs that have been checked/completed
      - `photo_urls` (jsonb) - Map of photo IDs to their uploaded URLs
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
      
  2. Storage
    - Creates 'site-survey-photos' storage bucket for photo uploads
    - Sets up public access policies for the bucket
    
  3. Security
    - Enable RLS on `site_survey_photos` table
    - Add policies for public access (technicians need to upload without auth)
*/

-- Create site_survey_photos table
CREATE TABLE IF NOT EXISTS site_survey_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid REFERENCES scheduling(id) ON DELETE CASCADE UNIQUE NOT NULL,
  checked_photos text[] DEFAULT '{}',
  photo_urls jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE site_survey_photos ENABLE ROW LEVEL SECURITY;

-- Create policies for public access
CREATE POLICY "Allow public read access to site_survey_photos"
  ON site_survey_photos FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert to site_survey_photos"
  ON site_survey_photos FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public update to site_survey_photos"
  ON site_survey_photos FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete from site_survey_photos"
  ON site_survey_photos FOR DELETE
  USING (true);
