import { NextRequest, NextResponse } from 'next/server';
import { runScrapeTask, runSendTask } from '@/lib/task-runner';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { task_type, drawing_time, lottery_sub_type_id } = body;

    console.log(`[API] Running ${task_type} task...`);
    
    if (task_type === 'scrape') {
      const result = await runScrapeTask(drawing_time, lottery_sub_type_id);
      return NextResponse.json({
        success: true,
        message: 'Scrape task completed',
        ...result
      });
    } else if (task_type === 'send') {
      const result = await runSendTask(drawing_time, lottery_sub_type_id);
      return NextResponse.json({
        success: true,
        message: 'Send task completed',
        ...result
      });
    } else {
      return NextResponse.json({
        success: true,
        message: 'Cleanup task completed'
      });
    }

  } catch (error) {
    console.error('[API] Task runner error:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Task execution failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 