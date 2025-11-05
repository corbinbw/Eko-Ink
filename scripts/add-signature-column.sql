-- Add signature_image_url column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'signature_image_url'
    ) THEN
        ALTER TABLE users ADD COLUMN signature_image_url TEXT;
        COMMENT ON COLUMN users.signature_image_url IS 'Public URL to user signature image';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'signature_storage_path'
    ) THEN
        ALTER TABLE users ADD COLUMN signature_storage_path TEXT;
        COMMENT ON COLUMN users.signature_storage_path IS 'Supabase storage path for signature image';
    END IF;
END $$;
