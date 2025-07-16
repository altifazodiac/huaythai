-- 1. Create a function to check if a user is an admin.
-- This function will be used in the RLS policies.
-- It's defined with `SECURITY DEFINER` to securely access the `user_roles` table.
CREATE OR REPLACE FUNCTION public.is_admin(p_user_id uuid)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_roles.user_id = p_user_id AND user_roles.role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Update the RLS policy for selecting lottery_tickets.
-- Drop the old policy first.
DROP POLICY IF EXISTS "Users can view their own tickets" ON public.lottery_tickets;

-- Create a new policy that allows access if the user is the owner OR is an admin.
CREATE POLICY "Users can view their own tickets or admins can view all"
ON public.lottery_tickets
FOR SELECT
USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

-- 3. Update the RLS policy for selecting lottery_ticket_items.
-- Drop the old policy first.
DROP POLICY IF EXISTS "Users can view their own ticket items" ON public.lottery_ticket_items;

-- Create a new policy that checks the parent ticket's ownership or admin status.
CREATE POLICY "Users can view their own ticket items or admins can view all"
ON public.lottery_ticket_items
FOR SELECT
USING (EXISTS (
  SELECT 1
  FROM public.lottery_tickets
  WHERE lottery_tickets.id = lottery_ticket_items.ticket_id
    AND (lottery_tickets.user_id = auth.uid() OR public.is_admin(auth.uid()))
));

-- 4. Update the RLS policy for updating lottery_tickets.
-- This is important for status changes and soft deletes by admins.
DROP POLICY IF EXISTS "Users can update their own tickets" ON public.lottery_tickets;

-- Create a new policy that allows updates if the user is the owner OR is an admin.
CREATE POLICY "Users can update their own tickets or admins can update any"
ON public.lottery_tickets
FOR UPDATE
USING (auth.uid() = user_id OR public.is_admin(auth.uid()));
