-- ส่วนที่ 5: สร้าง RLS Policies สำหรับตารางต่างๆ
SET search_path TO public;
BEGIN;

-- เปิด RLS สำหรับตารางที่ต้องการความปลอดภัย
ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."credit_transactions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."lottery_tickets" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."lottery_ticket_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."lottery_winnings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."managed_numbers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."status_change_history" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."user_roles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."lottery_results" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."drawing_schedules" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."lottery_types" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."lottery_sub_types" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."lottery_sub_number" ENABLE ROW LEVEL SECURITY;

-- สร้าง Policies สำหรับ profiles
CREATE POLICY "Users can view own profile" ON "public"."profiles" FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON "public"."profiles" FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can view all profiles" ON "public"."profiles" FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin')
);
CREATE POLICY "Admins can insert profiles" ON "public"."profiles" FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin')
);
CREATE POLICY "Admins can update all profiles" ON "public"."profiles" FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin')
);

-- สร้าง Policies สำหรับ credit_transactions
CREATE POLICY "Users can view own transactions" ON "public"."credit_transactions" FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all transactions" ON "public"."credit_transactions" FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin')
);
CREATE POLICY "Admins can insert transactions" ON "public"."credit_transactions" FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin')
);

-- สร้าง Policies สำหรับ lottery_tickets
CREATE POLICY "Users can view own tickets" ON "public"."lottery_tickets" FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all tickets" ON "public"."lottery_tickets" FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin')
);
CREATE POLICY "Users can insert own tickets" ON "public"."lottery_tickets" FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own tickets" ON "public"."lottery_tickets" FOR UPDATE USING (auth.uid() = user_id);

-- สร้าง Policies สำหรับ lottery_ticket_items
CREATE POLICY "Users can view own ticket items" ON "public"."lottery_ticket_items" FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.lottery_tickets WHERE lottery_tickets.id = lottery_ticket_items.ticket_id AND lottery_tickets.user_id = auth.uid())
);
CREATE POLICY "Admins can view all ticket items" ON "public"."lottery_ticket_items" FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin')
);
CREATE POLICY "Users can insert own ticket items" ON "public"."lottery_ticket_items" FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.lottery_tickets WHERE lottery_tickets.id = lottery_ticket_items.ticket_id AND lottery_tickets.user_id = auth.uid())
);

-- สร้าง Policies สำหรับ lottery_winnings
CREATE POLICY "Users can view own winnings" ON "public"."lottery_winnings" FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.lottery_ticket_items 
            JOIN public.lottery_tickets ON lottery_tickets.id = lottery_ticket_items.ticket_id 
            WHERE lottery_ticket_items.id = lottery_winnings.ticket_item_id AND lottery_tickets.user_id = auth.uid())
);
CREATE POLICY "Admins can view all winnings" ON "public"."lottery_winnings" FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin')
);

-- สร้าง Policies สำหรับ managed_numbers
CREATE POLICY "Authenticated users can manage numbers" ON "public"."managed_numbers" FOR ALL USING (auth.role() = 'authenticated');

-- สร้าง Policies สำหรับ status_change_history
CREATE POLICY "Users can view own status history" ON "public"."status_change_history" FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all status history" ON "public"."status_change_history" FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin')
);

-- สร้าง Policies สำหรับ user_roles
CREATE POLICY "Users can view own roles" ON "public"."user_roles" FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all roles" ON "public"."user_roles" FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin')
);

-- สร้าง Policies สำหรับ lottery_results (สาธารณะสำหรับการอ่าน)
CREATE POLICY "Enable read access for all users" ON "public"."lottery_results" FOR SELECT USING (true);
CREATE POLICY "Enable insert for authenticated users" ON "public"."lottery_results" FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- สร้าง Policies สำหรับ drawing_schedules (สาธารณะสำหรับการอ่าน)
CREATE POLICY "Enable read access for all users" ON "public"."drawing_schedules" FOR SELECT USING (true);
CREATE POLICY "Enable insert for authenticated users" ON "public"."drawing_schedules" FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- สร้าง Policies สำหรับ lottery_types (สาธารณะสำหรับการอ่าน)
CREATE POLICY "Enable read access for all users" ON "public"."lottery_types" FOR SELECT USING (true);

-- สร้าง Policies สำหรับ lottery_sub_types (สาธารณะสำหรับการอ่าน)
CREATE POLICY "Enable read access for all users" ON "public"."lottery_sub_types" FOR SELECT USING (true);

-- สร้าง Policies สำหรับ lottery_sub_number (สาธารณะสำหรับการอ่าน)
CREATE POLICY "Enable read access for all users" ON "public"."lottery_sub_number" FOR SELECT USING (true);

COMMIT;
