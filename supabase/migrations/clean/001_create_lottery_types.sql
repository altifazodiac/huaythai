-- =====================================================
-- Migration 001: สร้างตารางพื้นฐานประเภทหวย
-- สร้างเมื่อ: 2025-01-01
-- =====================================================

-- สร้างตารางประเภทหวยหลัก
CREATE TABLE IF NOT EXISTS public.lottery_types (
    lottery_type_id SERIAL PRIMARY KEY,
    type_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- สร้างตารางประเภทหวยย่อย
CREATE TABLE IF NOT EXISTS public.lottery_sub_types (
    lottery_sub_type_id SERIAL PRIMARY KEY,
    lottery_type_id INTEGER NOT NULL REFERENCES public.lottery_types(lottery_type_id) ON DELETE CASCADE,
    sub_type_name VARCHAR(100) NOT NULL,
    country_origin VARCHAR(2) DEFAULT 'TH',
    percent NUMERIC(5,2) DEFAULT 0 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- สร้างตารางประเภทการแทง
CREATE TABLE IF NOT EXISTS public.lottery_sub_number (
    id SERIAL PRIMARY KEY,
    type_number VARCHAR(20) NOT NULL,
    digit_number INTEGER NOT NULL CHECK (digit_number IN (1, 2, 3)),
    price_paid DECIMAL(10,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- สร้างตารางตารางเวลาออกหวย
CREATE TABLE IF NOT EXISTS public.drawing_schedules (
    schedule_id SERIAL PRIMARY KEY,
    lottery_type_id INTEGER NOT NULL REFERENCES public.lottery_types(lottery_type_id),
    lottery_sub_type_id INTEGER REFERENCES public.lottery_sub_types(lottery_sub_type_id),
    draw_time TIME WITHOUT TIME ZONE NOT NULL,
    open_time TIME WITHOUT TIME ZONE,
    close_time TIME WITHOUT TIME ZONE,
    frequency_unit VARCHAR(20),
    frequency_value INTEGER,
    day_of_week VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- สร้าง indexes
CREATE INDEX IF NOT EXISTS idx_lottery_sub_types_lottery_type_id ON public.lottery_sub_types(lottery_type_id);
CREATE INDEX IF NOT EXISTS idx_lottery_sub_number_digit_number ON public.lottery_sub_number(digit_number);
CREATE INDEX IF NOT EXISTS idx_drawing_schedules_lottery_type_id ON public.drawing_schedules(lottery_type_id);
CREATE INDEX IF NOT EXISTS idx_drawing_schedules_lottery_sub_type_id ON public.drawing_schedules(lottery_sub_type_id);

-- เปิด RLS
ALTER TABLE public.lottery_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lottery_sub_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lottery_sub_number ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drawing_schedules ENABLE ROW LEVEL SECURITY;

-- สร้าง RLS policies
CREATE POLICY "Enable read access for all users" ON public.lottery_types FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON public.lottery_sub_types FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON public.lottery_sub_number FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON public.drawing_schedules FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users" ON public.lottery_types FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable insert for authenticated users" ON public.lottery_sub_types FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable insert for authenticated users" ON public.lottery_sub_number FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable insert for authenticated users" ON public.drawing_schedules FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users" ON public.lottery_types FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Enable update for authenticated users" ON public.lottery_sub_types FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Enable update for authenticated users" ON public.lottery_sub_number FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Enable update for authenticated users" ON public.drawing_schedules FOR UPDATE USING (auth.role() = 'authenticated');

-- ให้สิทธิ์
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lottery_types TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lottery_sub_types TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lottery_sub_number TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.drawing_schedules TO anon, authenticated, service_role;
