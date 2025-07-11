-- Create the task_queue table
CREATE TABLE IF NOT EXISTS public.task_queue (
    id BIGSERIAL PRIMARY KEY,
    task_id TEXT NOT NULL,
    task_type TEXT NOT NULL,
    drawing_time TIME,
    lottery_sub_type_id INTEGER,
    status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'completed', 'failed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    attempts INTEGER DEFAULT 0
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_task_queue_status ON public.task_queue(status);
CREATE INDEX IF NOT EXISTS idx_task_queue_created_at ON public.task_queue(created_at);


-- Create the RPC function to enqueue tasks
CREATE OR REPLACE FUNCTION public.enqueue_task(
    p_task_id TEXT,
    p_task_type TEXT,
    p_drawing_time TIME DEFAULT NULL,
    p_lottery_sub_type_id INTEGER DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
    job_id BIGINT;
BEGIN
    -- Insert the task into the queue
    INSERT INTO public.task_queue (task_id, task_type, drawing_time, lottery_sub_type_id)
    VALUES (p_task_id, p_task_type, p_drawing_time, p_lottery_sub_type_id)
    RETURNING id INTO job_id;

    -- Update the scheduled_task status to 'queued' or similar
    UPDATE public.scheduled_tasks
    SET status = 'pending', -- or 'queued' if you add it to the check constraint
        updated_at = timezone('utc'::text, now())
    WHERE id = p_task_id;
    
    -- Return success response
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Task successfully queued.',
        'job_id', job_id
    );
EXCEPTION
    WHEN OTHERS THEN
        -- Return error response
        RETURN jsonb_build_object(
            'success', false,
            'message', SQLERRM,
            'details', SQLSTATE
        );
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON public.task_queue TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.enqueue_task(TEXT, TEXT, TIME, INTEGER) TO anon, authenticated, service_role; 