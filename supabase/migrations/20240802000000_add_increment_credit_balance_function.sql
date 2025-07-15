-- Migration: Add increment_credit_balance function for atomic credit topup
create or replace function increment_credit_balance(user_id uuid, amount numeric)
returns void as $$
begin
  update profiles set credit_balance = credit_balance + amount where id = user_id;
end;
$$ language plpgsql; 