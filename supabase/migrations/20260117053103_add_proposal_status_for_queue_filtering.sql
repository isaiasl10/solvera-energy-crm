/*
  # Add Proposal Status for Queue Filtering

  1. Changes to proposals table
    - Add `proposal_status` column to track proposal lifecycle
    - Status values: 'draft', 'in_progress', 'sent_to_customer', 'customer_signed', 'closed_deal', 'lost'
    - Default: 'draft'
    - Add check constraint for valid statuses
    - Add index for efficient filtering
    
  2. Important Notes
    - CustomerQueue will ONLY show proposals with status: 'customer_signed' OR 'closed_deal'
    - All other statuses are hidden from New Customer queue
    - This separates active proposals from completed/signed deals
    
  3. Security
    - No RLS changes (per approval conditions)
*/

-- Add proposal_status column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'proposals' AND column_name = 'proposal_status'
  ) THEN
    ALTER TABLE proposals ADD COLUMN proposal_status text DEFAULT 'draft';
  END IF;
END $$;

-- Add check constraint for valid proposal statuses
ALTER TABLE proposals DROP CONSTRAINT IF EXISTS proposals_status_check;
ALTER TABLE proposals ADD CONSTRAINT proposals_status_check
  CHECK (proposal_status IN ('draft', 'in_progress', 'sent_to_customer', 'customer_signed', 'closed_deal', 'lost'));

-- Add index for efficient filtering in CustomerQueue
CREATE INDEX IF NOT EXISTS idx_proposals_status ON proposals(proposal_status);

-- Add comment documenting the status flow
COMMENT ON COLUMN proposals.proposal_status IS 'Proposal lifecycle status. CustomerQueue shows only customer_signed and closed_deal.';

-- Update existing NULL values to draft
UPDATE proposals SET proposal_status = 'draft' WHERE proposal_status IS NULL;