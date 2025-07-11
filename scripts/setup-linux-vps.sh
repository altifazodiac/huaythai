#!/bin/bash

echo "🚀 Setting up Lottery Scheduler System on Linux VPS..."

# Create logs directory
mkdir -p logs

# Setup environment variables
if [ ! -f .env.local ]; then
    echo "❌ .env.local file not found!"
    echo "Please create .env.local with the following variables:"
    echo "- NEXT_PUBLIC_SUPABASE_URL"
    echo "- SUPABASE_SERVICE_ROLE_KEY"
    echo "- LINE_CHANNEL_ACCESS_TOKEN"
    echo "- NEXT_PUBLIC_SUPABASE_ANON_KEY"
    exit 1
fi

echo "✅ Found .env.local file"

# Install dependencies
echo "📦 Installing dependencies..."
bun install

# Setup dynamic cron jobs
echo "⏰ Setting up dynamic cron jobs..."
bun run setup-dynamic-cron.ts

# Start background processor with PM2
echo "🔄 Starting background task processor..."
pm2 start ecosystem.background.config.js

# Start scheduler
echo "📅 Starting lottery scheduler..."
pm2 start ecosystem.scheduler.config.js

# Save PM2 processes
pm2 save

# Generate PM2 startup script
pm2 startup

echo "✅ Setup completed!"
echo ""
echo "📋 To check status:"
echo "   pm2 status"
echo "   pm2 logs lottery-background-processor"
echo "   pm2 logs lottery-scheduler"
echo ""
echo "📋 To monitor:"
echo "   pm2 monit"
echo ""
echo "📋 To restart:"
echo "   pm2 restart lottery-background-processor"
echo "   pm2 restart lottery-scheduler" 