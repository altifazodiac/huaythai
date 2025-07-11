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

-- Create the RPC function to process next task
CREATE OR REPLACE FUNCTION public.process_next_task()
RETURNS jsonb AS $$
DECLARE
    task_record RECORD;
    job_id BIGINT;
BEGIN
    -- Get the next queued task
    SELECT * INTO task_record
    FROM public.task_queue
    WHERE status = 'queued'
    ORDER BY created_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED;

    -- If no task found, return empty
    IF task_record.id IS NULL THEN
        RETURN jsonb_build_object(
            'success', true,
            'message', 'No tasks in queue',
            'task', NULL
        );
    END IF;

    -- Update task status to running
    UPDATE public.task_queue
    SET status = 'running', 
        updated_at = timezone('utc'::text, now()),
        attempts = attempts + 1
    WHERE id = task_record.id;

    -- Update scheduled_tasks status
    UPDATE public.scheduled_tasks
    SET status = 'running',
        last_run = timezone('utc'::text, now()),
        updated_at = timezone('utc'::text, now())
    WHERE id = task_record.task_id;

    -- Return task details
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Task retrieved successfully',
        'task', row_to_json(task_record)
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', SQLERRM,
            'details', SQLSTATE
        );
END;
$$ LANGUAGE plpgsql;

-- Create the RPC function to complete task
CREATE OR REPLACE FUNCTION public.complete_task(
    p_task_id TEXT,
    p_status TEXT,
    p_error_message TEXT DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
    queue_record RECORD;
BEGIN
    -- Find the task in queue
    SELECT * INTO queue_record
    FROM public.task_queue tq
    WHERE tq.task_id = p_task_id AND tq.status = 'running';

    IF queue_record.id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Task not found or not running'
        );
    END IF;

    -- Update task_queue status
    UPDATE public.task_queue
    SET status = p_status,
        updated_at = timezone('utc'::text, now())
    WHERE id = queue_record.id;

    -- Update scheduled_tasks status
    UPDATE public.scheduled_tasks
    SET status = p_status,
        updated_at = timezone('utc'::text, now())
    WHERE id = p_task_id;

    -- Insert into task_logs
    INSERT INTO public.task_logs (
        task_id,
        task_name,
        task_type,
        status,
        error_message,
        execution_time
    )
    SELECT 
        st.id,
        st.name,
        st.type,
        CASE WHEN p_status = 'completed' THEN 'completed' ELSE 'failed' END,
        p_error_message,
        timezone('utc'::text, now())
    FROM public.scheduled_tasks st
    WHERE st.id = p_task_id;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Task completed successfully'
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', SQLERRM,
            'details', SQLSTATE
        );
END;
$$ LANGUAGE plpgsql;

-- Create the RPC function to get queue status
CREATE OR REPLACE FUNCTION public.get_queue_status()
RETURNS jsonb AS $$
DECLARE
    queue_stats RECORD;
BEGIN
    -- Get queue statistics
    SELECT 
        COUNT(CASE WHEN status = 'queued' THEN 1 END) as queued,
        COUNT(CASE WHEN status = 'running' THEN 1 END) as running,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
        COUNT(*) as total
    INTO queue_stats
    FROM public.task_queue;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Queue status retrieved successfully',
        'stats', row_to_json(queue_stats)
    );
EXCEPTION
    WHEN OTHERS THEN
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
GRANT EXECUTE ON FUNCTION public.process_next_task() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.complete_task(TEXT, TEXT, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_queue_status() TO anon, authenticated, service_role; 