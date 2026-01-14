/*
  # Add Panel Specifications and Obstructions Support

  ## Overview
  Enhances proposals with panel specifications and adds obstruction tracking for roof designs.

  ## Changes to `proposals` table
  - Add `panel_make` (text) - Panel manufacturer (e.g., "Aptos")
  - Add `panel_model` (text) - Panel model (e.g., "410W")
  - Add `panel_watts` (integer) - Panel wattage
  - Add `panel_orientation` (text) - Portrait or landscape orientation

  ## Changes to `proposal_roof_planes` table
  - Add `pitch_deg` (numeric) - Roof pitch in degrees (alternative to tilt)

  ## New Table: `proposal_obstructions`
  Stores obstructions on roof planes (vents, skylights, chimneys, trees, etc.)
  - `id` (uuid, primary key) - Unique obstruction identifier
  - `proposal_id` (uuid) - Reference to parent proposal
  - `type` (text) - Obstruction type: rect, circle, tree
  - `roof_plane_id` (uuid, nullable) - Optional reference to specific roof plane
  - `center_lat` (double precision) - Center latitude
  - `center_lng` (double precision) - Center longitude
  - `radius_ft` (double precision, nullable) - Radius in feet (for circles/trees)
  - `width_ft` (double precision, nullable) - Width in feet (for rectangles)
  - `height_ft` (double precision, nullable) - Height in feet (for rectangles)
  - `rotation_deg` (double precision, nullable) - Rotation in degrees
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ## Security
  - Enable RLS on proposal_obstructions
  - Users can only view and manage obstructions for their own proposals
*/

-- Add panel specification columns to proposals
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'proposals' AND column_name = 'panel_make'
  ) THEN
    ALTER TABLE proposals ADD COLUMN panel_make text DEFAULT 'Aptos';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'proposals' AND column_name = 'panel_model'
  ) THEN
    ALTER TABLE proposals ADD COLUMN panel_model text DEFAULT '410W';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'proposals' AND column_name = 'panel_watts'
  ) THEN
    ALTER TABLE proposals ADD COLUMN panel_watts integer DEFAULT 410;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'proposals' AND column_name = 'panel_orientation'
  ) THEN
    ALTER TABLE proposals ADD COLUMN panel_orientation text DEFAULT 'portrait' CHECK (panel_orientation IN ('portrait', 'landscape'));
  END IF;
END $$;

-- Add pitch_deg to proposal_roof_planes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'proposal_roof_planes' AND column_name = 'pitch_deg'
  ) THEN
    ALTER TABLE proposal_roof_planes ADD COLUMN pitch_deg numeric DEFAULT 0;
  END IF;
END $$;

-- Create proposal_obstructions table
CREATE TABLE IF NOT EXISTS proposal_obstructions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('rect', 'circle', 'tree')),
  roof_plane_id uuid REFERENCES proposal_roof_planes(id) ON DELETE SET NULL,
  center_lat double precision NOT NULL,
  center_lng double precision NOT NULL,
  radius_ft double precision,
  width_ft double precision,
  height_ft double precision,
  rotation_deg double precision,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_proposal_obstructions_proposal_id ON proposal_obstructions(proposal_id);
CREATE INDEX IF NOT EXISTS idx_proposal_obstructions_roof_plane_id ON proposal_obstructions(roof_plane_id);

-- Enable RLS
ALTER TABLE proposal_obstructions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for proposal_obstructions

-- Users can view obstructions for their proposals
CREATE POLICY "Users can view own proposal obstructions"
  ON proposal_obstructions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM proposals
      WHERE proposals.id = proposal_obstructions.proposal_id
      AND proposals.created_by = auth.uid()
    )
  );

-- Users can insert obstructions for their proposals
CREATE POLICY "Users can create obstructions for own proposals"
  ON proposal_obstructions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM proposals
      WHERE proposals.id = proposal_obstructions.proposal_id
      AND proposals.created_by = auth.uid()
    )
  );

-- Users can update obstructions for their proposals
CREATE POLICY "Users can update own proposal obstructions"
  ON proposal_obstructions
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM proposals
      WHERE proposals.id = proposal_obstructions.proposal_id
      AND proposals.created_by = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM proposals
      WHERE proposals.id = proposal_obstructions.proposal_id
      AND proposals.created_by = auth.uid()
    )
  );

-- Users can delete obstructions for their proposals
CREATE POLICY "Users can delete own proposal obstructions"
  ON proposal_obstructions
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM proposals
      WHERE proposals.id = proposal_obstructions.proposal_id
      AND proposals.created_by = auth.uid()
    )
  );

-- Add updated_at trigger
DROP TRIGGER IF EXISTS update_proposal_obstructions_updated_at ON proposal_obstructions;
CREATE TRIGGER update_proposal_obstructions_updated_at
  BEFORE UPDATE ON proposal_obstructions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
