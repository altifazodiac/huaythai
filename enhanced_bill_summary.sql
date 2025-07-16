-- Enhanced Bill Summary Function
-- แก้ไขปัญหาการดึงข้อมูลประเภทหวยและจำนวนเลขในแท็บ "สรุปตามบิล"

-- 1. อัปเดต get_bill_summary function
CREATE OR REPLACE FUNCTION public.get_bill_summary(p_draw_date DATE DEFAULT NULL, p_lottery_type_id INTEGER DEFAULT NULL)
RETURNS TABLE (
    bill_number TEXT,
    draw_date DATE,
    user_name TEXT,
    sub_type_name TEXT,
    country_origin TEXT,
    lottery_type_detail TEXT,
    total_amount NUMERIC,
    total_payout NUMERIC,
    net_profit_loss NUMERIC,
    numbers_count BIGINT,
    items_count BIGINT,
    status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    WITH bill_details AS (
        SELECT 
            lt.bill_number,
            lt.draw_date,
            COALESCE(p.name, p.full_name, 'ไม่ระบุ') as user_name,
            lst.sub_type_name,
            lst.country_origin,
            lt.total_amount,
            lt.status,
            -- Calculate lottery type details with proper aggregation
            STRING_AGG(DISTINCT CONCAT(lsn.digit_number, ' ตัว', lsn.type_number), ', ') as lottery_type_detail,
            -- Count actual numbers in all items
            SUM(CASE 
                WHEN lti.numbers IS NOT NULL THEN array_length(lti.numbers, 1) 
                ELSE 0 
            END) as numbers_count,
            -- Count items
            COUNT(lti.id) as items_count
        FROM public.lottery_tickets lt
        LEFT JOIN public.profiles p ON lt.user_id = p.id
        LEFT JOIN public.lottery_ticket_items lti ON lt.id = lti.ticket_id
        LEFT JOIN public.lottery_sub_types lst ON lti.lottery_sub_type_id = lst.lottery_sub_type_id
        LEFT JOIN public.lottery_sub_number lsn ON lti.lottery_sub_number_id = lsn.id
        WHERE lt.status = 'confirmed'
        AND (p_draw_date IS NULL OR lt.draw_date = p_draw_date)
        AND (p_lottery_type_id IS NULL OR lst.lottery_sub_type_id = p_lottery_type_id)
        GROUP BY lt.bill_number, lt.draw_date, p.name, p.full_name, lst.sub_type_name, lst.country_origin, lt.total_amount, lt.status
    ),
    bill_winnings AS (
        SELECT 
            lt.bill_number,
            COALESCE(SUM(lw.winning_amount), 0) as payout_amount
        FROM public.lottery_tickets lt
        LEFT JOIN public.lottery_ticket_items lti ON lt.id = lti.ticket_id
        LEFT JOIN public.lottery_winnings lw ON lti.id = lw.ticket_item_id
        WHERE lt.status = 'confirmed'
        AND (p_draw_date IS NULL OR lt.draw_date = p_draw_date)
        AND (p_lottery_type_id IS NULL OR EXISTS (
            SELECT 1 FROM public.lottery_sub_types lst 
            WHERE lst.lottery_sub_type_id = lti.lottery_sub_type_id 
            AND lst.lottery_sub_type_id = p_lottery_type_id
        ))
        GROUP BY lt.bill_number
    )
    SELECT 
        bd.bill_number,
        bd.draw_date,
        bd.user_name,
        bd.sub_type_name,
        bd.country_origin,
        CASE 
            WHEN bd.lottery_type_detail IS NOT NULL THEN bd.lottery_type_detail
            ELSE 'ไม่ระบุ'
        END as lottery_type_detail,
        bd.total_amount,
        COALESCE(bw.payout_amount, 0) as total_payout,
        (bd.total_amount - COALESCE(bw.payout_amount, 0)) as net_profit_loss,
        bd.numbers_count,
        bd.items_count,
        bd.status
    FROM bill_details bd
    LEFT JOIN bill_winnings bw ON bd.bill_number = bw.bill_number
    ORDER BY bd.draw_date DESC, bd.bill_number;
END;
$$;

-- 2. สร้าง helper function สำหรับดึงข้อมูลรายละเอียดบิล
CREATE OR REPLACE FUNCTION public.get_bill_details_with_types(p_bill_number TEXT)
RETURNS TABLE (
    bill_number TEXT,
    item_id UUID,
    lottery_type TEXT,
    numbers TEXT[],
    numbers_count INTEGER,
    amount NUMERIC,
    price_paid NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        lt.bill_number,
        lti.id as item_id,
        CONCAT(lsn.digit_number, ' ตัว', lsn.type_number) as lottery_type,
        lti.numbers,
        CASE 
            WHEN lti.numbers IS NOT NULL THEN array_length(lti.numbers, 1)
            ELSE 0
        END as numbers_count,
        lti.amount,
        lsn.price_paid
    FROM public.lottery_tickets lt
    JOIN public.lottery_ticket_items lti ON lt.id = lti.ticket_id
    JOIN public.lottery_sub_number lsn ON lti.lottery_sub_number_id = lsn.id
    WHERE lt.bill_number = p_bill_number
    AND lt.status = 'confirmed'
    ORDER BY lti.id;
END;
$$;

-- 3. สร้าง function สำหรับดึงสถิติประเภทหวย
CREATE OR REPLACE FUNCTION public.get_lottery_type_stats(p_draw_date DATE DEFAULT NULL)
RETURNS TABLE (
    lottery_type TEXT,
    total_bills BIGINT,
    total_items BIGINT,
    total_numbers BIGINT,
    total_amount NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        CONCAT(lsn.digit_number, ' ตัว', lsn.type_number) as lottery_type,
        COUNT(DISTINCT lt.bill_number) as total_bills,
        COUNT(lti.id) as total_items,
        SUM(CASE 
            WHEN lti.numbers IS NOT NULL THEN array_length(lti.numbers, 1)
            ELSE 0
        END) as total_numbers,
        SUM(lti.amount) as total_amount
    FROM public.lottery_tickets lt
    JOIN public.lottery_ticket_items lti ON lt.id = lti.ticket_id
    JOIN public.lottery_sub_number lsn ON lti.lottery_sub_number_id = lsn.id
    WHERE lt.status = 'confirmed'
    AND (p_draw_date IS NULL OR lt.draw_date = p_draw_date)
    GROUP BY lsn.digit_number, lsn.type_number
    ORDER BY total_amount DESC;
END;
$$;

-- 4. อัปเดต permissions
GRANT EXECUTE ON FUNCTION public.get_bill_summary(DATE, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_bill_details_with_types(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_lottery_type_stats(DATE) TO authenticated;

-- 5. เพิ่ม indexes สำหรับ performance
CREATE INDEX IF NOT EXISTS idx_lottery_ticket_items_numbers_gin 
ON public.lottery_ticket_items USING GIN (numbers);

CREATE INDEX IF NOT EXISTS idx_lottery_tickets_bill_number_status 
ON public.lottery_tickets (bill_number, status);

CREATE INDEX IF NOT EXISTS idx_lottery_ticket_items_lottery_sub_number_id 
ON public.lottery_ticket_items (lottery_sub_number_id);

-- 6. Add comments
COMMENT ON FUNCTION public.get_bill_summary(DATE, INTEGER) IS 'ดึงข้อมูลสรุปบิลพร้อมรายละเอียดประเภทหวยและจำนวนเลขที่ถูกต้อง';
COMMENT ON FUNCTION public.get_bill_details_with_types(TEXT) IS 'ดึงรายละเอียดข้อมูลของบิลเฉพาะ';
COMMENT ON FUNCTION public.get_lottery_type_stats(DATE) IS 'ดึงสถิติประเภทหวยตามวันที่';

-- 7. Test queries
/*
-- ทดสอบ enhanced bill summary
SELECT * FROM get_bill_summary('2024-01-01', NULL) LIMIT 10;

-- ทดสอบ bill details
SELECT * FROM get_bill_details_with_types('BILL-20240101-001');

-- ทดสอบ lottery type stats
SELECT * FROM get_lottery_type_stats('2024-01-01');

-- ทดสอบการนับเลขที่ถูกต้อง
SELECT 
    bill_number,
    lottery_type_detail,
    numbers_count,
    items_count
FROM get_bill_summary('2024-01-01', NULL)
WHERE numbers_count > 0
ORDER BY numbers_count DESC;
*/