# แก้ไขปัญหา Soft Delete ทันที (ไม่ต้องรอ Migration)

## ปัญหาที่เกิดขึ้น
หลังจากรัน SQL แล้ว ยังคงเจอข้อผิดพลาด:
```
เกิดข้อผิดพลาดในการลบ: Draw date cannot be in the past
```

## สาเหตุ
1. **Migration ยังไม่ได้ถูก apply** - Supabase CLI ไม่ได้ติดตั้งหรือ migration ไม่ได้รัน
2. **Trigger ยังทำงานอยู่** - `validate_draw_date` trigger ยังคงตรวจสอบ draw_date
3. **Function ยังไม่ได้สร้าง** - `soft_delete_lottery_ticket` function ยังไม่มีในฐานข้อมูล

## วิธีแก้ไขทันที

### วิธีที่ 1: รัน SQL Script โดยตรงใน Supabase Dashboard

1. **เปิด Supabase Dashboard**
   - เข้าไปที่ [supabase.com](https://supabase.com)
   - เลือกโปรเจคของคุณ
   - ไปที่ **SQL Editor**

2. **รัน SQL Script**
   - คัดลอกเนื้อหาจากไฟล์ `fix-soft-delete-manual.sql`
   - วางใน SQL Editor
   - กด **Run** หรือ **Ctrl+Enter**

3. **ตรวจสอบผลลัพธ์**
   - ควรเห็นข้อความ "✅ Function exists" และ "✅ Table exists"
   - หากมี error ให้ดูข้อความ error และแก้ไข

### วิธีที่ 2: แก้ไข Frontend Code ชั่วคราว

หากยังไม่สามารถรัน SQL ได้ ให้แก้ไข frontend code ชั่วคราว:

```typescript
// ใน app/(protected)/ticket-purchases/page.tsx
// แก้ไขฟังก์ชัน handleDeleteTicket

const handleDeleteTicket = async () => {
  if (!deletingTicket || !user) return;
  try {
    // วิธีชั่วคราว: ใช้ UPDATE โดยตรงแต่ข้าม validation
    const { error } = await supabase
      .from("lottery_tickets")
      .update({ 
        deleted_at: new Date().toISOString(),
        // เพิ่ม field อื่นๆ เพื่อหลีกเลี่ยง trigger
        updated_at: new Date().toISOString()
      })
      .eq("id", deletingTicket.id);
    
    if (error) throw error;
    
    // บันทึกประวัติการลบแยก
    await supabase
      .from("delete_history")
      .insert({
        ticket_id: deletingTicket.id,
        user_id: user.id,
        reason: deleteReason || 'ลบโดยผู้ใช้',
        deleted_at: new Date().toISOString(),
      });
      
    toast.success("ลบรายการสำเร็จ (จะถูกลบถาวรใน 30 วัน)");
    setDeleteDialogOpen(false);
    setDeletingTicket(null);
    setDeleteReason("");
    refetch();
  } catch (error: any) {
    toast.error("เกิดข้อผิดพลาดในการลบ: " + error.message);
  }
};
```

### วิธีที่ 3: ปิด Trigger ชั่วคราว

หากต้องการปิด trigger ชั่วคราว:

```sql
-- ปิด trigger ชั่วคราว
ALTER TABLE public.lottery_tickets DISABLE TRIGGER validate_draw_date;

-- หลังจากใช้งานเสร็จแล้ว เปิดกลับ
ALTER TABLE public.lottery_tickets ENABLE TRIGGER validate_draw_date;
```

## การตรวจสอบว่า Function ถูกสร้างแล้วหรือไม่

รันคำสั่งนี้ใน SQL Editor:

```sql
-- ตรวจสอบ function
SELECT 
    proname as function_name,
    prosrc as function_source
FROM pg_proc 
WHERE proname = 'soft_delete_lottery_ticket';

-- ตรวจสอบ table
SELECT 
    table_name,
    table_schema
FROM information_schema.tables 
WHERE table_name = 'delete_history';
```

## การทดสอบ Function

หลังจากสร้าง function แล้ว ทดสอบด้วย:

```sql
-- ทดสอบ function (ใส่ ticket_id จริง)
SELECT public.soft_delete_lottery_ticket(
    'your-ticket-id-here'::UUID, 
    'ทดสอบการลบ'
);
```

## หากยังมีปัญหา

1. **ตรวจสอบ Error Logs** ใน Supabase Dashboard
2. **ตรวจสอบ RLS Policies** ว่าอนุญาตให้ UPDATE ได้หรือไม่
3. **ตรวจสอบ Permissions** ของ user ที่ใช้งาน
4. **ตรวจสอบ Schema** ว่าตารางมี column `deleted_at` หรือไม่

## หมายเหตุสำคัญ

- **วิธีที่ 1** เป็นวิธีที่แนะนำที่สุด
- **วิธีที่ 2** เป็นทางเลือกชั่วคราว
- **วิธีที่ 3** ควรใช้เฉพาะในกรณีฉุกเฉิน
- หลังจากแก้ไขแล้ว ควรทดสอบการลบรายการย้อนหลังให้เรียบร้อย
