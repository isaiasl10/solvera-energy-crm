/*
  # Add Close Reason to Scheduling

  1. Changes
    - Add `close_reason` column to `scheduling` table
      - Used for storing the reason a ticket was closed
      - Options include: install complete, service complete, site survey complete, 
        additional day required, weather re-schedule, customer re-schedule, company re-schedule
      - Text field, optional (can be NULL)
  
  2. Notes
    - This field helps track why tickets are being closed
    - Provides better data for reporting and analytics
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'scheduling' AND column_name = 'close_reason'
  ) THEN
    ALTER TABLE scheduling ADD COLUMN close_reason text;
  END IF;
END $$;
