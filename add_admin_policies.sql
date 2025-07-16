-- Add Admin RLS Policies
-- เพิ่ม RLS policies เพื่อให้ admin สามารถเข้าถึงข้อมูลทั้งหมดได้

-- 1. Drop existing policies และสร้างใหม่ที่รองรับ admin
DROP POLICY IF EXISTS "Users can view their own tickets" ON public.lottery_tickets;
DROP POLICY IF EXISTS "Users can view their own ticket items" ON public.lottery_ticket_items;
DROP POLICY IF EXISTS "Users can view their own winnings" ON public.lottery_winnings;

-- 2. สร้าง policies ใหม่ที่รองรับ admin
CREATE POLICY "Users and admins can view tickets"
    ON public.lottery_tickets
    FOR SELECT
    USING (
        auth.uid() = user_id 
        OR EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = auth.uid() 
            AND ur.role = 'admin'
        )
        OR EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.role = 'admin'
        )
    );

CREATE POLICY "Users and admins can view ticket items"
    ON public.lottery_ticket_items
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.lottery_tickets lt
            WHERE lt.id = lottery_ticket_items.ticket_id
            AND (
                lt.user_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM public.user_roles ur
                    WHERE ur.user_id = auth.uid() 
                    AND ur.role = 'admin'
                )
                OR EXISTS (
                    SELECT 1 FROM public.profiles p
                    WHERE p.id = auth.uid()
                    AND p.role = 'admin'
                )
            )
        )
    );

CREATE POLICY "Users and admins can view winnings"
    ON public.lottery_winnings
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.lottery_ticket_items lti
            JOIN public.lottery_tickets lt ON lt.id = lti.ticket_id
            WHERE lti.id = lottery_winnings.ticket_item_id
            AND (
                lt.user_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM public.user_roles ur
                    WHERE ur.user_id = auth.uid() 
                    AND ur.role = 'admin'
                )
                OR EXISTS (
                    SELECT 1 FROM public.profiles p
                    WHERE p.id = auth.uid()
                    AND p.role = 'admin'
                )
            )
        )
    );

-- 3. เพิ่ม policies สำหรับการแก้ไขข้อมูล (admin เท่านั้น)
CREATE POLICY "Admins can update tickets"
    ON public.lottery_tickets
    FOR UPDATE
    USING (
        auth.uid() = user_id 
        OR EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = auth.uid() 
            AND ur.role = 'admin'
        )
        OR EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.role = 'admin'
        )
    );

CREATE POLICY "Admins can update ticket items"
    ON public.lottery_ticket_items
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.lottery_tickets lt
            WHERE lt.id = lottery_ticket_items.ticket_id
            AND (
                lt.user_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM public.user_roles ur
                    WHERE ur.user_id = auth.uid() 
                    AND ur.role = 'admin'
                )
                OR EXISTS (
                    SELECT 1 FROM public.profiles p
                    WHERE p.id = auth.uid()
                    AND p.role = 'admin'
                )
            )
        )
    );

-- 4. เพิ่ม policies สำหรับการลบข้อมูล (admin เท่านั้น)
CREATE POLICY "Admins can delete tickets"
    ON public.lottery_tickets
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = auth.uid() 
            AND ur.role = 'admin'
        )
        OR EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.role = 'admin'
        )
    );

CREATE POLICY "Admins can delete ticket items"
    ON public.lottery_ticket_items
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = auth.uid() 
            AND ur.role = 'admin'
        )
        OR EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.role = 'admin'
        )
    );

-- 5. เพิ่ม helper function สำหรับตรวจสอบสิทธิ์ admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid() 
        AND ur.role = 'admin'
    ) OR EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
        AND p.role = 'admin'
    );
END;
$$;

-- 6. Grant permissions สำหรับ helper function
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- 7. สร้าง policy สำหรับ profiles table (ถ้ายังไม่มี)
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

CREATE POLICY "Users can view own profile and admins can view all"
    ON public.profiles
    FOR SELECT
    USING (
        auth.uid() = id 
        OR public.is_admin()
    );

-- 8. สร้าง policy สำหรับ user_roles table
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;

CREATE POLICY "Users can view own roles and admins can view all"
    ON public.user_roles
    FOR SELECT
    USING (
        auth.uid() = user_id 
        OR public.is_admin()
    );

-- 9. อัปเดต policies สำหรับ summary functions
-- ให้ functions สามารถเข้าถึงข้อมูลได้โดยไม่ติด RLS (เพราะใช้ SECURITY DEFINER)
-- และจะใช้ logic ใน function เองในการกรองข้อมูล

-- 10. Add comments
COMMENT ON FUNCTION public.is_admin() IS 'ตรวจสอบว่าผู้ใช้ปัจจุบันเป็น admin หรือไม่';
COMMENT ON POLICY "Users and admins can view tickets" ON public.lottery_tickets IS 'ผู้ใช้เห็นตั๋วของตัวเอง และ admin เห็นทั้งหมด';
COMMENT ON POLICY "Users and admins can view ticket items" ON public.lottery_ticket_items IS 'ผู้ใช้เห็น items ของตัวเอง และ admin เห็นทั้งหมด';
COMMENT ON POLICY "Users and admins can view winnings" ON public.lottery_winnings IS 'ผู้ใช้เห็นรางวัลของตัวเอง และ admin เห็นทั้งหมด';

-- 11. Test queries สำหรับตรวจสอบว่า policies ทำงานถูกต้อง
/*
-- ทดสอบกับ regular user
SELECT set_config('request.jwt.claim.sub', 'user-uuid', true);
SELECT * FROM lottery_tickets LIMIT 5;

-- ทดสอบกับ admin
SELECT set_config('request.jwt.claim.sub', 'admin-uuid', true);
SELECT * FROM lottery_tickets LIMIT 5;

-- ทดสอบ helper function
SELECT public.is_admin();
*/