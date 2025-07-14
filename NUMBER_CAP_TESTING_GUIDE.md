# คู่มือการทดสอบระบบเลขอั้น

## วิธีการทดสอบ

### 1. ใช้ปุ่มทดสอบในหน้า Lottery Orders

#### a) ปุ่ม "🧪 ทดสอบ"
- **ฟังก์ชัน**: ทดสอบระบบเลขอั้นโดยรวม
- **การทำงาน**:
  1. ตรวจสอบข้อมูลทั้งหมดในตาราง `managed_numbers`
  2. ตรวจสอบข้อมูลสำหรับ lottery_sub_type_id และ draw_date ปัจจุบัน
  3. เพิ่มข้อมูลทดสอบเลข 123 (สามตัวบน, action: close)
  4. ทดสอบการตรวจสอบเลขอั้นหลังจากเพิ่มข้อมูล

#### b) ปุ่ม "📊 ดูตาราง"
- **ฟังก์ชัน**: แสดงข้อมูลในตาราง managed_numbers
- **การทำงาน**: Query ข้อมูล 10 รายการแรกและแสดงใน console.table()

### 2. ตรวจสอบ Console Logs

เมื่อคลิกปุ่มทดสอบ จะเห็น logs ดังนี้:

```
🧪 Testing number cap system: {subType: 16, drawDate: '2025-07-14', cacheCount: 0, contextCount: 0}
🔍 Checking managed_numbers table...
📊 Total records in managed_numbers: 0
🎯 Filtered records for subType/drawDate: 0
🧪 Inserting test data: {lottery_sub_type_id: 16, number: '123', ...}
✅ Test data inserted successfully: [{...}]
🔄 fetchDirectManagedNumbers: {subTypeId: 16, drawDate: '2025-07-14'}
✅ fetchDirectManagedNumbers result: 1 records
📋 Sample managed number: {lottery_sub_type_id: 16, number: '123', ...}
🧪 Test result after insert: {action: 'close', reason: 'ทดสอบระบบ'}
```

### 3. ตรวจสอบการทำงานของระบบ

#### ขั้นตอนการทดสอบ:

1. **เข้าสู่หน้า Lottery Orders**
   - ไปที่ `/lottery-orders?subType=16&draw=...`

2. **คลิกปุ่ม "📊 ดูตาราง"**
   - ตรวจสอบว่ามีข้อมูลในตาราง managed_numbers หรือไม่
   - ดูข้อมูลใน console.table()

3. **คลิกปุ่ม "🧪 ทดสอบ"**
   - ระบบจะเพิ่มข้อมูลทดสอบเลข 123
   - ตรวจสอบ toast notifications
   - ดู console logs เพื่อติดตามการทำงาน

4. **ลองเพิ่มเลข 123 ในรายการ**
   - เลือกประเภทหวย "สามตัวบน"
   - พิมพ์เลข "123"
   - ควรเห็นการแจ้งเตือน "🚫 เลข 123 ถูกปิดรับ"

### 4. การแก้ไขปัญหาที่อาจพบ

#### ปัญหา: ไม่มีข้อมูลในตาราง managed_numbers

**สาเหตุ**:
- ตาราง managed_numbers อาจไม่มีข้อมูล
- การเชื่อมต่อ database มีปัญหา
- Permission ไม่เพียงพอ

**วิธีแก้**:
1. ตรวจสอบ Supabase connection
2. ตรวจสอบ RLS policies ของตาราง managed_numbers
3. ใช้ปุ่ม "🧪 ทดสอบ" เพื่อเพิ่มข้อมูลทดสอบ

#### ปัญหา: ข้อมูลไม่ sync ระหว่าง cache และ context

**สาเหตุ**:
- Race condition ระหว่าง fetchDirectManagedNumbers และ fetchManagedNumbers
- Context ไม่ได้รับการอัปเดต

**วิธีแก้**:
1. รอให้ระบบโหลดข้อมูลเสร็จ (ประมาณ 1-2 วินาที)
2. Refresh หน้าเว็บ
3. ตรวจสอบ console logs ว่ามีการโหลดข้อมูลหรือไม่

#### ปัญหา: การแจ้งเตือนไม่แสดง

**สาเหตุ**:
- ฟังก์ชัน getNumberCapAction ไม่ได้รับข้อมูล
- Parameter ไม่ตรงกัน (date format, type_number, etc.)

