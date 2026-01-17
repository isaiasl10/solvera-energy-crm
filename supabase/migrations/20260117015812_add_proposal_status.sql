/*
  # Add Proposal Status Tracking

  1. Changes
    - Add `status` column to proposals table
    - Valid statuses: draft, sent, viewed, pending, customer_signed, closed_deal
    - Default status is 'draft'

  2. Security
    - Maintains existing RLS policies
*/

-- Add status column to proposals table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'proposals' AND column_name = 'status'
  ) THEN
    ALTER TABLE proposals ADD COLUMN status text DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'viewed', 'pending', 'customer_signed', 'closed_deal'));
    CREATE INDEX IF NOT EXISTS idx_proposals_status ON proposals(status);
  END IF;
END $$;
