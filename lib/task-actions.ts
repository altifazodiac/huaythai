'use server';

import { runTaskInBackground } from './background-task-runner';

export async function startTask(
  taskId: string,
  taskType: string,
  drawingTime?: string,
  lotterySubTypeId?: number
) {
  // Use setTimeout to return from the Server Action immediately
  // and run the long-running task in the background.
  setTimeout(() => {
    console.log(`[Server Action] Starting ${taskType} task in background via setTimeout...`);
    // Correctly call the function that performs the work.
    runTaskInBackground(taskId, taskType, drawingTime, lotterySubTypeId)
      .catch(error => {
        console.error(`[Server Action] Error executing background task for ${taskId}:`, error);
      });
  }, 0);

  // Return immediately
  return {
    success: true,
    message: `Task ${taskType} instructed to start in background.`,
    taskId
  };
} 