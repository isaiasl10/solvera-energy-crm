/*
  # Add Geolocation Tracking to Time Clock

  1. Changes
    - Add `clock_in_latitude` column to store clock-in location latitude
    - Add `clock_in_longitude` column to store clock-in location longitude
    - Add `clock_out_latitude` column to store clock-out location latitude
    - Add `clock_out_longitude` column to store clock-out location longitude
  
  2. Purpose
    - Track employee locations when clocking in and out
    - Verify employees are at correct locations
    - Provide audit trail for time tracking
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'time_clock' AND column_name = 'clock_in_latitude'
  ) THEN
    ALTER TABLE time_clock ADD COLUMN clock_in_latitude numeric(10, 7);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'time_clock' AND column_name = 'clock_in_longitude'
  ) THEN
    ALTER TABLE time_clock ADD COLUMN clock_in_longitude numeric(10, 7);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'time_clock' AND column_name = 'clock_out_latitude'
  ) THEN
    ALTER TABLE time_clock ADD COLUMN clock_out_latitude numeric(10, 7);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'time_clock' AND column_name = 'clock_out_longitude'
  ) THEN
    ALTER TABLE time_clock ADD COLUMN clock_out_longitude numeric(10, 7);
  END IF;
END $$;