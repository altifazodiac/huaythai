# 🎯 การติดตั้งระบบเลขอั้น (Number Cap System)

## 📋 สรุปปัญหาและการแก้ไข

### ปัญหาเดิม
- ระบบเลขอั้นเดิมหารครึ่งราคาซื้อ ทำให้ลูกค้าจ่ายน้อยลง
- ส่งผลให้รายได้ลดลงและไม่เป็นธรรมกับลูกค้าที่ซื้อเลขปกติ

### การแก้ไขใหม่
- ลูกค้าจ่ายเต็มราคาเสมอ
- เลขอั้นจะได้รับรางวัลครึ่งหนึ่ง (effective_prize_rate = prize_rate / 2)
- ข้อมูลถูกบันทึกในคอลัมน์ใหม่เพื่อการติดตาม

## 🚀 ขั้นตอนการติดตั้ง

### ตัวเลือกที่ 1: ใช้ Supabase Dashboard (แนะนำ - ง่ายที่สุด)

1. **เปิด Supabase Dashboard**
   - เข้าไปที่ https://supabase.com/dashboard
   - เลือกโปรเจคของคุณ

2. **เปิด SQL Editor**
   - ไปที่ SQL Editor ในเมนูด้านซ้าย

3. **รัน Migration Script**
   - คัดลอกเนื้อหาจากไฟล์ `run-migrations-supabase-sql.sql`
   - วางใน SQL Editor
   - กดปุ่ม "Run" หรือ Ctrl+Enter

4. **ตรวจสอบผลลัพธ์**
   - รันไฟล์ `check-migration-status-supabase.sql` เพื่อตรวจสอบสถานะ

### ตัวเลือกที่ 2: ใช้ Node.js บน VPS

```bash
# ให้สิทธิ์การรัน script
chmod +x run-migrations-simple.sh

# รัน migration
./run-migrations-simple.sh
```

### ตัวเลือกที่ 3: ใช้ Supabase CLI

```bash
# ให้สิทธิ์การรัน script
chmod +x run-migrations-vps-supabase.sh

# รัน migration
./run-migrations-vps-supabase.sh
```

### ตัวเลือกที่ 4: ใช้ curl

```bash
# ให้สิทธิ์การรัน script
chmod +x run-migrations-vps-curl.sh

# รัน migration
./run-migrations-vps-curl.sh
```

### ตัวเลือกที่ 5: รันด้วย Node.js โดยตรง

```bash
# ติดตั้ง dependencies (ถ้ายังไม่ได้ติดตั้ง)
npm install

# รัน migration
node run-migrations-vps-node.js
```

## 🔧 การตรวจสอบสถานะ

### ตรวจสอบผ่าน Supabase Dashboard (แนะนำ)

1. เปิด SQL Editor ใน Supabase Dashboard
2. คัดลอกเนื้อหาจากไฟล์ `check-migration-status-supabase.sql`
3. รัน script เพื่อดูสถานะ

### ตรวจสอบ Migration ด้วย Node.js

```bash
# ตรวจสอบสถานะ
node check-migration-status.js
```

### ตรวจสอบด้วย Node.js โดยตรง

```bash
# สร้าง script ตรวจสอบ
node -e "
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkMigration() {
  const { data, error } = await supabase
    .from('lottery_ticket_items')
    .select('effective_prize_rate, original_amount, number_cap_action, number_cap_status')
    .limit(5);
  
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Migration status:', data);
  }
}

checkMigration();
"
```

## 📊 ผลลัพธ์ที่คาดหวัง

ควรเห็นผลลัพธ์ดังนี้:

#### คอลัมน์ใหม่ในตาราง lottery_ticket_items:
- `effective_prize_rate` - อัตราจ่ายรางวัลที่ปรับแล้ว
- `original_amount` - จำนวนเงินเดิม
- `number_cap_status` - สถานะเลขอั้น (JSON)
- `number_cap_action` - การดำเนินการ ('half' หรือ 'close')

