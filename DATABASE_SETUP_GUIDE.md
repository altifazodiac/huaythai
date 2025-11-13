# =====================================================
# คู่มือการสร้างฐานข้อมูล Supabase ใหม่
# แก้ปัญหา Migration Files ที่ล้าสมัย
# =====================================================

## ปัญหาที่พบใน Migration Files เก่า

1. **ซ้ำซ้อน**: lottery_results table ถูกสร้าง 3 ครั้งในไฟล์ต่างกัน
2. **Schema ไม่สอดคล้อง**: บางตารางมีโครงสร้างต่างกัน
3. **Dependency ผิด**: บาง migration อ้างอิงตารางที่ยังไม่ถูกสร้าง
4. **ขาดตารางพื้นฐาน**: ไม่มีไฟล์สร้าง lottery_types, lottery_sub_types

## วิธีแก้ปัญหา: ใช้ Migration Files ใหม่

### ขั้นตอนที่ 1: สร้าง Supabase Project ใหม่
1. ไปที่ https://supabase.com
2. สร้าง project ใหม่
3. เลือก PostgreSQL version 15
4. จด URL และ API keys

### ขั้นตอนที่ 2: อัปเดต Environment Variables
```env
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://your-new-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-new-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### ขั้นตอนที่ 3: รัน Migration Files ใหม่ (แนะนำ)

#### วิธี A: ใช้ Supabase CLI (แนะนำสุด)
```bash
# ติดตั้ง Supabase CLI
npm install -g supabase

# Login และ link project
supabase login
supabase link --project-ref your-new-project-ref

# รัน migration ใหม่ทั้งหมด (ตามลำดับ)
supabase db push
```

#### วิธี B: รันผ่าน SQL Editor (ทีละไฟล์)
1. เปิด Supabase Dashboard → SQL Editor
2. รันตามลำดับ:

```sql
-- 1. สร้างตารางพื้นฐานประเภทหวย
-- รันไฟล์: 001_create_lottery_types.sql

-- 2. สร้างตารางผู้ใช้และสิทธิ์  
-- รันไฟล์: 002_create_user_system.sql

-- 3. สร้างตารางระบบหวย (ตั๋วและผล)
-- รันไฟล์: 003_create_lottery_system.sql

-- 4. สร้างตารางระบบเลขอั้นและ Automation
-- รันไฟล์: 004_create_managed_numbers_and_automation.sql

-- 5. สร้าง Functions และ Triggers
-- รันไฟล์: 005_create_functions_and_triggers.sql

-- 6. เพิ่มข้อมูลพื้นฐาน
-- รันไฟล์: 006_seed_data.sql
```

### ขั้นตอนที่ 4: ตรวจสอบการติดตั้ง

```sql
-- ตรวจสอบตารางทั้งหมด
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- ตรวจสอบข้อมูลพื้นฐาน
SELECT * FROM lottery_types;
SELECT * FROM lottery_sub_types;
SELECT * FROM lottery_sub_number;
SELECT COUNT(*) as total_schedules FROM drawing_schedules;
```

### ขั้นตอนที่ 5: ทดสอบระบบ

```bash
# รัน development server
npm run dev

# ทดสอบการเชื่อมต่อฐานข้อมูล
# เข้า http://localhost:3000 และลอง login
```

## โครงสร้าง Migration Files ใหม่

```
supabase/migrations/clean/
├── 001_create_lottery_types.sql              # ตารางประเภทหวย
├── 002_create_user_system.sql                # ตารางผู้ใช้และสิทธิ์
├── 003_create_lottery_system.sql             # ตารางตั๋วหวยและผล
├── 004_create_managed_numbers_and_automation.sql  # เลขอั้นและ automation
├── 005_create_functions_and_triggers.sql     # Functions และ triggers
└── 006_seed_data.sql                         # ข้อมูลพื้นฐาน
```

## ความสามารถของระบบใหม่

✅ **ครบถ้วน**: ครอบคลุมทุกตารางที่จำเป็น  
✅ **ไม่ซ้ำซ้อน**: แต่ละตารางสร้างครั้งเดียว  
✅ **Dependency ถูกต้อง**: สร้างตามลำดับที่ถูกต้อง  
✅ **RLS Policies**: ความปลอดภัยครบถ้วน  
✅ **Indexes**: ประสิทธิภาพสูง  
✅ **Functions**: พร้อมใช้งาน  
✅ **Seed Data**: ข้อมูลพื้นฐานพร้อม  

## ข้อควรระวัง

⚠️ **Backup**: สำรองข้อมูลเก่าก่อน  
⚠️ **Environment**: อัปเดตค่า config ใหม่  
⚠️ **Order**: ต้องรันตามลำดับที่กำหนด  
⚠️ **Testing**: ทดสอบการทำงานให้ละเอียด  
⚠️ **API Keys**: เก็บ service role key อย่างปลอดภัย  

## ตรวจสอบสถานะหลังติดตั้ง

```sql
-- ตรวจสอบจำนวนตาราง
SELECT COUNT(*) as total_tables 
FROM information_schema.tables 
WHERE table_schema = 'public';

-- ตรวจสอบ functions
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_type = 'FUNCTION';

-- ตรวจสอบ triggers
SELECT trigger_name, event_object_table 
FROM information_schema.triggers 
WHERE trigger_schema = 'public';
```

ระบบใหม่นี้พร้อมใช้งานและแก้ไขปัญหาทั้งหมดจาก migration files เก่าครับ!
