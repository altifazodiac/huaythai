# ระบบ Soft Delete สำหรับ Lottery Tickets

## คุณสมบัติของระบบ

### 1. การลบแบบ Soft Delete
- เมื่อผู้ใช้ลบบิลหวย ข้อมูลจะไม่ถูกลบออกจากฐานข้อมูลจริง
- ระบบจะอัปเดต `deleted_at` timestamp แทน
- บันทึกประวัติการลบใน `delete_history` table พร้อมเหตุผล
- ข้อมูลจะถูกเก็บไว้ 30 วันก่อนลบถาวร

### 2. การแสดงข้อมูล
- **โหมดปกติ**: แสดงเฉพาะบิลที่ยังไม่ถูกลบ
- **โหมดรายการที่ลบ**: แสดงเฉพาะบิลที่ถูกลบแล้ว
- รายการที่ลบจะแสดงด้วยสีเทาและขีดทับ
- แสดงวันที่ลบในคอลัมน์วันที่ซื้อ

### 3. การกู้คืนข้อมูล
- สามารถกู้คืนบิลที่ลบได้ภายใน 30 วัน
- กู้คืนโดยการตั้งค่า `deleted_at` เป็น `null`
- ลบประวัติการลบออกจาก `delete_history`

## การใช้งาน

### ในหน้า Ticket Purchases

1. **ลบบิลหวย**:
   - คลิกปุ่ม "ลบ" ในรายการบิล
   - ใส่เหตุผลการลบ (ไม่บังคับ)
   - คลิก "ยืนยันลบ"

2. **ดูรายการที่ลบ**:
   - คลิกปุ่ม "แสดงรายการที่ลบ" ใน Filter Section
   - รายการที่ลบจะแสดงด้วยสีเทาและมีป้าย "(ลบแล้ว)"

3. **กู้คืนบิล**:
   - ในโหมดรายการที่ลบ คลิกปุ่ม "กู้คืน"
   - บิลจะกลับมาแสดงในรายการปกติ

## โครงสร้างฐานข้อมูล

### Tables ที่เกี่ยวข้อง

1. **lottery_tickets**
   - `deleted_at`: TIMESTAMP - วันที่ลบ (null = ยังไม่ลบ)

2. **delete_history**
   - `ticket_id`: UUID - ID ของบิลที่ลบ
   - `user_id`: UUID - ผู้ที่ทำการลบ
   - `deleted_at`: TIMESTAMP - วันเวลาที่ลบ
   - `reason`: TEXT - เหตุผลการลบ

3. **lottery_tickets_with_user_details** (View)
   - View ที่รวมข้อมูล lottery_tickets กับ profiles

## Functions ที่สำคัญ

### 1. cleanup_deleted_tickets()
ลบข้อมูลที่ถูก soft delete เก่ากว่า 30 วันออกจากฐานข้อมูลถาวร

```sql
SELECT * FROM public.cleanup_deleted_tickets();
```

**ผลลัพธ์**:
- `deleted_tickets_count`: จำนวนบิลที่ลบ
- `deleted_items_count`: จำนวนรายการในบิลที่ลบ
- `deleted_history_count`: จำนวนประวัติการลบที่ลบ

### 2. get_cleanup_preview()
ดูจำนวนข้อมูลที่จะถูกลบก่อนการ cleanup

```sql
SELECT * FROM public.get_cleanup_preview();
```

**ผลลัพธ์**:
- `tickets_to_delete`: จำนวนบิลที่จะถูกลบ
- `oldest_deleted_date`: วันที่ลบเก่าสุด
- `newest_deleted_date`: วันที่ลบใหม่สุด

## การตั้งค่า Cron Job (แนะนำ)

สร้าง cron job เพื่อเรียกใช้ cleanup function อัตโนมัติ:

```bash
# รันทุกวันที่ 2:00 น.
0 2 * * * psql -d your_database -c "SELECT public.cleanup_deleted_tickets();"
```

## การ Query ข้อมูล

### ดูรายการบิลปกติ (ไม่ถูกลบ)
```sql
SELECT * FROM lottery_tickets_with_user_details 
WHERE deleted_at IS NULL;
```

### ดูรายการบิลที่ถูกลบ
```sql
SELECT * FROM lottery_tickets_with_user_details 
WHERE deleted_at IS NOT NULL;
```

### ดูประวัติการลบ
```sql
SELECT 
  dh.*,
  lt.bill_number,
  p.name as deleted_by_user
FROM delete_history dh
LEFT JOIN lottery_tickets lt ON dh.ticket_id = lt.id
LEFT JOIN profiles p ON dh.user_id = p.id
ORDER BY dh.deleted_at DESC;
```

## Security และ Permissions

- เฉพาะเจ้าของบิลและ Admin เท่านั้นที่สามารถลบได้
- การกู้คืนต้องมีสิทธิ์เดียวกันกับการลบ
- Functions cleanup มีความปลอดภัยด้วย SECURITY DEFINER

## Best Practices

1. **สำรองข้อมูล**: ควรสำรองข้อมูลก่อนรัน cleanup function
2. **Log การทำงาน**: บันทึก log เมื่อมีการ cleanup
3. **แจ้งเตือน**: แจ้งผู้ใช้ก่อนข้อมูลถูกลบถาวร
4. **Monitor**: ตรวจสอบขนาดฐานข้อมูลและประสิทธิภาพ

## การแก้ไขปัญหา

### หากต้องการเปลี่ยนระยะเวลาเก็บข้อมูล
แก้ไข INTERVAL ในฟังก์ชัน cleanup:

```sql
-- เปลี่ยนจาก 30 วันเป็น 60 วัน
WHERE deleted_at < NOW() - INTERVAL '60 days'
```

### หากต้องการกู้คืนข้อมูลที่ถูกลบถาวรแล้ว
ต้องใช้ backup ของฐานข้อมูล เนื่องจากข้อมูลถูกลบออกจากระบบแล้ว

## การอัปเดตระบบ

หากต้องการเพิ่มคุณสมบัติใหม่:

1. เพิ่ม column ใน delete_history table หากต้องการ
2. อัปเดต view lottery_tickets_with_user_details
3. ปรับปรุง functions cleanup ตามความต้องการ
4. ทดสอบการทำงานในสภาพแวดล้อม staging ก่อน 