/*
  # Fix Scheduling Table - Make appointment_type nullable
  
  1. Changes
    - Remove NOT NULL constraint from appointment_type
    - This allows service tickets to be created without appointment_type
    - appointment_type is used for site surveys, installations, inspections
    - ticket_type is used for service tickets and other work orders
    
  2. Notes
    - Maintains backward compatibility
    - Allows both appointment-based and ticket-based scheduling
*/

-- Make appointment_type nullable
ALTER TABLE scheduling ALTER COLUMN appointment_type DROP NOT NULL;
