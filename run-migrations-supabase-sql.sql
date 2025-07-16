-- =====================================================
-- Migration Script สำหรับระบบเลขอั้น (Number Cap System)
-- รันผ่าน Supabase Dashboard > SQL Editor
-- =====================================================

-- Migration 1: เพิ่มคอลัมน์ใหม่ในตาราง lottery_ticket_items
-- =====================================================

-- เพิ่มคอลัมน์ใหม่
ALTER TABLE public.lottery_ticket_items 
ADD COLUMN IF NOT EXISTS effective_prize_rate DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS original_amount DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS number_cap_status JSONB,
ADD COLUMN IF NOT EXISTS number_cap_action TEXT CHECK (number_cap_action IN ('half', 'close'));

-- อัปเดตข้อมูลเก่าให้มีค่าเริ่มต้น
UPDATE public.lottery_ticket_items 
SET 
    effective_prize_rate = lsn.price_paid,
    original_amount = amount,
    number_cap_status = NULL,
    number_cap_action = NULL
FROM public.lottery_sub_number lsn
WHERE lottery_ticket_items.lottery_sub_number_id = lsn.id
AND lottery_ticket_items.effective_prize_rate IS NULL;

-- สร้าง indexes สำหรับประสิทธิภาพ
CREATE INDEX IF NOT EXISTS idx_lottery_ticket_items_effective_prize_rate 
ON public.lottery_ticket_items(effective_prize_rate);

CREATE INDEX IF NOT EXISTS idx_lottery_ticket_items_number_cap_action 
ON public.lottery_ticket_items(number_cap_action);

-- เพิ่ม comment อธิบายคอลัมน์ใหม่
COMMENT ON COLUMN public.lottery_ticket_items.effective_prize_rate IS 'อัตราจ่ายรางวัลที่ปรับแล้วสำหรับเลขอั้น (actual prize rate after number cap adjustment)';
COMMENT ON COLUMN public.lottery_ticket_items.original_amount IS 'จำนวนเงินเดิมก่อนปรับเลขอั้น (original amount before number cap)';
COMMENT ON COLUMN public.lottery_ticket_items.number_cap_status IS 'สถานะเลขอั้นในรูปแบบ JSON (number cap status in JSON format)';
COMMENT ON COLUMN public.lottery_ticket_items.number_cap_action IS 'การดำเนินการเลขอั้น: half (หารครึ่ง) หรือ close (ปิดรับ)';

-- สร้างฟังก์ชันตรวจสอบข้อมูลเลขอั้น
CREATE OR REPLACE FUNCTION validate_number_cap_data()
RETURNS TRIGGER AS $$
BEGIN
    -- ถ้า number_cap_action เป็น 'half' ให้ตรวจสอบ effective_prize_rate
    IF NEW.number_cap_action = 'half' THEN
        IF NEW.effective_prize_rate IS NULL THEN
            RAISE EXCEPTION 'effective_prize_rate must be set when number_cap_action is half';
        END IF;
        
        -- ตรวจสอบ original_amount
        IF NEW.original_amount IS NULL THEN
            NEW.original_amount := NEW.amount;
        END IF;
    END IF;
    
    -- ถ้า number_cap_action เป็น 'close' ไม่ควร insert (จัดการใน application)
    IF NEW.number_cap_action = 'close' THEN
        RAISE EXCEPTION 'Numbers with close action should not be inserted';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- สร้าง trigger สำหรับตรวจสอบข้อมูล
DROP TRIGGER IF EXISTS validate_number_cap_trigger ON public.lottery_ticket_items;
CREATE TRIGGER validate_number_cap_trigger
    BEFORE INSERT OR UPDATE ON public.lottery_ticket_items
    FOR EACH ROW
    EXECUTE FUNCTION validate_number_cap_data();

-- ให้สิทธิ์ที่จำเป็น
GRANT SELECT, INSERT, UPDATE ON public.lottery_ticket_items TO authenticated;
GRANT USAGE ON SEQUENCE lottery_ticket_items_id_seq TO authenticated;

-- Migration 2: สร้าง RPC function ใหม่
-- =====================================================

-- สร้างฟังก์ชัน handle_lottery_order ที่ปรับปรุงแล้ว
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

        IF item_effective_prize_rate IS NULL OR item_effective_prize_rate <= 0 THEN
            RAISE EXCEPTION 'Invalid effective_prize_rate for ticket item: %', item;
        END IF;

        -- เพิ่ม ticket item พร้อมระบบเลขอั้น
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
        -- บันทึกรายละเอียด error
        RAISE EXCEPTION 'Error processing lottery order: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
END;
$$;

-- ให้สิทธิ์ execute สำหรับ authenticated users
GRANT EXECUTE ON FUNCTION public.handle_lottery_order TO authenticated;

