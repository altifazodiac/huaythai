-- =====================================================
-- Migration 003: สร้างตารางระบบหวย (ตั๋วและผล)
-- สร้างเมื่อ: 2025-01-01
-- =====================================================

-- สร้าง enum types
DO $$ BEGIN
    CREATE TYPE ticket_status AS ENUM ('pending', 'confirmed', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE draw_status AS ENUM ('pending', 'completed', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE winning_status AS ENUM ('pending', 'paid', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- สร้างตาราง lottery_tickets (ตั๋วหวย)
CREATE TABLE IF NOT EXISTS public.lottery_tickets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    bill_name TEXT,
    bill_number TEXT NOT NULL,
    purchase_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    draw_date DATE NOT NULL,
    draw_time TIME,
    close_time TIME,
    total_amount DECIMAL(10,2) NOT NULL,
    status ticket_status NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- สร้างตาราง lottery_ticket_items (รายการแทงในตั๋ว)
CREATE TABLE IF NOT EXISTS public.lottery_ticket_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    ticket_id UUID REFERENCES public.lottery_tickets(id) ON DELETE CASCADE NOT NULL,
    lottery_sub_type_id INTEGER REFERENCES public.lottery_sub_types(lottery_sub_type_id) NOT NULL,
    lottery_sub_number_id INTEGER REFERENCES public.lottery_sub_number(id) NOT NULL,
    numbers TEXT[] NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    original_amount DECIMAL(10,2),
    effective_prize_rate DECIMAL(10,2),
    number_cap_status JSONB,
    number_cap_action TEXT CHECK (number_cap_action IN ('half', 'close')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT positive_amount CHECK (amount > 0)
);

-- สร้างตาราง lottery_results (ผลการออกหวย) - เวอร์ชันสุดท้าย
CREATE TABLE IF NOT EXISTS public.lottery_results (
    id BIGSERIAL PRIMARY KEY,
    lottery_type_id INTEGER NOT NULL REFERENCES public.lottery_types(lottery_type_id),
    lottery_sub_type_id INTEGER NOT NULL REFERENCES public.lottery_sub_types(lottery_sub_type_id),
    schedule_id INTEGER NOT NULL REFERENCES public.drawing_schedules(schedule_id),
    draw_date DATE NOT NULL,
    draw_time TIME,
    prize_code TEXT NOT NULL,
    winning_number TEXT NOT NULL,
    is_sent_to_line BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- สร้างตาราง lottery_winnings (รางวัลที่ได้)
CREATE TABLE IF NOT EXISTS public.lottery_winnings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    ticket_item_id UUID REFERENCES public.lottery_ticket_items(id) NOT NULL,
    lottery_result_id BIGINT REFERENCES public.lottery_results(id) NOT NULL,
    winning_amount DECIMAL(10,2) NOT NULL,
    status winning_status NOT NULL DEFAULT 'pending',
    paid_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT positive_winning_amount CHECK (winning_amount > 0)
);

-- สร้าง indexes สำหรับ lottery_tickets
CREATE INDEX IF NOT EXISTS idx_lottery_tickets_user_id ON public.lottery_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_lottery_tickets_draw_date ON public.lottery_tickets(draw_date);
CREATE INDEX IF NOT EXISTS idx_lottery_tickets_purchase_date ON public.lottery_tickets(purchase_date);
CREATE INDEX IF NOT EXISTS idx_lottery_tickets_status ON public.lottery_tickets(status);
CREATE INDEX IF NOT EXISTS idx_lottery_tickets_bill_number ON public.lottery_tickets(bill_number);

-- สร้าง indexes สำหรับ lottery_ticket_items
CREATE INDEX IF NOT EXISTS idx_lottery_ticket_items_ticket_id ON public.lottery_ticket_items(ticket_id);
CREATE INDEX IF NOT EXISTS idx_lottery_ticket_items_sub_type_id ON public.lottery_ticket_items(lottery_sub_type_id);
CREATE INDEX IF NOT EXISTS idx_lottery_ticket_items_sub_number_id ON public.lottery_ticket_items(lottery_sub_number_id);
CREATE INDEX IF NOT EXISTS idx_lottery_ticket_items_effective_prize_rate ON public.lottery_ticket_items(effective_prize_rate);
CREATE INDEX IF NOT EXISTS idx_lottery_ticket_items_number_cap_action ON public.lottery_ticket_items(number_cap_action);

-- สร้าง indexes สำหรับ lottery_results
CREATE INDEX IF NOT EXISTS idx_lottery_results_draw_date ON public.lottery_results(draw_date);
CREATE INDEX IF NOT EXISTS idx_lottery_results_lottery_type_id ON public.lottery_results(lottery_type_id);
CREATE INDEX IF NOT EXISTS idx_lottery_results_lottery_sub_type_id ON public.lottery_results(lottery_sub_type_id);
CREATE INDEX IF NOT EXISTS idx_lottery_results_schedule_id ON public.lottery_results(schedule_id);
CREATE INDEX IF NOT EXISTS idx_lottery_results_unique_result ON public.lottery_results (lottery_sub_type_id, schedule_id, draw_date, draw_time, prize_code);
CREATE INDEX IF NOT EXISTS idx_lottery_results_is_sent_to_line ON public.lottery_results(is_sent_to_line);

-- สร้าง indexes สำหรับ lottery_winnings
CREATE INDEX IF NOT EXISTS idx_lottery_winnings_ticket_item_id ON public.lottery_winnings(ticket_item_id);
CREATE INDEX IF NOT EXISTS idx_lottery_winnings_lottery_result_id ON public.lottery_winnings(lottery_result_id);
CREATE INDEX IF NOT EXISTS idx_lottery_winnings_status ON public.lottery_winnings(status);

-- เปิด RLS
ALTER TABLE public.lottery_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lottery_ticket_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lottery_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lottery_winnings ENABLE ROW LEVEL SECURITY;

-- สร้าง RLS policies สำหรับ lottery_tickets
CREATE POLICY "Users can view their own tickets" ON public.lottery_tickets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own tickets" ON public.lottery_tickets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own tickets" ON public.lottery_tickets FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all tickets" ON public.lottery_tickets FOR SELECT USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));
CREATE POLICY "Service role can manage all tickets" ON public.lottery_tickets FOR ALL USING (auth.role() = 'service_role');

-- สร้าง RLS policies สำหรับ lottery_ticket_items
CREATE POLICY "Users can view their own ticket items" ON public.lottery_ticket_items FOR SELECT USING (EXISTS (SELECT 1 FROM public.lottery_tickets WHERE lottery_tickets.id = lottery_ticket_items.ticket_id AND lottery_tickets.user_id = auth.uid()));
CREATE POLICY "Users can create their own ticket items" ON public.lottery_ticket_items FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.lottery_tickets WHERE lottery_tickets.id = lottery_ticket_items.ticket_id AND lottery_tickets.user_id = auth.uid()));
CREATE POLICY "Admins can view all ticket items" ON public.lottery_ticket_items FOR SELECT USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));
CREATE POLICY "Service role can manage all ticket items" ON public.lottery_ticket_items FOR ALL USING (auth.role() = 'service_role');

