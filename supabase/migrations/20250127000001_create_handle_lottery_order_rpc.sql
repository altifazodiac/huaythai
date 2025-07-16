-- Create improved handle_lottery_order function with number cap support
-- This function replaces the previous handle_confirm_order and adds support for effective_prize_rate

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
    -- 1. Validate user exists and get credit balance
    SELECT credit_balance INTO current_credit 
    FROM public.profiles
    WHERE id = p_user_id;

    IF current_credit IS NULL THEN
        RAISE EXCEPTION 'User not found or no credit balance';
    END IF;

    IF current_credit < p_total_amount THEN
        RAISE EXCEPTION 'Insufficient credit balance. Current: %, Required: %', current_credit, p_total_amount;
    END IF;

    -- 2. Deduct credit from user account
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

    -- 4. Insert ticket items from the JSONB array
    FOR item IN SELECT * FROM jsonb_array_elements(p_ticket_items)
    LOOP
        -- Extract all fields from the item
        item_amount := (item->>'amount')::NUMERIC;
        item_original_amount := COALESCE((item->>'original_amount')::NUMERIC, item_amount);
        item_effective_prize_rate := (item->>'effective_prize_rate')::NUMERIC;
        item_number_cap_action := item->>'number_cap_action';
        item_number_cap_status := item->'number_cap_status';

        -- Validate required fields
        IF item_amount IS NULL OR item_amount <= 0 THEN
            RAISE EXCEPTION 'Invalid amount for ticket item: %', item;
        END IF;

        IF item_effective_prize_rate IS NULL OR item_effective_prize_rate <= 0 THEN
            RAISE EXCEPTION 'Invalid effective_prize_rate for ticket item: %', item;
        END IF;

        -- Insert the ticket item with number cap support
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
        'Lottery ticket purchase - ' || COALESCE(p_bill_name, 'Bill #' || p_bill_number), 
        p_bill_number
    );

    -- 6. Log successful transaction
    RAISE NOTICE 'Lottery order completed successfully. Bill: %, Amount: %, Items: %', 
        p_bill_number, p_total_amount, jsonb_array_length(p_ticket_items);

EXCEPTION
    WHEN OTHERS THEN
        -- Log error details
        RAISE EXCEPTION 'Error processing lottery order: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.handle_lottery_order TO authenticated;

-- Add comment to explain the function
COMMENT ON FUNCTION public.handle_lottery_order IS 'Process lottery ticket purchase with number cap support. Handles credit deduction, ticket creation, and transaction logging.';

-- Create a helper function to validate lottery order data
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
    -- Get user credit
    SELECT credit_balance INTO current_credit 
    FROM public.profiles
    WHERE id = p_user_id;

    -- Calculate total from items
    FOR item IN SELECT * FROM jsonb_array_elements(p_ticket_items)
    LOOP
        item_amount := (item->>'amount')::NUMERIC;
        calculated_total := calculated_total + item_amount;
    END LOOP;

    -- Build result
    result := jsonb_build_object(
        'valid', true,
        'current_credit', current_credit,
        'total_amount', p_total_amount,
        'calculated_total', calculated_total,
        'sufficient_credit', current_credit >= p_total_amount,
        'total_match', calculated_total = p_total_amount,
        'item_count', jsonb_array_length(p_ticket_items)
    );

    -- Add validation errors if any
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

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.validate_lottery_order_data TO authenticated; 