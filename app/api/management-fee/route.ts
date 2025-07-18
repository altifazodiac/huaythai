import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    console.log('API: Starting GET request');
    
    const supabase = createRouteHandlerClient({ cookies });
    console.log('API: Supabase client created');
    
    // ตรวจสอบ authentication
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    console.log('API: Auth check result:', { user: !!user, userError });
    
    if (userError || !user) {
      console.log('API: No authenticated user');
      return NextResponse.json({ 
        error: 'Authentication required',
        details: userError?.message || 'No user found'
      }, { status: 401 });
    }
    
    // ดึงข้อมูลรอบการคำนวณโดยตรงจากตาราง
    const { data: cycles, error: cyclesError } = await supabase
      .from('management_fee_cycles')
      .select('*')
      .order('cycle_number', { ascending: false });
    
    console.log('API: Cycles query result:', { cycles: cycles?.length, cyclesError });
    
    if (cyclesError) {
      console.error('API: Cycles fetch error:', cyclesError);
      return NextResponse.json({ 
        error: 'Failed to fetch cycles',
        details: cyclesError.message 
      }, { status: 500 });
    }

    // ดึงการตั้งค่า
    const { data: settings, error: settingsError } = await supabase
      .from('management_fee_scheduler_settings')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1);
    
    console.log('API: Settings query result:', { settings: settings?.length, settingsError });
    
    if (settingsError) {
      console.error('API: Settings fetch error:', settingsError);
      // ไม่ return error เพราะ settings อาจไม่มี
    }

    return NextResponse.json({
      cycles: cycles || [],
      settings: settings?.[0] || null
    });

  } catch (error) {
    console.error('API: Error in GET request:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('API: Starting POST request');
    
    const supabase = createRouteHandlerClient({ cookies });
    
    // ตรวจสอบ authentication
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    console.log('API: Auth check result:', { user: !!user, userError });
    
    if (userError || !user) {
      console.log('API: No authenticated user');
      return NextResponse.json({ 
        error: 'Authentication required',
        details: userError?.message || 'No user found'
      }, { status: 401 });
    }
    
    const body = await request.json();
    const { action, ...params } = body;
    
    console.log('API: POST body:', { action, params });

    switch (action) {
      case 'create_cycle':
        console.log('API: Creating new cycle...');
        const { data: cycleId, error: createError } = await supabase.rpc('auto_create_management_fee_cycle');
        if (createError) {
          console.error('API: Create cycle error:', createError);
          return NextResponse.json({ 
            error: 'Failed to create cycle',
            details: createError.message 
          }, { status: 500 });
        }
        console.log('API: Cycle created successfully:', cycleId);
        return NextResponse.json({ cycleId });

      case 'mark_paid':
        const { cycle_id } = params;
        console.log('API: Marking cycle as paid:', cycle_id);
        const { error: updateError } = await supabase
          .from('management_fee_cycles')
          .update({ 
            is_paid: true, 
            paid_at: new Date().toISOString() 
          })
          .eq('id', cycle_id);
        if (updateError) {
          console.error('API: Mark paid error:', updateError);
          return NextResponse.json({ 
            error: 'Failed to mark cycle as paid',
            details: updateError.message 
          }, { status: 500 });
        }
        console.log('API: Cycle marked as paid successfully');
        return NextResponse.json({ success: true });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

  } catch (error) {
    console.error('API: Error in POST request:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 