/*
  # Fix Panel Models Schema Mismatch

  1. Problem
    - Table created with width_inches and height_inches
    - Seed data and code expect length_mm and width_mm
    - This causes silent failures in panel placement

  2. Changes
    - Drop old columns (width_inches, height_inches)
    - Add correct columns (length_mm, width_mm)
    - Re-seed the panel data

  3. Security
    - No RLS changes needed
*/

-- Remove old incorrect columns
ALTER TABLE panel_models DROP COLUMN IF EXISTS width_inches;
ALTER TABLE panel_models DROP COLUMN IF EXISTS height_inches;

-- Add correct columns in millimeters
ALTER TABLE panel_models ADD COLUMN IF NOT EXISTS length_mm numeric NOT NULL DEFAULT 1800;
ALTER TABLE panel_models ADD COLUMN IF NOT EXISTS width_mm numeric NOT NULL DEFAULT 1000;

-- Clear existing data and re-seed
DELETE FROM panel_models;

-- Seed with correct data
INSERT INTO panel_models (brand, model, watts, length_mm, width_mm) VALUES
  -- Aptos
  ('Aptos', 'DNA-450-BF30', 450, 1839, 1016),
  ('Aptos', 'DNA-460-BF30', 460, 1839, 1016),
  ('Aptos', 'DNA-470-BF30', 470, 1839, 1016),
  
  -- Silfab
  ('Silfab', 'SIL-400 HC', 400, 1791, 1001),
  ('Silfab', 'SIL-420 HC', 420, 1791, 1001),
  ('Silfab', 'SIL-440 HC', 440, 1791, 1001),
  ('Silfab', 'Elite SIL-450 BG', 450, 1849, 1016),
  ('Silfab', 'Elite SIL-470 BG', 470, 1849, 1016),
  
  -- Jinko
  ('Jinko', 'Tiger Neo 400W', 400, 1801, 1021),
  ('Jinko', 'Tiger Neo 420W', 420, 1801, 1021),
  ('Jinko', 'Tiger Neo 440W', 440, 1801, 1021),
  ('Jinko', 'Tiger Neo 460W', 460, 1801, 1021),
  ('Jinko', 'Tiger Neo 480W', 480, 1801, 1021),
  
  -- Canadian Solar
  ('Canadian Solar', 'HiKu6 CS6R-410MS', 410, 1834, 1011),
  ('Canadian Solar', 'HiKu6 CS6R-430MS', 430, 1834, 1011),
  ('Canadian Solar', 'HiKu6 CS6R-450MS', 450, 1834, 1011),
  ('Canadian Solar', 'HiKu7 CS7N-575MS', 575, 2174, 1130),
  ('Canadian Solar', 'HiKu7 CS7N-590MS', 590, 2174, 1130),
  
  -- Trina Solar
  ('Trina Solar', 'Vertex S TSM-400DE09', 400, 1780, 1001),
  ('Trina Solar', 'Vertex S TSM-420DE09', 420, 1780, 1001),
  ('Trina Solar', 'Vertex S+ TSM-440NEG9R', 440, 1811, 1021),
  ('Trina Solar', 'Vertex S+ TSM-460NEG9R', 460, 1811, 1021),
  ('Trina Solar', 'Vertex S+ TSM-480NEG9R', 480, 1811, 1021),
  
  -- REC
  ('REC', 'Alpha Pure-R 405', 405, 1717, 1001),
  ('REC', 'Alpha Pure-R 420', 420, 1717, 1001),
  ('REC', 'Alpha Pure-R 430', 430, 1717, 1001)
ON CONFLICT DO NOTHING;
