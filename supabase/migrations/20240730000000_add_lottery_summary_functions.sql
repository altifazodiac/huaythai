-- Create function to get daily lottery summary
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
  with daily_tickets as (
    select 
      lt.draw_date,
      count(distinct lt.id) as total_bills,
      count(lti.id) as total_numbers,
      sum(lt.total_amount) as total_purchase_amount
    from lottery_tickets lt
    left join lottery_ticket_items lti on lt.id = lti.ticket_id
    where lt.status = 'confirmed'
    group by lt.draw_date
  ),
  daily_winnings as (
    select 
      lt.draw_date,
      sum(
        case 
          when lr.id is not null then 
            case 
              when lsn.type_number = 'โต๊ด' then
                case when lti.numbers[1] = any(string_to_array(lr.winning_number, ',')) 
                     then lti.amount * lsn.price_paid 
                     else 0 end
              when lsn.type_number like 'วิ่ง%' then
                case when exists (
                  select 1 from unnest(string_to_array(lti.numbers[1], '')) as digit
                  where digit = any(string_to_array(lr.winning_number, ','))
                ) then lti.amount * lsn.price_paid 
                  else 0 end
              else 
                case when lti.numbers[1] = lr.winning_number 
                     then lti.amount * lsn.price_paid 
                     else 0 end
            end
          else 0
        end
      ) as total_payout
    from lottery_tickets lt
    left join lottery_ticket_items lti on lt.id = lti.ticket_id
    left join lottery_sub_number lsn on lti.lottery_sub_number_id = lsn.id
    left join lottery_results lr on (
      lti.lottery_sub_type_id = lr.lottery_sub_type_id 
      and lt.draw_date = lr.draw_date
      and lr.prize_code = concat(lsn.digit_number, ' ตัว', lsn.type_number)
    )
    where lt.status = 'confirmed'
    group by lt.draw_date
  )
  select 
    dt.draw_date,
    dt.total_bills,
    dt.total_numbers,
    dt.total_purchase_amount,
    coalesce(dw.total_payout, 0) as total_payout,
    (dt.total_purchase_amount - coalesce(dw.total_payout, 0)) as net_profit_loss
  from daily_tickets dt
  left join daily_winnings dw on dt.draw_date = dw.draw_date
  order by dt.draw_date desc;
end;
$$;

-- Create function to get lottery type summary
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
  with type_tickets as (
    select 
      lti.lottery_sub_type_id,
      lst.sub_type_name,
      lst.country_origin,
      count(distinct lt.id) as total_bills,
      count(lti.id) as total_numbers,
      sum(lt.total_amount) as total_purchase_amount
    from lottery_tickets lt
    left join lottery_ticket_items lti on lt.id = lti.ticket_id
    left join lottery_sub_types lst on lti.lottery_sub_type_id = lst.lottery_sub_type_id
    where lt.status = 'confirmed'
      and (p_draw_date is null or lt.draw_date = p_draw_date)
    group by lti.lottery_sub_type_id, lst.sub_type_name, lst.country_origin
  ),
  type_winnings as (
    select 
      lti.lottery_sub_type_id,
      sum(
        case 
          when lr.id is not null then 
            case 
              when lsn.type_number = 'โต๊ด' then
                case when lti.numbers[1] = any(string_to_array(lr.winning_number, ',')) 
                     then lti.amount * lsn.price_paid 
                     else 0 end
              when lsn.type_number like 'วิ่ง%' then
                case when exists (
                  select 1 from unnest(string_to_array(lti.numbers[1], '')) as digit
                  where digit = any(string_to_array(lr.winning_number, ','))
                ) then lti.amount * lsn.price_paid 
                  else 0 end
              else 
                case when lti.numbers[1] = lr.winning_number 
                     then lti.amount * lsn.price_paid 
                     else 0 end
            end
          else 0
        end
      ) as total_payout
    from lottery_tickets lt
    left join lottery_ticket_items lti on lt.id = lti.ticket_id
    left join lottery_sub_number lsn on lti.lottery_sub_number_id = lsn.id
    left join lottery_results lr on (
      lti.lottery_sub_type_id = lr.lottery_sub_type_id 
      and lt.draw_date = lr.draw_date
      and lr.prize_code = concat(lsn.digit_number, ' ตัว', lsn.type_number)
    )
    where lt.status = 'confirmed'
      and (p_draw_date is null or lt.draw_date = p_draw_date)
    group by lti.lottery_sub_type_id
  )
  select 
    tt.lottery_sub_type_id,
    tt.sub_type_name,
    tt.country_origin,
    tt.total_bills,
    tt.total_numbers,
    tt.total_purchase_amount,
    coalesce(tw.total_payout, 0) as total_payout,
    (tt.total_purchase_amount - coalesce(tw.total_payout, 0)) as net_profit_loss
  from type_tickets tt
  left join type_winnings tw on tt.lottery_sub_type_id = tw.lottery_sub_type_id
  order by tt.total_purchase_amount desc;
end;
$$;

-- Create function to get number details for a specific bill
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
    case 
      when lr.id is not null then 
        case 
          when lsn.type_number = 'โต๊ด' then
            lti.numbers[1] = any(string_to_array(lr.winning_number, ','))
          when lsn.type_number like 'วิ่ง%' then
            exists (
              select 1 from unnest(string_to_array(lti.numbers[1], '')) as digit
              where digit = any(string_to_array(lr.winning_number, ','))
            )
          else 
            lti.numbers[1] = lr.winning_number
        end
      else false
    end as is_winning,
    case 
      when lr.id is not null then 
        case 
          when lsn.type_number = 'โต๊ด' then
            case when lti.numbers[1] = any(string_to_array(lr.winning_number, ',')) 
                 then lti.amount * lsn.price_paid 
                 else 0 end
          when lsn.type_number like 'วิ่ง%' then
            case when exists (
              select 1 from unnest(string_to_array(lti.numbers[1], '')) as digit
              where digit = any(string_to_array(lr.winning_number, ','))
            ) then lti.amount * lsn.price_paid 
              else 0 end
          else 
            case when lti.numbers[1] = lr.winning_number 
                 then lti.amount * lsn.price_paid 
                 else 0 end
        end
      else 0
    end as payout_amount,
    lr.winning_number as winning_numbers
  from lottery_tickets lt
  left join lottery_ticket_items lti on lt.id = lti.ticket_id
  left join lottery_sub_number lsn on lti.lottery_sub_number_id = lsn.id
  left join lottery_results lr on (
    lti.lottery_sub_type_id = lr.lottery_sub_type_id 
    and lt.draw_date = lr.draw_date
    and lr.prize_code = concat(lsn.digit_number, ' ตัว', lsn.type_number)
  )
  where lt.status = 'confirmed'
    and (p_bill_number is null or lt.bill_number = p_bill_number)
  order by lti.id;
end;
$$;

-- Grant execute permissions to authenticated users
grant execute on function public.get_daily_lottery_summary() to authenticated;
grant execute on function public.get_lottery_type_summary(date) to authenticated;
grant execute on function public.get_number_details(character varying) to authenticated;