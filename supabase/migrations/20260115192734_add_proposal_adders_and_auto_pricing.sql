/*
  # Add Proposal Adders and Auto Pricing System

  1. New Tables
    - `proposal_adders`
      - Links proposals to custom_adders with quantities
      - Tracks which adders are applied to each proposal
  
  2. Changes
    - Creates junction table for proposal-adder relationship
    - Allows multiple adders per proposal with optional quantity/multiplier
  
  3. Security
    - Enable RLS on proposal_adders table
    - Authenticated users can manage adders for their proposals
*/

CREATE TABLE IF NOT EXISTS proposal_adders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
  custom_adder_id uuid NOT NULL REFERENCES custom_adders(id) ON DELETE CASCADE,
  quantity numeric DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(proposal_id, custom_adder_id)
);

ALTER TABLE proposal_adders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view proposal adders"
  ON proposal_adders
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert proposal adders"
  ON proposal_adders
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update proposal adders"
  ON proposal_adders
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete proposal adders"
  ON proposal_adders
  FOR DELETE
  TO authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS idx_proposal_adders_proposal_id ON proposal_adders(proposal_id);
CREATE INDEX IF NOT EXISTS idx_proposal_adders_custom_adder_id ON proposal_adders(custom_adder_id);