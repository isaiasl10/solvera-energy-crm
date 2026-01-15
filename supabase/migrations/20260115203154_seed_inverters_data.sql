/*
  # Seed Inverters Data

  1. Purpose
    - Populate the inverters table with standard options from CustomerForm

  2. Data Added
    - Enphase IQ8+ (micro inverter)
    - Enphase IQ8M (micro inverter)
    - SolarEdge HD-Wave (string inverter)
    - SolarEdge Optimizers (string inverter with optimizers)
    - Tesla Inverter (string inverter)
    - SMA Sunny Boy (string inverter)
    - Fronius Primo (string inverter)
    - Generac PWRcell (hybrid inverter)
*/

INSERT INTO inverters (brand, model, capacity_kw, type, cost, warranty_years, is_active)
VALUES
  ('Enphase', 'IQ8+', 0.3, 'micro', 150, 25, true),
  ('Enphase', 'IQ8M', 0.33, 'micro', 160, 25, true),
  ('SolarEdge', 'HD-Wave', 7.6, 'string', 1200, 12, true),
  ('SolarEdge', 'Optimizers', 7.6, 'string', 1500, 12, true),
  ('Tesla', 'Inverter', 7.6, 'string', 1100, 12, true),
  ('SMA', 'Sunny Boy', 7.7, 'string', 1300, 10, true),
  ('Fronius', 'Primo', 8.2, 'string', 1400, 10, true),
  ('Generac', 'PWRcell', 7.6, 'hybrid', 2000, 10, true)
ON CONFLICT DO NOTHING;