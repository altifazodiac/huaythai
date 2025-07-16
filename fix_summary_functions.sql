-- Fix Summary Functions
-- แก้ไขปัญหาการคำนวณยอดซื้อใน summary functions

-- 1. แก้ไข get_daily_lottery_summary function
CREATE OR REPLACE FUNCTION public.get_daily_lottery_summary()
RETURNS TABLE (
    draw_date DATE,
    total_bills BIGINT,
    total_numbers BIGINT,
    total_purchase_amount NUMERIC,
    total_payout NUMERIC,
    net_profit_loss NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        lt.draw_date,
        COUNT(DISTINCT lt.id) as total_bills,
        COUNT(lti.id) as total_numbers,
        -- ใช้ SUM(DISTINCT lt.total_amount) เพื่อหลีกเลี่ยงการคูณซ้ำ
        COALESCE(SUM(DISTINCT lt.total_amount), 0) as total_purchase_amount,
        COALESCE(SUM(
            CASE 
                WHEN lw.winning_amount IS NOT NULL THEN lw.winning_amount
                ELSE 0
            END
        ), 0) as total_payout,
        COALESCE(SUM(DISTINCT lt.total_amount), 0) - COALESCE(SUM(
            CASE 
                WHEN lw.winning_amount IS NOT NULL THEN lw.winning_amount
                ELSE 0
            END
        ), 0) as net_profit_loss
    FROM public.lottery_tickets lt
    LEFT JOIN public.lottery_ticket_items lti ON lt.id = lti.ticket_id
    LEFT JOIN public.lottery_winnings lw ON lti.id = lw.ticket_item_id
    WHERE lt.status = 'confirmed'
    GROUP BY lt.draw_date
    ORDER BY lt.draw_date DESC;
END;
$$;

-- 2. แก้ไข get_lottery_type_summary function
CREATE OR REPLACE FUNCTION public.get_lottery_type_summary(p_draw_date DATE DEFAULT NULL)
RETURNS TABLE (
    lottery_sub_type_id INTEGER,
    sub_type_name TEXT,
    country_origin TEXT,
    total_bills BIGINT,
    total_numbers BIGINT,
    total_purchase_amount NUMERIC,
    total_payout NUMERIC,
    net_profit_loss NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    WITH ticket_totals AS (
        SELECT 
            lst.lottery_sub_type_id,
            lst.sub_type_name,
            lst.country_origin,
            lt.id as ticket_id,
            lt.total_amount,
            COUNT(lti.id) as item_count
        FROM public.lottery_sub_types lst
        LEFT JOIN public.lottery_ticket_items lti ON lst.lottery_sub_type_id = lti.lottery_sub_type_id
        LEFT JOIN public.lottery_tickets lt ON lti.ticket_id = lt.id
        WHERE lt.status = 'confirmed'
        AND (p_draw_date IS NULL OR lt.draw_date = p_draw_date)
        GROUP BY lst.lottery_sub_type_id, lst.sub_type_name, lst.country_origin, lt.id, lt.total_amount
    )
    SELECT 
        tt.lottery_sub_type_id,
        tt.sub_type_name,
        tt.country_origin,
        COUNT(DISTINCT tt.ticket_id) as total_bills,
        SUM(tt.item_count) as total_numbers,
        -- ใช้ SUM(tt.total_amount) เพื่อรวมยอดตั๋วโดยไม่คูณซ้ำ
        COALESCE(SUM(tt.total_amount), 0) as total_purchase_amount,
        COALESCE(SUM(
            CASE 
                WHEN lw.winning_amount IS NOT NULL THEN lw.winning_amount
                ELSE 0
            END
        ), 0) as total_payout,
        COALESCE(SUM(tt.total_amount), 0) - COALESCE(SUM(
            CASE 
                WHEN lw.winning_amount IS NOT NULL THEN lw.winning_amount
                ELSE 0
            END
        ), 0) as net_profit_loss
    FROM ticket_totals tt
    LEFT JOIN public.lottery_ticket_items lti ON tt.ticket_id = lti.ticket_id AND tt.lottery_sub_type_id = lti.lottery_sub_type_id
    LEFT JOIN public.lottery_winnings lw ON lti.id = lw.ticket_item_id
    GROUP BY tt.lottery_sub_type_id, tt.sub_type_name, tt.country_origin
    ORDER BY total_purchase_amount DESC;
END;
$$;

-- 3. แก้ไข get_bill_summary function ให้ใช้ field ที่ถูกต้อง
CREATE OR REPLACE FUNCTION public.get_bill_summary(p_draw_date DATE DEFAULT NULL, p_lottery_type_id INTEGER DEFAULT NULL)
RETURNS TABLE (
    bill_number TEXT,
    draw_date DATE,
    user_name TEXT,
    sub_type_name TEXT,
    country_origin TEXT,
    total_amount NUMERIC,
    total_payout NUMERIC,
    net_profit_loss NUMERIC,
    numbers_count BIGINT,
    status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        lt.bill_number,
        lt.draw_date,
        -- ใช้ COALESCE เพื่อจัดการ null values
        COALESCE(p.name, p.full_name, 'ไม่ระบุ') as user_name,
        COALESCE(lst.sub_type_name, 'ไม่ระบุ') as sub_type_name,
        COALESCE(lst.country_origin, 'ไม่ระบุ') as country_origin,
        lt.total_amount,
        COALESCE(SUM(
            CASE 
                WHEN lw.winning_amount IS NOT NULL THEN lw.winning_amount
                ELSE 0
            END
        ), 0) as total_payout,
        lt.total_amount - COALESCE(SUM(
            CASE 
                WHEN lw.winning_amount IS NOT NULL THEN lw.winning_amount
                ELSE 0
            END
        ), 0) as net_profit_loss,
        COUNT(lti.id) as numbers_count,
        lt.status
    FROM public.lottery_tickets lt
    LEFT JOIN public.profiles p ON lt.user_id = p.id
    LEFT JOIN public.lottery_ticket_items lti ON lt.id = lti.ticket_id
    LEFT JOIN public.lottery_sub_types lst ON lti.lottery_sub_type_id = lst.lottery_sub_type_id
    LEFT JOIN public.lottery_winnings lw ON lti.id = lw.ticket_item_id
    WHERE lt.status = 'confirmed'
    AND (p_draw_date IS NULL OR lt.draw_date = p_draw_date)
    AND (p_lottery_type_id IS NULL OR lst.lottery_sub_type_id = p_lottery_type_id)
    GROUP BY lt.bill_number, lt.draw_date, p.name, p.full_name, lst.sub_type_name, lst.country_origin, lt.total_amount, lt.status
    ORDER BY lt.draw_date DESC, lt.bill_number;
END;
$$;

-- 4. แก้ไข get_number_details function
CREATE OR REPLACE FUNCTION public.get_number_details(p_bill_number TEXT DEFAULT NULL)
RETURNS TABLE (
    id UUID,
    bill_number TEXT,
    lottery_type_name TEXT,
    digit_number INTEGER,
    type_number TEXT,
    numbers TEXT[],
    amount NUMERIC,
    price_paid NUMERIC,
    is_winning BOOLEAN,
    payout_amount NUMERIC,
    winning_numbers TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        lti.id,
        lt.bill_number,
        CONCAT(lsn.digit_number, ' ตัว', lsn.type_number) as lottery_type_name,
        lsn.digit_number,
        lsn.type_number,
        lti.numbers,
        lti.amount,
        lsn.price_paid,
        CASE WHEN lw.winning_amount IS NOT NULL AND lw.winning_amount > 0 THEN TRUE ELSE FALSE END as is_winning,
        COALESCE(lw.winning_amount, 0) as payout_amount,
        lr.winning_number as winning_numbers
    FROM public.lottery_ticket_items lti
    JOIN public.lottery_tickets lt ON lti.ticket_id = lt.id
    JOIN public.lottery_sub_types lst ON lti.lottery_sub_type_id = lst.lottery_sub_type_id
    JOIN public.lottery_sub_number lsn ON lti.lottery_sub_number_id = lsn.id
    LEFT JOIN public.lottery_winnings lw ON lti.id = lw.ticket_item_id
    LEFT JOIN public.lottery_results lr ON (
        lst.lottery_sub_type_id = lr.lottery_sub_type_id 
        AND lt.draw_date = lr.draw_date
        AND lr.prize_code = CONCAT(lsn.digit_number, ' ตัว', lsn.type_number)
    )
    WHERE lt.status = 'confirmed'
    AND (p_bill_number IS NULL OR lt.bill_number = p_bill_number)
    ORDER BY lt.bill_number, lti.id;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_daily_lottery_summary() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_lottery_type_summary(DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_bill_summary(DATE, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_number_details(TEXT) TO authenticated;

-- Add comments
COMMENT ON FUNCTION public.get_daily_lottery_summary() IS 'แก้ไขปัญหาการคำนวณยอดซื้อที่คูณซ้ำ - ใช้ SUM(DISTINCT total_amount)';
COMMENT ON FUNCTION public.get_lottery_type_summary(DATE) IS 'แก้ไขปัญหาการคำนวณยอดซื้อใน lottery type summary';
COMMENT ON FUNCTION public.get_bill_summary(DATE, INTEGER) IS 'แก้ไขปัญหา user_name field และการคำนวณยอดซื้อ';
COMMENT ON FUNCTION public.get_number_details(TEXT) IS 'แก้ไขปัญหาการแสดงผลรายละเอียดเลข';