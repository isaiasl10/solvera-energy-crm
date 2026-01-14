/*
  # Make rotation_deg nullable with default in proposal_panels

  1. Changes
    - Make `rotation_deg` column nullable with default value of 0
    - Ensures panels can be inserted without explicit rotation
    - Default to 0 degrees (no rotation)

  2. Notes
    - Most panels don't require rotation
    - Default value of 0 is appropriate for standard placement
*/

ALTER TABLE proposal_panels 
ALTER COLUMN rotation_deg SET DEFAULT 0,
ALTER COLUMN rotation_deg DROP NOT NULL;