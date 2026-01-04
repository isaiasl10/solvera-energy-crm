/*
  # Add Work Progress Tracking to Scheduling

  1. New Fields
    - `in_transit_at` (timestamptz) - When technician is in transit
    - `arrived_at` (timestamptz) - When technician arrives on site
    - `begin_ticket_at` (timestamptz) - When work begins
    - `work_performed` (text) - Description of work performed
    - `departing_at` (timestamptz) - When technician departs site
    - `closed_at` (timestamptz) - When ticket is closed
    - `alert_customer_transit` (boolean) - Whether to alert customer for transit
    - `alert_customer_arrival` (boolean) - Whether to alert customer for arrival
    - `alert_customer_departure` (boolean) - Whether to alert customer for departure
    
  2. Notes
    - These fields enable real-time tracking of ticket progress
    - Supports customer notification system
    - Maintains audit trail of all ticket activities
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'scheduling' AND column_name = 'in_transit_at'
  ) THEN
    ALTER TABLE scheduling ADD COLUMN in_transit_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'scheduling' AND column_name = 'arrived_at'
  ) THEN
    ALTER TABLE scheduling ADD COLUMN arrived_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'scheduling' AND column_name = 'begin_ticket_at'
  ) THEN
    ALTER TABLE scheduling ADD COLUMN begin_ticket_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'scheduling' AND column_name = 'work_performed'
  ) THEN
    ALTER TABLE scheduling ADD COLUMN work_performed text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'scheduling' AND column_name = 'departing_at'
  ) THEN
    ALTER TABLE scheduling ADD COLUMN departing_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'scheduling' AND column_name = 'closed_at'
  ) THEN
    ALTER TABLE scheduling ADD COLUMN closed_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'scheduling' AND column_name = 'alert_customer_transit'
  ) THEN
    ALTER TABLE scheduling ADD COLUMN alert_customer_transit boolean DEFAULT true;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'scheduling' AND column_name = 'alert_customer_arrival'
  ) THEN
    ALTER TABLE scheduling ADD COLUMN alert_customer_arrival boolean DEFAULT true;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'scheduling' AND column_name = 'alert_customer_departure'
  ) THEN
    ALTER TABLE scheduling ADD COLUMN alert_customer_departure boolean DEFAULT true;
  END IF;
END $$;