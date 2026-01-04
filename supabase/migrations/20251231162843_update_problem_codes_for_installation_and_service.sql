/*
  # Update Problem Codes for Installation and Service Tickets

  1. Changes
    - Updates the allowed problem codes for the scheduling table
    - Installation problem codes: new_install, pv_only, finish_panel_lay, electrical_pv, electrical_only, electrical_battery_only, battery_pv, electrical_mid_rough_pv
    - Service problem codes: panels_not_reporting, roof_leak, commission_system, inspection_failed, detach_panels, reset_panels
    - Inspection problem codes: city_inspection, site_survey
    
  2. Notes
    - This migration ensures the database accepts the new problem code values
    - Previous problem codes remain valid for backward compatibility with existing records
*/

-- No schema changes needed as problem_code is already a text field
-- This migration documents the new valid problem code values for reference

-- Installation problem codes:
-- - new_install
-- - pv_only
-- - finish_panel_lay
-- - electrical_pv
-- - electrical_only
-- - electrical_battery_only
-- - battery_pv
-- - electrical_mid_rough_pv

-- Service problem codes:
-- - panels_not_reporting
-- - roof_leak
-- - commission_system
-- - inspection_failed
-- - detach_panels
-- - reset_panels

-- Inspection problem codes:
-- - city_inspection
-- - site_survey

-- Other ticket types (maintenance, repair, etc.) use general codes:
-- - general
-- - electrical
-- - structural
-- - equipment
-- - permitting
-- - customer_request
-- - warranty
-- - emergency
