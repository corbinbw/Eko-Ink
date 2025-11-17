-- Reset test credits for Corbin Williams account
-- Run this in Supabase SQL Editor

-- First, find the account ID for corbinbrandonwilliams@gmail.com
-- Then set credits to 0

UPDATE accounts
SET credits_remaining = 0
WHERE id IN (
  SELECT account_id
  FROM users
  WHERE email = 'corbinbrandonwilliams@gmail.com'
);

-- Verify the change
SELECT
  a.id,
  a.company_name,
  a.credits_remaining,
  u.email
FROM accounts a
JOIN users u ON u.account_id = a.id
WHERE u.email = 'corbinbrandonwilliams@gmail.com';
