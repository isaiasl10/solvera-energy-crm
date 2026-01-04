/*
  # Fix Problem Code Constraint and Customers Schema Issues

  1. Changes
    - Drop and recreate the scheduling table problem_code check constraint to include ALL valid problem codes
    - Installation codes: new_install, pv_only, finish_panel_lay, electrical_pv, electrical_only, electrical_battery_only, battery_pv, electrical_mid_rough_pv
    - Service codes: panels_not_reporting, roof_leak, commission_system, inspection_failed, detach_panels, reset_panels
    - Inspection codes: city_inspection, site_survey
    - General codes: general, electrical, structural, equipment, permitting, customer_request, warranty, emergency
    
  2. Notes
    - This fixes the constraint that was blocking ticket creation with installation/service-specific problem codes
    - All valid problem codes from the UI are now accepted by the database
*/

-- Drop the existing problem_code constraint
ALTER TABLE scheduling DROP CONSTRAINT IF EXISTS scheduling_problem_code_check;

-- Add new constraint with ALL valid problem codes
ALTER TABLE scheduling ADD CONSTRAINT scheduling_problem_code_check 
  CHECK (problem_code IN (
    -- Installation problem codes
    'new_install',
    'pv_only',
    'finish_panel_lay',
    'electrical_pv',
    'electrical_only',
    'electrical_battery_only',
    'battery_pv',
    'electrical_mid_rough_pv',
    -- Service problem codes
    'panels_not_reporting',
    'roof_leak',
    'commission_system',
    'detach_panels',
    'reset_panels',
    -- Inspection problem codes
    'city_inspection',
    'site_survey',
    -- General problem codes
    'general',
    'electrical',
    'structural',
    'equipment',
    'permitting',
    'inspection_failed',
    'customer_request',
    'warranty',
    'emergency'
  ));