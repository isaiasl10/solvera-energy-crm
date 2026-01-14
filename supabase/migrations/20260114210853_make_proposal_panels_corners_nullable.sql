/*
  # Make corners column nullable in proposal_panels

  1. Changes
    - Make `corners` column nullable in `proposal_panels` table
    - This allows panels to be inserted without corner data initially
    - Corners can be calculated on-demand when needed for display

  2. Notes
    - The auto-fill panel logic doesn't calculate corners during insertion
    - Corners can be computed from center_lat, center_lng, rotation_deg, and panel dimensions
*/

ALTER TABLE proposal_panels 
ALTER COLUMN corners DROP NOT NULL;