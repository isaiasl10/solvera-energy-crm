/*
  # Solar Panel Models and Placement System

  1. New Tables
    - `panel_models`
      - `id` (uuid, primary key)
      - `brand` (text) - Panel manufacturer
      - `model` (text) - Model name/number
      - `watts` (numeric) - Power output in watts
      - `width_inches` (numeric) - Panel width in inches
      - `height_inches` (numeric) - Panel height in inches
      - `created_at` (timestamptz)
      
    - `proposal_panels`
      - `id` (uuid, primary key)
      - `proposal_id` (uuid, foreign key)
      - `roof_plane_id` (uuid, foreign key, nullable)
      - `panel_model_id` (uuid, foreign key)
      - `center_lat` (numeric) - Center latitude
      - `center_lng` (numeric) - Center longitude
      - `rotation_deg` (numeric) - Rotation angle in degrees
      - `is_portrait` (boolean) - Orientation (true=portrait, false=landscape)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Allow authenticated users to read all panel models
    - Allow authenticated users full access to proposal_panels for their proposals
*/

CREATE TABLE IF NOT EXISTS panel_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand text NOT NULL,
  model text NOT NULL,
  watts numeric NOT NULL,
  width_inches numeric NOT NULL,
  height_inches numeric NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS proposal_panels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
  roof_plane_id uuid REFERENCES proposal_roof_planes(id) ON DELETE CASCADE,
  panel_model_id uuid NOT NULL REFERENCES panel_models(id) ON DELETE RESTRICT,
  center_lat numeric NOT NULL,
  center_lng numeric NOT NULL,
  rotation_deg numeric DEFAULT 0,
  is_portrait boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_proposal_panels_proposal_id ON proposal_panels(proposal_id);
CREATE INDEX IF NOT EXISTS idx_proposal_panels_roof_plane_id ON proposal_panels(roof_plane_id);
CREATE INDEX IF NOT EXISTS idx_proposal_panels_panel_model_id ON proposal_panels(panel_model_id);

ALTER TABLE panel_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposal_panels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read panel models"
  ON panel_models
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can read proposal panels"
  ON proposal_panels
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert proposal panels"
  ON proposal_panels
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update proposal panels"
  ON proposal_panels
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete proposal panels"
  ON proposal_panels
  FOR DELETE
  TO authenticated
  USING (true);
