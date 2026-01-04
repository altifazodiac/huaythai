-- ลบ admin เก่า (ถ้าต้องการ - ระวัง! จะลบข้อมูลทั้งหมด)
-- รันคำสั่งนี้เฉพาะเมื่อแน่ใจว่า admin ใหม่ทำงานได้แล้ว

-- ลบจาก user_roles
DELETE FROM user_roles WHERE user_id = (
  SELECT id FROM auth.users WHERE email = 'admin@gmail.com'
);

-- ลบจาก profiles
DELETE FROM profiles WHERE email = 'admin@gmail.com';

-- ลบจาก auth.users (ต้องทำใน Supabase Dashboard)
-- ไปที่ Authentication > Users > ค้นหา admin@gmail.com > Delete

-- ตรวจสอบหลังลบ
SELECT COUNT(*) as remaining_admin_count 
FROM auth.users 
WHERE email IN ('admin@gmail.com', 'altifadev@gmail.com');
