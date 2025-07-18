import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // ตรวจสอบ API key หรือ token สำหรับ cron job
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    // ตรวจสอบ token (สามารถปรับแต่งตามความต้องการ)
    if (token !== process.env.CRON_SECRET_KEY) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // ตรวจสอบและสร้างรอบใหม่
    const { data: cycleId, error } = await supabase.rpc('check_and_create_management_fee_cycle');
    
    if (error) {
      console.error('Error in management fee cron job:', error);
      return NextResponse.json({ 
        success: false, 
        error: error.message,
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      cycleId,
      message: cycleId ? 'New cycle created' : 'No new cycle needed',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in management fee cron job:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// สำหรับการทดสอบ
export async function GET() {
  return NextResponse.json({
    message: 'Management fee cron job endpoint',
    usage: 'POST with Bearer token',
    timestamp: new Date().toISOString()
  });
} 