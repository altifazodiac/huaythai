import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { format, addMinutes, parseISO } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface ScheduledTask {
  id: string;
  name: string;
  type: 'scrape' | 'send' | 'cleanup';
  scheduled_time: string;
  drawing_time: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  last_run?: string;
  next_run: string;
  created_at: string;
  updated_at: string;
}

interface DrawingSchedule {
  schedule_id: number;
  drawing_time: string;
  lottery_sub_type_id: number;
  created_at: string;
}

const TIMEZONE = 'Asia/Bangkok';

class TaskScheduler {
  private isRunning = false;
  private taskInterval: NodeJS.Timeout | null = null;

  async initialize() {
    console.log('🚀 Initializing Task Scheduler...');
    
    // สร้างตารางสำหรับ scheduled tasks ถ้ายังไม่มี
    await this.createScheduledTasksTable();
    
    // อัปเดต scheduled tasks จากตาราง drawing_schedules
    await this.updateScheduledTasks();
    
    console.log('✅ Task Scheduler initialized successfully');
  }

  private async createScheduledTasksTable() {
    const { error } = await supabase.from('scheduled_tasks').select('id').limit(1);
    
    if (error && error.code === 'PGRST116') {
      // ตารางไม่มี สร้างใหม่
      await supabase.rpc('create_scheduled_tasks_table');
    }
  }

  private async updateScheduledTasks() {
    console.log('📅 Updating scheduled tasks from drawing_schedules...');
    
    // ดึงข้อมูล drawing schedules
    const { data: drawingSchedules, error } = await supabase
      .from('drawing_schedules')
      .select('*')
      .not('drawing_time', 'is', null)
      .order('drawing_time');

    if (error) {
      console.error('Error fetching drawing schedules:', error);
      return;
    }

    if (!drawingSchedules || drawingSchedules.length === 0) {
      console.log('No drawing schedules found');
      return;
    }

    const now = new Date();
    const currentTime = formatInTimeZone(now, TIMEZONE, 'yyyy-MM-dd HH:mm:ss');
    
    // ลบ scheduled tasks เก่าที่ไม่ใช้แล้ว
    await supabase.from('scheduled_tasks').delete().lt('next_run', currentTime);

    // สร้าง scheduled tasks ใหม่
    const tasksToCreate: any[] = [];

    for (const schedule of drawingSchedules) {
      const drawingTime = schedule.drawing_time;
      const [hour, minute] = drawingTime.split(':').map(Number);
      
      // คำนวณเวลาสำหรับ scrape (หลังจากเวลาออกหวย 1 นาที)
      const scrapeTime = addMinutes(new Date(2024, 0, 1, hour, minute), 1);
      const scrapeTimeStr = format(scrapeTime, 'HH:mm:ss');
      
      // คำนวณเวลาสำหรับ send (หลังจากเวลาออกหวย 3 นาที)
      const sendTime = addMinutes(new Date(2024, 0, 1, hour, minute), 3);
      const sendTimeStr = format(sendTime, 'HH:mm:ss');

      // คำนวณ next_run สำหรับวันนี้และพรุ่งนี้
      const today = formatInTimeZone(now, TIMEZONE, 'yyyy-MM-dd');
      const tomorrow = formatInTimeZone(addMinutes(now, 24 * 60), TIMEZONE, 'yyyy-MM-dd');
      
      const todayScrapeNext = `${today} ${scrapeTimeStr}`;
      const tomorrowScrapeNext = `${tomorrow} ${scrapeTimeStr}`;
      const todaySendNext = `${today} ${sendTimeStr}`;
      const tomorrowSendNext = `${tomorrow} ${sendTimeStr}`;

      // สร้าง scrape task
      tasksToCreate.push({
        id: `scrape_${schedule.schedule_id}_${drawingTime.replace(':', '')}`,
        name: `Scrape lottery results for ${drawingTime}`,
        type: 'scrape',
        scheduled_time: scrapeTimeStr,
        drawing_time: drawingTime,
        status: 'pending',
        next_run: todayScrapeNext > currentTime ? todayScrapeNext : tomorrowScrapeNext,
        schedule_id: schedule.schedule_id,
        lottery_sub_type_id: schedule.lottery_sub_type_id
      });

      // สร้าง send task
      tasksToCreate.push({
        id: `send_${schedule.schedule_id}_${drawingTime.replace(':', '')}`,
        name: `Send lottery results for ${drawingTime}`,
        type: 'send',
        scheduled_time: sendTimeStr,
        drawing_time: drawingTime,
        status: 'pending',
        next_run: todaySendNext > currentTime ? todaySendNext : tomorrowSendNext,
        schedule_id: schedule.schedule_id,
        lottery_sub_type_id: schedule.lottery_sub_type_id
      });
    }

    // เพิ่ม cleanup task (ทุกวันเวลา 00:30)
    const cleanupNext = formatInTimeZone(addMinutes(now, 24 * 60), TIMEZONE, 'yyyy-MM-dd') + ' 00:30:00';
    tasksToCreate.push({
      id: 'cleanup_daily',
      name: 'Daily cleanup task',
      type: 'cleanup',
      scheduled_time: '00:30:00',
      drawing_time: '00:00:00',
      status: 'pending',
      next_run: cleanupNext
    });

    // Upsert scheduled tasks
    const { error: upsertError } = await supabase
      .from('scheduled_tasks')
      .upsert(tasksToCreate, { onConflict: 'id' });

    if (upsertError) {
      console.error('Error upserting scheduled tasks:', upsertError);
    } else {
      console.log(`✅ Created/updated ${tasksToCreate.length} scheduled tasks`);
    }
  }

