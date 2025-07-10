-- Create scheduled_tasks table
CREATE TABLE IF NOT EXISTS public.scheduled_tasks (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('scrape', 'send', 'cleanup')),
    scheduled_time TIME NOT NULL,
    drawing_time TIME NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
    last_run TIMESTAMP WITH TIME ZONE,
    next_run TIMESTAMP WITH TIME ZONE NOT NULL,
    schedule_id INTEGER REFERENCES public.drawing_schedules(schedule_id),
    lottery_sub_type_id INTEGER REFERENCES public.lottery_sub_types(lottery_sub_type_id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create task_logs table
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

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_scheduled_tasks_status ON public.scheduled_tasks(status);
CREATE INDEX IF NOT EXISTS idx_scheduled_tasks_next_run ON public.scheduled_tasks(next_run);
CREATE INDEX IF NOT EXISTS idx_scheduled_tasks_type ON public.scheduled_tasks(type);
CREATE INDEX IF NOT EXISTS idx_task_logs_task_id ON public.task_logs(task_id);
CREATE INDEX IF NOT EXISTS idx_task_logs_execution_time ON public.task_logs(execution_time);
CREATE INDEX IF NOT EXISTS idx_task_logs_status ON public.task_logs(status);

-- Create function to create scheduled_tasks table (for API compatibility)
CREATE OR REPLACE FUNCTION public.create_scheduled_tasks_table()
RETURNS void AS $$
BEGIN
    -- Table already exists, do nothing
    NULL;
END;
$$ LANGUAGE plpgsql;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_scheduled_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER trigger_update_scheduled_tasks_updated_at
    BEFORE UPDATE ON public.scheduled_tasks
    FOR EACH ROW
    EXECUTE FUNCTION public.update_scheduled_tasks_updated_at();

-- Create function to clean up old logs
CREATE OR REPLACE FUNCTION public.cleanup_old_task_logs()
RETURNS void AS $$
BEGIN
    -- ลบ logs ที่เก่ากว่า 7 วัน
    DELETE FROM public.task_logs
    WHERE created_at < NOW() - INTERVAL '7 days';
    
    -- ลบ scheduled tasks ที่เก่ากว่า 1 วัน
    DELETE FROM public.scheduled_tasks
    WHERE next_run < NOW() - INTERVAL '1 day'
    AND status IN ('completed', 'failed');
END;
$$ LANGUAGE plpgsql;

-- Enable RLS (Row Level Security)
ALTER TABLE public.scheduled_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "scheduled_tasks_policy" ON public.scheduled_tasks
    FOR ALL USING (true);

CREATE POLICY "task_logs_policy" ON public.task_logs
    FOR ALL USING (true);

-- Grant necessary permissions
GRANT ALL ON public.scheduled_tasks TO anon, authenticated, service_role;
GRANT ALL ON public.task_logs TO anon, authenticated, service_role;

-- Create helpful views
CREATE OR REPLACE VIEW public.scheduled_tasks_summary AS
SELECT 
    type,
    status,
    COUNT(*) as count,
    MIN(next_run) as next_run_min,
    MAX(next_run) as next_run_max,
    MIN(last_run) as last_run_min,
    MAX(last_run) as last_run_max
FROM public.scheduled_tasks 
GROUP BY type, status;

CREATE OR REPLACE VIEW public.task_logs_summary AS
SELECT 
    task_type,
    status,
    DATE(execution_time) as execution_date,
    COUNT(*) as count,
    COUNT(CASE WHEN error_message IS NOT NULL THEN 1 END) as error_count
FROM public.task_logs 
GROUP BY task_type, status, DATE(execution_time)
ORDER BY execution_date DESC, task_type, status;

GRANT SELECT ON public.scheduled_tasks_summary TO anon, authenticated, service_role;
GRANT SELECT ON public.task_logs_summary TO anon, authenticated, service_role; 