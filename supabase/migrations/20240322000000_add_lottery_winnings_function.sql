-- Drop existing trigger and function if they exist
DROP TRIGGER IF EXISTS process_winning_tickets_after_results ON public.lottery_results;
DROP FUNCTION IF EXISTS public.trigger_process_winning_tickets();
DROP FUNCTION IF EXISTS public.process_winning_tickets(UUID);
DROP FUNCTION IF EXISTS public.handle_lottery_winnings(UUID, UUID, DECIMAL);

-- Create function to handle lottery winnings
CREATE OR REPLACE FUNCTION public.handle_lottery_winnings(
    p_ticket_item_id UUID,
    p_draw_id UUID,
    p_winning_amount DECIMAL(10,2)
)
RETURNS UUID AS $$
DECLARE
    v_winning_id UUID;
BEGIN
    -- Insert the winning record
    INSERT INTO public.lottery_winnings (
        ticket_item_id,
        draw_id,
        winning_amount,
        status
    ) VALUES (
        p_ticket_item_id,
        p_draw_id,
        p_winning_amount,
        'pending'
    )
    RETURNING id INTO v_winning_id;

    RETURN v_winning_id;
END;
$$ LANGUAGE plpgsql;

-- Create function to process winning tickets
CREATE OR REPLACE FUNCTION public.process_winning_tickets(
    p_draw_id UUID
)
RETURNS void AS $$
DECLARE
    v_ticket_item RECORD;
    v_winning_numbers TEXT[];
    v_winning_amount DECIMAL(10,2);
BEGIN
    -- Get all ticket items for the draw date
    FOR v_ticket_item IN 
        SELECT 
            lti.id as ticket_item_id,
            lti.numbers,
            lti.amount,
            lti.lottery_sub_type_id,
            lti.ticket_id,
            lst.multiplication_factor
        FROM public.lottery_ticket_items lti
        JOIN public.lottery_tickets lt ON lt.id = lti.ticket_id
        JOIN public.lottery_sub_types lst ON lst.lottery_sub_type_id = lti.lottery_sub_type_id
        WHERE lt.draw_date = (
            SELECT draw_date 
            FROM public.lottery_draws 
            WHERE id = p_draw_id
        )
    LOOP
        -- Get winning numbers for this ticket's sub type
        SELECT winning_numbers INTO v_winning_numbers
        FROM public.lottery_results
        WHERE draw_id = p_draw_id
        AND lottery_sub_type_id = v_ticket_item.lottery_sub_type_id;

        -- Calculate winning amount based on matches
        v_winning_amount := 0;
        IF v_winning_numbers IS NOT NULL THEN
            -- Check for matches and calculate amount
            -- This is a simplified version - you may need to adjust the logic
            -- based on your specific lottery rules
            IF v_ticket_item.numbers && v_winning_numbers THEN
                v_winning_amount := v_ticket_item.amount * v_ticket_item.multiplication_factor;
            END IF;
        END IF;

        -- If there are winnings, create a winning record
        IF v_winning_amount > 0 THEN
            PERFORM public.handle_lottery_winnings(
                v_ticket_item.ticket_item_id,
                p_draw_id,
                v_winning_amount
            );
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to process winning tickets after results are inserted
CREATE OR REPLACE FUNCTION public.trigger_process_winning_tickets()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM public.process_winning_tickets(NEW.draw_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER process_winning_tickets_after_results
    AFTER INSERT ON public.lottery_results
    FOR EACH ROW
    EXECUTE FUNCTION public.trigger_process_winning_tickets(); 