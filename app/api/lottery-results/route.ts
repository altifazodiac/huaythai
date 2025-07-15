import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const runtime = "nodejs"

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: results, error } = await supabase
      .from('lottery_api_results')
      .select('id, created_at, draw_date, country, lottery_name, results, source_url, draw_time')
      .order('draw_date', { ascending: false })
      .order('draw_time', { ascending: false });

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({
        status: 'warning',
        setupNeeded: true,
        message: 'Database tables not found. Please setup the database first.'
      })
    }

    return NextResponse.json({
      status: 'success',
      data: results
    })

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({
      status: 'error',
      message: 'Internal server error'
    }, { status: 500 })
  }
}
