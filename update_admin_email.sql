-- Execute this SQL directly in Supabase SQL Editor
-- https://supabase.com/dashboard/project/wbvgdqiozztgqodtajui/sql

-- Update admin email in auth.users table
UPDATE auth.users 
SET email = 'altifadev@gmail.com'
WHERE email = 'admin@gmail.com';

-- Update email in profiles table as well (if exists)
UPDATE profiles 
SET email = 'altifadev@gmail.com'
WHERE email = 'admin@gmail.com';

-- Verify the change
SELECT 
  id,
  email,
  created_at,
  last_sign_in_at,
  raw_user_meta_data
FROM auth.users 
WHERE email = 'altifadev@gmail.com';

-- Check profiles table
SELECT 
  id,
  email,
  name,
  phone,
  created_at
FROM profiles 
WHERE email = 'altifadev@gmail.com';
