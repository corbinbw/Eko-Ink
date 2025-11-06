-- Make your user a manager and generate an invite code
-- Run this in Supabase SQL Editor

UPDATE users
SET
  role = 'manager',
  invite_code = SUBSTRING(MD5(RANDOM()::TEXT || RANDOM()::TEXT) FROM 1 FOR 8),
  team_name = 'Sales Team'
WHERE email = 'corbinbrandonwilliams@gmail.com';

-- Verify the update
SELECT id, email, name, role, invite_code, team_name
FROM users
WHERE email = 'corbinbrandonwilliams@gmail.com';
