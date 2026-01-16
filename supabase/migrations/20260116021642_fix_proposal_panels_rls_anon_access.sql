/*
  # Fix RLS Policies for Proposal Panels and Roof Planes

  1. Changes
    - Add anon access policies for proposal_panels table
    - Add anon access policies for proposal_roof_planes table
    - Add anon access policies for proposal_obstructions table
    - This matches the pattern used for customers table where anon users can manage data

  2. Security
    - Allow authenticated and anon users to read, insert, update, and delete
    - This is necessary for the proposal workspace to function properly
*/

-- Drop existing restrictive policies and create new permissive ones for proposal_panels
DROP POLICY IF EXISTS "Authenticated users can read proposal panels" ON proposal_panels;
DROP POLICY IF EXISTS "Authenticated users can insert proposal panels" ON proposal_panels;
DROP POLICY IF EXISTS "Authenticated users can update proposal panels" ON proposal_panels;
DROP POLICY IF EXISTS "Authenticated users can delete proposal panels" ON proposal_panels;

CREATE POLICY "Anyone can read proposal panels"
  ON proposal_panels
  FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert proposal panels"
  ON proposal_panels
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update proposal panels"
  ON proposal_panels
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete proposal panels"
  ON proposal_panels
  FOR DELETE
  USING (true);

-- Drop existing restrictive policies and create new permissive ones for proposal_roof_planes
DROP POLICY IF EXISTS "Users can view own proposal roof planes" ON proposal_roof_planes;
DROP POLICY IF EXISTS "Users can create roof planes for own proposals" ON proposal_roof_planes;
DROP POLICY IF EXISTS "Users can update own proposal roof planes" ON proposal_roof_planes;
DROP POLICY IF EXISTS "Users can delete own proposal roof planes" ON proposal_roof_planes;

CREATE POLICY "Anyone can read proposal roof planes"
  ON proposal_roof_planes
  FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert proposal roof planes"
  ON proposal_roof_planes
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update proposal roof planes"
  ON proposal_roof_planes
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete proposal roof planes"
  ON proposal_roof_planes
  FOR DELETE
  USING (true);

-- Fix proposal_obstructions table if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'proposal_obstructions') THEN
    DROP POLICY IF EXISTS "Authenticated users can read proposal obstructions" ON proposal_obstructions;
    DROP POLICY IF EXISTS "Authenticated users can insert proposal obstructions" ON proposal_obstructions;
    DROP POLICY IF EXISTS "Authenticated users can update proposal obstructions" ON proposal_obstructions;
    DROP POLICY IF EXISTS "Authenticated users can delete proposal obstructions" ON proposal_obstructions;

    CREATE POLICY "Anyone can read proposal obstructions"
      ON proposal_obstructions
      FOR SELECT
      USING (true);

    CREATE POLICY "Anyone can insert proposal obstructions"
      ON proposal_obstructions
      FOR INSERT
      WITH CHECK (true);

    CREATE POLICY "Anyone can update proposal obstructions"
      ON proposal_obstructions
      FOR UPDATE
      USING (true)
      WITH CHECK (true);

    CREATE POLICY "Anyone can delete proposal obstructions"
      ON proposal_obstructions
      FOR DELETE
      USING (true);
  END IF;
END $$;
