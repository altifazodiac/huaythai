-- Define a type for the ticket items to make the function signature cleaner
create type public.ticket_item_type as (
  lottery_sub_type_id bigint,
  lottery_sub_number_id bigint,
  numbers text[],
  amount numeric
);

-- Create the function
create or replace function public.handle_confirm_order(
  p_bill_number text,
  p_bill_name text,
  p_total_amount numeric,
  p_draw_date date,
  p_ticket_items public.ticket_item_type[]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_current_credit numeric;
  v_ticket_id bigint;
begin
  -- 1. Check user's credit balance
  select credit_balance into v_current_credit from profiles where id = v_user_id;

  if v_current_credit is null or v_current_credit < p_total_amount then
    raise exception 'Insufficient credit';
  end if;

  -- 2. Deduct credit and log transaction
  update profiles
  set credit_balance = credit_balance - p_total_amount
  where id = v_user_id;

  insert into credit_transactions(user_id, amount, transaction_type, description, related_bill_number)
  values (v_user_id, -p_total_amount, 'purchase', 'ซื้อหวย บิล ' || p_bill_number, p_bill_number);

  -- 3. Insert ticket
  insert into lottery_tickets(user_id, draw_date, bill_number, bill_name, total_amount, status)
  values (v_user_id, p_draw_date, p_bill_number, p_bill_name, p_total_amount, 'pending')
  returning id into v_ticket_id;

  if v_ticket_id is null then
    raise exception 'Failed to create ticket';
  end if;

  -- 4. Insert ticket items
  -- Use a loop to insert each item from the array
  for i in 1..array_length(p_ticket_items, 1) loop
    insert into lottery_ticket_items(ticket_id, lottery_sub_type_id, lottery_sub_number_id, numbers, amount)
    values (
      v_ticket_id,
      p_ticket_items[i].lottery_sub_type_id,
      p_ticket_items[i].lottery_sub_number_id,
      p_ticket_items[i].numbers,
      p_ticket_items[i].amount
    );
  end loop;

  -- 5. Update ticket status to confirmed
  update lottery_tickets
  set status = 'confirmed'
  where id = v_ticket_id;

exception
  when others then
    -- If any error occurs, the transaction will be rolled back automatically by PostgreSQL.
    -- We just re-raise the error.
    raise;
end;
$$; 