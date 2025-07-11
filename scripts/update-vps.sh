#!/bin/bash

echo "🔄 Updating VPS after git pull..."

# 1. Install/update dependencies
echo "📦 Installing dependencies..."
bun install

# 2. Check if Next.js build is needed
if [ "$1" = "--production" ] || [ "$1" = "-p" ]; then
    echo "🏗️ Building Next.js for production..."
    bun run build
    
    echo "🔄 Restarting Next.js app..."
    pm2 restart huaylotto-app 2>/dev/null || echo "ℹ️ huaylotto-app not found in PM2"
else
    echo "🔄 Restarting Next.js app (development mode)..."
    pm2 restart huaylotto-app 2>/dev/null || echo "ℹ️ huaylotto-app not found in PM2"
fi

# 3. Restart background services
echo "🔄 Restarting background services..."
pm2 restart lottery-background-processor 2>/dev/null || echo "ℹ️ lottery-background-processor not found in PM2"
pm2 restart lottery-scheduler 2>/dev/null || echo "ℹ️ lottery-scheduler not found in PM2"

# 4. Update cron jobs (if needed)
echo "⏰ Updating cron jobs..."
bun run setup-dynamic-cron.ts

# 5. Show status
echo "📊 Current PM2 status:"
pm2 status

echo "✅ Update completed!"
echo ""
echo "📋 To check logs:"
echo "   pm2 logs --lines 20"
echo "   pm2 logs lottery-background-processor" 