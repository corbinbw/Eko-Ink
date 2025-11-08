-- Add intelligent analysis fields to calls table
-- This enables the world-class AI system to store structured insights

ALTER TABLE calls
ADD COLUMN analyzed_data JSONB,
ADD COLUMN analysis_status TEXT DEFAULT 'pending',
ADD COLUMN analyzed_at TIMESTAMPTZ;

COMMENT ON COLUMN calls.analyzed_data IS 'Structured AI analysis of call: key moments, emotions, commitments, customer profile';
COMMENT ON COLUMN calls.analysis_status IS 'Status: pending, analyzing, complete, failed';
COMMENT ON COLUMN calls.analyzed_at IS 'When the intelligent analysis completed';

-- Add index for querying by analysis status
CREATE INDEX idx_calls_analysis_status ON calls(analysis_status);

-- Example of analyzed_data structure:
-- {
--   "key_moments": [
--     {
--       "timestamp": "3:45",
--       "content": "Customer mentioned daughter starting college",
--       "emotion": "proud",
--       "importance": 9
--     }
--   ],
--   "customer_profile": {
--     "emotional_tone": "excited_but_practical",
--     "family": ["daughter in college"],
--     "interests": ["road trips", "camping"],
--     "concerns_resolved": ["financing"]
--   },
--   "commitments": [
--     "Follow up about extended warranty next week"
--   ],
--   "analysis_quality_score": 0.85
-- }
