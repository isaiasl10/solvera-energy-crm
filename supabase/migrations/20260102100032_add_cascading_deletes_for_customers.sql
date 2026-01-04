/*
  # Add Cascading Deletes for Customer Projects

  1. Purpose
    - Ensures that when a customer/project is deleted, all related data is automatically removed
    - Maintains database integrity and prevents orphaned records

  2. Changes
    - Updates foreign key constraints on all tables that reference customers.id
    - Changes ON DELETE behavior from RESTRICT/NO ACTION to CASCADE
    - Affects tables: project_timeline, documents, appointments, scheduling, customer_financing,
      project_messages, project_activity_log, sales_commissions

  3. Security
    - No changes to RLS policies - deletion permissions are controlled by existing policies on the customers table
*/

-- Drop existing foreign keys and recreate with CASCADE

-- project_timeline
ALTER TABLE project_timeline
  DROP CONSTRAINT IF EXISTS project_timeline_customer_id_fkey,
  ADD CONSTRAINT project_timeline_customer_id_fkey
    FOREIGN KEY (customer_id)
    REFERENCES customers(id)
    ON DELETE CASCADE;

-- documents
ALTER TABLE documents
  DROP CONSTRAINT IF EXISTS documents_customer_id_fkey,
  ADD CONSTRAINT documents_customer_id_fkey
    FOREIGN KEY (customer_id)
    REFERENCES customers(id)
    ON DELETE CASCADE;

-- appointments
ALTER TABLE appointments
  DROP CONSTRAINT IF EXISTS appointments_customer_id_fkey,
  ADD CONSTRAINT appointments_customer_id_fkey
    FOREIGN KEY (customer_id)
    REFERENCES customers(id)
    ON DELETE CASCADE;

-- scheduling
ALTER TABLE scheduling
  DROP CONSTRAINT IF EXISTS scheduling_customer_id_fkey,
  ADD CONSTRAINT scheduling_customer_id_fkey
    FOREIGN KEY (customer_id)
    REFERENCES customers(id)
    ON DELETE CASCADE;

-- customer_financing
ALTER TABLE customer_financing
  DROP CONSTRAINT IF EXISTS customer_financing_customer_id_fkey,
  ADD CONSTRAINT customer_financing_customer_id_fkey
    FOREIGN KEY (customer_id)
    REFERENCES customers(id)
    ON DELETE CASCADE;

-- project_messages
ALTER TABLE project_messages
  DROP CONSTRAINT IF EXISTS project_messages_customer_id_fkey,
  ADD CONSTRAINT project_messages_customer_id_fkey
    FOREIGN KEY (customer_id)
    REFERENCES customers(id)
    ON DELETE CASCADE;

-- project_activity_log
ALTER TABLE project_activity_log
  DROP CONSTRAINT IF EXISTS project_activity_log_customer_id_fkey,
  ADD CONSTRAINT project_activity_log_customer_id_fkey
    FOREIGN KEY (customer_id)
    REFERENCES customers(id)
    ON DELETE CASCADE;

-- sales_commissions
ALTER TABLE sales_commissions
  DROP CONSTRAINT IF EXISTS sales_commissions_customer_id_fkey,
  ADD CONSTRAINT sales_commissions_customer_id_fkey
    FOREIGN KEY (customer_id)
    REFERENCES customers(id)
    ON DELETE CASCADE;

-- Now handle the photo tables that reference scheduling
-- When scheduling records are deleted (via customer cascade), these photos should also be deleted

-- installation_photos
ALTER TABLE installation_photos
  DROP CONSTRAINT IF EXISTS installation_photos_ticket_id_fkey,
  ADD CONSTRAINT installation_photos_ticket_id_fkey
    FOREIGN KEY (ticket_id)
    REFERENCES scheduling(id)
    ON DELETE CASCADE;

-- inspection_photos
ALTER TABLE inspection_photos
  DROP CONSTRAINT IF EXISTS inspection_photos_ticket_id_fkey,
  ADD CONSTRAINT inspection_photos_ticket_id_fkey
    FOREIGN KEY (ticket_id)
    REFERENCES scheduling(id)
    ON DELETE CASCADE;

-- site_survey_photos
ALTER TABLE site_survey_photos
  DROP CONSTRAINT IF EXISTS site_survey_photos_ticket_id_fkey,
  ADD CONSTRAINT site_survey_photos_ticket_id_fkey
    FOREIGN KEY (ticket_id)
    REFERENCES scheduling(id)
    ON DELETE CASCADE;
