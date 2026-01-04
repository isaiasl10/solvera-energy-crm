/*
  # Add Site Survey Ticket Type

  1. Changes
    - Drop existing ticket_type constraint
    - Add new constraint that includes 'site_survey' as valid ticket type
    
  2. Notes
    - Preserves all existing ticket types
    - Allows site survey tickets to be created and managed
*/

-- Drop the existing constraint
ALTER TABLE scheduling DROP CONSTRAINT IF EXISTS scheduling_ticket_type_check;

-- Add new constraint with site_survey included
ALTER TABLE scheduling ADD CONSTRAINT scheduling_ticket_type_check 
  CHECK (ticket_type IN ('service', 'installation', 'inspection', 'maintenance', 'repair', 'follow_up', 'consultation', 'site_survey'));