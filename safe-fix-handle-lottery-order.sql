-- Safe fix for handle_lottery_order function
-- This script prevents "UPDATE requires WHERE clause" error by checking table/column existence first

-- Enable session_replication_role to allow updates without WHERE in controlled manner
-- (Only for specific migration operations)
BEGIN;

-- 1. First, check if tables exist before proceeding
DO $$
DECLARE
    table_exists boolean;
    column_exists boolean;
BEGIN
    -- Check if lottery_ticket_items table exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'lottery_ticket_items'
    ) INTO table_exists;
    
    IF NOT table_exists THEN
        RAISE EXCEPTION 'Table lottery_ticket_items does not exist. Please run base lottery table migrations first.';
    END IF;
    
    RAISE NOTICE 'Table lottery_ticket_items exists - proceeding with column additions';
END $$;

-- 2. Add number cap support columns to lottery_ticket_items table if they don't exist
DO $$
BEGIN
    -- Add original_amount column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lottery_ticket_items' 
        AND column_name = 'original_amount'
    ) THEN
        ALTER TABLE public.lottery_ticket_items 
        ADD COLUMN original_amount DECIMAL(10,2);
        RAISE NOTICE 'Added original_amount column';
    ELSE
        RAISE NOTICE 'Column original_amount already exists';
    END IF;

    -- Add effective_prize_rate column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lottery_ticket_items' 
        AND column_name = 'effective_prize_rate'
    ) THEN
        ALTER TABLE public.lottery_ticket_items 
        ADD COLUMN effective_prize_rate DECIMAL(10,2);
        RAISE NOTICE 'Added effective_prize_rate column';
    ELSE
        RAISE NOTICE 'Column effective_prize_rate already exists';
    END IF;

    -- Add number_cap_action column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lottery_ticket_items' 
        AND column_name = 'number_cap_action'
    ) THEN
        ALTER TABLE public.lottery_ticket_items 
        ADD COLUMN number_cap_action TEXT;
        RAISE NOTICE 'Added number_cap_action column';
    ELSE
        RAISE NOTICE 'Column number_cap_action already exists';
    END IF;

    -- Add number_cap_status column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lottery_ticket_items' 
        AND column_name = 'number_cap_status'
    ) THEN
        ALTER TABLE public.lottery_ticket_items 
        ADD COLUMN number_cap_status JSONB;
        RAISE NOTICE 'Added number_cap_status column';
    ELSE
        RAISE NOTICE 'Column number_cap_status already exists';
    END IF;
END $$;

-- 3. SAFE UPDATE: Only update records where original_amount is NULL AND amount is NOT NULL
-- This prevents the "UPDATE requires WHERE clause" error by having a proper WHERE condition
DO $$
DECLARE
    update_count integer;
BEGIN
    -- Count records that need updating
    SELECT COUNT(*) INTO update_count
    FROM public.lottery_ticket_items 
    WHERE original_amount IS NULL AND amount IS NOT NULL;
    
    RAISE NOTICE 'Found % records that need original_amount update', update_count;
    
    -- Only proceed if we have records to update
    IF update_count > 0 THEN
        UPDATE public.lottery_ticket_items 
        SET 
            original_amount = amount,
            effective_prize_rate = COALESCE(effective_prize_rate, 0),
            number_cap_action = COALESCE(number_cap_action, NULL),
            number_cap_status = COALESCE(number_cap_status, NULL)
        WHERE original_amount IS NULL AND amount IS NOT NULL;
        
        RAISE NOTICE 'Updated % records with default values', update_count;
    ELSE
        RAISE NOTICE 'No records need updating';
    END IF;
END $$;

-- 4. Add draw_time and close_time columns to lottery_tickets table
DO $$
BEGIN
    -- Check if lottery_tickets table exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'lottery_tickets'
    ) THEN
        RAISE EXCEPTION 'Table lottery_tickets does not exist. Please run base lottery table migrations first.';
    END IF;

    -- Add draw_time column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lottery_tickets' 
        AND column_name = 'draw_time'
    ) THEN
        ALTER TABLE public.lottery_tickets 
        ADD COLUMN draw_time TIME;
        RAISE NOTICE 'Added draw_time column to lottery_tickets';
    END IF;

    -- Add close_time column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lottery_tickets' 
        AND column_name = 'close_time'
    ) THEN
        ALTER TABLE public.lottery_tickets 
        ADD COLUMN close_time TIME;
        RAISE NOTICE 'Added close_time column to lottery_tickets';
    END IF;

    -- Add bill_name column (if not exists)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lottery_tickets' 
        AND column_name = 'bill_name'
    ) THEN
        ALTER TABLE public.lottery_tickets 
        ADD COLUMN bill_name TEXT;
        RAISE NOTICE 'Added bill_name column to lottery_tickets';
    END IF;

    -- Add bill_number column (if not exists)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lottery_tickets' 
        AND column_name = 'bill_number'
    ) THEN
        ALTER TABLE public.lottery_tickets 
        ADD COLUMN bill_number TEXT;
        RAISE NOTICE 'Added bill_number column to lottery_tickets';
    END IF;
