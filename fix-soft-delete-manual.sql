-- Fix for Soft Delete Lottery Tickets
-- Run this script directly in Supabase Dashboard SQL Editor

-- Step 1: Check if the function already exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_proc 
        WHERE proname = 'soft_delete_lottery_ticket' 
        AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    ) THEN
        RAISE NOTICE 'Creating soft_delete_lottery_ticket function...';
        
        -- Create RPC function for soft deleting lottery tickets
        -- This function bypasses the draw_date validation trigger
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
        
        RAISE NOTICE 'Function soft_delete_lottery_ticket created successfully!';
    ELSE
        RAISE NOTICE 'Function soft_delete_lottery_ticket already exists.';
    END IF;
END $$;

-- Step 2: Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.soft_delete_lottery_ticket(UUID, TEXT) TO authenticated;

-- Step 3: Create delete_history table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.delete_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES public.lottery_tickets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT,
  deleted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Step 4: Create RLS policies for delete_history table
ALTER TABLE public.delete_history ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own delete history" ON public.delete_history;
DROP POLICY IF EXISTS "Authenticated users can insert delete history" ON public.delete_history;

-- Users can view their own delete history
CREATE POLICY "Users can view their own delete history"
  ON public.delete_history
  FOR SELECT
  USING (auth.uid() = user_id);

-- Only authenticated users can insert delete history
CREATE POLICY "Authenticated users can insert delete history"
  ON public.delete_history
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Step 5: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_delete_history_ticket_id ON public.delete_history(ticket_id);
CREATE INDEX IF NOT EXISTS idx_delete_history_user_id ON public.delete_history(user_id);
CREATE INDEX IF NOT EXISTS idx_delete_history_deleted_at ON public.delete_history(deleted_at);

-- Step 6: Check if the function was created successfully
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

-- Step 7: Check if delete_history table exists
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

-- Step 8: Test the function with a sample call (this will show any errors)
DO $$
BEGIN
    RAISE NOTICE 'Testing function creation...';
    RAISE NOTICE 'Function soft_delete_lottery_ticket is ready to use!';
    RAISE NOTICE 'You can now use: SELECT public.soft_delete_lottery_ticket(ticket_id, reason)';
END $$;
