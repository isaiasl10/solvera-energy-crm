/*
  # Seed Custom Adders with Existing System Adders

  1. Data Seeding
    - Insert 7 existing system adders into custom_adders table:
      - Steep Roof: $0.10 per kW
      - Metal Roof: $0.10 per kW
      - Tile Roof: $0.15 per kW
      - MPU: $2,500 flat rate
      - FSU: $3,500 flat rate
      - Small System Adder: $1,000 flat rate
      - Critter Guard: $50 per panel

  2. Notes
    - Uses INSERT ON CONFLICT to prevent duplicate entries
    - All adders are set to active by default
    - Preserves existing adders if they already exist
*/

INSERT INTO custom_adders (name, description, calculation_type, rate, is_active)
VALUES
  ('Steep Roof', 'Additional cost for steep roof installations', 'per_kw', 0.10, true),
  ('Metal Roof', 'Additional cost for metal roof installations', 'per_kw', 0.10, true),
  ('Tile Roof', 'Additional cost for tile roof installations', 'per_kw', 0.15, true),
  ('MPU', 'Main Panel Upgrade cost', 'flat_rate', 2500.00, true),
  ('FSU', 'Full Service Upgrade cost', 'flat_rate', 3500.00, true),
  ('Small System Adder', 'Additional cost for small system installations', 'flat_rate', 1000.00, true),
  ('Critter Guard', 'Cost for critter guard installation', 'per_panel', 50.00, true)
ON CONFLICT DO NOTHING;