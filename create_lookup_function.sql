-- Execute this SQL directly in Supabase SQL Editor
-- https://supabase.com/dashboard/project/wbvgdqiozztgqodtajui/sql

-- Drop existing function first (if it exists)
DROP FUNCTION IF EXISTS lookup_user_by_phone(text);

-- Create function to lookup user by phone number
CREATE OR REPLACE FUNCTION lookup_user_by_phone(phone_number TEXT)
RETURNS TABLE (
  user_id UUID,
  user_email TEXT,
  user_phone TEXT,
  user_name TEXT
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id as user_id,
    p.email as user_email,
    p.phone as user_phone,
    p.name as user_name
  FROM profiles p
  WHERE p.phone = phone_number
     OR p.phone = REPLACE(phone_number, '+66', '0')
     OR p.phone = REPLACE(phone_number, '0', '+66')
     OR p.phone = REPLACE(REPLACE(phone_number, '+66', ''), '-', '')
     OR REPLACE(p.phone, '-', '') = REPLACE(phone_number, '-', '')
     OR REPLACE(p.phone, ' ', '') = REPLACE(phone_number, ' ', '')
  LIMIT 1;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION lookup_user_by_phone TO authenticated;
GRANT EXECUTE ON FUNCTION lookup_user_by_phone TO anon;

-- Test the function
-- SELECT * FROM lookup_user_by_phone('0812345678');
