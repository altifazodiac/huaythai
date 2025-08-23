# 🚨 แก้ไขปัญหา Soft Delete ฉุกเฉิน - ง่ายๆ ได้ผลทันที!

## ปัญหา
```
เกิดข้อผิดพลาดในการลบ: Draw date cannot be in the past
```

## วิธีแก้ไขฉุกเฉิน (ได้ผลทันที)

### 1. เปิด Supabase Dashboard
- เข้า [supabase.com](https://supabase.com)
- เลือกโปรเจค
- ไปที่ **SQL Editor**

### 2. รัน EMERGENCY_FIX.sql
- คัดลอกเนื้อหาจากไฟล์ `EMERGENCY_FIX.sql`
- วางใน SQL Editor
- กด **Run**

### 3. ทดสอบการลบ
- ลองลบรายการย้อนหลัง
- ควรไม่มี error แล้ว

## วิธีทำงาน

**ปิด Trigger ชั่วคราว**:
```sql
ALTER TABLE public.lottery_tickets DISABLE TRIGGER validate_draw_date;
```

**สร้าง Function ใหม่**:
```sql
CREATE OR REPLACE FUNCTION public.soft_delete_lottery_ticket(...)
```

## ผลลัพธ์ที่คาดหวัง

หลังจากรันแล้วควรเห็น:
- 🚨 EMERGENCY FIX APPLIED!
- Trigger validate_draw_date has been DISABLED
- Function soft_delete_lottery_ticket created
- Table delete_history created
- You can now delete lottery tickets without draw_date validation errors!

## หมายเหตุสำคัญ

⚠️ **ข้อควรระวัง**: วิธีนี้ปิด trigger ชั่วคราว
✅ **ข้อดี**: แก้ไขปัญหาได้ทันที
🔄 **ต้องทำ**: เปิด trigger กลับเมื่อใช้งานเสร็จ

## เปิด Trigger กลับ (เมื่อใช้งานเสร็จ)

```sql
ALTER TABLE public.lottery_tickets ENABLE TRIGGER validate_draw_date;
```

## หากยังมีปัญหา

1. **ตรวจสอบ Error Logs** ใน Supabase Dashboard
2. **ตรวจสอบ RLS Policies** ว่าอนุญาตให้ UPDATE ได้หรือไม่
3. **ตรวจสอบ Permissions** ของ user

## สรุป

**รัน `EMERGENCY_FIX.sql` → ทดสอบการลบ → ใช้งานเสร็จแล้วเปิด trigger กลับ**

ง่ายๆ แค่นี้ครับ! 🎯
