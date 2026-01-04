-- สร้าง profile และกำหนดสิทธิ์ admin ให้ altifadev@gmail.com
-- รันหลังจากสร้าง user ใน Supabase Dashboard แล้ว

-- สร้าง profile สำหรับ admin ใหม่
INSERT INTO profiles (id, email, name, created_at, updated_at)
SELECT 
  id, 
  'altifadev@gmail.com', 
  'Admin User',
  now(),
  now()
FROM auth.users 
WHERE email = 'altifadev@gmail.com'
AND NOT EXISTS (
  SELECT 1 FROM profiles WHERE email = 'altifadev@gmail.com'
);

-- กำหนดสิทธิ์ admin
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

-- ตรวจสอบผลลัพธ์
SELECT 
  u.id,
  u.email,
  u.created_at as auth_created,
  p.name,
  p.credit_balance,
  ur.role as user_role
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
LEFT JOIN user_roles ur ON u.id = ur.user_id
WHERE u.email = 'altifadev@gmail.com';
