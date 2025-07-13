-- Create the handle_lottery_order function that the React code is calling
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
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_credit NUMERIC;
    new_credit NUMERIC;
    new_ticket_id UUID;
    item JSONB;
    item_numbers TEXT[];
BEGIN
    -- 1. Check user's credit balance
    SELECT credit_balance INTO current_credit 
    FROM public.profiles
    WHERE id = p_user_id;

    IF current_credit IS NULL OR current_credit < p_total_amount THEN
        RAISE EXCEPTION 'Error processing lottery order: insufficient credit balance';
    END IF;

    -- 2. Deduct credit
    new_credit := current_credit - p_total_amount;
    UPDATE public.profiles
    SET credit_balance = new_credit
    WHERE id = p_user_id;

    -- 3. Create a new lottery ticket
    INSERT INTO public.lottery_tickets (
        user_id, 
        bill_name, 
        bill_number, 
        draw_date, 
        total_amount, 
        status
    )
    VALUES (
        p_user_id, 
        p_bill_name, 
        p_bill_number, 
        p_draw_date, 
        p_total_amount, 
        'confirmed'
    )
    RETURNING id INTO new_ticket_id;

    -- 4. Insert ticket items from the JSONB array
    FOR item IN SELECT * FROM jsonb_array_elements(p_ticket_items)
    LOOP
        -- Extract numbers array from the item
        SELECT ARRAY(SELECT jsonb_array_elements_text(item->'numbers')) INTO item_numbers;
        
        INSERT INTO public.lottery_ticket_items (
            ticket_id,
            lottery_sub_type_id,
            lottery_sub_number_id,
            numbers,
            amount
        )
        VALUES (
            new_ticket_id,
            (item->>'lottery_sub_type_id')::INTEGER,
            (item->>'lottery_sub_number_id')::INTEGER,
            item_numbers,
            (item->>'amount')::NUMERIC
        );
    END LOOP;
    
    -- 5. Create a credit transaction log
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
        'Lottery purchase for bill: ' || p_bill_number, 
        p_bill_number
    );

END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.handle_lottery_order(UUID, TEXT, TEXT, DATE, TIME, TIME, NUMERIC, JSONB) TO authenticated; 