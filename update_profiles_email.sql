-- อัปเดต email ในตาราง profiles หลังจากเปลี่ยนใน Supabase Dashboard
UPDATE profiles 
SET email = 'altifadev@gmail.com'
WHERE email = 'admin@gmail.com';

-- ตรวจสอบผลลัพธ์
SELECT * FROM profiles WHERE email = 'altifadev@gmail.com';
