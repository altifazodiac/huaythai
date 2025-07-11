import { createClient } from '@supabase/supabase-js';
import { formatInTimeZone } from 'date-fns-tz';
import 'dotenv/config';

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
  schedule_id?: number;
  lottery_sub_type_id?: number;
}

class TaskScheduler {
  private isRunning = false;
  private checkInterval: NodeJS.Timeout | null = null;
  private readonly API_KEY = process.env.INTERNAL_API_KEY || 'internal';
  private readonly BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  constructor() {
    console.log('🚀 TaskScheduler initialized');
  }

  async start() {
    if (this.isRunning) {
      console.log('⚠️ TaskScheduler is already running');
      return;
    }

    this.isRunning = true;
    console.log('✅ TaskScheduler started');
    
    // เริ่มต้นการตรวจสอบ tasks
    this.checkTasks();
    
    // ตั้งเวลาตรวจสอบทุก 30 วินาที
    this.checkInterval = setInterval(() => {
      this.checkTasks();
    }, 30000);
  }

  async stop() {
    if (!this.isRunning) {
      console.log('⚠️ TaskScheduler is not running');
      return;
    }

    this.isRunning = false;
    
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    
    console.log('🛑 TaskScheduler stopped');
  }

  private async checkTasks() {
    try {
      const timeZone = 'Asia/Bangkok';
      const now = new Date();
      const currentTime = formatInTimeZone(now, timeZone, 'yyyy-MM-dd HH:mm:ss');
      
      // ดึง tasks ที่ถึงเวลารัน
      const { data: tasks, error } = await supabase
        .from('scheduled_tasks')
        .select('*')
        .eq('status', 'pending')
        .lte('next_run', currentTime);
      
      if (error) {
        console.error('❌ Error fetching tasks:', error);
        return;
      }

      if (!tasks || tasks.length === 0) {
        console.log(`📋 No tasks to run at ${currentTime}`);
        return;
      }

      console.log(`🔄 Found ${tasks.length} tasks to run`);
      
      // รัน tasks
      for (const task of tasks) {
        await this.executeTask(task);
      }
      
    } catch (error) {
      console.error('❌ Error in checkTasks:', error);
    }
  }

  private async executeTask(task: ScheduledTask) {
    try {
      console.log(`🚀 Executing task: ${task.name} (${task.type})`);
      
      // อัปเดตสถานะเป็น running
      await supabase
        .from('scheduled_tasks')
        .update({ 
          status: 'running',
          last_run: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', task.id);

      let success = false;
      let errorMessage = '';

      try {
        switch (task.type) {
          case 'scrape':
            success = await this.executeScrapeTask(task);
            break;
          case 'send':
            success = await this.executeSendTask(task);
            break;
          case 'cleanup':
            success = await this.executeCleanupTask(task);
            break;
        }
      } catch (error) {
        success = false;
        errorMessage = error instanceof Error ? error.message : 'Unknown error';
      }

      // อัปเดตสถานะ
      const newStatus = success ? 'completed' : 'failed';
      
      await supabase
        .from('scheduled_tasks')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', task.id);

      // บันทึก log
      await supabase
        .from('task_logs')
        .insert({
          task_id: task.id,
          task_name: task.name,
          task_type: task.type,
          status: newStatus,
          error_message: errorMessage || null,
          execution_time: new Date().toISOString()
        });

      console.log(`${success ? '✅' : '❌'} Task ${task.name} ${newStatus}`);
      
    } catch (error) {
      console.error(`❌ Error executing task ${task.name}:`, error);
    }
  }

  private async executeScrapeTask(task: ScheduledTask): Promise<boolean> {
    try {
      const response = await fetch(`${this.BASE_URL}/api/import-lottery-results`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.API_KEY
        },
        body: JSON.stringify({
          drawing_time: task.drawing_time,
          lottery_sub_type_id: task.lottery_sub_type_id,
          action: 'scrape_and_import'
        })
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${result.error || 'Unknown error'}`);
      }

      console.log(`✅ Scrape task completed: ${result.message}`);
      return true;
      
    } catch (error) {
      console.error('❌ Scrape task failed:', error);
      return false;
    }
  }

  private async executeSendTask(task: ScheduledTask): Promise<boolean> {
    try {
      const response = await fetch(`${this.BASE_URL}/api/send-lottery-results`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.API_KEY
        },
        body: JSON.stringify({
          drawing_time: task.drawing_time,
          lottery_sub_type_id: task.lottery_sub_type_id
        })
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${result.error || 'Unknown error'}`);
      }

      console.log(`✅ Send task completed: ${result.message}`);
      return true;
      
    } catch (error) {
      console.error('❌ Send task failed:', error);
      return false;
    }
  }

  private async executeCleanupTask(task: ScheduledTask): Promise<boolean> {
    try {
      // เรียกใช้ function ที่เราสร้างไว้
      const { error } = await supabase.rpc('cleanup_old_task_logs');
      
      if (error) {
        throw new Error(`Cleanup failed: ${error.message}`);
      }

      console.log('✅ Cleanup task completed');
      return true;
      
    } catch (error) {
      console.error('❌ Cleanup task failed:', error);
      return false;
    }
  }
}

// สร้าง instance และเริ่มต้น
const scheduler = new TaskScheduler();

// จัดการการปิดโปรแกรม
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down TaskScheduler...');
  await scheduler.stop();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Shutting down TaskScheduler...');
  await scheduler.stop();
  process.exit(0);
});

// เริ่มต้น scheduler
scheduler.start();

export default scheduler; 