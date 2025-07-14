-- สร้างตาราง managed_numbers สำหรับเก็บข้อมูลเลขอั้นแต่ละประเภทหวย
CREATE TABLE public.managed_numbers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    lottery_sub_type_id INTEGER NOT NULL REFERENCES public.lottery_sub_types(lottery_sub_type_id) ON DELETE CASCADE,
    number VARCHAR(10) NOT NULL,
    digit_count INTEGER NOT NULL CHECK (digit_count IN (1, 2, 3)),
    type_number VARCHAR(20) NOT NULL,
    action VARCHAR(10) NOT NULL CHECK (action IN ('half', 'close')),
    reason TEXT,
    is_manual BOOLEAN DEFAULT false,
    draw_date DATE NOT NULL,
    risk_percentage DECIMAL(5,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_by UUID REFERENCES auth.users(id),
    
    -- สร้าง unique constraint เพื่อป้องกันการซ้ำ
    UNIQUE(lottery_sub_type_id, number, digit_count, type_number, draw_date)
);

-- สร้าง index สำหรับการค้นหาที่รวดเร็ว
CREATE INDEX idx_managed_numbers_lottery_sub_type_id ON public.managed_numbers(lottery_sub_type_id);
CREATE INDEX idx_managed_numbers_draw_date ON public.managed_numbers(draw_date);
CREATE INDEX idx_managed_numbers_number ON public.managed_numbers(number);
CREATE INDEX idx_managed_numbers_action ON public.managed_numbers(action);
CREATE INDEX idx_managed_numbers_composite ON public.managed_numbers(lottery_sub_type_id, draw_date, action);

-- สร้าง function สำหรับอัปเดต updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at_managed_numbers()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- สร้าง trigger สำหรับอัปเดต updated_at
CREATE TRIGGER trigger_managed_numbers_updated_at
    BEFORE UPDATE ON public.managed_numbers
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at_managed_numbers();

-- เปิดใช้งาน RLS (Row Level Security)
ALTER TABLE public.managed_numbers ENABLE ROW LEVEL SECURITY;

-- สร้าง RLS policies
CREATE POLICY "Enable read access for all authenticated users" ON public.managed_numbers
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert for authenticated users" ON public.managed_numbers
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users" ON public.managed_numbers
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete for authenticated users" ON public.managed_numbers
    FOR DELETE USING (auth.role() = 'authenticated');

-- เพิ่มความคิดเห็นสำหรับเอกสาร
COMMENT ON TABLE public.managed_numbers IS 'ตารางสำหรับเก็บข้อมูลเลขอั้นแต่ละประเภทหวย';
COMMENT ON COLUMN public.managed_numbers.lottery_sub_type_id IS 'ID ของประเภทหวยย่อย';
COMMENT ON COLUMN public.managed_numbers.number IS 'หมายเลขที่ถูกจัดการ';
COMMENT ON COLUMN public.managed_numbers.digit_count IS 'จำนวนหลักของเลข (1, 2, 3)';
COMMENT ON COLUMN public.managed_numbers.type_number IS 'ประเภทของเลข (บน, ล่าง, โต๊ด, วิ่งบน, วิ่งล่าง)';
COMMENT ON COLUMN public.managed_numbers.action IS 'การกระทำ (half = หารครึ่ง, close = ปิดรับ)';
COMMENT ON COLUMN public.managed_numbers.reason IS 'เหตุผลในการจัดการ';
COMMENT ON COLUMN public.managed_numbers.is_manual IS 'เป็นการเพิ่มด้วยตนเองหรือไม่';
COMMENT ON COLUMN public.managed_numbers.draw_date IS 'วันที่ออกรางวัล';
COMMENT ON COLUMN public.managed_numbers.risk_percentage IS 'เปอร์เซ็นต์ความเสี่ยง';
COMMENT ON COLUMN public.managed_numbers.created_by IS 'ผู้ที่สร้างข้อมูล'; 