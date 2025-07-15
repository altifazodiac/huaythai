-- Create status_change_history table
CREATE TABLE IF NOT EXISTS status_change_history (
    id BIGSERIAL PRIMARY KEY,
    ticket_id BIGINT NOT NULL REFERENCES lottery_tickets(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    old_status TEXT NOT NULL,
    new_status TEXT NOT NULL,
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_status_change_history_ticket_id ON status_change_history(ticket_id);
CREATE INDEX IF NOT EXISTS idx_status_change_history_user_id ON status_change_history(user_id);
CREATE INDEX IF NOT EXISTS idx_status_change_history_changed_at ON status_change_history(changed_at);

-- Add RLS policies
ALTER TABLE status_change_history ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own status changes
CREATE POLICY "Users can view their own status changes" ON status_change_history
    FOR SELECT USING (auth.uid() = user_id);

-- Allow admins to view all status changes
CREATE POLICY "Admins can view all status changes" ON status_change_history
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Allow users to insert their own status changes
CREATE POLICY "Users can insert their own status changes" ON status_change_history
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Add updated_at column to lottery_tickets if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'lottery_tickets' AND column_name = 'updated_at') THEN
        ALTER TABLE lottery_tickets ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;

-- Create trigger to update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_lottery_tickets_updated_at') THEN
        CREATE TRIGGER update_lottery_tickets_updated_at
            BEFORE UPDATE ON lottery_tickets
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;