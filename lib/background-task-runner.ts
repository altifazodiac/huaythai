import { createClient } from '@supabase/supabase-js';
import { runScrapeTask, runSendTask } from './task-runner';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ฟังก์ชันสำหรับรัน task ใน background
export async function runTaskInBackground(
  taskId: string,
  taskType: string,
  drawingTime?: string,
  lotterySubTypeId?: number
) {
  try {
    console.log(`[Background] Starting ${taskType} task for ${taskId}`);
    
    // อัปเดตสถานะเป็น running
    await supabase
      .from('scheduled_tasks')
      .update({
        status: 'running',
        last_run: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', taskId);
    
    let result;
    
    // รัน task ตาม type
    if (taskType === 'scrape') {
      result = await runScrapeTask(drawingTime, lotterySubTypeId);
      console.log(`[Background] Scrape completed: ${result.scrapedCount} scraped, ${result.importedCount} imported`);
    } else if (taskType === 'send') {
      result = await runSendTask(drawingTime, lotterySubTypeId);
      console.log(`[Background] Send completed: ${result.sentCount} sent`);
    } else {
      console.log(`[Background] Cleanup task completed`);
    }
    
    // อัปเดตสถานะเป็น completed
    await supabase
      .from('scheduled_tasks')
      .update({
        status: 'completed',
        updated_at: new Date().toISOString()
      })
      .eq('id', taskId);
    
    // บันทึก log
    await supabase
      .from('task_logs')
      .insert({
        task_id: taskId,
        task_name: `${taskType} task`,
        task_type: taskType,
        status: 'completed',
        execution_time: new Date().toISOString()
      });
    
    console.log(`[Background] Task ${taskId} completed successfully`);
    
  } catch (error) {
    console.error(`[Background] Task ${taskId} failed:`, error);
    
    // อัปเดตสถานะเป็น failed
    await supabase
      .from('scheduled_tasks')
      .update({
        status: 'failed',
        updated_at: new Date().toISOString()
      })
      .eq('id', taskId);
    
    // บันทึก error log
    await supabase
      .from('task_logs')
      .insert({
        task_id: taskId,
        task_name: `${taskType} task`,
        task_type: taskType,
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Unknown error',
        execution_time: new Date().toISOString()
      });
  }
}

// ฟังก์ชันสำหรับเริ่ม task (ไม่รอ response)
export function startTaskInBackground(
  taskId: string,
  taskType: string,
  drawingTime?: string,
  lotterySubTypeId?: number
) {
  // รัน task ใน background โดยไม่ block UI
  runTaskInBackground(taskId, taskType, drawingTime, lotterySubTypeId)
    .catch(error => {
      console.error(`[Background] Unhandled error in task ${taskId}:`, error);
    });
  
  // Return ทันทีโดยไม่รอ task เสร็จ
  return Promise.resolve({
    success: true,
    message: `Task ${taskId} started in background`,
    taskId
  });
} 