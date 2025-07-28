-- Fix handle_lottery_order function by adding missing columns
-- This script adds all the missing columns that the function expects

-- 1. Add number cap support columns to lottery_ticket_items table
ALTER TABLE public.lottery_ticket_items 
ADD COLUMN IF NOT EXISTS original_amount DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS effective_prize_rate DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS number_cap_action TEXT,
ADD COLUMN IF NOT EXISTS number_cap_status JSONB;

-- Update existing records to have default values
UPDATE public.lottery_ticket_items 
SET 
    original_amount = amount,
    effective_prize_rate = 0,
    number_cap_action = NULL,
    number_cap_status = NULL
WHERE original_amount IS NULL;

-- Add constraints to ensure data integrity
DO $$
BEGIN
    -- Add constraint for original_amount if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_original_amount_positive' AND conrelid = 'public.lottery_ticket_items'::regclass) THEN
        ALTER TABLE public.lottery_ticket_items ADD CONSTRAINT check_original_amount_positive CHECK (original_amount IS NULL OR original_amount > 0);
    END IF;

    -- Add constraint for effective_prize_rate if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_effective_prize_rate_positive' AND conrelid = 'public.lottery_ticket_items'::regclass) THEN
        ALTER TABLE public.lottery_ticket_items ADD CONSTRAINT check_effective_prize_rate_positive CHECK (effective_prize_rate IS NULL OR effective_prize_rate >= 0);
    END IF;

    -- Add constraint for number_cap_action if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_number_cap_action_valid' AND conrelid = 'public.lottery_ticket_items'::regclass) THEN
        ALTER TABLE public.lottery_ticket_items ADD CONSTRAINT check_number_cap_action_valid CHECK (number_cap_action IS NULL OR number_cap_action IN ('close', 'half'));
    END IF;
END $$;

-- 2. Add draw_time and close_time columns to lottery_tickets table
ALTER TABLE public.lottery_tickets 
ADD COLUMN IF NOT EXISTS draw_time TIME,
ADD COLUMN IF NOT EXISTS close_time TIME,
ADD COLUMN IF NOT EXISTS bill_name TEXT,
ADD COLUMN IF NOT EXISTS bill_number TEXT;

-- Create unique constraint for bill_number to ensure uniqueness
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_bill_number' AND conrelid = 'public.lottery_tickets'::regclass) THEN
        ALTER TABLE public.lottery_tickets ADD CONSTRAINT unique_bill_number UNIQUE (bill_number);
    END IF;
END $$;

-- 3. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_lottery_ticket_items_number_cap_action 
ON public.lottery_ticket_items(number_cap_action) 
WHERE number_cap_action IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_lottery_ticket_items_effective_prize_rate 
ON public.lottery_ticket_items(effective_prize_rate);

CREATE INDEX IF NOT EXISTS idx_lottery_tickets_draw_time 
ON public.lottery_tickets(draw_time);

CREATE INDEX IF NOT EXISTS idx_lottery_tickets_close_time 
ON public.lottery_tickets(close_time);

CREATE INDEX IF NOT EXISTS idx_lottery_tickets_bill_number 
ON public.lottery_tickets(bill_number);

-- 4. Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lottery_ticket_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lottery_tickets TO authenticated;

-- 5. Add comments to explain the new columns
COMMENT ON COLUMN public.lottery_ticket_items.original_amount IS 'Original amount before number cap adjustment';
COMMENT ON COLUMN public.lottery_ticket_items.effective_prize_rate IS 'Effective prize rate after number cap adjustment';
COMMENT ON COLUMN public.lottery_ticket_items.number_cap_action IS 'Number cap action taken: close, half, or null';
COMMENT ON COLUMN public.lottery_ticket_items.number_cap_status IS 'JSON object containing number cap status details';

COMMENT ON COLUMN public.lottery_tickets.draw_time IS 'Time when the lottery draw will occur';
COMMENT ON COLUMN public.lottery_tickets.close_time IS 'Time when ticket sales close';
COMMENT ON COLUMN public.lottery_tickets.bill_name IS 'Name of the lottery bill';
COMMENT ON COLUMN public.lottery_tickets.bill_number IS 'Unique bill number for this ticket';

-- 6. Verify the changes
SELECT 'Migration completed successfully' as status; 