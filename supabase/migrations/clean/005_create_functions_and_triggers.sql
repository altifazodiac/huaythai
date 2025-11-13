-- =====================================================
-- Migration 005: สร้าง Functions และ Triggers ที่จำเป็น
-- สร้างเมื่อ: 2025-01-01
-- =====================================================

-- สร้าง function สำหรับอัปเดต updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- สร้าง triggers สำหรับ updated_at ในทุกตาราง
CREATE TRIGGER update_lottery_types_updated_at BEFORE UPDATE ON public.lottery_types FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER update_lottery_sub_types_updated_at BEFORE UPDATE ON public.lottery_sub_types FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER update_lottery_sub_number_updated_at BEFORE UPDATE ON public.lottery_sub_number FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER update_drawing_schedules_updated_at BEFORE UPDATE ON public.drawing_schedules FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER update_user_roles_updated_at BEFORE UPDATE ON public.user_roles FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER update_lottery_tickets_updated_at BEFORE UPDATE ON public.lottery_tickets FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER update_lottery_ticket_items_updated_at BEFORE UPDATE ON public.lottery_ticket_items FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER update_lottery_results_updated_at BEFORE UPDATE ON public.lottery_results FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER update_lottery_winnings_updated_at BEFORE UPDATE ON public.lottery_winnings FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER update_managed_numbers_updated_at BEFORE UPDATE ON public.managed_numbers FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER update_scheduled_tasks_updated_at BEFORE UPDATE ON public.scheduled_tasks FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- สร้าง function สำหรับจัดการคำสั่งซื้อหวย (handle_lottery_order)
CREATE OR REPLACE FUNCTION public.handle_lottery_order(
    p_user_id UUID,
    p_bill_name TEXT,
    p_bill_number TEXT,
    p_draw_date DATE,
    p_draw_time TIME,
    p_close_time TIME,
    p_total_amount NUMERIC,
    p_ticket_items JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_credit NUMERIC;
    new_credit NUMERIC;
    new_ticket_id UUID;
    item JSONB;
    item_amount NUMERIC;
    item_original_amount NUMERIC;
    item_effective_prize_rate NUMERIC;
    item_number_cap_action TEXT;
    item_number_cap_status JSONB;
BEGIN
    -- 1. ตรวจสอบ user และเครดิต
    SELECT credit_balance INTO current_credit 
    FROM public.profiles
    WHERE id = p_user_id;

    IF current_credit IS NULL THEN
        RAISE EXCEPTION 'User not found or no credit balance';
    END IF;

    IF current_credit < p_total_amount THEN
        RAISE EXCEPTION 'Insufficient credit balance. Current: %, Required: %', current_credit, p_total_amount;
    END IF;

    -- 2. หักเครดิตจากบัญชี user
    new_credit := current_credit - p_total_amount;
    UPDATE public.profiles
    SET credit_balance = new_credit
    WHERE id = p_user_id;

    -- 3. สร้าง lottery ticket ใหม่
    INSERT INTO public.lottery_tickets (
        user_id, 
        bill_name, 
        bill_number, 
        draw_date, 
        draw_time, 
        close_time, 
        total_amount, 
        status
    )
    VALUES (
        p_user_id, 
        p_bill_name, 
        p_bill_number, 
        p_draw_date, 
        p_draw_time, 
        p_close_time, 
        p_total_amount, 
        'confirmed'
    )
    RETURNING id INTO new_ticket_id;

    -- 4. เพิ่ม ticket items จาก JSONB array
    FOR item IN SELECT * FROM jsonb_array_elements(p_ticket_items)
    LOOP
        -- ดึงข้อมูลทั้งหมดจาก item
        item_amount := (item->>'amount')::NUMERIC;
        item_original_amount := COALESCE((item->>'original_amount')::NUMERIC, item_amount);
        item_effective_prize_rate := (item->>'effective_prize_rate')::NUMERIC;
        item_number_cap_action := item->>'number_cap_action';
        item_number_cap_status := item->'number_cap_status';

        -- ตรวจสอบข้อมูลที่จำเป็น
        IF item_amount IS NULL OR item_amount <= 0 THEN
            RAISE EXCEPTION 'Invalid amount for ticket item: %', item;
        END IF;

        -- เพิ่ม ticket item
        INSERT INTO public.lottery_ticket_items (
            ticket_id,
            lottery_sub_type_id,
            lottery_sub_number_id,
            numbers,
            amount,
            original_amount,
            effective_prize_rate,
            number_cap_action,
            number_cap_status
        )
        VALUES (
            new_ticket_id,
            (item->>'lottery_sub_type_id')::INTEGER,
            (item->>'lottery_sub_number_id')::INTEGER,
            (SELECT array_agg(elem::TEXT) FROM jsonb_array_elements_text(item->'numbers')),
            item_amount,
            item_original_amount,
            item_effective_prize_rate,
            item_number_cap_action,
            item_number_cap_status
        );
    END LOOP;

    -- 5. สร้าง credit transaction log
    INSERT INTO public.credit_transactions (
        user_id, 
        amount, 
        transaction_type, 
        description, 
        related_bill_number
    )
    VALUES (
        p_user_id, 
        -p_total_amount, 
        'purchase', 
        'Lottery ticket purchase - ' || COALESCE(p_bill_name, 'Bill #' || p_bill_number), 
        p_bill_number
    );

    -- 6. บันทึกการทำรายการสำเร็จ
    RAISE NOTICE 'Lottery order completed successfully. Bill: %, Amount: %, Items: %', 
        p_bill_number, p_total_amount, jsonb_array_length(p_ticket_items);

EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Error processing lottery order: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
END;
$$;

-- ให้สิทธิ์ execute สำหรับ function
GRANT EXECUTE ON FUNCTION public.handle_lottery_order TO authenticated;

-- สร้าง function สำหรับเพิ่มเครดิต
CREATE OR REPLACE FUNCTION public.increment_credit_balance(
    p_user_id UUID,
    p_amount DECIMAL(10,2),
    p_transaction_type TEXT DEFAULT 'topup',
    p_description TEXT DEFAULT 'Credit top-up'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- เพิ่มเครดิตใน profiles
    UPDATE public.profiles 
    SET credit_balance = credit_balance + p_amount
    WHERE id = p_user_id;
    
    -- บันทึก transaction
    INSERT INTO public.credit_transactions (
        user_id, 
        amount, 
        transaction_type, 
        description
    )
    VALUES (
        p_user_id, 
        p_amount, 
        p_transaction_type, 
        p_description
    );
    
    RETURN true;
EXCEPTION
    WHEN OTHERS THEN
        RETURN false;
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_credit_balance TO authenticated;

-- สร้าง view สำหรับสรุปข้อมูล
CREATE OR REPLACE VIEW public.lottery_tickets_with_user_details AS
SELECT 
    lt.*,
    p.name as username,
    p.email as user_email,
    p.phone as user_phone
FROM public.lottery_tickets lt
LEFT JOIN public.profiles p ON lt.user_id = p.id;

GRANT SELECT ON public.lottery_tickets_with_user_details TO anon, authenticated, service_role;

-- สร้าง view สำหรับ scheduled tasks summary
CREATE OR REPLACE VIEW public.scheduled_tasks_summary AS
SELECT 
    type,
    status,
    COUNT(*) as count,
    MIN(next_run) as next_run_min,
    MAX(next_run) as next_run_max,
    MIN(last_run) as last_run_min,
    MAX(last_run) as last_run_max
FROM public.scheduled_tasks 
GROUP BY type, status;

GRANT SELECT ON public.scheduled_tasks_summary TO anon, authenticated, service_role;
