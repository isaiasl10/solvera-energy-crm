/*
  # Fix Problem Codes Constraint

  1. Changes
    - Drop existing problem_code constraint
    - Add new constraint with all valid problem codes including:
      - Installation codes
      - Service codes  
      - Inspection codes
      - General maintenance codes
    
  2. Notes
    - This fixes the issue where site_survey tickets with certain problem codes were being rejected
*/

-- Drop the existing constraint
ALTER TABLE scheduling DROP CONSTRAINT IF EXISTS scheduling_problem_code_check;

-- Add comprehensive constraint with all problem codes
ALTER TABLE scheduling ADD CONSTRAINT scheduling_problem_code_check 
  CHECK (problem_code IN (
    -- General codes
    'general', 
    'electrical', 
    'structural', 
    'equipment', 
    'permitting', 
    'customer_request', 
    'warranty', 
    'emergency',
    -- Inspection codes
    'city_inspection',
    'site_survey',
    'inspection_failed',
    -- Installation codes
    'new_install',
    'pv_only',
    'finish_panel_lay',
    'electrical_pv',
    'electrical_only',
    'electrical_battery_only',
    'battery_pv',
    'electrical_mid_rough_pv',
    -- Service codes
    'panels_not_reporting',
    'roof_leak',
    'commission_system',
    'detach_panels',
    'reset_panels'
  ));
