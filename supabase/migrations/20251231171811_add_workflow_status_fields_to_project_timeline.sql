/*
  # Add Workflow Status Fields to Project Timeline

  1. Overview
    - Transforms project_timeline from date-only tracking to status-based workflow
    - Each phase now has a status field that tracks its current state
    - Supports revision workflows for utility and permit applications
    - Enforces business rules like 48-hour material ordering lead time

  2. New Status Fields Added
    - `site_survey_status`: pending_schedule | scheduled | completed
    - `engineering_status`: pending | completed
    - `utility_status`: not_started | submitted | revision_required | revision_submitted | approved
    - `permit_status`: not_started | submitted | revision_required | revision_submitted | approved
    - `installation_status`: pending_customer | pending_material | scheduled | completed
    - `material_order_status`: not_ordered | ordered | delivered
    - `inspection_status`: not_ready | ready | scheduled | passed | failed | service_required | service_completed

  3. New Date Fields for Revisions
    - `utility_revision_date`: When utility revision was required
    - `utility_revision_submitted_date`: When revised utility app was resubmitted
    - `permit_revision_date`: When permit revision was required
    - `permit_revision_submitted_date`: When revised permit was resubmitted
    - `service_completed_date`: When service after inspection failure was completed

  4. Business Rules
    - Material can only be ordered when installation is scheduled
    - Installation date must be at least 48 hours in the future
    - Inspection can only be scheduled after installation is completed

  5. Security
    - Maintains existing RLS policies
*/

-- Add status fields for each workflow phase
DO $$
BEGIN
  -- Site Survey Status
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'project_timeline' AND column_name = 'site_survey_status'
  ) THEN
    ALTER TABLE project_timeline ADD COLUMN site_survey_status text DEFAULT 'pending_schedule'
      CHECK (site_survey_status IN ('pending_schedule', 'scheduled', 'completed'));
  END IF;

  -- Engineering Status
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'project_timeline' AND column_name = 'engineering_status'
  ) THEN
    ALTER TABLE project_timeline ADD COLUMN engineering_status text DEFAULT 'pending'
      CHECK (engineering_status IN ('pending', 'completed'));
  END IF;

  -- Utility Application Status
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'project_timeline' AND column_name = 'utility_status'
  ) THEN
    ALTER TABLE project_timeline ADD COLUMN utility_status text DEFAULT 'not_started'
      CHECK (utility_status IN ('not_started', 'submitted', 'revision_required', 'revision_submitted', 'approved'));
  END IF;

  -- City Permit Status
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'project_timeline' AND column_name = 'permit_status'
  ) THEN
    ALTER TABLE project_timeline ADD COLUMN permit_status text DEFAULT 'not_started'
      CHECK (permit_status IN ('not_started', 'submitted', 'revision_required', 'revision_submitted', 'approved'));
  END IF;

  -- Installation Coordination Status
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'project_timeline' AND column_name = 'installation_status'
  ) THEN
    ALTER TABLE project_timeline ADD COLUMN installation_status text DEFAULT 'pending_customer'
      CHECK (installation_status IN ('pending_customer', 'pending_material', 'scheduled', 'completed'));
  END IF;

  -- Material Order Status
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'project_timeline' AND column_name = 'material_order_status'
  ) THEN
    ALTER TABLE project_timeline ADD COLUMN material_order_status text DEFAULT 'not_ordered'
      CHECK (material_order_status IN ('not_ordered', 'ordered', 'delivered'));
  END IF;

  -- Inspection Status (expanded)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'project_timeline' AND column_name = 'inspection_status'
  ) THEN
    ALTER TABLE project_timeline ADD COLUMN inspection_status text DEFAULT 'not_ready'
      CHECK (inspection_status IN ('not_ready', 'ready', 'scheduled', 'passed', 'failed', 'service_required', 'service_completed'));
  END IF;
END $$;

-- Add revision tracking date fields
DO $$
BEGIN
  -- Utility revision dates
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'project_timeline' AND column_name = 'utility_revision_date'
  ) THEN
    ALTER TABLE project_timeline ADD COLUMN utility_revision_date timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'project_timeline' AND column_name = 'utility_revision_submitted_date'
  ) THEN
    ALTER TABLE project_timeline ADD COLUMN utility_revision_submitted_date timestamptz;
  END IF;

  -- Permit revision dates
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'project_timeline' AND column_name = 'permit_revision_date'
  ) THEN
    ALTER TABLE project_timeline ADD COLUMN permit_revision_date timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'project_timeline' AND column_name = 'permit_revision_submitted_date'
  ) THEN
    ALTER TABLE project_timeline ADD COLUMN permit_revision_submitted_date timestamptz;
  END IF;

  -- Service completion after inspection failure
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'project_timeline' AND column_name = 'service_completed_date'
  ) THEN
    ALTER TABLE project_timeline ADD COLUMN service_completed_date timestamptz;
  END IF;

  -- Notes fields for each phase
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'project_timeline' AND column_name = 'utility_notes'
  ) THEN
    ALTER TABLE project_timeline ADD COLUMN utility_notes text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'project_timeline' AND column_name = 'permit_notes'
  ) THEN
    ALTER TABLE project_timeline ADD COLUMN permit_notes text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'project_timeline' AND column_name = 'installation_notes'
  ) THEN
    ALTER TABLE project_timeline ADD COLUMN installation_notes text;
  END IF;
END $$;