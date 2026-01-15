/*
  # Seed Racking Data

  1. Purpose
    - Populate the racking table with standard options from CustomerForm

  2. Data Added
    - IronRidge XR Rail (composition shingle)
    - IronRidge Flush Mount (composition shingle)
    - Unirac SolarMount (composition shingle)
    - Snapnrack (composition shingle)
    - Quick Mount PV (composition shingle)
    - Ecofasten Rock-It (tile roof)
    - Ground Mount (ground)
    - Ballasted Roof Mount (flat roof)
*/

INSERT INTO racking (brand, model, roof_type, cost_per_panel, warranty_years, is_active)
VALUES
  ('IronRidge', 'XR Rail', 'composition', 35, 25, true),
  ('IronRidge', 'Flush Mount', 'composition', 40, 25, true),
  ('Unirac', 'SolarMount', 'composition', 38, 20, true),
  ('Snapnrack', 'Snapnrack', 'composition', 32, 20, true),
  ('Quick Mount', 'Quick Mount PV', 'composition', 45, 25, true),
  ('Ecofasten', 'Rock-It', 'tile', 50, 20, true),
  ('Generic', 'Ground Mount', 'flat', 60, 25, true),
  ('Generic', 'Ballasted Roof Mount', 'flat', 55, 20, true)
ON CONFLICT DO NOTHING;