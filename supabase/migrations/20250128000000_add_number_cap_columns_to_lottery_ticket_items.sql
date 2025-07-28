-- Add number cap support columns to lottery_ticket_items table
-- This migration adds the missing columns that handle_lottery_order function expects

-- Add new columns to lottery_ticket_items table
ALTER TABLE public.lottery_ticket_items 
ADD COLUMN IF NOT EXISTS original_amount DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS effective_prize_rate DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS number_cap_action TEXT,
ADD COLUMN IF NOT EXISTS number_cap_status JSONB;

-- Add comments to explain the new columns
COMMENT ON COLUMN public.lottery_ticket_items.original_amount IS 'Original amount before number cap adjustment';
COMMENT ON COLUMN public.lottery_ticket_items.effective_prize_rate IS 'Effective prize rate after number cap adjustment';
COMMENT ON COLUMN public.lottery_ticket_items.number_cap_action IS 'Number cap action taken: close, half, or null';
COMMENT ON COLUMN public.lottery_ticket_items.number_cap_status IS 'JSON object containing number cap status details';

-- Update existing records to have default values
UPDATE public.lottery_ticket_items 
SET 
    original_amount = amount,
    effective_prize_rate = 0,
    number_cap_action = NULL,
    number_cap_status = NULL
WHERE original_amount IS NULL;

-- Add constraints to ensure data integrity
ALTER TABLE public.lottery_ticket_items 
ADD CONSTRAINT check_original_amount_positive 
CHECK (original_amount IS NULL OR original_amount > 0),
ADD CONSTRAINT check_effective_prize_rate_positive 
CHECK (effective_prize_rate IS NULL OR effective_prize_rate >= 0),
ADD CONSTRAINT check_number_cap_action_valid 
CHECK (number_cap_action IS NULL OR number_cap_action IN ('close', 'half'));

-- Create index for number cap queries
CREATE INDEX IF NOT EXISTS idx_lottery_ticket_items_number_cap_action 
ON public.lottery_ticket_items(number_cap_action) 
WHERE number_cap_action IS NOT NULL;

-- Create index for effective prize rate queries
CREATE INDEX IF NOT EXISTS idx_lottery_ticket_items_effective_prize_rate 
ON public.lottery_ticket_items(effective_prize_rate);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lottery_ticket_items TO authenticated; 