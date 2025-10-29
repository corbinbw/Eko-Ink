-- Migration: Add handwriting service fields to notes table
-- Created: 2025-10-16

-- Add order tracking columns
ALTER TABLE notes
ADD COLUMN handwriteio_order_id TEXT,
ADD COLUMN handwriteio_status TEXT,
ADD COLUMN tracking_number TEXT,
ADD COLUMN estimated_delivery TIMESTAMP WITH TIME ZONE;

-- Add comments for documentation
COMMENT ON COLUMN notes.handwriteio_order_id IS 'Handwrite.io order ID for tracking';
COMMENT ON COLUMN notes.handwriteio_status IS 'Order status: processing, written, complete, problem, cancelled';
COMMENT ON COLUMN notes.tracking_number IS 'USPS tracking number when available';
COMMENT ON COLUMN notes.estimated_delivery IS 'Estimated delivery date';
