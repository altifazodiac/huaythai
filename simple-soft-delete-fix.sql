-- Simple Fix for Soft Delete Lottery Tickets
-- Run this in Supabase Dashboard SQL Editor

-- Step 1: Create the function directly
CREATE OR REPLACE FUNCTION public.soft_delete_lottery_ticket(
  ticket_id UUID,
  delete_reason TEXT DEFAULT 'ลบโดยผู้ใช้'
)
RETURNS VOID AS $$
BEGIN
  -- Soft delete the lottery ticket by setting deleted_at
  UPDATE public.lottery_tickets
  SET deleted_at = NOW()
  WHERE id = ticket_id;
  
  -- Insert into delete_history table
  INSERT INTO public.delete_history (
    ticket_id,
    user_id,
    reason,
    deleted_at
  ) VALUES (
    ticket_id,
    auth.uid(),
    delete_reason,
    NOW()
  );
  
  -- Raise exception if no rows were updated
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lottery ticket not found';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 2: Grant execute permission
GRANT EXECUTE ON FUNCTION public.soft_delete_lottery_ticket(UUID, TEXT) TO authenticated;

-- Step 3: Create delete_history table
CREATE TABLE IF NOT EXISTS public.delete_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES public.lottery_tickets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT,
  deleted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Step 4: Setup RLS policies
ALTER TABLE public.delete_history ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own delete history" ON public.delete_history;
DROP POLICY IF EXISTS "Authenticated users can insert delete history" ON public.delete_history;

-- Create policies
CREATE POLICY "Users can view their own delete history"
  ON public.delete_history
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can insert delete history"
  ON public.delete_history
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Step 5: Create indexes
CREATE INDEX IF NOT EXISTS idx_delete_history_ticket_id ON public.delete_history(ticket_id);
CREATE INDEX IF NOT EXISTS idx_delete_history_user_id ON public.delete_history(user_id);
CREATE INDEX IF NOT EXISTS idx_delete_history_deleted_at ON public.delete_history(deleted_at);

-- Step 6: Verification
SELECT 
    'Function Status' as check_type,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_proc 
            WHERE proname = 'soft_delete_lottery_ticket' 
            AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
        ) THEN '✅ Function exists'
        ELSE '❌ Function not found'
    END as status;

SELECT 
    'Table Status' as check_type,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'delete_history'
        ) THEN '✅ Table exists'
        ELSE '❌ Table not found'
    END as status;

-- Step 7: Success message
SELECT '🎉 Soft delete setup completed!' as message;