-- เพิ่ม comment อธิบายฟังก์ชัน
COMMENT ON FUNCTION public.handle_lottery_order IS 'Process lottery ticket purchase with number cap support. Handles credit deduction, ticket creation, and transaction logging.';

-- สร้างฟังก์ชันช่วยตรวจสอบข้อมูล lottery order
CREATE OR REPLACE FUNCTION public.validate_lottery_order_data(
    p_user_id UUID,
    p_total_amount NUMERIC,
    p_ticket_items JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_credit NUMERIC;
    calculated_total NUMERIC := 0;
    item JSONB;
    item_amount NUMERIC;
    result JSONB;
BEGIN
    -- ดึงเครดิต user
    SELECT credit_balance INTO current_credit 
    FROM public.profiles
    WHERE id = p_user_id;

    -- คำนวณยอดรวมจาก items
    FOR item IN SELECT * FROM jsonb_array_elements(p_ticket_items)
    LOOP
        item_amount := (item->>'amount')::NUMERIC;
        calculated_total := calculated_total + item_amount;
    END LOOP;

    -- สร้างผลลัพธ์
    result := jsonb_build_object(
        'valid', true,
        'current_credit', current_credit,
        'total_amount', p_total_amount,
        'calculated_total', calculated_total,
        'sufficient_credit', current_credit >= p_total_amount,
        'total_match', calculated_total = p_total_amount,
        'item_count', jsonb_array_length(p_ticket_items)
    );

    -- เพิ่ม validation errors ถ้ามี
    IF current_credit IS NULL THEN
        result := jsonb_set(result, '{valid}', 'false');
        result := jsonb_set(result, '{error}', '"User not found"');
    ELSIF current_credit < p_total_amount THEN
        result := jsonb_set(result, '{valid}', 'false');
        result := jsonb_set(result, '{error}', '"Insufficient credit"');
    ELSIF calculated_total != p_total_amount THEN
        result := jsonb_set(result, '{valid}', 'false');
        result := jsonb_set(result, '{error}', '"Total amount mismatch"');
    END IF;

    RETURN result;
END;
$$;

-- ให้สิทธิ์ execute สำหรับ authenticated users
GRANT EXECUTE ON FUNCTION public.validate_lottery_order_data TO authenticated;

-- =====================================================
-- ตรวจสอบผลลัพธ์
-- =====================================================

-- ตรวจสอบคอลัมน์ใหม่
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'lottery_ticket_items' 
AND table_schema = 'public'
AND column_name IN ('effective_prize_rate', 'original_amount', 'number_cap_status', 'number_cap_action')
ORDER BY column_name;

-- ตรวจสอบ RPC function ใหม่
SELECT 
    routine_name,
    routine_type,
    data_type
FROM information_schema.routines 
WHERE routine_name = 'handle_lottery_order' 
AND routine_schema = 'public';

-- ตรวจสอบข้อมูลตัวอย่าง
SELECT 
    id,
    ticket_id,
    lottery_sub_type_id,
    lottery_sub_number_id,
    numbers,
    amount,
    original_amount,
    effective_prize_rate,
    number_cap_action,
    number_cap_status,
    created_at
FROM lottery_ticket_items 
ORDER BY created_at DESC 
LIMIT 5;

-- ตรวจสอบจำนวนรายการที่มีข้อมูลเลขอั้น
SELECT 
    COUNT(*) as total_items,
    COUNT(original_amount) as items_with_original_amount,
    COUNT(effective_prize_rate) as items_with_effective_prize_rate,
    COUNT(number_cap_action) as items_with_number_cap_action,
    COUNT(number_cap_status) as items_with_number_cap_status
FROM lottery_ticket_items;

-- ตรวจสอบรายการที่มี number_cap_action = 'half'
SELECT 
    id,
    ticket_id,
    numbers,
    amount,
    original_amount,
    effective_prize_rate,
    number_cap_action,
    number_cap_status,
    created_at
FROM lottery_ticket_items 
WHERE number_cap_action = 'half'
ORDER BY created_at DESC;

-- =====================================================
-- สรุป: Migration สำเร็จแล้ว!
-- =====================================================

-- ระบบเลขอั้นพร้อมใช้งานแล้ว:
-- 1. ✅ เพิ่มคอลัมน์ใหม่ในตาราง lottery_ticket_items
-- 2. ✅ สร้าง RPC function handle_lottery_order ใหม่
-- 3. ✅ อัปเดตข้อมูลเก่าให้มีค่าเริ่มต้น
-- 4. ✅ ระบบเลขอั้นพร้อมใช้งาน
--    - ลูกค้าจะจ่ายเต็มราคา
--    - เลขอั้นจะได้รับรางวัลครึ่งหนึ่ง
--    - ข้อมูลจะถูกบันทึกในคอลัมน์ใหม่ 