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

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.soft_delete_lottery_ticket(UUID, TEXT) TO authenticated;

-- Create delete_history table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.delete_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES public.lottery_tickets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT,
  deleted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create RLS policies for delete_history table
ALTER TABLE public.delete_history ENABLE ROW LEVEL SECURITY;

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

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_delete_history_ticket_id ON public.delete_history(ticket_id);
CREATE INDEX IF NOT EXISTS idx_delete_history_user_id ON public.delete_history(user_id);
CREATE INDEX IF NOT EXISTS idx_delete_history_deleted_at ON public.delete_history(deleted_at);
