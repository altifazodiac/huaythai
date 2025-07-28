#!/bin/bash

echo "🛑 หยุดการทำงานอัตโนมัติทั้งหมด..."

# 1. หยุด PM2 processes
echo "📋 หยุด PM2 processes..."
pm2 stop all
pm2 delete all

# 2. ลบ cron jobs ทั้งหมด
echo "⏰ ลบ cron jobs ทั้งหมด..."
crontab -r

# 3. หยุด background processes ที่อาจจะยังทำงานอยู่
echo "🔄 หยุด background processes..."
pkill -f "background-task-processor"
pkill -f "start-background-processor"
pkill -f "scheduler"
pkill -f "import-lottery-results"
pkill -f "send-lottery-results"
pkill -f "setup-dynamic-cron"

# 4. หยุด Node.js processes ที่เกี่ยวข้อง
echo "🟢 หยุด Node.js processes..."
pkill -f "node.*lottery"
pkill -f "bun.*lottery"

# 5. ตรวจสอบสถานะ
echo "📊 ตรวจสอบสถานะ..."
echo "PM2 status:"
pm2 status

echo "Cron jobs:"
crontab -l 2>/dev/null || echo "ไม่มี cron jobs"

echo "Background processes:"
ps aux | grep -E "(background|scheduler|lottery)" | grep -v grep || echo "ไม่มี background processes"

echo "✅ หยุดการทำงานอัตโนมัติทั้งหมดเสร็จสิ้น!"
echo ""
echo "📝 หากต้องการเริ่มต้นใหม่:"
echo "   pm2 start ecosystem.background.config.js"
echo "   pm2 start ecosystem.scheduler.config.js"
echo "   bun run setup-dynamic-cron.ts" 