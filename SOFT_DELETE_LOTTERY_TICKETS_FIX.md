# แก้ไขปัญหา Soft Delete Lottery Tickets

## ปัญหาที่เกิดขึ้น
เมื่อพยายามลบรายการบิลหวย (soft delete) ระบบจะแสดงข้อผิดพลาด:
```
เกิดข้อผิดพลาดในการลบ: Draw date cannot be in the past
```

## สาเหตุของปัญหา
ข้อผิดพลาดเกิดจาก database trigger `validate_draw_date` ที่สร้างไว้ใน migration `20240321000000_create_lottery_ticket_system.sql` ซึ่งจะตรวจสอบว่า `draw_date` ไม่สามารถเป็นวันที่ในอดีตได้

เมื่อทำการ UPDATE ตาราง `lottery_tickets` เพื่อตั้งค่า `deleted_at` trigger นี้จะทำงานและตรวจสอบ `draw_date` ทำให้ไม่สามารถลบรายการย้อนหลังได้

## วิธีแก้ไข
สร้าง RPC function `soft_delete_lottery_ticket` ที่จะทำ soft delete โดยไม่ผ่าน trigger validation

### 1. สร้าง Migration ใหม่
ไฟล์: `supabase/migrations/20250101000000_create_soft_delete_lottery_ticket_function.sql`

### 2. แก้ไข Frontend Code
ใน `app/(protected)/ticket-purchases/page.tsx` เปลี่ยนจากการใช้ `supabase.from().update()` เป็น `supabase.rpc()`

### 3. รัน Migration
```bash
# Linux/Mac
./run-soft-delete-migration.sh

# Windows
.\run-soft-delete-migration.ps1
```

## รายละเอียดการแก้ไข

### RPC Function
```sql
CREATE OR REPLACE FUNCTION public.soft_delete_lottery_ticket(
  ticket_id UUID,
  delete_reason TEXT DEFAULT 'ลบโดยผู้ใช้'
)
RETURNS VOID AS $$
BEGIN
  -- Soft delete the lottery ticket by setting deleted_at
  UPDATE public.lottery_tickets
  SET deleted_at = NOW()
  WHERE id = ticket_id;
  
  -- Insert into delete_history table
  INSERT INTO public.delete_history (
    ticket_id,
    user_id,
    reason,
    deleted_at
  ) VALUES (
    ticket_id,
    auth.uid(),
    delete_reason,
    NOW()
  );
  
  -- Raise exception if no rows were updated
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lottery ticket not found';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Frontend Changes
```typescript
// เดิม (มีปัญหา)
const { error } = await supabase
  .from("lottery_tickets")
  .update({ deleted_at: new Date().toISOString() })
  .eq("id", deletingTicket.id);

// ใหม่ (แก้ไขแล้ว)
const { error } = await supabase.rpc('soft_delete_lottery_ticket', {
  ticket_id: deletingTicket.id,
  delete_reason: deleteReason || 'ลบโดยผู้ใช้'
});
```

## ประโยชน์ของการแก้ไข
1. **แก้ไขปัญหา validation error** - สามารถลบรายการย้อนหลังได้
2. **รักษาความปลอดภัย** - ใช้ RPC function ที่มี SECURITY DEFINER
3. **บันทึกประวัติการลบ** - เก็บข้อมูลในตาราง `delete_history`
4. **ไม่กระทบระบบอื่น** - ไม่เปลี่ยนแปลง trigger เดิม

## การทดสอบ
หลังจากรัน migration แล้ว ให้ทดสอบ:
1. ลบรายการบิลหวยที่ซื้อในอดีต
2. ตรวจสอบว่าสามารถลบได้โดยไม่มี error
3. ตรวจสอบว่าข้อมูลถูกเก็บใน `deleted_at` และ `delete_history`

## หมายเหตุ
- การแก้ไขนี้ใช้เฉพาะสำหรับ soft delete เท่านั้น
- การสร้างบิลใหม่ยังคงต้องผ่าน validation เดิม
- ข้อมูลที่ลบแล้วจะถูกลบถาวรใน 30 วัน (ตาม logic เดิม)
