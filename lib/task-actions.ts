'use server';

import { startTaskInBackground } from './background-task-runner';

export async function startTask(
  taskId: string,
  taskType: string,
  drawingTime?: string,
  lotterySubTypeId?: number
) {
  try {
    console.log(`[Server Action] Starting ${taskType} task in background...`);
    
    // เริ่ม task ใน background (ไม่รอ response)
    const result = await startTaskInBackground(taskId, taskType, drawingTime, lotterySubTypeId);
    
    return {
      success: true,
      message: `Task ${taskType} started successfully`,
      taskId
    };
    
  } catch (error) {
    console.error('[Server Action] Error starting task:', error);
    return {
      success: false,
      error: 'Failed to start task',
      details: error instanceof Error ? error.message : 'Unknown error'
    };
  }
} 