-- Add missing columns to lottery_tickets table
ALTER TABLE public.lottery_tickets 
ADD COLUMN IF NOT EXISTS close_time TEXT,
ADD COLUMN IF NOT EXISTS draw_time TEXT;

-- Update the handle_confirm_order function to support draw_time parameter and new columns
CREATE OR REPLACE FUNCTION public.handle_confirm_order(
    p_user_id uuid,
    p_bill_name text,
    p_bill_number text,
    p_draw_date date,
    p_draw_time text DEFAULT NULL,
    p_close_time text DEFAULT NULL,
    p_total_amount numeric,
    p_ticket_items jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_credit numeric;
    new_credit numeric;
    new_ticket_id uuid;
    item jsonb;
BEGIN
    -- 1. Check user's credit balance
    SELECT credit_balance INTO current_credit FROM public.profiles
    WHERE id = p_user_id;

    IF current_credit IS NULL OR current_credit < p_total_amount THEN
        RAISE EXCEPTION 'Insufficient credit';
    END IF;

    -- 2. Deduct credit
    new_credit := current_credit - p_total_amount;
    UPDATE public.profiles
    SET credit_balance = new_credit
    WHERE id = p_user_id;

    -- 3. Create a new lottery ticket
    INSERT INTO public.lottery_tickets (user_id, bill_name, bill_number, draw_date, draw_time, close_time, total_amount, status)
    VALUES (p_user_id, p_bill_name, p_bill_number, p_draw_date, p_draw_time, p_close_time, p_total_amount, 'confirmed')
    RETURNING id INTO new_ticket_id;

    -- 4. Insert ticket items from the JSONB array
    FOR item IN SELECT * FROM jsonb_array_elements(p_ticket_items)
    LOOP
        INSERT INTO public.lottery_ticket_items (
            ticket_id,
            lottery_sub_type_id,
            lottery_sub_number_id,
            numbers,
            amount
        )
        VALUES (
            new_ticket_id,
            (item->>'lottery_sub_type_id')::integer,
            (item->>'lottery_sub_number_id')::integer,
            ARRAY(SELECT jsonb_array_elements_text(item->'numbers')),
            (item->>'amount')::numeric
        );
    END LOOP;
    
    -- 5. Create a credit transaction log
    INSERT INTO public.credit_transactions (user_id, amount, transaction_type, description, related_bill_number)
    VALUES (p_user_id, -p_total_amount, 'purchase', 'Lottery purchase', p_bill_number);

END;
$$; 