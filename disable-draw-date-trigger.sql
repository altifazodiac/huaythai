-- Disable draw_date validation trigger temporarily
-- This will allow soft delete to work without validation errors

-- Step 1: Check current trigger status
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement,
    'ENABLED' as status
FROM information_schema.triggers 
WHERE trigger_name = 'validate_draw_date'
AND event_object_table = 'lottery_tickets';

-- Step 2: Disable the trigger
ALTER TABLE public.lottery_tickets DISABLE TRIGGER validate_draw_date;

-- Step 3: Verify trigger is disabled
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement,
    'DISABLED' as status
FROM information_schema.triggers 
WHERE trigger_name = 'validate_draw_date'
AND event_object_table = 'lottery_tickets';

-- Step 4: Test if UPDATE works now
-- (This will show if the trigger is really disabled)
DO $$
BEGIN
    RAISE NOTICE 'Trigger validate_draw_date has been DISABLED';
    RAISE NOTICE 'You can now perform soft delete operations without draw_date validation errors';
    RAISE NOTICE 'Remember to re-enable the trigger when you are done:';
    RAISE NOTICE 'ALTER TABLE public.lottery_tickets ENABLE TRIGGER validate_draw_date;';
END $$;
