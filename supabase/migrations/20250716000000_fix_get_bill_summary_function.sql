-- Fix get_bill_summary function to properly count numbers and handle multiple lottery types
DROP FUNCTION IF EXISTS public.get_bill_summary(DATE, INTEGER);

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
    WITH ticket_summary AS (
        SELECT 
            lt.bill_number,
            lt.draw_date,
            lt.user_id,
            lt.total_amount,
            lt.status,
            -- Count total numbers across all items in each ticket
            COALESCE(SUM(array_length(lti.numbers, 1)), 0) as total_numbers,
            -- Aggregate unique sub types and countries
            string_agg(DISTINCT lst.sub_type_name, ', ' ORDER BY lst.sub_type_name) as sub_type_names,
            string_agg(DISTINCT lst.country_origin, ', ' ORDER BY lst.country_origin) as country_origins,
            -- Calculate total payout
            COALESCE(SUM(
                CASE 
                    WHEN lw.winning_amount IS NOT NULL THEN lw.winning_amount
                    ELSE 0
                END
            ), 0) as total_payout_amount
        FROM public.lottery_tickets lt
        LEFT JOIN public.lottery_ticket_items lti ON lt.id = lti.ticket_id
        LEFT JOIN public.lottery_sub_types lst ON lti.lottery_sub_type_id = lst.lottery_sub_type_id
        LEFT JOIN public.lottery_winnings lw ON lti.id = lw.ticket_item_id
        WHERE lt.status = 'confirmed'
        AND (p_draw_date IS NULL OR lt.draw_date = p_draw_date)
        AND (p_lottery_type_id IS NULL OR lst.lottery_sub_type_id = p_lottery_type_id)
        GROUP BY lt.bill_number, lt.draw_date, lt.user_id, lt.total_amount, lt.status
    )
    SELECT 
        ts.bill_number,
        ts.draw_date,
        COALESCE(p.name, p.full_name, 'ไม่ระบุ') as user_name,
        COALESCE(ts.sub_type_names, 'ไม่ระบุ') as sub_type_name,
        COALESCE(ts.country_origins, 'ไม่ระบุ') as country_origin,
        ts.total_amount,
        ts.total_payout_amount as total_payout,
        ts.total_amount - ts.total_payout_amount as net_profit_loss,
        ts.total_numbers as numbers_count,
        ts.status
    FROM ticket_summary ts
    LEFT JOIN public.profiles p ON ts.user_id = p.id
    ORDER BY ts.draw_date DESC, ts.bill_number;
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.get_bill_summary(DATE, INTEGER) TO authenticated;

-- Add comment explaining the fix
COMMENT ON FUNCTION public.get_bill_summary(DATE, INTEGER) IS 
'Fixed version that properly counts numbers and handles multiple lottery types per bill';