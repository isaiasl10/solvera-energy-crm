/*
  # Add Custom ID and Photo to Users

  1. Changes to Tables
    - `app_users`
      - Add `custom_id` field (text, unique) - User-defined identifier for employees
      - Add `photo_url` field (text, nullable) - URL to user's profile photo

  2. Details
    - Custom ID allows for company-specific employee numbering systems
    - Custom ID must be unique across all users
    - Photo URL will store the path to the user's profile photo in Supabase Storage
    - Both fields are optional to maintain backward compatibility

  3. Indexes
    - Add unique index on custom_id for fast lookups
*/

-- Add custom_id column
ALTER TABLE app_users 
ADD COLUMN IF NOT EXISTS custom_id text;

-- Add photo_url column
ALTER TABLE app_users 
ADD COLUMN IF NOT EXISTS photo_url text;

-- Add unique constraint on custom_id
ALTER TABLE app_users 
ADD CONSTRAINT app_users_custom_id_unique UNIQUE (custom_id);

-- Create index for custom_id lookups
CREATE INDEX IF NOT EXISTS idx_app_users_custom_id ON app_users(custom_id);