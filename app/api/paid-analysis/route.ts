import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const lotteryTypeId = searchParams.get('lotteryTypeId');

    if (!date) {
      return NextResponse.json({ error: 'Date parameter is required' }, { status: 400 });
    }

    const supabase = createRouteHandlerClient({ cookies });

    // Check if user is authenticated and has admin role
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has admin role
    const { data: userRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (!userRole || userRole.role !== 'admin') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Build the analysis query
    let query = `
      WITH number_analysis AS (
        SELECT 
          unnest(lti.numbers) as number,
          lst.sub_type_name,
          lst.country_origin,
          lsn.name as number_type,
          lsn.type_number,
          lsn.price_paid,
          SUM(lti.amount) as total_amount,
          COUNT(*) as total_count,
          SUM(lti.amount * lsn.price_paid) as potential_payout
        FROM lottery_tickets lt
        JOIN lottery_ticket_items lti ON lt.id = lti.ticket_id
        JOIN lottery_sub_types lst ON lti.lottery_sub_type_id = lst.lottery_sub_type_id
        JOIN lottery_sub_number lsn ON lti.lottery_sub_number_id = lsn.id
        WHERE lt.deleted_at IS NULL
          AND lt.draw_date = $1
    `;

    const params = [date];

    if (lotteryTypeId && lotteryTypeId !== 'all') {
      query += ` AND lst.lottery_sub_type_id = $2`;
      params.push(lotteryTypeId);
    }

    query += `
        GROUP BY unnest(lti.numbers), lst.sub_type_name, lst.country_origin, lsn.name, lsn.type_number, lsn.price_paid
      )
      SELECT 
        ROW_NUMBER() OVER (ORDER BY total_amount DESC) as rank,
        number,
        sub_type_name as lottery_type,
        total_amount,
        total_count,
        potential_payout,
        CASE 
          WHEN potential_payout > 10000 THEN 'สูงมาก'
          WHEN potential_payout > 5000 THEN 'สูง'
          WHEN potential_payout > 1000 THEN 'ปานกลาง'
          ELSE 'ต่ำ'
        END as risk_level
      FROM number_analysis
      ORDER BY total_amount DESC
      LIMIT 100
    `;

    const { data, error } = await supabase.rpc('exec_sql', { 
      sql_query: query,
      params: params 
    });

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    return NextResponse.json({ data });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 