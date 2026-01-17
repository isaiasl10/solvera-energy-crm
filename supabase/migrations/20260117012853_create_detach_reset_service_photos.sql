/*
  # Create Detach, Reset, and Service Photo Tickets

  1. New Tables
    - `detach_photos` - Photos for detach tickets
      - `id` (uuid, primary key)
      - `ticket_id` (uuid, unique, references scheduling)
      - `checked_photos` (jsonb) - Array of checked photo IDs
      - `photo_urls` (jsonb) - Object mapping photo IDs to URLs
      - `footing_brand` (text) - Brand of footing
      - `footing_quantity` (text) - Number of footings
      - `additional_material` (text) - Additional materials needed for reset
      - `critter_guard` (text) - Yes/No for critter guard presence
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `reset_photos` - Photos for reset tickets
      - `id` (uuid, primary key)
      - `ticket_id` (uuid, unique, references scheduling)
      - `checked_photos` (jsonb) - Array of checked photo IDs
      - `photo_urls` (jsonb) - Object mapping photo IDs to URLs
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `service_photos` - Photos for service tickets
      - `id` (uuid, primary key)
      - `ticket_id` (uuid, unique, references scheduling)
      - `checked_photos` (jsonb) - Array of checked photo IDs
      - `photo_urls` (jsonb) - Object mapping photo IDs to URLs
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Create detach_photos table
CREATE TABLE IF NOT EXISTS detach_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid UNIQUE NOT NULL REFERENCES scheduling(id) ON DELETE CASCADE,
  checked_photos jsonb DEFAULT '[]'::jsonb,
  photo_urls jsonb DEFAULT '{}'::jsonb,
  footing_brand text,
  footing_quantity text,
  additional_material text,
  critter_guard text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create reset_photos table
CREATE TABLE IF NOT EXISTS reset_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid UNIQUE NOT NULL REFERENCES scheduling(id) ON DELETE CASCADE,
  checked_photos jsonb DEFAULT '[]'::jsonb,
  photo_urls jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create service_photos table
CREATE TABLE IF NOT EXISTS service_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid UNIQUE NOT NULL REFERENCES scheduling(id) ON DELETE CASCADE,
  checked_photos jsonb DEFAULT '[]'::jsonb,
  photo_urls jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE detach_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE reset_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_photos ENABLE ROW LEVEL SECURITY;

-- Create policies for detach_photos
CREATE POLICY "Authenticated users can view detach_photos"
  ON detach_photos FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert detach_photos"
  ON detach_photos FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update detach_photos"
  ON detach_photos FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete detach_photos"
  ON detach_photos FOR DELETE
  TO authenticated
  USING (true);

-- Create policies for reset_photos
CREATE POLICY "Authenticated users can view reset_photos"
  ON reset_photos FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert reset_photos"
  ON reset_photos FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update reset_photos"
  ON reset_photos FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete reset_photos"
  ON reset_photos FOR DELETE
  TO authenticated
  USING (true);

-- Create policies for service_photos
CREATE POLICY "Authenticated users can view service_photos"
  ON service_photos FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert service_photos"
  ON service_photos FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update service_photos"
  ON service_photos FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete service_photos"
  ON service_photos FOR DELETE
  TO authenticated
  USING (true);
