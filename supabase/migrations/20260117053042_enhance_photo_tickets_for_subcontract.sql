/*
  # Enhance Photo Tickets for Subcontract Linkage

  1. Documentation Updates
    - Document the linkage path for subcontract jobs to photo tickets
    - Path: subcontract_jobs → scheduling (via subcontract_job_id) → photo tables (via ticket_id)
    
  2. Important Notes
    - Photo tables already link to scheduling via ticket_id
    - Scheduling links to both customer_id AND subcontract_job_id
    - Therefore, photo tickets work for BOTH internal and subcontract jobs
    - No schema changes needed - just documentation
    
  3. Photo Table Linkage
    - detach_photos → scheduling.id (ticket_id)
    - reset_photos → scheduling.id (ticket_id)
    - service_photos → scheduling.id (ticket_id)
    - installation_photos → scheduling.id (ticket_id)
    - inspection_photos → scheduling.id (ticket_id)
    - site_survey_photos → scheduling.id (ticket_id)
*/

-- Add documentation comments to photo tables
COMMENT ON TABLE detach_photos IS 'Detach photo checklist. Links to scheduling via ticket_id. Supports both internal customers (via scheduling.customer_id) and subcontract jobs (via scheduling.subcontract_job_id).';
COMMENT ON TABLE reset_photos IS 'Reset photo checklist. Links to scheduling via ticket_id. Supports both internal customers (via scheduling.customer_id) and subcontract jobs (via scheduling.subcontract_job_id).';
COMMENT ON TABLE service_photos IS 'Service photo checklist. Links to scheduling via ticket_id. Supports both internal customers (via scheduling.customer_id) and subcontract jobs (via scheduling.subcontract_job_id).';
COMMENT ON TABLE installation_photos IS 'Installation photo checklist. Links to scheduling via ticket_id. Primarily for internal customers via scheduling.customer_id.';
COMMENT ON TABLE inspection_photos IS 'Inspection photo checklist. Links to scheduling via ticket_id. Primarily for internal customers via scheduling.customer_id.';
COMMENT ON TABLE site_survey_photos IS 'Site survey photo checklist. Links to scheduling via ticket_id. Primarily for internal customers via scheduling.customer_id.';

-- Add comments to ticket_id columns
COMMENT ON COLUMN detach_photos.ticket_id IS 'FK to scheduling.id - links to either internal customer or subcontract job';
COMMENT ON COLUMN reset_photos.ticket_id IS 'FK to scheduling.id - links to either internal customer or subcontract job';
COMMENT ON COLUMN service_photos.ticket_id IS 'FK to scheduling.id - links to either internal customer or subcontract job';
COMMENT ON COLUMN installation_photos.ticket_id IS 'FK to scheduling.id - links to internal customer';
COMMENT ON COLUMN inspection_photos.ticket_id IS 'FK to scheduling.id - links to internal customer';
COMMENT ON COLUMN site_survey_photos.ticket_id IS 'FK to scheduling.id - links to internal customer';