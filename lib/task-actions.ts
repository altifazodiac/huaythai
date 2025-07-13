'use server';

import { createClient } from '@/lib/supabase/server';

export async function startTask(
  taskId: string,
  taskType: string,
  drawingTime?: string,
  lotterySubTypeId?: number
) {
  const supabase = await createClient();
  
  try {
    const { data, error } = await supabase.rpc('enqueue_task', {
      p_task_id: taskId,
      p_task_type: taskType,
      p_draw_time: drawingTime,
      p_lottery_sub_type_id: lotterySubTypeId
    });

    if (error) {
      // This would be a network or fundamental RPC call error
      throw new Error(`RPC Error: ${error.message}`);
    }

    if (!data.success) {
      // This is a business logic error from within the RPC function
      console.error(`[Server Action] Failed to enqueue task ${taskId}: ${data.message}`);
      // Also update the main task table to reflect this failure
      await supabase
        .from('scheduled_tasks')
        .update({ status: 'failed', error_message: data.message })
        .eq('id', taskId);
      return {
        success: false,
        message: data.message || `Failed to enqueue task ${taskType}`,
        taskId,
        error: data.details
      };
    }

    return {
      success: true,
      message: data.message || `Task ${taskType} queued for execution`,
      taskId,
      jobId: data.job_id
    };
  } catch (error) {
    console.error(`[Server Action] Exception in startTask for ${taskId}:`, error);
    
    // This is a fallback for unexpected errors
    // We can still try to update the task status
    await supabase
      .from('scheduled_tasks')
      .update({ 
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Unknown exception'
      })
      .eq('id', taskId);

    return {
      success: false,
      message: `An unexpected error occurred while starting task ${taskType}`,
      taskId,
      error: error instanceof Error ? error.message : 'Unknown exception'
    };
  }
}