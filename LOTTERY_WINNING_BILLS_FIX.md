# 🔧 แก้ไขปัญหา 403 Forbidden - lottery_winning_bills

## 🚨 ปัญหาที่พบ

เมื่อเข้าถึงหน้า results จะเกิดข้อผิดพลาด 403 Forbidden เมื่อพยายามเข้าถึงตาราง `lottery_winning_bills`:

```
POST https://bqgiwmawqnixpgvuqhuc.supabase.co/rest/v1/lottery_winning_bills?on_conflict=bill_number 403 (Forbidden)
```

## 🔍 สาเหตุของปัญหา

ตาราง `lottery_winning_bills` มีอยู่แล้วในฐานข้อมูล แต่มีปัญหาเรื่อง:
- RLS policies ที่ไม่เหมาะสมหรือไม่มี
- การเข้าถึงข้อมูลที่ไม่มีสิทธิ์
- Error handling ที่ไม่ครอบคลุม

## ✅ การแก้ไข

### 1. ตรวจสอบโครงสร้างตารางที่มีอยู่

ตาราง `lottery_winning_bills` ที่มีอยู่มีโครงสร้างดังนี้:

```sql
create table public.lottery_winning_bills (
  id serial not null,
  bill_number text not null,
  bill_name text null,
  user_id text null,
  draw_date date null,
  total_prize numeric null,
  status text null default 'pending'::text,
  paid_at timestamp with time zone null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint lottery_winning_bills_pkey primary key (id),
  constraint unique_bill_number unique (bill_number)
) TABLESPACE pg_default;
```

### 2. ปรับปรุง Error Handling

แก้ไขหน้า `app/(protected)/results/page.tsx`:

- เพิ่ม try-catch blocks สำหรับการเข้าถึงตาราง
- แสดง warning แทน error เมื่อเกิดข้อผิดพลาด
- ตั้งค่า fallback values เมื่อเกิดข้อผิดพลาด
- ปรับการใช้งานให้เข้ากับโครงสร้างที่มีอยู่
- ใช้ batch operations แทนการ loop

### 3. แก้ไข RLS Policies

#### วิธีที่ 1: รัน SQL Script โดยตรงใน Supabase SQL Editor

คัดลอกเนื้อหาจากไฟล์ `fix-lottery-winning-bills-rls.sql` และรันใน Supabase SQL Editor

#### วิธีที่ 2: ใช้ Supabase CLI

```bash
# รัน migration
supabase db push --include-all

# หรือใช้สคริปต์
chmod +x fix-lottery-winning-bills-rls.sh
./fix-lottery-winning-bills-rls.sh
```

## 📊 โครงสร้างตาราง lottery_winning_bills

```sql
create table public.lottery_winning_bills (
  id serial not null,
  bill_number text not null,
  bill_name text null,
  user_id text null,
  draw_date date null,
  total_prize numeric null,
  status text null default 'pending'::text,
  paid_at timestamp with time zone null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint lottery_winning_bills_pkey primary key (id),
  constraint unique_bill_number unique (bill_number)
) TABLESPACE pg_default;
```

## 🔐 RLS Policies ที่แก้ไข

```sql
-- เปิดใช้งาน RLS
ALTER TABLE public.lottery_winning_bills ENABLE ROW LEVEL SECURITY;

-- Policy สำหรับการอ่านข้อมูล
CREATE POLICY "Enable read access for authenticated users" ON public.lottery_winning_bills
    FOR SELECT 
    USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- Policy สำหรับการเพิ่มข้อมูล
CREATE POLICY "Enable insert for authenticated users" ON public.lottery_winning_bills
    FOR INSERT 
    WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- Policy สำหรับการอัปเดตข้อมูล
CREATE POLICY "Enable update for authenticated users" ON public.lottery_winning_bills
    FOR UPDATE 
    USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- Policy สำหรับการลบข้อมูล (เฉพาะ service_role)
CREATE POLICY "Enable delete for service role only" ON public.lottery_winning_bills
    FOR DELETE 
    USING (auth.role() = 'service_role');
```

## ⚡ Features ที่ปรับปรุง

### 1. การติดตามสถานะการจ่ายรางวัล
- `pending`: รอจ่าย
- `paid`: จ่ายแล้ว
- `cancelled`: ยกเลิก