-- สร้าง RLS policies สำหรับ lottery_results
CREATE POLICY "Enable read access for all users" ON public.lottery_results FOR SELECT USING (true);
CREATE POLICY "Enable insert for authenticated users" ON public.lottery_results FOR INSERT WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'service_role');
CREATE POLICY "Enable update for authenticated users" ON public.lottery_results FOR UPDATE USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');
CREATE POLICY "Enable delete for authenticated users" ON public.lottery_results FOR DELETE USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- สร้าง RLS policies สำหรับ lottery_winnings
CREATE POLICY "Users can view their own winnings" ON public.lottery_winnings FOR SELECT USING (EXISTS (SELECT 1 FROM public.lottery_ticket_items JOIN public.lottery_tickets ON lottery_tickets.id = lottery_ticket_items.ticket_id WHERE lottery_ticket_items.id = lottery_winnings.ticket_item_id AND lottery_tickets.user_id = auth.uid()));
CREATE POLICY "Admins can view all winnings" ON public.lottery_winnings FOR SELECT USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));
CREATE POLICY "Service role can manage all winnings" ON public.lottery_winnings FOR ALL USING (auth.role() = 'service_role');

-- ให้สิทธิ์
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lottery_tickets TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lottery_ticket_items TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lottery_results TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lottery_winnings TO anon, authenticated, service_role;
GRANT USAGE ON SEQUENCE public.lottery_results_id_seq TO anon, authenticated, service_role;
