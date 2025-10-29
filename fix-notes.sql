-- Fix existing notes that have placeholder text
UPDATE notes 
SET draft_text = NULL, status = 'pending'
WHERE draft_text = 'Generating note...' OR draft_text = '';


