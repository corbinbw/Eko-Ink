-- ADD SIGNATURE COLUMNS TO USERS TABLE
-- Run this in your Supabase SQL Editor: https://vszhsjpmlufjmmbswvov.supabase.co/project/_/sql

-- Add signature_image_url column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'signature_image_url'
    ) THEN
        ALTER TABLE users ADD COLUMN signature_image_url TEXT;
        RAISE NOTICE 'Added signature_image_url column';
    ELSE
        RAISE NOTICE 'signature_image_url column already exists';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'signature_storage_path'
    ) THEN
        ALTER TABLE users ADD COLUMN signature_storage_path TEXT;
        RAISE NOTICE 'Added signature_storage_path column';
    ELSE
        RAISE NOTICE 'signature_storage_path column already exists';
    END IF;
END $$;

-- Add comments for documentation
COMMENT ON COLUMN users.signature_image_url IS 'Public URL to user signature image (base64 data URL or storage URL)';
COMMENT ON COLUMN users.signature_storage_path IS 'Supabase storage path for signature image';