**วิธีแก้**:
1. ตรวจสอบ console logs ใน handleAddOrder
2. ตรวจสอบ parameter ที่ส่งไปยัง getNumberCapAction
3. เปรียบเทียบข้อมูลในตาราง vs parameter ที่ใช้ query

### 5. SQL Commands สำหรับการทดสอบ

#### ตรวจสอบข้อมูลในตาราง
```sql
-- ดูข้อมูลทั้งหมด
SELECT * FROM managed_numbers ORDER BY created_at DESC;

-- ดูข้อมูลเฉพาะ lottery_sub_type_id = 16
SELECT * FROM managed_numbers 
WHERE lottery_sub_type_id = 16 
ORDER BY draw_date DESC;

-- ดูสถิติ
SELECT 
  lottery_sub_type_id,
  draw_date,
  COUNT(*) as total_numbers,
  COUNT(CASE WHEN action = 'close' THEN 1 END) as blocked,
  COUNT(CASE WHEN action = 'half' THEN 1 END) as half
FROM managed_numbers 
GROUP BY lottery_sub_type_id, draw_date
ORDER BY draw_date DESC;
```

#### เพิ่มข้อมูลทดสอบ
```sql
-- เพิ่มเลขทดสอบ
INSERT INTO managed_numbers (
  lottery_sub_type_id,
  number,
  digit_count,
  type_number,
  action,
  reason,
  is_manual,
  draw_date,
  risk_percentage
) VALUES (
  16,           -- lottery_sub_type_id
  '123',        -- number
  3,            -- digit_count
  'บน',         -- type_number
  'close',      -- action
  'ทดสอบระบบ',  -- reason
  true,         -- is_manual
  '2025-07-14', -- draw_date
  100           -- risk_percentage
);
```

#### ลบข้อมูลทดสอบ
```sql
-- ลบข้อมูลทดสอบ
DELETE FROM managed_numbers 
WHERE reason = 'ทดสอบระบบ';

-- ลบข้อมูลทั้งหมดของวันที่เฉพาะ
DELETE FROM managed_numbers 
WHERE lottery_sub_type_id = 16 
AND draw_date = '2025-07-14';
```

### 6. การตรวจสอบผลลัพธ์

#### ผลลัพธ์ที่คาดหวัง:

1. **เมื่อคลิก "📊 ดูตาราง"**:
   - Toast: "📊 พบข้อมูล X รายการ (ดู Console)"
   - Console: แสดงตาราง managed_numbers

2. **เมื่อคลิก "🧪 ทดสอบ"**:
   - Toast: "✅ เพิ่มข้อมูลทดสอบสำเร็จ"
   - Toast: "✅ ระบบเลขอั้นทำงาน: เลข 123 ปิดรับ"
   - Console: แสดง logs ของการทำงานทั้งหมด

3. **เมื่อเพิ่มเลข 123 ในรายการ**:
   - Toast: "🚫 เลข 123 ถูกปิดรับ (ทดสอบระบบ)"
   - เลข 123 จะไม่ถูกเพิ่มในรายการ

4. **เมื่อเพิ่มเลขอื่นที่ไม่ได้อยู่ในระบบเลขอั้น**:
   - ไม่มี toast แจ้งเตือน
   - เลขจะถูกเพิ่มในรายการได้ปกติ

### 7. ไฟล์ที่เกี่ยวข้อง

- `app/(protected)/lottery-orders/page.tsx` - หน้าหลักที่มีระบบทดสอบ
- `lib/contexts/NumberCapContext.tsx` - Context สำหรับจัดการเลขอั้น
- `components/lottery/NumberCapIndicator.tsx` - แสดงสถานะเลขอั้น
- `supabase/migrations/20250121000000_create_managed_numbers_table.sql` - Schema ตาราง

### 8. เทคนิคการ Debug เพิ่มเติม

#### ใช้ Browser DevTools:
1. **Network Tab**: ตรวจสอบ API calls ไปยัง Supabase
2. **Console Tab**: ดู debug logs
3. **Application Tab**: ตรวจสอบ localStorage/sessionStorage

#### ใช้ Supabase Dashboard:
1. **Database**: ดูข้อมูลในตาราง managed_numbers
2. **API**: ทดสอบ queries โดยตรง
3. **Logs**: ดู real-time logs

#### React DevTools:
1. ตรวจสอบ state ของ NumberCapContext
2. ดู props และ state ของ components
3. ติดตาม re-renders ที่อาจเกิดขึ้น

อย่าลืมลบข้อมูลทดสอบออกหลังจากการทดสอบเสร็จสิ้น! 