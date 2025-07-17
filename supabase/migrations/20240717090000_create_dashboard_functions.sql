-- Function to get dashboard summary
CREATE OR REPLACE FUNCTION get_dashboard_summary(
  start_date DATE,
  end_date DATE
)
RETURNS TABLE (
  total_users BIGINT,
  total_tickets BIGINT,
  total_sales NUMERIC,
  total_payouts NUMERIC,
  net_profit NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH 
  user_count AS (
    SELECT COUNT(DISTINCT user_id) as count
    FROM profiles
    WHERE created_at <= end_date
  ),
  ticket_stats AS (
    SELECT 
      COUNT(DISTINCT lt.id) as ticket_count,
      COALESCE(SUM(lt.total_amount), 0) as total_sales,
      COALESCE(SUM(
        CASE 
          WHEN lr.id IS NOT NULL THEN lr.payout_amount
          ELSE 0
        END
      ), 0) as total_payouts
    FROM lottery_tickets lt
    LEFT JOIN (
      SELECT 
        lti.ticket_id,
        SUM(lti.amount * lsn.price_paid) as payout_amount
      FROM lottery_ticket_items lti
      JOIN lottery_sub_number lsn ON lti.lottery_sub_number_id = lsn.id
      WHERE lti.is_winning = true
      GROUP BY lti.ticket_id
    ) lr ON lt.id = lr.ticket_id
    WHERE lt.status = 'confirmed'
    AND lt.created_at::DATE BETWEEN start_date AND end_date
  )
  SELECT 
    uc.count::BIGINT as total_users,
    ts.ticket_count::BIGINT as total_tickets,
    COALESCE(ts.total_sales, 0) as total_sales,
    COALESCE(ts.total_payouts, 0) as total_payouts,
    COALESCE(ts.total_sales, 0) - COALESCE(ts.total_payouts, 0) as net_profit
  FROM user_count uc, ticket_stats ts;
END;
$$;

-- Function to get daily summary
CREATE OR REPLACE FUNCTION get_daily_summary(
  start_date DATE,
  end_date DATE
)
RETURNS TABLE (
  date DATE,
  sales NUMERIC,
  payouts NUMERIC,
  profit NUMERIC,
  ticket_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    dates.date::DATE,
    COALESCE(ts.sales, 0) as sales,
    COALESCE(ts.payouts, 0) as payouts,
    COALESCE(ts.sales, 0) - COALESCE(ts.payouts, 0) as profit,
    COALESCE(ts.ticket_count, 0) as ticket_count
  FROM 
    generate_series(
      start_date, 
      end_date, 
      '1 day'::interval
    ) as dates(date)
  LEFT JOIN (
    SELECT 
      lt.created_at::DATE as date,
      SUM(lt.total_amount) as sales,
      SUM(
        CASE 
          WHEN lr.id IS NOT NULL THEN lr.payout_amount
          ELSE 0
        END
      ) as payouts,
      COUNT(DISTINCT lt.id) as ticket_count
    FROM lottery_tickets lt
    LEFT JOIN (
      SELECT 
        lti.ticket_id,
        SUM(lti.amount * lsn.price_paid) as payout_amount
      FROM lottery_ticket_items lti
      JOIN lottery_sub_number lsn ON lti.lottery_sub_number_id = lsn.id
      WHERE lti.is_winning = true
      GROUP BY lti.ticket_id
    ) lr ON lt.id = lr.ticket_id
    WHERE lt.status = 'confirmed'
    AND lt.created_at::DATE BETWEEN start_date AND end_date
    GROUP BY lt.created_at::DATE
  ) ts ON dates.date = ts.date
  ORDER BY dates.date;
END;
$$;

-- Function to get lottery type summary
CREATE OR REPLACE FUNCTION get_lottery_type_summary(
  start_date DATE,
  end_date DATE
)
RETURNS TABLE (
  id INTEGER,
  name TEXT,
  sales NUMERIC,
  payouts NUMERIC,
  profit NUMERIC,
  ticket_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    lst.id,
    lst.name,
    COALESCE(ts.sales, 0) as sales,
    COALESCE(ts.payouts, 0) as payouts,
    COALESCE(ts.sales, 0) - COALESCE(ts.payouts, 0) as profit,
    COALESCE(ts.ticket_count, 0) as ticket_count
  FROM lottery_sub_type lst
  LEFT JOIN (
    SELECT 
      lti.lottery_sub_type_id,
      SUM(lti.amount * lsn.price) as sales,
      SUM(
        CASE 
          WHEN lti.is_winning = true THEN lti.amount * lsn.price_paid
          ELSE 0
        END
      ) as payouts,
      COUNT(DISTINCT lt.id) as ticket_count
    FROM lottery_ticket_items lti
    JOIN lottery_sub_number lsn ON lti.lottery_sub_number_id = lsn.id
    JOIN lottery_tickets lt ON lti.ticket_id = lt.id
    WHERE lt.status = 'confirmed'
    AND lt.created_at::DATE BETWEEN start_date AND end_date
    GROUP BY lti.lottery_sub_type_id
  ) ts ON lst.id = ts.lottery_sub_type_id
  ORDER BY COALESCE(ts.sales, 0) DESC;
END;
$$;

-- Function to get top users
CREATE OR REPLACE FUNCTION get_top_users(
  start_date DATE,
  end_date DATE,
  limit_count INTEGER DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  email TEXT,
  ticket_count BIGINT,
  total_spent NUMERIC,
  total_won NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    COALESCE(p.full_name, p.email) as name,
    p.email,
    COALESCE(ut.ticket_count, 0) as ticket_count,
    COALESCE(ut.total_spent, 0) as total_spent,
    COALESCE(uw.total_won, 0) as total_won
  FROM profiles p
  LEFT JOIN (
    SELECT 
      lt.user_id,
      COUNT(DISTINCT lt.id) as ticket_count,
      SUM(lt.total_amount) as total_spent
    FROM lottery_tickets lt
    WHERE lt.status = 'confirmed'
    AND lt.created_at::DATE BETWEEN start_date AND end_date
    GROUP BY lt.user_id
  ) ut ON p.id = ut.user_id
  LEFT JOIN (
    SELECT 
      lt.user_id,
      SUM(lti.amount * lsn.price_paid) as total_won
    FROM lottery_ticket_items lti
    JOIN lottery_sub_number lsn ON lti.lottery_sub_number_id = lsn.id
    JOIN lottery_tickets lt ON lti.ticket_id = lt.id
    WHERE lti.is_winning = true
    AND lt.status = 'confirmed'
    AND lt.created_at::DATE BETWEEN start_date AND end_date
    GROUP BY lt.user_id
  ) uw ON p.id = uw.user_id
  WHERE ut.ticket_count IS NOT NULL
  ORDER BY COALESCE(ut.total_spent, 0) DESC
  LIMIT limit_count;
END;
$$;