  async processPendingTasks() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    console.log('🔄 Processing pending tasks...');

    try {
      const currentTime = formatInTimeZone(new Date(), TIMEZONE, 'yyyy-MM-dd HH:mm:ss');
      
      // ดึง pending tasks ที่ถึงเวลาแล้ว
      const { data: pendingTasks, error } = await supabase
        .from('scheduled_tasks')
        .select('*')
        .eq('status', 'pending')
        .lte('next_run', currentTime)
        .order('next_run');

      if (error) {
        console.error('Error fetching pending tasks:', error);
        return;
      }

      if (!pendingTasks || pendingTasks.length === 0) {
        console.log('No pending tasks to process');
        return;
      }

      console.log(`Found ${pendingTasks.length} pending tasks to process`);

      // ประมวลผลแต่ละ task
      for (const task of pendingTasks) {
        try {
          console.log(`🔄 Processing task: ${task.name}`);
          
          // อัปเดตสถานะเป็น running
          await this.updateTaskStatus(task.id, 'running');

          // ประมวลผล task ตามประเภท
          let success = false;
          switch (task.type) {
            case 'scrape':
              success = await this.processScrapeTask(task);
              break;
            case 'send':
              success = await this.processSendTask(task);
              break;
            case 'cleanup':
              success = await this.processCleanupTask(task);
              break;
          }

          // อัปเดตสถานะและเวลาถัดไป
          await this.updateTaskAfterExecution(task, success);
          
          console.log(`✅ Task ${task.name} completed successfully`);
        } catch (error) {
          console.error(`❌ Error processing task ${task.name}:`, error);
          await this.updateTaskStatus(task.id, 'failed');
        }
      }
    } catch (error) {
      console.error('Error processing pending tasks:', error);
    } finally {
      this.isRunning = false;
    }
  }

  private async processScrapeTask(task: any): Promise<boolean> {
    console.log(`🔍 Processing scrape task for ${task.drawing_time}`);
    
    // เรียก import-lottery-results logic
    const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/import-lottery-results`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.INTERNAL_API_KEY || 'internal'
      },
      body: JSON.stringify({
        drawing_time: task.drawing_time,
        lottery_sub_type_id: task.lottery_sub_type_id
      })
    });

    return response.ok;
  }

  private async processSendTask(task: any): Promise<boolean> {
    console.log(`📤 Processing send task for ${task.drawing_time}`);
    
    // เรียก send-lottery-results logic
    const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/send-lottery-results`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.INTERNAL_API_KEY || 'internal'
      },
      body: JSON.stringify({
        drawing_time: task.drawing_time,
        lottery_sub_type_id: task.lottery_sub_type_id
      })
    });

    return response.ok;
  }

  private async processCleanupTask(task: any): Promise<boolean> {
    console.log('🧹 Processing cleanup task');
    
    // ทำความสะอาดข้อมูลเก่า
    const yesterday = formatInTimeZone(
      addMinutes(new Date(), -24 * 60), 
      TIMEZONE, 
      'yyyy-MM-dd'
    );

    // ลบ scheduled tasks เก่า
    await supabase
      .from('scheduled_tasks')
      .delete()
      .lt('next_run', yesterday + ' 00:00:00');

    // ลบ logs เก่า (ถ้ามี)
    await supabase
      .from('task_logs')
      .delete()
      .lt('created_at', yesterday + ' 00:00:00');

    return true;
  }

  private async updateTaskStatus(taskId: string, status: string) {
    const { error } = await supabase
      .from('scheduled_tasks')
      .update({ 
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', taskId);

    if (error) {
      console.error(`Error updating task status:`, error);
    }
  }

  private async updateTaskAfterExecution(task: any, success: boolean) {
    const status = success ? 'completed' : 'failed';
    const now = new Date();
    
    // คำนวณเวลาถัดไป (วันต่อไป)
    const nextRunDate = addMinutes(now, 24 * 60);
    const nextRun = formatInTimeZone(nextRunDate, TIMEZONE, 'yyyy-MM-dd') + ' ' + task.scheduled_time;

    const { error } = await supabase
      .from('scheduled_tasks')
      .update({
        status: 'pending', // รีเซ็ตเป็น pending สำหรับรอบถัดไป
        last_run: now.toISOString(),
        next_run: nextRun,
        updated_at: now.toISOString()
      })
      .eq('id', task.id);

    if (error) {
      console.error(`Error updating task after execution:`, error);
    }

    // บันทึก log
    await this.logTaskExecution(task, status, success ? null : 'Task execution failed');
  }

  private async logTaskExecution(task: any, status: string, error?: string) {
    const { error: logError } = await supabase
      .from('task_logs')
      .insert({
        task_id: task.id,
        task_name: task.name,
        task_type: task.type,
        status,
        error_message: error,
        execution_time: new Date().toISOString()
      });

    if (logError) {
      console.error('Error logging task execution:', logError);
    }
  }

  startScheduler() {
    console.log('🚀 Starting task scheduler...');
    
    // ตรวจสอบ pending tasks ทุก 30 วินาที
    this.taskInterval = setInterval(async () => {
      await this.processPendingTasks();
    }, 30000);

    // ตรวจสอบและอัปเดต scheduled tasks ทุก 1 ชั่วโมง
    setInterval(async () => {
      await this.updateScheduledTasks();
    }, 60 * 60 * 1000);

    console.log('✅ Task scheduler started successfully');
  }

  stopScheduler() {
    if (this.taskInterval) {
      clearInterval(this.taskInterval);
      this.taskInterval = null;
    }
    console.log('🛑 Task scheduler stopped');
  }
}

// Global task scheduler instance
let taskScheduler: TaskScheduler | null = null;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'status';

    switch (action) {
      case 'init':
        if (!taskScheduler) {
          taskScheduler = new TaskScheduler();
          await taskScheduler.initialize();
          taskScheduler.startScheduler();
        }
        return NextResponse.json({ 
          message: 'Task scheduler initialized successfully',
          status: 'running'
        });

      case 'status':
        const { data: tasks } = await supabase
          .from('scheduled_tasks')
          .select('*')
          .order('next_run');

        const { data: logs } = await supabase
          .from('task_logs')
          .select('*')
          .order('execution_time', { ascending: false })
          .limit(10);

        return NextResponse.json({
          status: taskScheduler ? 'running' : 'stopped',
          tasks: tasks || [],
          recentLogs: logs || []
        });

      case 'stop':
        if (taskScheduler) {
          taskScheduler.stopScheduler();
          taskScheduler = null;
        }
        return NextResponse.json({ message: 'Task scheduler stopped' });

      case 'process':
        if (!taskScheduler) {
          return NextResponse.json({ error: 'Task scheduler not initialized' }, { status: 400 });
        }
        await taskScheduler.processPendingTasks();
        return NextResponse.json({ message: 'Pending tasks processed' });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error in scheduler API:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    if (!taskScheduler) {
      taskScheduler = new TaskScheduler();
      await taskScheduler.initialize();
      taskScheduler.startScheduler();
    }

    switch (action) {
      case 'update_schedules':
        await taskScheduler.updateScheduledTasks();
        return NextResponse.json({ message: 'Scheduled tasks updated successfully' });

      case 'run_task':
        const { taskId } = body;
        if (!taskId) {
          return NextResponse.json({ error: 'Task ID required' }, { status: 400 });
        }
        
        // ดึงข้อมูล task
        const { data: task } = await supabase
          .from('scheduled_tasks')
          .select('*')
          .eq('id', taskId)
          .single();

        if (!task) {
          return NextResponse.json({ error: 'Task not found' }, { status: 404 });
        }

        // รัน task ทันที
        await taskScheduler.processPendingTasks();
        
        return NextResponse.json({ message: 'Task executed successfully' });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error in scheduler POST API:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 