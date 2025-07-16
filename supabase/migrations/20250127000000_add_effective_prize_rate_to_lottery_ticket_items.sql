-- Add effective_prize_rate and original_amount columns to lottery_ticket_items
-- This migration adds support for number cap system (เลขอั้น)

-- Add new columns to lottery_ticket_items table
ALTER TABLE public.lottery_ticket_items 
ADD COLUMN IF NOT EXISTS effective_prize_rate DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS original_amount DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS number_cap_status JSONB,
ADD COLUMN IF NOT EXISTS number_cap_action TEXT CHECK (number_cap_action IN ('half', 'close'));

-- Update existing records to set default values
UPDATE public.lottery_ticket_items 
SET 
    effective_prize_rate = lsn.price_paid,
    original_amount = amount,
    number_cap_status = NULL,
    number_cap_action = NULL
FROM public.lottery_sub_number lsn
WHERE lottery_ticket_items.lottery_sub_number_id = lsn.id
AND lottery_ticket_items.effective_prize_rate IS NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_lottery_ticket_items_effective_prize_rate 
ON public.lottery_ticket_items(effective_prize_rate);

CREATE INDEX IF NOT EXISTS idx_lottery_ticket_items_number_cap_action 
ON public.lottery_ticket_items(number_cap_action);

-- Add comment to explain the new columns
COMMENT ON COLUMN public.lottery_ticket_items.effective_prize_rate IS 'อัตราจ่ายรางวัลที่ปรับแล้วสำหรับเลขอั้น (actual prize rate after number cap adjustment)';
COMMENT ON COLUMN public.lottery_ticket_items.original_amount IS 'จำนวนเงินเดิมก่อนปรับเลขอั้น (original amount before number cap)';
COMMENT ON COLUMN public.lottery_ticket_items.number_cap_status IS 'สถานะเลขอั้นในรูปแบบ JSON (number cap status in JSON format)';
COMMENT ON COLUMN public.lottery_ticket_items.number_cap_action IS 'การดำเนินการเลขอั้น: half (หารครึ่ง) หรือ close (ปิดรับ)';

-- Create function to validate number cap data
CREATE OR REPLACE FUNCTION validate_number_cap_data()
RETURNS TRIGGER AS $$
BEGIN
    -- If number_cap_action is 'half', ensure effective_prize_rate is set
    IF NEW.number_cap_action = 'half' THEN
        IF NEW.effective_prize_rate IS NULL THEN
            RAISE EXCEPTION 'effective_prize_rate must be set when number_cap_action is half';
        END IF;
        
        -- Ensure original_amount is preserved
        IF NEW.original_amount IS NULL THEN
            NEW.original_amount := NEW.amount;
        END IF;
    END IF;
    
    -- If number_cap_action is 'close', this should not be inserted (handled in application)
    IF NEW.number_cap_action = 'close' THEN
        RAISE EXCEPTION 'Numbers with close action should not be inserted';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to validate number cap data
DROP TRIGGER IF EXISTS validate_number_cap_trigger ON public.lottery_ticket_items;
CREATE TRIGGER validate_number_cap_trigger
    BEFORE INSERT OR UPDATE ON public.lottery_ticket_items
    FOR EACH ROW
    EXECUTE FUNCTION validate_number_cap_data();

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON public.lottery_ticket_items TO authenticated;
GRANT USAGE ON SEQUENCE lottery_ticket_items_id_seq TO authenticated; 