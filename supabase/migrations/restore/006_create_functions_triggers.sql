-- ส่วนที่ 6: สร้าง Functions และ Triggers พื้นฐาน
SET search_path TO public;
BEGIN;

-- สร้าง function สำหรับ updated_at
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- สร้าง triggers สำหรับ updated_at บนตารางต่างๆ
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON "public"."credit_transactions" FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON "public"."lottery_tickets" FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON "public"."lottery_ticket_items" FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON "public"."lottery_winnings" FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON "public"."managed_numbers" FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON "public"."status_change_history" FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON "public"."user_roles" FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON "public"."lottery_results" FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON "public"."drawing_schedules" FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON "public"."lottery_types" FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON "public"."lottery_sub_types" FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON "public"."lottery_sub_number" FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON "public"."scheduled_tasks" FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON "public"."task_logs" FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON "public"."management_fee_cycles" FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON "public"."management_fee_daily_records" FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- สร้าง function สำหรับสร้าง profile เมื่อมี user ใหม่
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, name, credit_balance)
    VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'name', 0);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- สร้าง trigger สำหรับสร้าง profile เมื่อมี user ใหม่
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- สร้าง function สำหรับกำหนด role ให้ user ใหม่
CREATE OR REPLACE FUNCTION public.assign_default_role()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'user');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- สร้าง trigger สำหรับกำหนด role ให้ user ใหม่
CREATE TRIGGER assign_default_role_trigger
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.assign_default_role();

-- สร้าง function สำหรับ handle_lottery_order
CREATE OR REPLACE FUNCTION public.handle_lottery_order(
    p_user_id uuid,
    p_bill_name text,
    p_bill_number text,
    p_draw_date date,
    p_close_time text,
    p_total_amount numeric,
    p_ticket_items jsonb
)
RETURNS jsonb AS $$
DECLARE
    v_ticket_id uuid;
    v_ticket_item_id uuid;
    v_current_credit numeric;
    v_item json;
    v_result jsonb := '{"success": false, "message": "", "data": {}}'::jsonb;
BEGIN
    -- ตรวจสอบเครดิตปัจจุบัน
    SELECT credit_balance INTO v_current_credit 
    FROM public.profiles 
    WHERE id = p_user_id;
    
    IF v_current_credit IS NULL THEN
        v_result := jsonb_set(v_result, '{message}', 'User profile not found');
        RETURN v_result;
    END IF;
    
    IF v_current_credit < p_total_amount THEN
        v_result := jsonb_set(v_result, '{message}', 'Insufficient credit balance');
        RETURN v_result;
    END IF;
    
    -- สร้าง lottery ticket
    INSERT INTO public.lottery_tickets (
        user_id, 
        bill_name, 
        bill_number, 
        draw_date, 
        close_time, 
        total_amount, 
        status
    ) VALUES (
        p_user_id,
        p_bill_name,
        p_bill_number,
        p_draw_date,
        p_close_time,
        p_total_amount,
        'pending'
    ) RETURNING id INTO v_ticket_id;
    
    -- สร้าง ticket items
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_ticket_items)
    LOOP
        INSERT INTO public.lottery_ticket_items (
            ticket_id,
            lottery_sub_type_id,
            lottery_sub_number_id,
            numbers,
            amount
        ) VALUES (
            v_ticket_id,
            (v_item->>'lottery_sub_type_id')::integer,
            (v_item->>'lottery_sub_number_id')::integer,
            ARRAY[v_item->>'numbers'],
            (v_item->>'amount')::numeric
        );
    END LOOP;
    
    -- หักเครดิต
    UPDATE public.profiles 
    SET credit_balance = credit_balance - p_total_amount 
    WHERE id = p_user_id;
    
    -- บันทึก transaction
    INSERT INTO public.credit_transactions (
        user_id,
        amount,
        transaction_type,
        description,
        related_bill_number
    ) VALUES (
        p_user_id,
        -p_total_amount,
        'purchase',
        'Lottery ticket purchase',
        p_bill_number
    );
    
    v_result := jsonb_set(v_result, '{success}', 'true');
    v_result := jsonb_set(v_result, '{message}', 'Order created successfully');
    v_result := jsonb_set(v_result, '{data}', '{"ticket_id": "' || v_ticket_id || '"}'::jsonb);
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- สร้าง function สำหรับ increment_credit_balance
CREATE OR REPLACE FUNCTION public.increment_credit_balance(
    p_user_id uuid,
    p_amount numeric,
    p_transaction_type text DEFAULT 'topup',
    p_description text DEFAULT NULL,
    p_related_bill_number text DEFAULT NULL
)
RETURNS boolean AS $$
DECLARE
    v_updated boolean;
BEGIN
    UPDATE public.profiles 
    SET credit_balance = credit_balance + p_amount 
    WHERE id = p_user_id;
    
    v_updated := FOUND;
    
    IF v_updated THEN
        INSERT INTO public.credit_transactions (
            user_id,
            amount,
            transaction_type,
            description,
            related_bill_number
        ) VALUES (
            p_user_id,
            p_amount,
            p_transaction_type,
            p_description,
            p_related_bill_number
        );
    END IF;
    
    RETURN v_updated;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