#### RPC Function ใหม่:
- `handle_lottery_order` - แทนที่ `handle_confirm_order` เก่า

## 🔧 การทำงานของระบบใหม่

### Frontend (React/Next.js)
1. ตรวจสอบเลขอั้นเมื่อเพิ่มเลข
2. คำนวณ `effective_prize_rate` สำหรับเลขอั้น
3. ส่งข้อมูลครบถ้วนไปยัง RPC function

### Backend (PostgreSQL)
1. รับข้อมูลจาก frontend
2. บันทึกข้อมูลในคอลัมน์ใหม่
3. คำนวณรางวัลตาม `effective_prize_rate`

### ตัวอย่างการทำงาน
```
เลขปกติ: 123
- ราคาซื้อ: 20 บาท
- อัตราจ่าย: 900 เท่า
- รางวัล: 18,000 บาท

เลขอั้น: 456 (half)
- ราคาซื้อ: 20 บาท (จ่ายเต็ม)
- อัตราจ่าย: 450 เท่า (ครึ่งหนึ่ง)
- รางวัล: 9,000 บาท
```

## 📊 การตรวจสอบข้อมูล

### ตรวจสอบรายการที่มีเลขอั้น
```sql
SELECT 
    id,
    numbers,
    amount,
    effective_prize_rate,
    number_cap_action,
    number_cap_status
FROM lottery_ticket_items 
WHERE number_cap_action = 'half'
ORDER BY created_at DESC;
```

### ตรวจสอบสถิติเลขอั้น
```sql
SELECT 
    number_cap_action,
    COUNT(*) as count,
    SUM(amount) as total_amount
FROM lottery_ticket_items 
WHERE number_cap_action IS NOT NULL
GROUP BY number_cap_action;
```

## ⚠️ ข้อควรระวัง

1. **ข้อมูลเก่า**: รายการเก่าจะมี `original_amount = amount` และ `effective_prize_rate = prize_rate`
2. **การทดสอบ**: ทดสอบระบบกับเลขปกติก่อนใช้เลขอั้น
3. **การสำรองข้อมูล**: สำรองฐานข้อมูลก่อนรัน migration
4. **Environment Variables**: ตรวจสอบให้แน่ใจว่ามี environment variables ครบถ้วน

## 🎉 ผลลัพธ์ที่คาดหวัง

- ✅ ลูกค้าจ่ายเต็มราคาเสมอ
- ✅ เลขอั้นได้รับรางวัลครึ่งหนึ่ง
- ✅ รายได้ไม่ลดลง
- ✅ ข้อมูลถูกบันทึกครบถ้วน
- ✅ ระบบทำงานอย่างเป็นธรรม

## 📞 การสนับสนุน

หากพบปัญหาในการติดตั้งหรือใช้งาน:
1. ตรวจสอบ log ของ migration
2. ตรวจสอบสถานะฐานข้อมูล
3. ทดสอบกับข้อมูลตัวอย่าง
4. ติดต่อทีมพัฒนา

## 🔍 การแก้ไขปัญหา

### ปัญหา: ไม่พบ psql
**วิธีแก้**: ใช้ Supabase Dashboard หรือ Node.js script

### ปัญหา: ไม่พบ supabase CLI
**วิธีแก้**: ใช้ Supabase Dashboard หรือ Node.js script

### ปัญหา: Environment variables ไม่ครบ
**วิธีแก้**: ใช้ Supabase Dashboard (ไม่ต้องใช้ environment variables)

### ปัญหา: Migration ล้มเหลว
**วิธีแก้**: 
1. ตรวจสอบ error message
2. รัน script ตรวจสอบสถานะ
3. ลองรันใหม่หรือใช้ Supabase Dashboard

## 📝 ขั้นตอนหลัง Migration

1. **รีสตาร์ท application server**
2. **ทดสอบระบบเลขอั้น**
3. **สร้างรายการใหม่เพื่อทดสอบ**
4. **ตรวจสอบข้อมูลในฐานข้อมูล** 