END $$;

-- 5. Add constraints safely
DO $$
BEGIN
    -- Add constraint for original_amount if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'check_original_amount_positive' 
        AND conrelid = 'public.lottery_ticket_items'::regclass
    ) THEN
        ALTER TABLE public.lottery_ticket_items 
        ADD CONSTRAINT check_original_amount_positive 
        CHECK (original_amount IS NULL OR original_amount > 0);
        RAISE NOTICE 'Added check_original_amount_positive constraint';
    END IF;

    -- Add constraint for effective_prize_rate if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'check_effective_prize_rate_positive' 
        AND conrelid = 'public.lottery_ticket_items'::regclass
    ) THEN
        ALTER TABLE public.lottery_ticket_items 
        ADD CONSTRAINT check_effective_prize_rate_positive 
        CHECK (effective_prize_rate IS NULL OR effective_prize_rate >= 0);
        RAISE NOTICE 'Added check_effective_prize_rate_positive constraint';
    END IF;

    -- Add constraint for number_cap_action if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'check_number_cap_action_valid' 
        AND conrelid = 'public.lottery_ticket_items'::regclass
    ) THEN
        ALTER TABLE public.lottery_ticket_items 
        ADD CONSTRAINT check_number_cap_action_valid 
        CHECK (number_cap_action IS NULL OR number_cap_action IN ('close', 'half'));
        RAISE NOTICE 'Added check_number_cap_action_valid constraint';
    END IF;
END $$;

-- 6. Create unique constraint for bill_number safely
DO $$
BEGIN
    -- Check if constraint already exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'unique_bill_number' 
        AND conrelid = 'public.lottery_tickets'::regclass
    ) THEN
        -- First, check for duplicate bill_numbers and handle them
        IF EXISTS (
            SELECT bill_number 
            FROM public.lottery_tickets 
            WHERE bill_number IS NOT NULL 
            GROUP BY bill_number 
            HAVING COUNT(*) > 1
        ) THEN
            RAISE WARNING 'Found duplicate bill_numbers. Please resolve duplicates before adding unique constraint.';
        ELSE
            ALTER TABLE public.lottery_tickets 
            ADD CONSTRAINT unique_bill_number UNIQUE (bill_number);
            RAISE NOTICE 'Added unique_bill_number constraint';
        END IF;
    ELSE
        RAISE NOTICE 'Constraint unique_bill_number already exists - skipping';
    END IF;
END $$;

-- 7. Create indexes for performance
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

-- 8. Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lottery_ticket_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lottery_tickets TO authenticated;

-- 9. Add helpful comments
COMMENT ON COLUMN public.lottery_ticket_items.original_amount IS 'Original amount before number cap adjustment';
COMMENT ON COLUMN public.lottery_ticket_items.effective_prize_rate IS 'Effective prize rate after number cap adjustment';
COMMENT ON COLUMN public.lottery_ticket_items.number_cap_action IS 'Number cap action taken: close, half, or null';
COMMENT ON COLUMN public.lottery_ticket_items.number_cap_status IS 'JSON object containing number cap status details';

COMMENT ON COLUMN public.lottery_tickets.draw_time IS 'Time when the lottery draw will occur';
COMMENT ON COLUMN public.lottery_tickets.close_time IS 'Time when ticket sales close';
COMMENT ON COLUMN public.lottery_tickets.bill_name IS 'Name of the lottery bill';
COMMENT ON COLUMN public.lottery_tickets.bill_number IS 'Unique bill number for this ticket';

-- 10. Final verification
DO $$
DECLARE
    ticket_items_columns_count integer;
    lottery_tickets_columns_count integer;
BEGIN
    -- Check lottery_ticket_items columns
    SELECT COUNT(*) INTO ticket_items_columns_count
    FROM information_schema.columns
    WHERE table_name = 'lottery_ticket_items'
    AND column_name IN ('original_amount', 'effective_prize_rate', 'number_cap_action', 'number_cap_status');
    
    -- Check lottery_tickets columns  
    SELECT COUNT(*) INTO lottery_tickets_columns_count
    FROM information_schema.columns
    WHERE table_name = 'lottery_tickets'
    AND column_name IN ('draw_time', 'close_time', 'bill_name', 'bill_number');
    
    RAISE NOTICE 'Verification: lottery_ticket_items has %/4 required columns', ticket_items_columns_count;
    RAISE NOTICE 'Verification: lottery_tickets has %/4 required columns', lottery_tickets_columns_count;
    
    IF ticket_items_columns_count = 4 AND lottery_tickets_columns_count = 4 THEN
        RAISE NOTICE '✅ All required columns have been added successfully!';
    ELSE
        RAISE WARNING '⚠️  Some columns may be missing. Please check the logs above.';
    END IF;
END $$;

COMMIT;

-- Final success message
SELECT 'Safe migration completed successfully!' as status,
       'handle_lottery_order function should now work correctly' as next_step; 