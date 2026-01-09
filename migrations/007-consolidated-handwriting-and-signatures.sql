-- Migration 007: Consolidated Handwriting and Signature Fields
-- Combines: add-handwriting-fields.sql, add-signature-fields.sql, fix-handwriting-service-columns.sql
-- Created: 2025-12-15 (consolidation cleanup)

-- Add Handwrite.io tracking columns to notes table
ALTER TABLE notes
ADD COLUMN IF NOT EXISTS handwriteio_order_id TEXT,
ADD COLUMN IF NOT EXISTS handwriteio_status TEXT,
ADD COLUMN IF NOT EXISTS tracking_number TEXT,
ADD COLUMN IF NOT EXISTS estimated_delivery TIMESTAMP WITH TIME ZONE;

-- Add comments for documentation
COMMENT ON COLUMN notes.handwriteio_order_id IS 'Handwrite.io order ID for tracking';
COMMENT ON COLUMN notes.handwriteio_status IS 'Order status: processing, written, complete, problem, cancelled';
COMMENT ON COLUMN notes.tracking_number IS 'USPS tracking number when available';
COMMENT ON COLUMN notes.estimated_delivery IS 'Estimated delivery date from Handwrite.io';

-- Add signature storage columns to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS signature_image_url TEXT,
ADD COLUMN IF NOT EXISTS signature_storage_path TEXT;

-- Add comments for documentation
COMMENT ON COLUMN users.signature_image_url IS 'Public URL to user signature image';
COMMENT ON COLUMN users.signature_storage_path IS 'Supabase storage path for signature image';
