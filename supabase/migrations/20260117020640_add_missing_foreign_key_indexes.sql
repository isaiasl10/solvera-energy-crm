/*
  # Add Missing Foreign Key Indexes

  1. Performance Improvements
    - Add indexes for unindexed foreign keys
    - Improves query performance for joins and lookups

  2. Indexes Added
    - customers.installer_id
    - project_timeline.customer_id
    - project_timeline.installer_id
    - proposals.created_by
    - proposals.owner_id
*/

-- Add index for customers.installer_id
CREATE INDEX IF NOT EXISTS idx_customers_installer_id ON customers(installer_id);

-- Add index for project_timeline.customer_id (if not exists)
CREATE INDEX IF NOT EXISTS idx_project_timeline_customer_id ON project_timeline(customer_id);

-- Add index for project_timeline.installer_id
CREATE INDEX IF NOT EXISTS idx_project_timeline_installer_id ON project_timeline(installer_id);

-- Add index for proposals.created_by
CREATE INDEX IF NOT EXISTS idx_proposals_created_by ON proposals(created_by);

-- Add index for proposals.owner_id
CREATE INDEX IF NOT EXISTS idx_proposals_owner_id ON proposals(owner_id);
