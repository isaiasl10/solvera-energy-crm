/*
  # Make roof_plane_id nullable in proposal_panels

  1. Changes
    - Make `roof_plane_id` column nullable in `proposal_panels` table
    - Panels can exist without being assigned to a specific roof plane
    - Matches the original schema design intent

  2. Notes
    - Some panels may not be associated with a specific roof plane
    - This allows more flexibility in panel placement workflows
*/

ALTER TABLE proposal_panels 
ALTER COLUMN roof_plane_id DROP NOT NULL;