/*
  # Update Problem Codes for Inspection Tickets

  1. Changes
    - Update problem_code constraint to include 'city_inspection' and 'site_survey'
    - Remove old constraint and add new one with updated values
    
  2. Notes
    - Adds inspection-specific problem codes
    - Maintains backward compatibility with existing codes
*/

-- Drop the existing constraint
ALTER TABLE scheduling DROP CONSTRAINT IF EXISTS scheduling_problem_code_check;

-- Add new constraint with updated problem codes
ALTER TABLE scheduling ADD CONSTRAINT scheduling_problem_code_check 
  CHECK (problem_code IN (
    'general', 
    'electrical', 
    'structural', 
    'equipment', 
    'permitting', 
    'inspection_failed', 
    'customer_request', 
    'warranty', 
    'emergency',
    'city_inspection',
    'site_survey'
  ));