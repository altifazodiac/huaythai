-- Create lottery notification tables
-- This migration creates tables to store lottery import and send notifications

-- Create lottery import notifications table
CREATE TABLE public.lottery_import_notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    notification_time TIMESTAMP WITH TIME ZONE NOT NULL,
    lottery_names TEXT[] NOT NULL DEFAULT '{}',
    total_results INTEGER NOT NULL DEFAULT 0,
    message TEXT NOT NULL,
    notification_type TEXT NOT NULL CHECK (notification_type IN ('import_success', 'import_error')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create lottery send notifications table
CREATE TABLE public.lottery_send_notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    notification_time TIMESTAMP WITH TIME ZONE NOT NULL,
    lottery_names TEXT[] NOT NULL DEFAULT '{}',
    total_results INTEGER NOT NULL DEFAULT 0,
    message TEXT NOT NULL,
    notification_type TEXT NOT NULL CHECK (notification_type IN ('send_success', 'send_error')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes for better performance
CREATE INDEX idx_lottery_import_notifications_created_at ON public.lottery_import_notifications(created_at DESC);
CREATE INDEX idx_lottery_import_notifications_type ON public.lottery_import_notifications(notification_type);
CREATE INDEX idx_lottery_import_notifications_time ON public.lottery_import_notifications(notification_time DESC);

CREATE INDEX idx_lottery_send_notifications_created_at ON public.lottery_send_notifications(created_at DESC);
CREATE INDEX idx_lottery_send_notifications_type ON public.lottery_send_notifications(notification_type);
CREATE INDEX idx_lottery_send_notifications_time ON public.lottery_send_notifications(notification_time DESC);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at_notifications()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_lottery_import_notifications_updated_at
    BEFORE UPDATE ON public.lottery_import_notifications
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at_notifications();

CREATE TRIGGER update_lottery_send_notifications_updated_at
    BEFORE UPDATE ON public.lottery_send_notifications
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at_notifications();

-- Enable RLS (Row Level Security)
ALTER TABLE public.lottery_import_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lottery_send_notifications ENABLE ROW LEVEL SECURITY;

-- Create policies for lottery_import_notifications
CREATE POLICY "Enable read access for all users" ON public.lottery_import_notifications
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for service role" ON public.lottery_import_notifications
    FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Enable update for service role" ON public.lottery_import_notifications
    FOR UPDATE USING (auth.role() = 'service_role');

-- Create policies for lottery_send_notifications
CREATE POLICY "Enable read access for all users" ON public.lottery_send_notifications
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for service role" ON public.lottery_send_notifications
    FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Enable update for service role" ON public.lottery_send_notifications
    FOR UPDATE USING (auth.role() = 'service_role');

-- Create a function to clean up old notifications (older than 7 days)
CREATE OR REPLACE FUNCTION public.cleanup_old_notifications()
RETURNS void AS $$
BEGIN
    DELETE FROM public.lottery_import_notifications 
    WHERE created_at < NOW() - INTERVAL '7 days';
    
    DELETE FROM public.lottery_send_notifications 
    WHERE created_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;

-- Create a comment for documentation
COMMENT ON TABLE public.lottery_import_notifications IS 'Stores notifications for lottery data import operations';
COMMENT ON TABLE public.lottery_send_notifications IS 'Stores notifications for lottery data send operations';
COMMENT ON FUNCTION public.cleanup_old_notifications() IS 'Cleans up notification records older than 7 days'; 