-- Create a function to get bill summary information
create or replace function public.get_bill_summary(
    p_draw_date date default null,
    p_lottery_type_id integer default null
)
returns table (
    bill_number character varying,
    draw_date date,
    user_name text,
    sub_type_name character varying,
    country_origin character varying,
    total_amount numeric,
    total_payout numeric,
    net_profit_loss numeric,
    total_numbers bigint,
    status character varying
)
language plpgsql
security definer
as $$
begin
  return query
  with bill_tickets as (
    select 
      lt.bill_number,
      lt.draw_date,
      p.name as user_name,
      lst.sub_type_name,
      lst.country_origin,
      lt.total_amount,
      lt.status::text as status,
      count(lti.id) as numbers_count
    from lottery_tickets lt
    left join profiles p on lt.user_id = p.id
    left join lottery_ticket_items lti on lt.id = lti.ticket_id
    left join lottery_sub_types lst on lti.lottery_sub_type_id = lst.lottery_sub_type_id
    where lt.status = 'confirmed'
      and (p_draw_date is null or lt.draw_date = p_draw_date)
      and (p_lottery_type_id is null or lti.lottery_sub_type_id = p_lottery_type_id)
    group by lt.bill_number, lt.draw_date, p.name, lst.sub_type_name, lst.country_origin, lt.total_amount, lt.status
  ),
  bill_winnings as (
    select 
      lt.bill_number,
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
      ) as payout_amount
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
      and (p_lottery_type_id is null or lti.lottery_sub_type_id = p_lottery_type_id)
    group by lt.bill_number
  )
  select 
    bt.bill_number,
    bt.draw_date,
    bt.user_name,
    bt.sub_type_name,
    bt.country_origin,
    bt.total_amount,
    coalesce(bw.payout_amount, 0) as total_payout,
    (bt.total_amount - coalesce(bw.payout_amount, 0)) as net_profit_loss,
    bt.numbers_count,
    bt.status
  from bill_tickets bt
  left join bill_winnings bw on bt.bill_number = bw.bill_number
  order by bt.draw_date desc, bt.total_amount desc;
end;
$$;

-- Grant execute permission to authenticated users
grant execute on function public.get_bill_summary(date, integer) to authenticated;
