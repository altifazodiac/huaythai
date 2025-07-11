#!/usr/bin/env bun

import { backgroundTaskProcessor } from '../lib/background-task-processor';
import 'dotenv/config';

console.log('🚀 Starting Background Task Processor...');
console.log('⏰ Time:', new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' }));

// Validate environment variables
const requiredEnvVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'LINE_CHANNEL_ACCESS_TOKEN'
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`❌ Missing required environment variable: ${envVar}`);
    process.exit(1);
  }
}

console.log('✅ Environment variables validated');

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