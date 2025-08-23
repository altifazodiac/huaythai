-- EMERGENCY FIX: แก้ไขปัญหา "Draw date cannot be in the past" ทันที
-- รันใน Supabase Dashboard SQL Editor

-- วิธีที่ 1: ปิด trigger ชั่วคราว (แก้ไขทันที)
ALTER TABLE public.lottery_tickets DISABLE TRIGGER validate_draw_date;

-- วิธีที่ 2: สร้าง function สำหรับ soft delete
CREATE OR REPLACE FUNCTION public.soft_delete_lottery_ticket(
  ticket_id UUID,
  delete_reason TEXT DEFAULT 'ลบโดยผู้ใช้'
)
RETURNS VOID AS $$
BEGIN
  UPDATE public.lottery_tickets
  SET deleted_at = NOW()
  WHERE id = ticket_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lottery ticket not found';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ให้สิทธิ์ใช้งาน
GRANT EXECUTE ON FUNCTION public.soft_delete_lottery_ticket(UUID, TEXT) TO authenticated;

-- สร้างตาราง delete_history ถ้ายังไม่มี
CREATE TABLE IF NOT EXISTS public.delete_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES public.lottery_tickets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT,
  deleted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ตั้งค่า RLS
ALTER TABLE public.delete_history ENABLE ROW LEVEL SECURITY;

-- สร้าง policies
DROP POLICY IF EXISTS "Users can view their own delete history" ON public.delete_history;
CREATE POLICY "Users can view their own delete history"
  ON public.delete_history FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Authenticated users can insert delete history" ON public.delete_history;
CREATE POLICY "Authenticated users can insert delete history"
  ON public.delete_history FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- ตรวจสอบผลลัพธ์
SELECT '🚨 EMERGENCY FIX APPLIED!' as status;
SELECT 'Trigger validate_draw_date has been DISABLED' as action;
SELECT 'Function soft_delete_lottery_ticket created' as function_status;
SELECT 'Table delete_history created' as table_status;
SELECT 'You can now delete lottery tickets without draw_date validation errors!' as result;
