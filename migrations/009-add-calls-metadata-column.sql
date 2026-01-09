-- Migration 009: Add metadata column to calls table for storing multiple audio files
-- Created: 2026-01-08
-- Purpose: Support multiple audio files per call by storing URLs and paths in metadata

-- Add metadata column to calls table
ALTER TABLE calls
ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_calls_metadata ON calls USING gin(metadata);

-- Add comment
COMMENT ON COLUMN calls.metadata IS 'Stores additional call data like multiple audio file URLs/paths when combining recordings';
