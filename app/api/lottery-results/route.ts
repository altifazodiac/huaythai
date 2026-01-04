import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const runtime = "nodejs"

// Cache configuration
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes
let cache: { data: unknown; timestamp: number } | null = null

export async function GET(request: Request) {
  try {
    // Check cache first
    if (cache && Date.now() - cache.timestamp < CACHE_DURATION) {
      return NextResponse.json({
        status: 'success',
        data: cache.data,
        cached: true
      })
    }

    const supabase = await createClient()

    // Parse query params for filtering
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '100')
    const country = searchParams.get('country')
    const lotteryName = searchParams.get('lottery_name')

    let query = supabase
      .from('lottery_api_results')
      .select('id, created_at, draw_date, country, lottery_name, results, source_url, draw_time')
      .order('draw_date', { ascending: false })
      .order('draw_time', { ascending: false })
      .limit(limit)

    // Apply filters if provided
    if (country) {
      query = query.eq('country', country)
    }
    if (lotteryName) {
      query = query.eq('lottery_name', lotteryName)
    }

    const { data: results, error } = await query

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({
        status: 'error',
        message: 'Database error: ' + error.message,
        setupNeeded: error.code === '42P01' // Table doesn't exist
      }, { status: error.code === '42P01' ? 404 : 500 })
    }

    // Update cache (only for unfiltered requests)
    if (!country && !lotteryName) {
      cache = { data: results, timestamp: Date.now() }
    }

    return NextResponse.json({
      status: 'success',
      data: results,
      count: results?.length || 0
    })

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 })
  }
}

// Clear cache endpoint (POST)
export async function POST(request: Request) {
  try {
    const { action } = await request.json()
    
    if (action === 'clear_cache') {
      cache = null
      return NextResponse.json({
        status: 'success',
        message: 'Cache cleared'
      })
    }

    return NextResponse.json({
      status: 'error',
      message: 'Invalid action'
    }, { status: 400 })

  } catch (error) {
    return NextResponse.json({
      status: 'error',
      message: 'Invalid request'
    }, { status: 400 })
  }
}
