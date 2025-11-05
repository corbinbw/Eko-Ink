-- Simple migration to add signature columns
ALTER TABLE users ADD COLUMN IF NOT EXISTS signature_image_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS signature_storage_path TEXT;
