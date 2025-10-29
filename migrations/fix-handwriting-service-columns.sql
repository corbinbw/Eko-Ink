-- Migration: Fix handwriting service columns
-- The original schema had Handwrytten, but code now uses Handwrite.io
-- This migration adds the correct columns for Handwrite.io

-- Add Handwrite.io specific columns
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

-- Note: We're keeping the old handwrytten_* columns for backwards compatibility
-- They can be removed later if you're sure you won't use Handwrytten
