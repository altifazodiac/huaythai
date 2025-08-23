-- Re-enable draw_date validation trigger
-- Run this after you are done with soft delete operations

-- Step 1: Check current trigger status
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement,
    'DISABLED' as status
FROM information_schema.triggers 
WHERE trigger_name = 'validate_draw_date'
AND event_object_table = 'lottery_tickets';

-- Step 2: Re-enable the trigger
ALTER TABLE public.lottery_tickets ENABLE TRIGGER validate_draw_date;

-- Step 3: Verify trigger is enabled
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement,
    'ENABLED' as status
FROM information_schema.triggers 
WHERE trigger_name = 'validate_draw_date'
AND event_object_table = 'lottery_tickets';

-- Step 4: Confirm trigger is working
DO $$
BEGIN
    RAISE NOTICE 'Trigger validate_draw_date has been RE-ENABLED';
    RAISE NOTICE 'Draw date validation is now active again';
    RAISE NOTICE 'New lottery tickets will be validated for draw_date';
END $$;
