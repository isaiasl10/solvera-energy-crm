/*
  # Add Photo URLs Storage to Installation Photos Table

  1. Changes
    - Add JSONB column to store photo URLs mapped to photo IDs
    - Structure: { "rooftop_0": ["url1", "url2"], "electrical_1": ["url3"] }
    - Each photo item can have multiple photos uploaded
    
  2. Notes
    - Uses JSONB for flexible storage and efficient querying
    - Stores array of photo URLs per checklist item
*/

-- Add photo_urls column to store uploaded photo URLs
ALTER TABLE installation_photos 
ADD COLUMN IF NOT EXISTS photo_urls jsonb DEFAULT '{}'::jsonb;