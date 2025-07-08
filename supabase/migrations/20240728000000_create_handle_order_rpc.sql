create or replace function public.handle_confirm_order(
    p_user_id uuid,
    p_bill_name text,
    p_bill_number text,
    p_draw_date date,
    p_close_time text,
    p_total_amount numeric,
    p_ticket_items jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
    current_credit numeric;
    new_credit numeric;
    new_ticket_id uuid;
    item jsonb;
begin
    -- 1. Check user's credit balance
    select credit_balance into current_credit from public.profiles
    where id = p_user_id;

    if current_credit is null or current_credit < p_total_amount then
        raise exception 'Insufficient credit';
    end if;

    -- 2. Deduct credit
    new_credit := current_credit - p_total_amount;
    update public.profiles
    set credit_balance = new_credit
    where id = p_user_id;

    -- 3. Create a new lottery ticket
    insert into public.lottery_tickets (user_id, bill_name, bill_number, draw_date, close_time, total_amount, status)
    values (p_user_id, p_bill_name, p_bill_number, p_draw_date, p_close_time, p_total_amount, 'confirmed')
    returning id into new_ticket_id;

    -- 4. Insert ticket items from the JSONB array
    for item in select * from jsonb_array_elements(p_ticket_items)
    loop
        insert into public.lottery_ticket_items (
            ticket_id,
            lottery_sub_type_id,
            lottery_sub_number_id,
            numbers,
            amount
        )
        values (
            new_ticket_id,
            (item->>'lottery_sub_type_id')::integer,
            (item->>'lottery_sub_number_id')::integer,
            (select array_agg(elem::text) from jsonb_array_elements_text(item->'numbers')),
            (item->>'amount')::numeric
        );
    end loop;
    
    -- 5. Create a credit transaction log
    insert into public.credit_transactions (user_id, amount, transaction_type, description, related_bill_number)
    values (p_user_id, -p_total_amount, 'purchase', 'Lottery purchase', p_bill_number);

end;
$$; 