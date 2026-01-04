/*
  # Update Installation Photos Table Schema

  1. Changes
    - Drop the old installation_photos table structure
    - Create new structure to store:
      - Array of checked photo IDs
      - Inverter type (solaredge, enphase, other)
      - Inverter serial number (text input)
      - RGM serial number for SolarEdge (text input)
    - One record per ticket with all photo data in JSON-friendly format
    
  2. Notes
    - Uses JSONB array for flexible photo ID storage
    - Supports different inverter types with conditional fields
    - Maintains unique constraint on ticket_id
*/

-- Drop old table and recreate with new schema
DROP TABLE IF EXISTS installation_photos;

CREATE TABLE IF NOT EXISTS installation_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid REFERENCES scheduling(id) ON DELETE CASCADE NOT NULL UNIQUE,
  checked_photos text[] DEFAULT '{}',
  inverter_type text DEFAULT 'solaredge',
  inverter_serial_number text DEFAULT '',
  rgm_serial_number text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE installation_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public access to installation_photos"
  ON installation_photos
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_installation_photos_ticket_id ON installation_photos(ticket_id);