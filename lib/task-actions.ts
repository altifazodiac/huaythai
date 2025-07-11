'use server';

import { runScrapeTask, runSendTask } from './task-runner';

export async function executeTask(taskType: string, drawingTime?: string, lotterySubTypeId?: number) {
  try {
    console.log(`[Server Action] Running ${taskType} task...`);
    
    if (taskType === 'scrape') {
      const result = await runScrapeTask(drawingTime, lotterySubTypeId);
      return {
        success: true,
        message: 'Scrape task completed',
        ...result
      };
    } else if (taskType === 'send') {
      const result = await runSendTask(drawingTime, lotterySubTypeId);
      return {
        success: true,
        message: 'Send task completed',
        ...result
      };
    } else {
      return {
        success: true,
        message: 'Cleanup task completed'
      };
    }

  } catch (error) {
    console.error('[Server Action] Task execution error:', error);
    return {
      success: false,
      error: 'Task execution failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    };
  }
} 