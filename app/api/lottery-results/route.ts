import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const runtime = "nodejs"

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! // หรือใช้ anon key ถ้าไม่ต้องการสิทธิ์สูง
    );

    const { data: results, error } = await supabase
      .from('lottery_results')
      .select(`
        *,
        ticket_sub_types (*),
        lottery_draws (*)
      `)
      .order('created_at', { ascending: false })

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
