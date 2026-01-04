/*
  # Add City Approved Document Types

  1. Changes
    - Adds specific document types for city approved documents:
      - 'city_approved_permit' - For City Approved Permit folder
      - 'city_approved_plan_set' - For Plan Set from City Approved Plans & Engineer Letter folder
      - 'city_approved_eng_letter' - For Engineer Letter from City Approved Plans & Engineer Letter folder
    
  2. Notes
    - This allows the ticket detail modal to properly filter and display documents in their respective tabs
    - Maintains backward compatibility with existing document types
*/

-- No schema change needed as document_type is already a text field without constraints
-- This migration documents the new valid document type values for reference

-- Document Types:
-- - contract
-- - utility_bill
-- - identification
-- - permit (general permit, not city approved)
-- - plans (general plans, not city approved)
-- - approved_plans_and_letter (deprecated, use specific types below)
-- - city_approved_permit (City Approved Permit folder)
-- - city_approved_plan_set (City Approved Plans & Engineer Letter folder - Plan Set)
-- - city_approved_eng_letter (City Approved Plans & Engineer Letter folder - Engineer Letter)
