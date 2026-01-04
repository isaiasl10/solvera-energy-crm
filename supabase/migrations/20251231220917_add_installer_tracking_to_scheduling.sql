/*
  # Add Installer Tracking to Scheduling

  1. Changes
    - Add `pv_installer_id` column to track which PV installer completed the work
    - This enables per-watt pay calculation for installation tickets
    - This enables battery pay calculation for installations with batteries
  
  2. Purpose
    - Track which installer completed each installation
    - Calculate production-based pay (per watt and battery bonuses)
    - Generate accurate payroll including all pay types
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'scheduling' AND column_name = 'pv_installer_id'
  ) THEN
    ALTER TABLE scheduling ADD COLUMN pv_installer_id uuid REFERENCES app_users(id);
  END IF;
END $$;