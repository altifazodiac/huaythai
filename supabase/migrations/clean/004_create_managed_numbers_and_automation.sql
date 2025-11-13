-- =====================================================
-- Migration 004: สร้างตารางระบบเลขอั้นและ Automation
-- สร้างเมื่อ: 2025-01-01
-- =====================================================

-- สร้างตาราง managed_numbers (เลขอั้น)
CREATE TABLE IF NOT EXISTS public.managed_numbers (
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
    UNIQUE(lottery_sub_type_id, number, digit_count, type_number, draw_date)
);

-- สร้างตาราง scheduled_tasks (งานสำหรับ automation)
CREATE TABLE IF NOT EXISTS public.scheduled_tasks (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('scrape', 'send', 'cleanup')),
    scheduled_time TIME NOT NULL,
    draw_time TIME NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
    last_run TIMESTAMP WITH TIME ZONE,
    next_run TIMESTAMP WITH TIME ZONE NOT NULL,
    schedule_id INTEGER REFERENCES public.drawing_schedules(schedule_id),
    lottery_sub_type_id INTEGER REFERENCES public.lottery_sub_types(lottery_sub_type_id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- สร้างตาราง task_logs (ประวัติการทำงาน)
CREATE TABLE IF NOT EXISTS public.task_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    task_id TEXT NOT NULL REFERENCES public.scheduled_tasks(id) ON DELETE CASCADE,
    task_name TEXT NOT NULL,
    task_type TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('completed', 'failed')),
    error_message TEXT,
    execution_time TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- สร้างตาราง status_change_history (ประวัติการเปลี่ยนสถานะ)
CREATE TABLE IF NOT EXISTS public.status_change_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    table_name TEXT NOT NULL,
    record_id UUID NOT NULL,
    old_status TEXT,
    new_status TEXT NOT NULL,
    changed_by UUID REFERENCES auth.users(id),
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    reason TEXT
);

-- สร้าง indexes สำหรับ managed_numbers
CREATE INDEX IF NOT EXISTS idx_managed_numbers_lottery_sub_type_id ON public.managed_numbers(lottery_sub_type_id);
CREATE INDEX IF NOT EXISTS idx_managed_numbers_draw_date ON public.managed_numbers(draw_date);
CREATE INDEX IF NOT EXISTS idx_managed_numbers_number ON public.managed_numbers(number);
CREATE INDEX IF NOT EXISTS idx_managed_numbers_action ON public.managed_numbers(action);
CREATE INDEX IF NOT EXISTS idx_managed_numbers_composite ON public.managed_numbers(lottery_sub_type_id, draw_date, action);

-- สร้าง indexes สำหรับ scheduled_tasks
CREATE INDEX IF NOT EXISTS idx_scheduled_tasks_status ON public.scheduled_tasks(status);
CREATE INDEX IF NOT EXISTS idx_scheduled_tasks_next_run ON public.scheduled_tasks(next_run);
CREATE INDEX IF NOT EXISTS idx_scheduled_tasks_type ON public.scheduled_tasks(type);
CREATE INDEX IF NOT EXISTS idx_scheduled_tasks_schedule_id ON public.scheduled_tasks(schedule_id);

-- สร้าง indexes สำหรับ task_logs
CREATE INDEX IF NOT EXISTS idx_task_logs_task_id ON public.task_logs(task_id);
CREATE INDEX IF NOT EXISTS idx_task_logs_execution_time ON public.task_logs(execution_time);
CREATE INDEX IF NOT EXISTS idx_task_logs_status ON public.task_logs(status);

-- สร้าง indexes สำหรับ status_change_history
CREATE INDEX IF NOT EXISTS idx_status_change_history_table_record ON public.status_change_history(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_status_change_history_changed_at ON public.status_change_history(changed_at);
CREATE INDEX IF NOT EXISTS idx_status_change_history_changed_by ON public.status_change_history(changed_by);

-- เปิด RLS
ALTER TABLE public.managed_numbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.status_change_history ENABLE ROW LEVEL SECURITY;

-- สร้าง RLS policies
CREATE POLICY "Enable read access for authenticated users" ON public.managed_numbers FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Enable insert for authenticated users" ON public.managed_numbers FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update for authenticated users" ON public.managed_numbers FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Enable delete for authenticated users" ON public.managed_numbers FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY "scheduled_tasks_policy" ON public.scheduled_tasks FOR ALL USING (true);
CREATE POLICY "task_logs_policy" ON public.task_logs FOR ALL USING (true);
CREATE POLICY "status_change_history_policy" ON public.status_change_history FOR ALL USING (true);

-- ให้สิทธิ์
GRANT SELECT, INSERT, UPDATE, DELETE ON public.managed_numbers TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scheduled_tasks TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_logs TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.status_change_history TO anon, authenticated, service_role;
