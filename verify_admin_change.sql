-- ตรวจสอบผลลัพธ์การเปลี่ยน email admin

-- ตรวจสอบใน auth.users
SELECT 
  id,
  email,
  created_at,
  last_sign_in_at,
  email_confirmed_at
FROM auth.users 
WHERE email IN ('admin@gmail.com', 'altifadev@gmail.com')
ORDER BY created_at DESC;

-- ตรวจสอบใน profiles table
SELECT 
  id,
  email,
  name,
  role,
  phone,
  created_at,
  updated_at
FROM profiles 
WHERE email IN ('admin@gmail.com', 'altifadev@gmail.com')
ORDER BY created_at DESC;

-- ตรวจสอบใน user_roles table
SELECT 
  ur.user_id,
  ur.role,
  u.email
FROM user_roles ur
JOIN auth.users u ON ur.user_id = u.id
WHERE u.email IN ('admin@gmail.com', 'altifadev@gmail.com');
