/*
  # Add Mentions Support to Project Messages

  ## Changes
  
  1. Modifications to `project_messages` Table
    - Add `mentions` column (text array) - Array of user IDs who are mentioned in the message
  
  ## Notes
  - This allows tracking which users are @mentioned in each message
  - The mentions array stores user IDs for efficient querying
*/

-- Add mentions column to project_messages
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'project_messages' AND column_name = 'mentions'
  ) THEN
    ALTER TABLE project_messages ADD COLUMN mentions text[] DEFAULT ARRAY[]::text[];
  END IF;
END $$;

-- Create index for faster mention queries
CREATE INDEX IF NOT EXISTS idx_project_messages_mentions ON project_messages USING GIN(mentions);