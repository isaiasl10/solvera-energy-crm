/*
  # Add Missing Columns to Proposals Table

  ## Changes
  - Add `customer_id` column to proposals table (optional link to customers)
  - Add `updated_at` column to proposals table with trigger
  - Ensure proposal_roof_planes table exists with all required columns

  ## Security
  - Maintains existing RLS policies
*/

-- Add missing columns to proposals table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'proposals' AND column_name = 'customer_id'
  ) THEN
    ALTER TABLE proposals ADD COLUMN customer_id uuid REFERENCES customers(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_proposals_customer_id ON proposals(customer_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'proposals' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE proposals ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
END $$;

-- Create proposal_roof_planes table if it doesn't exist
CREATE TABLE IF NOT EXISTS proposal_roof_planes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
  path jsonb NOT NULL,
  area_sqft double precision NOT NULL DEFAULT 0,
  tilt integer,
  azimuth integer CHECK (azimuth >= 0 AND azimuth <= 360),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_proposal_roof_planes_proposal_id ON proposal_roof_planes(proposal_id);

-- Enable RLS on proposal_roof_planes
ALTER TABLE proposal_roof_planes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for proposal_roof_planes table (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'proposal_roof_planes' AND policyname = 'Users can view own proposal roof planes'
  ) THEN
    CREATE POLICY "Users can view own proposal roof planes"
      ON proposal_roof_planes
      FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM proposals
          WHERE proposals.id = proposal_roof_planes.proposal_id
          AND proposals.created_by = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'proposal_roof_planes' AND policyname = 'Users can create roof planes for own proposals'
  ) THEN
    CREATE POLICY "Users can create roof planes for own proposals"
      ON proposal_roof_planes
      FOR INSERT
      TO authenticated
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM proposals
          WHERE proposals.id = proposal_roof_planes.proposal_id
          AND proposals.created_by = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'proposal_roof_planes' AND policyname = 'Users can update own proposal roof planes'
  ) THEN
    CREATE POLICY "Users can update own proposal roof planes"
      ON proposal_roof_planes
      FOR UPDATE
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM proposals
          WHERE proposals.id = proposal_roof_planes.proposal_id
          AND proposals.created_by = auth.uid()
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM proposals
          WHERE proposals.id = proposal_roof_planes.proposal_id
          AND proposals.created_by = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'proposal_roof_planes' AND policyname = 'Users can delete own proposal roof planes'
  ) THEN
    CREATE POLICY "Users can delete own proposal roof planes"
      ON proposal_roof_planes
      FOR DELETE
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM proposals
          WHERE proposals.id = proposal_roof_planes.proposal_id
          AND proposals.created_by = auth.uid()
        )
      );
  END IF;
END $$;

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers
DROP TRIGGER IF EXISTS update_proposals_updated_at ON proposals;
CREATE TRIGGER update_proposals_updated_at
  BEFORE UPDATE ON proposals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_proposal_roof_planes_updated_at ON proposal_roof_planes;
CREATE TRIGGER update_proposal_roof_planes_updated_at
  BEFORE UPDATE ON proposal_roof_planes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
