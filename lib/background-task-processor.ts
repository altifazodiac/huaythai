import { createClient } from '@supabase/supabase-js';
import { runScrapeTask, runSendTask } from './task-runner';
import { formatInTimeZone } from 'date-fns-tz';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface TaskRecord {
  id: number;
  task_id: string;
  task_type: 'scrape' | 'send' | 'cleanup';
  draw_time?: string;
  lottery_sub_type_id?: number;
  status: string;
  created_at: string;
  attempts: number;
}

interface TaskResult {
  scrapedCount?: number;
  importedCount?: number;
  sentCount?: number;
  error?: string;
}

class BackgroundTaskProcessor {
  private isRunning = false;
  private pollingInterval = 5000; // 5 seconds
  private maxAttempts = 3;

  constructor() {
    this.log('Background Task Processor initialized');
  }

  private log(message: string) {
    const timestamp = new Date().toLocaleString('th-TH', {
      timeZone: 'Asia/Bangkok',
      hour12: false
    });
    console.log(`[${timestamp}] [TaskProcessor] ${message}`);
  }

  async start() {
    if (this.isRunning) {
      this.log('Already running');
      return;
    }

    this.isRunning = true;
    this.log('Starting background task processor...');

    while (this.isRunning) {
      try {
        await this.processNextTask();
        await this.sleep(this.pollingInterval);
      } catch (error) {
        this.log(`Error in main loop: ${error instanceof Error ? error.message : 'Unknown error'}`);
        await this.sleep(this.pollingInterval * 2); // Wait longer on error
      }
    }
  }

  stop() {
    this.log('Stopping background task processor...');
    this.isRunning = false;
  }

  private async processNextTask() {
    try {
      // Get next task from queue using RPC
      const { data: response, error } = await supabase.rpc('process_next_task');
      
      if (error) {
        this.log(`Error calling process_next_task: ${error.message}`);
        return;
      }

      if (!response || !response.success) {
        // No tasks in queue or error
        if (response?.message !== 'No tasks in queue') {
          this.log(`RPC Error: ${response?.message || 'Unknown error'}`);
        }
        return;
      }

      const task = response.task as TaskRecord;
      if (!task) {
        return; // No task to process
      }

      this.log(`Processing task: ${task.task_id} (${task.task_type})`);

      // Process the task
      const result = await this.executeTask(task);
      
      // Complete the task
      await this.completeTask(task, result);

    } catch (error) {
      this.log(`Error processing task: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async executeTask(task: TaskRecord): Promise<TaskResult> {
    try {
      switch (task.task_type) {
        case 'scrape':
          const scrapeResult = await runScrapeTask(task.draw_time, task.lottery_sub_type_id);
          return {
            scrapedCount: scrapeResult.scrapedCount,
            importedCount: scrapeResult.importedCount
          };

        case 'send':
          const sendResult = await runSendTask(task.draw_time, task.lottery_sub_type_id);
          return {
            sentCount: sendResult.sentCount
          };

        case 'cleanup':
          // TODO: Implement cleanup logic
          this.log('Cleanup task not implemented yet');
          return {};

        default:
          throw new Error(`Unknown task type: ${task.task_type}`);
      }
    } catch (error) {
      this.log(`Task execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return {
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async completeTask(task: TaskRecord, result: TaskResult) {
    try {
      const success = !result.error;
      
      const { data: response, error } = await supabase.rpc('complete_task', {
        p_task_id: task.task_id,
        p_queue_id: task.id,
        p_success: success,
        p_error_message: result.error || null,
        p_scraped_count: result.scrapedCount || 0,
        p_imported_count: result.importedCount || 0
      });

      if (error) {
        this.log(`Error completing task: ${error.message}`);
        return;
      }

      if (!response?.success) {
        this.log(`RPC Error completing task: ${response?.message || 'Unknown error'}`);
        return;
      }

      const status = success ? 'completed' : 'failed';
      this.log(`Task ${task.task_id} ${status}`);
      
      if (success) {
        this.log(`- Scraped: ${result.scrapedCount || 0}, Imported: ${result.importedCount || 0}, Sent: ${result.sentCount || 0}`);
      } else {
        this.log(`- Error: ${result.error}`);
      }

    } catch (error) {
      this.log(`Error completing task: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Method to get queue status
  async getQueueStatus() {
    try {
      const { data: response, error } = await supabase.rpc('get_queue_status');
      
      if (error) {
        this.log(`Error getting queue status: ${error.message}`);
        return null;
      }

      return response;
    } catch (error) {
      this.log(`Error getting queue status: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return null;
    }
  }
}

// Export singleton instance
export const backgroundTaskProcessor = new BackgroundTaskProcessor();

// For direct script execution
if (typeof require !== 'undefined' && require.main === module) {
  console.log('🚀 Starting Background Task Processor...');
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n📴 Shutting down gracefully...');
    backgroundTaskProcessor.stop();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('\n📴 Shutting down gracefully...');
    backgroundTaskProcessor.stop();
    process.exit(0);
  });

  // Start the processor
  backgroundTaskProcessor.start().catch(error => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
} else if (typeof (globalThis as any).Bun !== 'undefined') {
  // For Bun runtime
  console.log('🚀 Starting Background Task Processor with Bun...');
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n📴 Shutting down gracefully...');
    backgroundTaskProcessor.stop();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('\n📴 Shutting down gracefully...');
    backgroundTaskProcessor.stop();
    process.exit(0);
  });

  // Start the processor
  backgroundTaskProcessor.start().catch(error => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
} 