/*
  # Add Detailed Ticket Fields to Scheduling Table

  1. Changes
    - Add `ticket_type` field - Service, Installation, Inspection, Maintenance, Repair, Follow-up
    - Add `problem_code` field - Categorize the issue or work needed
    - Add `ticket_status` field - More detailed status tracking
    - Add `resolution_description` field - How the work was resolved
    - Add `priority` field - Urgency level
    - Add `notes` field - Additional notes and details
    - Add `is_active` field - Filter active vs completed tickets
    
  2. Notes
    - These fields provide detailed work order tracking
    - Enables better reporting and analytics
    - Maintains existing fields for backward compatibility
*/

-- Add new detailed ticket fields
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'scheduling' AND column_name = 'ticket_type'
  ) THEN
    ALTER TABLE scheduling ADD COLUMN ticket_type text DEFAULT 'service' CHECK (ticket_type IN ('service', 'installation', 'inspection', 'maintenance', 'repair', 'follow_up', 'consultation'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'scheduling' AND column_name = 'problem_code'
  ) THEN
    ALTER TABLE scheduling ADD COLUMN problem_code text DEFAULT 'general' CHECK (problem_code IN ('general', 'electrical', 'structural', 'equipment', 'permitting', 'inspection_failed', 'customer_request', 'warranty', 'emergency'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'scheduling' AND column_name = 'ticket_status'
  ) THEN
    ALTER TABLE scheduling ADD COLUMN ticket_status text DEFAULT 'open' CHECK (ticket_status IN ('open', 'in_progress', 'on_hold', 'pending_parts', 'pending_customer', 'scheduled', 'completed', 'cancelled', 'closed'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'scheduling' AND column_name = 'resolution_description'
  ) THEN
    ALTER TABLE scheduling ADD COLUMN resolution_description text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'scheduling' AND column_name = 'priority'
  ) THEN
    ALTER TABLE scheduling ADD COLUMN priority text DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'scheduling' AND column_name = 'notes'
  ) THEN
    ALTER TABLE scheduling ADD COLUMN notes text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'scheduling' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE scheduling ADD COLUMN is_active boolean DEFAULT true;
  END IF;
END $$;