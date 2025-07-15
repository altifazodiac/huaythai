-- Create RPC functions for lottery summary data
-- These functions provide consistent data access for the summary page

-- Create function to get daily lottery summary
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
        COALESCE(SUM(lti.amount), 0) as total_purchase_amount,
        COALESCE(SUM(
            CASE 
                WHEN lw.winning_amount IS NOT NULL THEN lw.winning_amount
                ELSE 0
            END
        ), 0) as total_payout,
        COALESCE(SUM(lti.amount), 0) - COALESCE(SUM(
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

-- Create function to get lottery type summary
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
    SELECT 
        lst.lottery_sub_type_id,
        lst.sub_type_name,
        lst.country_origin,
        COUNT(DISTINCT lt.id) as total_bills,
        COUNT(lti.id) as total_numbers,
        COALESCE(SUM(lti.amount), 0) as total_purchase_amount,
        COALESCE(SUM(
            CASE 
                WHEN lw.winning_amount IS NOT NULL THEN lw.winning_amount
                ELSE 0
            END
        ), 0) as total_payout,
        COALESCE(SUM(lti.amount), 0) - COALESCE(SUM(
            CASE 
                WHEN lw.winning_amount IS NOT NULL THEN lw.winning_amount
                ELSE 0
            END
        ), 0) as net_profit_loss
    FROM public.lottery_sub_types lst
    LEFT JOIN public.lottery_ticket_items lti ON lst.lottery_sub_type_id = lti.lottery_sub_type_id
    LEFT JOIN public.lottery_tickets lt ON lti.ticket_id = lt.id
    LEFT JOIN public.lottery_winnings lw ON lti.id = lw.ticket_item_id
    WHERE lt.status = 'confirmed'
    AND (p_draw_date IS NULL OR lt.draw_date = p_draw_date)
    GROUP BY lst.lottery_sub_type_id, lst.sub_type_name, lst.country_origin
    ORDER BY total_purchase_amount DESC;
END;
$$;

-- Create function to get bill summary
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
        p.full_name as user_name,
        lst.sub_type_name,
        lst.country_origin,
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
    GROUP BY lt.bill_number, lt.draw_date, p.full_name, lst.sub_type_name, lst.country_origin, lt.total_amount, lt.status
    ORDER BY lt.draw_date DESC, lt.bill_number;
END;
$$;

-- Create function to get number details
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
        lst.sub_type_name as lottery_type_name,
        lsn.digit_number,
        lsn.type_number,
        lti.numbers,
        lti.amount,
        lsn.price_paid,
        CASE WHEN lw.winning_amount IS NOT NULL THEN TRUE ELSE FALSE END as is_winning,
        COALESCE(lw.winning_amount, 0) as payout_amount,
        lr.winning_number as winning_numbers
    FROM public.lottery_ticket_items lti
    JOIN public.lottery_tickets lt ON lti.ticket_id = lt.id
    JOIN public.lottery_sub_types lst ON lti.lottery_sub_type_id = lst.lottery_sub_type_id
    JOIN public.lottery_sub_number lsn ON lti.lottery_sub_number_id = lsn.id
    LEFT JOIN public.lottery_winnings lw ON lti.id = lw.ticket_item_id
    LEFT JOIN public.lottery_results lr ON lst.lottery_sub_type_id = lr.lottery_sub_type_id 
        AND lt.draw_date = lr.draw_date
    WHERE (p_bill_number IS NULL OR lt.bill_number = p_bill_number)
    ORDER BY lt.bill_number, lti.id;
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.get_daily_lottery_summary() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_lottery_type_summary(DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_bill_summary(DATE, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_number_details(TEXT) TO authenticated; 