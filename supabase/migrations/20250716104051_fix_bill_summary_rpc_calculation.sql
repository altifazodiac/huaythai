-- Update get_bill_summary to correctly calculate total_amount based on filters
DROP FUNCTION IF EXISTS public.get_bill_summary(date, integer);

CREATE OR REPLACE FUNCTION public.get_bill_summary(
    p_draw_date DATE DEFAULT NULL,
    p_lottery_type_id INTEGER DEFAULT NULL
)
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
AS $$
BEGIN
    RETURN QUERY
    WITH filtered_items AS (
        -- First, filter the lottery_ticket_items based on the lottery type ID if provided.
        -- This is the crucial step to ensure calculations are based only on relevant data.
        SELECT 
            lti.ticket_id,
            lti.lottery_sub_type_id,
            lti.id,
            lti.amount
        FROM public.lottery_ticket_items lti
        WHERE (p_lottery_type_id IS NULL OR lti.lottery_sub_type_id = p_lottery_type_id)
    ),
    bill_calcs AS (
        -- Now, calculate aggregates based on the filtered items.
        SELECT 
            fi.ticket_id,
            COALESCE(SUM(fi.amount), 0) as calculated_total_amount,
            COUNT(fi.id) as calculated_numbers_count,
            -- Also aggregate winnings for the filtered items
            COALESCE(SUM(lw.winning_amount), 0) as calculated_total_payout
        FROM filtered_items fi
        LEFT JOIN public.lottery_winnings lw ON fi.id = lw.ticket_item_id
        GROUP BY fi.ticket_id
    )
    -- Finally, join everything together
    SELECT 
        lt.bill_number,
        lt.draw_date,
        p.full_name as user_name,
        -- To avoid issues with multiple sub-types, we get the name from one of the filtered items.
        (SELECT lst.sub_type_name FROM public.lottery_sub_types lst 
         JOIN filtered_items fi_sub ON lst.lottery_sub_type_id = fi_sub.lottery_sub_type_id
         WHERE fi_sub.ticket_id = lt.id LIMIT 1) as sub_type_name,
        (SELECT lst.country_origin FROM public.lottery_sub_types lst
         JOIN filtered_items fi_sub ON lst.lottery_sub_type_id = fi_sub.lottery_sub_type_id
         WHERE fi_sub.ticket_id = lt.id LIMIT 1) as country_origin,
        
        bc.calculated_total_amount as total_amount,
        bc.calculated_total_payout as total_payout,
        (bc.calculated_total_amount - bc.calculated_total_payout) as net_profit_loss,
        bc.calculated_numbers_count as numbers_count,
        lt.status
    FROM public.lottery_tickets lt
    JOIN bill_calcs bc ON lt.id = bc.ticket_id
    LEFT JOIN public.profiles p ON lt.user_id = p.id
    WHERE 
        lt.status = 'confirmed'
        -- The primary date filter on the main tickets table
        AND (p_draw_date IS NULL OR lt.draw_date = p_draw_date)
        -- Ensure that we only include bills that have items after filtering
        AND bc.calculated_numbers_count > 0 
    ORDER BY lt.draw_date DESC, lt.created_at DESC;
END;
$$;
