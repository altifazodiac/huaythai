-- Fix RLS policies for lottery_winning_bills table
-- This migration ensures proper access to the lottery_winning_bills table

-- First, drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own winning bills" ON public.lottery_winning_bills;
DROP POLICY IF EXISTS "Users can insert their own winning bills" ON public.lottery_winning_bills;
DROP POLICY IF EXISTS "Users can update their own winning bills" ON public.lottery_winning_bills;
DROP POLICY IF EXISTS "Admin can view all winning bills" ON public.lottery_winning_bills;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.lottery_winning_bills;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.lottery_winning_bills;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.lottery_winning_bills;

-- Enable RLS if not already enabled
ALTER TABLE public.lottery_winning_bills ENABLE ROW LEVEL SECURITY;

-- Create new policies that work with the existing table structure
-- Policy for reading winning bills - allow authenticated users to read
CREATE POLICY "Enable read access for authenticated users" ON public.lottery_winning_bills
    FOR SELECT 
    USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- Policy for inserting winning bills - allow authenticated users to insert
CREATE POLICY "Enable insert for authenticated users" ON public.lottery_winning_bills
    FOR INSERT 
    WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- Policy for updating winning bills - allow authenticated users to update
CREATE POLICY "Enable update for authenticated users" ON public.lottery_winning_bills
    FOR UPDATE 
    USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- Policy for deleting winning bills - allow service role only
CREATE POLICY "Enable delete for service role only" ON public.lottery_winning_bills
    FOR DELETE 
    USING (auth.role() = 'service_role');

-- Create indexes for better performance if they don't exist
CREATE INDEX IF NOT EXISTS idx_lottery_winning_bills_bill_number ON public.lottery_winning_bills(bill_number);
CREATE INDEX IF NOT EXISTS idx_lottery_winning_bills_user_id ON public.lottery_winning_bills(user_id);
CREATE INDEX IF NOT EXISTS idx_lottery_winning_bills_draw_date ON public.lottery_winning_bills(draw_date);
CREATE INDEX IF NOT EXISTS idx_lottery_winning_bills_status ON public.lottery_winning_bills(status);
CREATE INDEX IF NOT EXISTS idx_lottery_winning_bills_created_at ON public.lottery_winning_bills(created_at DESC);

-- Grant necessary permissions
GRANT ALL ON public.lottery_winning_bills TO authenticated;
GRANT ALL ON public.lottery_winning_bills TO service_role;
GRANT USAGE ON SEQUENCE public.lottery_winning_bills_id_seq TO authenticated;
GRANT USAGE ON SEQUENCE public.lottery_winning_bills_id_seq TO service_role; 