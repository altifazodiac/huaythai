-- Add draw_time and close_time columns to lottery_tickets table
-- This migration adds the missing columns that handle_lottery_order function expects

-- Add new columns to lottery_tickets table
ALTER TABLE public.lottery_tickets 
ADD COLUMN IF NOT EXISTS draw_time TIME,
ADD COLUMN IF NOT EXISTS close_time TIME,
ADD COLUMN IF NOT EXISTS bill_name TEXT,
ADD COLUMN IF NOT EXISTS bill_number TEXT;

-- Add comments to explain the new columns
COMMENT ON COLUMN public.lottery_tickets.draw_time IS 'Time when the lottery draw will occur';
COMMENT ON COLUMN public.lottery_tickets.close_time IS 'Time when ticket sales close';
COMMENT ON COLUMN public.lottery_tickets.bill_name IS 'Name of the lottery bill';
COMMENT ON COLUMN public.lottery_tickets.bill_number IS 'Unique bill number for this ticket';

-- Create indexes for the new columns
CREATE INDEX IF NOT EXISTS idx_lottery_tickets_draw_time 
ON public.lottery_tickets(draw_time);

CREATE INDEX IF NOT EXISTS idx_lottery_tickets_close_time 
ON public.lottery_tickets(close_time);

CREATE INDEX IF NOT EXISTS idx_lottery_tickets_bill_number 
ON public.lottery_tickets(bill_number);

-- Create unique constraint for bill_number to ensure uniqueness
ALTER TABLE public.lottery_tickets 
ADD CONSTRAINT unique_bill_number 
UNIQUE (bill_number);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lottery_tickets TO authenticated; 