-- Migration: Add signature fields to users table
-- Created: 2025-10-16

-- Add signature storage columns
ALTER TABLE users
ADD COLUMN signature_image_url TEXT,
ADD COLUMN signature_storage_path TEXT;

-- Add comment for documentation
COMMENT ON COLUMN users.signature_image_url IS 'Public URL to user signature image';
COMMENT ON COLUMN users.signature_storage_path IS 'Supabase storage path for signature image';
