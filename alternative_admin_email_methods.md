# วิธีเปลี่ยน Email Admin แบบอื่นๆ

## วิธีที่ 2: สร้าง Admin ใหม่ (แนะนำที่สุด)

### ขั้นตอน:
1. **สร้าง user ใหม่** ด้วย email altifadev@gmail.com
2. **กำหนดสิทธิ์ admin** ให้ user ใหม่
3. **ลบ user เก่า** admin@gmail.com (ถ้าต้องการ)

### SQL สำหรับสร้าง admin ใหม่:
```sql
-- 1. สร้าง user ใหม่ผ่าน Supabase Auth
-- ไปที่ Authentication > Users > Add user
-- กรอก: altifadev@gmail.com และตั้งรหัสผ่าน

-- 2. คัดลอก user ID จากหน้า Authentication แล้วรัน SQL นี้:
INSERT INTO profiles (id, email, name, role, created_at)
SELECT 
  id, 
  'altifadev@gmail.com', 
  'Admin User', 
  'admin',
  now()
FROM auth.users 
WHERE email = 'altifadev@gmail.com';

-- 3. กำหนดสิทธิ์ admin
INSERT INTO user_roles (user_id, role)
SELECT 
  id,
  'admin'
FROM auth.users 
WHERE email = 'altifadev@gmail.com';
```

## วิธีที่ 3: ใช้ Supabase Admin API

### สร้าง script เพื่อเปลี่ยน email:
```javascript
// ใช้ใน Node.js หรือ browser console
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://wbvgdqiozztgqodtajui.supabase.co',
  'your-service-role-key' // Service Role Key จาก Settings > API
);

async function updateAdminEmail() {
  // ค้นหา user ID ของ admin@gmail.com
  const { data: users } = await supabase.auth.admin.listUsers();
  const adminUser = users.users.find(u => u.email === 'admin@gmail.com');
  
  if (adminUser) {
    // เปลี่ยน email
    const { data, error } = await supabase.auth.admin.updateUserById(
      adminUser.id,
      { email: 'altifadev@gmail.com' }
    );
    
    console.log('Updated:', data, error);
  }
}

updateAdminEmail();
```

## วิธีที่ 4: ใช้ Supabase CLI
```bash
# ติดตั้ง Supabase CLI ก่อน
npx supabase login

# ใช้คำสั่งอัปเดต user
supabase auth users update admin@gmail.com --email altifadev@gmail.com
```

## แนะนำให้ใช้วิธีที่ 2 (สร้าง admin ใหม่)
เพราะ:
- ปลอดภัยที่สุด
- ไม่กระทบข้อมูลเก่า
- ง่ายต่อการควบคุม
- สามารถทดสอบได้ทันที
