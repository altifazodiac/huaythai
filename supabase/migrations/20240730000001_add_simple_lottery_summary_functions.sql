-- Create simple function to get daily lottery summary (without winning calculations)
create or replace function public.get_daily_lottery_summary()
returns table (
    draw_date date,
    total_bills bigint,
    total_numbers bigint,
    total_purchase_amount numeric,
    total_payout numeric,
    net_profit_loss numeric
)
language plpgsql
security definer
as $$
begin
  return query
  select 
    lt.draw_date,
    count(distinct lt.id) as total_bills,
    count(lti.id) as total_numbers,
    sum(lt.total_amount) as total_purchase_amount,
    0 as total_payout, -- Placeholder for now
    sum(lt.total_amount) as net_profit_loss -- Placeholder for now
  from lottery_tickets lt
  left join lottery_ticket_items lti on lt.id = lti.ticket_id
  where lt.status = 'confirmed'
  group by lt.draw_date
  order by lt.draw_date desc;
end;
$$;

-- Create simple function to get lottery type summary (without winning calculations)
create or replace function public.get_lottery_type_summary(p_draw_date date default null)
returns table (
    lottery_sub_type_id integer,
    sub_type_name character varying,
    country_origin character varying,
    total_bills bigint,
    total_numbers bigint,
    total_purchase_amount numeric,
    total_payout numeric,
    net_profit_loss numeric
)
language plpgsql
security definer
as $$
begin
  return query
  select 
    lti.lottery_sub_type_id,
    lst.sub_type_name,
    lst.country_origin,
    count(distinct lt.id) as total_bills,
    count(lti.id) as total_numbers,
    sum(lt.total_amount) as total_purchase_amount,
    0 as total_payout, -- Placeholder for now
    sum(lt.total_amount) as net_profit_loss -- Placeholder for now
  from lottery_tickets lt
  left join lottery_ticket_items lti on lt.id = lti.ticket_id
  left join lottery_sub_types lst on lti.lottery_sub_type_id = lst.lottery_sub_type_id
  where lt.status = 'confirmed'
    and (p_draw_date is null or lt.draw_date = p_draw_date)
  group by lti.lottery_sub_type_id, lst.sub_type_name, lst.country_origin
  order by sum(lt.total_amount) desc;
end;
$$;

-- Create simple function to get number details for a specific bill
create or replace function public.get_number_details(p_bill_number character varying default null)
returns table (
    id uuid,
    bill_number character varying,
    lottery_type_name text,
    digit_number integer,
    type_number character varying,
    numbers text[],
    amount numeric,
    price_paid numeric,
    is_winning boolean,
    payout_amount numeric,
    winning_numbers text
)
language plpgsql
security definer
as $$
begin
  return query
  select 
    lti.id,
    lt.bill_number,
    concat(lsn.digit_number, ' ตัว', lsn.type_number) as lottery_type_name,
    lsn.digit_number,
    lsn.type_number,
    lti.numbers,
    lti.amount,
    lsn.price_paid,
    false as is_winning, -- Placeholder for now
    0 as payout_amount, -- Placeholder for now
    null as winning_numbers -- Placeholder for now
  from lottery_tickets lt
  left join lottery_ticket_items lti on lt.id = lti.ticket_id
  left join lottery_sub_number lsn on lti.lottery_sub_number_id = lsn.id
  where lt.status = 'confirmed'
    and (p_bill_number is null or lt.bill_number = p_bill_number)
  order by lti.id;
end;
$$;

-- Grant execute permissions to authenticated users
grant execute on function public.get_daily_lottery_summary() to authenticated;
grant execute on function public.get_lottery_type_summary(date) to authenticated;
grant execute on function public.get_number_details(character varying) to authenticated;