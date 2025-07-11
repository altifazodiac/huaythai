'use server';

import { startTaskInBackground } from './background-task-runner';

export async function startTask(
  taskId: string,
  taskType: string,
  drawingTime?: string,
  lotterySubTypeId?: number
) {
  // ใช้ setTimeout เพื่อให้ Server Action return ทันที
  // และรัน task ที่ใช้เวลานานใน background
  setTimeout(() => {
    console.log(`[Server Action] Starting ${taskType} task in background via setTimeout...`);
    startTaskInBackground(taskId, taskType, drawingTime, lotterySubTypeId)
      .catch(error => {
        console.error(`[Server Action] Error executing background task for ${taskId}:`, error);
      });
  }, 0);

  // Return ทันที
  return {
    success: true,
    message: `Task ${taskType} instructed to start in background.`,
    taskId
  };
} 