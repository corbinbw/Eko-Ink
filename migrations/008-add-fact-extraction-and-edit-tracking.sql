-- Migration 008: Add fact extraction and edit tracking support
-- Created: 2026-01-08
-- Purpose: Add structured fact storage and edit delta tracking for AI improvements

-- Add fact extraction fields to calls table
ALTER TABLE calls ADD COLUMN IF NOT EXISTS facts_json JSONB;
ALTER TABLE calls ADD COLUMN IF NOT EXISTS extraction_status TEXT DEFAULT 'pending';

-- Add edit tracking to notes table
ALTER TABLE notes ADD COLUMN IF NOT EXISTS edit_delta JSONB;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_calls_extraction_status ON calls(extraction_status);
CREATE INDEX IF NOT EXISTS idx_notes_edit_delta ON notes(id) WHERE edit_delta IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN calls.facts_json IS 'Structured facts extracted from call transcript (customer_goal, key_moments, personal_details, risk_flags)';
COMMENT ON COLUMN calls.extraction_status IS 'Status of fact extraction: pending, processing, complete, failed';
COMMENT ON COLUMN notes.edit_delta IS 'Tracks what user changed when editing draft (phrases_added, phrases_removed, length_change)';
