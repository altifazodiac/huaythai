# วิธีเปลี่ยน Email Admin ใน Supabase Auth

## ปัญหา
ไม่สามารถ UPDATE ตรงๆ ในตาราง auth.users ได้เพราะเป็นตารางพิเศษของ Supabase Auth

## วิธีแก้ไข

### วิธีที่ 1: ผ่าน Supabase Dashboard (แนะนำ)
1. เข้าไปที่ Supabase Dashboard
2. ไปที่ Authentication > Users
3. ค้นหา admin@gmail.com
4. คลิกที่ user นั้น
5. คลิก "Edit user" หรือ "Update email"
6. เปลี่ยนเป็น altifadev@gmail.com
7. บันทึกการเปลี่ยนแปลง

### วิธีที่ 2: สร้าง Admin ใหม่แล้วลบเก่า
1. สร้าง user ใหม่ด้วย altifadev@gmail.com
2. กำหนดสิทธิ์ admin ให้ user ใหม่
3. ลบ user เก่า admin@gmail.com

### วิธีที่ 3: ใช้ Admin API
```javascript
// ใช้ Supabase Admin Service Role Key
const { data, error } = await supabase.auth.admin.updateUserById(
  'user-id-here',
  { email: 'altifadev@gmail.com' }
);
```

## ขั้นตอนที่แนะนำ
1. ใช้ Supabase Dashboard (วิธีที่ 1)
2. หลังจากเปลี่ยน email แล้ว
3. อัปเดต profiles table ให้ตรงกัน:
```sql
UPDATE profiles 
SET email = 'altifadev@gmail.com'
WHERE email = 'admin@gmail.com';
```

## ตรวจสอบหลังเปลี่ยน
- ทดสอบล็อกอินด้วย altifadev@gmail.com
- ตรวจสอบสิทธิ์ admin
- ตรวจสอบข้อมูลใน profiles table