### 2. การอัปเดตเครดิตอัตโนมัติ
- เมื่อ admin กดปุ่ม "จ่ายแล้ว"
- อัปเดตเครดิตของผู้ใช้
- บันทึกธุรกรรมใน `credit_transactions`

### 3. การแสดงผลที่ปรับปรุง
- แสดงสถานะการจ่ายรางวัล
- แสดงเวลาที่จ่าย
- แสดงจำนวนรางวัลที่ได้รับ

### 4. การปรับปรุงประสิทธิภาพ
- ใช้ batch operations แทนการ loop
- เพิ่ม indexes สำหรับการค้นหา
- ปรับปรุง error handling

## 🚀 การใช้งาน

### สำหรับ User
1. เข้าหน้า results
2. เลือกวันที่ที่ต้องการดู
3. ดูบิลที่ถูกรางวัล
4. ตรวจสอบสถานะการจ่าย

### สำหรับ Admin
1. เข้าหน้า results
2. เลือกวันที่ที่ต้องการดู
3. กดปุ่ม "รอจ่าย" เพื่อเปลี่ยนสถานะเป็น "จ่ายแล้ว"
4. ระบบจะอัปเดตเครดิตของผู้ใช้อัตโนมัติ

## 🔧 การแก้ไขปัญหาเพิ่มเติม

### หากยังเกิด 403 Forbidden

1. ตรวจสอบ RLS policies:
```sql
SELECT * FROM pg_policies WHERE tablename = 'lottery_winning_bills';
```

2. ตรวจสอบสิทธิ์การเข้าถึง:
```sql
-- ตรวจสอบว่า RLS เปิดใช้งานหรือไม่
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'lottery_winning_bills';
```

3. ทดสอบการเข้าถึงโดยตรง:
```sql
-- ทดสอบการเข้าถึง (ต้องรันใน Supabase SQL Editor)
SELECT * FROM public.lottery_winning_bills LIMIT 5;
```

4. ตรวจสอบ permissions:
```sql
-- ตรวจสอบ permissions ที่มี
SELECT grantee, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_name = 'lottery_winning_bills';
```

### หากต้องการรีเซ็ตข้อมูล

```sql
-- ลบข้อมูลทั้งหมดในตาราง (ระวัง!)
DELETE FROM public.lottery_winning_bills;

-- รีเซ็ต sequence
ALTER SEQUENCE public.lottery_winning_bills_id_seq RESTART WITH 1;
```

## 📝 หมายเหตุ

- ตารางนี้มีอยู่แล้วในฐานข้อมูล
- โครงสร้างใช้ `user_id` เป็น `text` ไม่ใช่ `UUID`
- การจ่ายรางวัลจะอัปเดตเครดิตและบันทึกธุรกรรมอัตโนมัติ
- Error handling ได้รับการปรับปรุงให้ทนทานต่อข้อผิดพลาด
- ใช้ batch operations เพื่อเพิ่มประสิทธิภาพ

## 🎯 ผลลัพธ์ที่คาดหวัง

หลังจากแก้ไขแล้ว:
- ✅ ไม่มี 403 Forbidden error
- ✅ หน้า results แสดงข้อมูลได้ปกติ
- ✅ ระบบการจ่ายรางวัลทำงานได้
- ✅ การอัปเดตเครดิตทำงานได้
- ✅ การบันทึกธุรกรรมทำงานได้
- ✅ Error handling ที่ดีขึ้น
- ✅ ประสิทธิภาพที่ดีขึ้น

## 📋 ขั้นตอนการแก้ไข

1. **รัน SQL Script** ใน Supabase SQL Editor:
   - เปิดไฟล์ `fix-lottery-winning-bills-rls.sql`
   - คัดลอกเนื้อหาและรันใน Supabase SQL Editor

2. **ตรวจสอบผลลัพธ์**:
   - ตรวจสอบว่า policies ถูกสร้างแล้ว
   - ทดสอบการเข้าถึงตาราง

3. **ทดสอบหน้า results**:
   - เข้าหน้า results
   - ตรวจสอบว่าไม่มี 403 error
   - ทดสอบการทำงานของระบบ 