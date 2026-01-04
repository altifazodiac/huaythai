-- สร้าง admin ใหม่หลังจากสร้าง user ใน Supabase Dashboard

-- 1. สร้าง profile สำหรับ admin ใหม่
INSERT INTO profiles (id, email, name, role, created_at, updated_at)
SELECT 
  id, 
  'altifadev@gmail.com', 
  'Admin User', 
  'admin',
  now(),
  now()
FROM auth.users 
WHERE email = 'altifadev@gmail.com'
AND NOT EXISTS (
  SELECT 1 FROM profiles WHERE email = 'altifadev@gmail.com'
);

-- 2. กำหนดสิทธิ์ admin ใน user_roles
INSERT INTO user_roles (user_id, role)
SELECT 
  id,
  'admin'
FROM auth.users 
WHERE email = 'altifadev@gmail.com'
AND NOT EXISTS (
  SELECT 1 FROM user_roles WHERE user_id = (
    SELECT id FROM auth.users WHERE email = 'altifadev@gmail.com'
  )
);

-- 3. ตรวจสอบผลลัพธ์
SELECT 
  u.id,
  u.email,
  u.created_at as auth_created,
  p.name,
  p.role as profile_role,
  ur.role as user_role
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
LEFT JOIN user_roles ur ON u.id = ur.user_id
WHERE u.email = 'altifadev@gmail.com';
