/*
  # Link Scheduling Table to Subcontract Jobs

  1. Changes to scheduling table
    - Add `subcontract_job_id` column (nullable, FK to subcontract_jobs)
    - Add 'detach', 'reset', 'service' to appointment_type check constraint
    - Add index on subcontract_job_id for performance
    
  2. Important Notes
    - Scheduling now supports BOTH sources:
      - Internal jobs: customer_id (for new install pipeline)
      - Subcontract jobs: subcontract_job_id (for external contractor work)
    - Each scheduling record must have EITHER customer_id OR subcontract_job_id (not both)
    - Completed tickets are retained with completed status (never deleted)
    
  3. Security
    - No RLS changes to existing policies (per approval conditions)
*/

-- Add subcontract_job_id column to scheduling
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'scheduling' AND column_name = 'subcontract_job_id'
  ) THEN
    ALTER TABLE scheduling ADD COLUMN subcontract_job_id uuid REFERENCES subcontract_jobs(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_scheduling_subcontract_job ON scheduling(subcontract_job_id);

-- Update appointment_type constraint to include subcontract job types
ALTER TABLE scheduling DROP CONSTRAINT IF EXISTS scheduling_appointment_type_check;
ALTER TABLE scheduling ADD CONSTRAINT scheduling_appointment_type_check 
  CHECK (appointment_type IN ('site_survey', 'installation', 'inspection', 'detach', 'reset', 'service'));

-- Add constraint to ensure either customer_id OR subcontract_job_id is set (not both, not neither)
ALTER TABLE scheduling DROP CONSTRAINT IF EXISTS scheduling_job_source_check;
ALTER TABLE scheduling ADD CONSTRAINT scheduling_job_source_check
  CHECK (
    (customer_id IS NOT NULL AND subcontract_job_id IS NULL) OR
    (customer_id IS NULL AND subcontract_job_id IS NOT NULL)
  );

-- Add comment documenting the dual-source linkage
COMMENT ON COLUMN scheduling.customer_id IS 'Links to internal new install customer pipeline';
COMMENT ON COLUMN scheduling.subcontract_job_id IS 'Links to external subcontract jobs (detach/reset/service)';
COMMENT ON TABLE scheduling IS 'Unified scheduling for both internal customers and subcontract jobs. Completed tickets are retained with completed status.';