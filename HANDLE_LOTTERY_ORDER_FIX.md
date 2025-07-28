# แก้ไขปัญหา handle_lottery_order function

## ปัญหาที่พบ
```
Error: UPDATE requires a WHERE clause
```

## สาเหตุของปัญหา
ฟังก์ชัน `handle_lottery_order` พยายาม INSERT ข้อมูลลงในตาราง `lottery_ticket_items` และ `lottery_tickets` แต่คอลัมน์ที่จำเป็นไม่มีอยู่ในตาราง

### คอลัมน์ที่ขาดหายไป:

#### ตาราง `lottery_ticket_items`:
- `original_amount` - จำนวนเงินเดิมก่อนปรับเลขอั้น
- `effective_prize_rate` - อัตราจ่ายรางวัลที่ปรับแล้วสำหรับเลขอั้น
- `number_cap_action` - การกระทำกับเลขอั้น (close, half, null)
- `number_cap_status` - สถานะเลขอั้นในรูปแบบ JSON

#### ตาราง `lottery_tickets`:
- `draw_time` - เวลาที่จะออกรางวัล
- `close_time` - เวลาที่ปิดรับซื้อ
- `bill_name` - ชื่อบิล
- `bill_number` - เลขบิล

## วิธีแก้ไข

### 1. รัน Migration ใหม่

สร้างไฟล์ migration ใหม่ที่เพิ่มคอลัมน์ที่จำเป็น:

```sql
-- Migration 1: เพิ่มคอลัมน์สำหรับระบบเลขอั้น
ALTER TABLE public.lottery_ticket_items 
ADD COLUMN IF NOT EXISTS original_amount DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS effective_prize_rate DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS number_cap_action TEXT,
ADD COLUMN IF NOT EXISTS number_cap_status JSONB;

-- Migration 2: เพิ่มคอลัมน์สำหรับข้อมูลบิล
ALTER TABLE public.lottery_tickets 
ADD COLUMN IF NOT EXISTS draw_time TIME,
ADD COLUMN IF NOT EXISTS close_time TIME,
ADD COLUMN IF NOT EXISTS bill_name TEXT,
ADD COLUMN IF NOT EXISTS bill_number TEXT;
```

### 2. วิธีรัน Migration

#### วิธีที่ 1: ใช้ Supabase CLI
```bash
supabase db push
```

#### วิธีที่ 2: รันใน Supabase Dashboard
1. ไปที่ Supabase Dashboard
2. ไปที่ SQL Editor
3. Copy และ paste SQL จากไฟล์ `fix-handle-lottery-order.sql`
4. กด Run

#### วิธีที่ 3: ใช้ VPS Script
```bash
./run-migrations-vps-curl.sh
```

### 3. ตรวจสอบการแก้ไข

หลังจากรัน migration แล้ว ให้ตรวจสอบว่า:

1. คอลัมน์ใหม่ถูกเพิ่มในตาราง
2. ฟังก์ชัน `handle_lottery_order` ทำงานได้
3. การซื้อลอตเตอรี่สำเร็จ

## ไฟล์ที่เกี่ยวข้อง

- `supabase/migrations/20250128000000_add_number_cap_columns_to_lottery_ticket_items.sql`
- `supabase/migrations/20250128000001_add_draw_time_columns_to_lottery_tickets.sql`
- `fix-handle-lottery-order.sql` - SQL รวมสำหรับแก้ไขปัญหา
- `supabase/migrations/20250127000001_create_handle_lottery_order_rpc.sql` - ฟังก์ชัน RPC

## การทดสอบ

หลังจากแก้ไขแล้ว ให้ทดสอบ:

1. เปิดหน้า lottery-orders
2. เลือกเลขและใส่ราคา
3. กดบันทึกรายการ
4. ตรวจสอบว่าไม่เกิด error "UPDATE requires a WHERE clause"

## หมายเหตุ

- Migration นี้จะไม่กระทบข้อมูลเดิม
- คอลัมน์ใหม่จะมีค่า NULL สำหรับข้อมูลเก่า
- ข้อมูลเก่าจะถูกอัปเดตให้มีค่าเริ่มต้นที่เหมาะสม 