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

### 1. รัน Migration บน VPS

```bash
# ให้สิทธิ์การรัน script
chmod +x run-migrations-vps.sh

# รัน migration
./run-migrations-vps.sh
```

### 2. ตรวจสอบสถานะ Migration

```bash
# ตรวจสอบว่าการเปลี่ยนแปลงสำเร็จหรือไม่
psql $DATABASE_URL -f check-migration-status.sql
```

### 3. ตรวจสอบผลลัพธ์

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