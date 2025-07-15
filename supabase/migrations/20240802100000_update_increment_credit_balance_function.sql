-- Migration: Update increment_credit_balance to return the new balance
drop function if exists increment_credit_balance(uuid, numeric);

create or replace function increment_credit_balance(p_user_id uuid, p_amount numeric)
returns numeric as $$
declare
  new_balance numeric;
begin
  update profiles 
  set credit_balance = credit_balance + p_amount 
  where id = p_user_id
  returning credit_balance into new_balance;
  
  return new_balance;
end;
$$ language plpgsql; 