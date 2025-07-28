#!/bin/bash

echo "🚨 EMERGENCY STOP - หยุดการทำงานฉุกเฉิน!"
echo "=========================================="

# หยุด bun processes ทั้งหมดทันที
echo "🛑 หยุด bun processes ทั้งหมด..."
pkill -9 -f bun

# หยุด node processes ทั้งหมด
echo "🛑 หยุด node processes ทั้งหมด..."
pkill -9 -f node

# หยุด PM2 processes
echo "🛑 หยุด PM2 processes..."
pm2 stop all 2>/dev/null
pm2 delete all 2>/dev/null
pm2 kill 2>/dev/null

# ลบ cron jobs
echo "🛑 ลบ cron jobs..."
crontab -r 2>/dev/null

# หยุด processes ที่ใช้ port
echo "🛑 หยุด processes ที่ใช้ port..."
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
lsof -ti:3001 | xargs kill -9 2>/dev/null || true
lsof -ti:3002 | xargs kill -9 2>/dev/null || true

# หยุด background processes ที่เกี่ยวข้อง
echo "🛑 หยุด background processes..."
pkill -9 -f "background-task-processor"
pkill -9 -f "start-background-processor"
pkill -9 -f "scheduler"
pkill -9 -f "import-lottery-results"
pkill -9 -f "send-lottery-results"
pkill -9 -f "setup-dynamic-cron"

# ตรวจสอบสถานะหลังหยุด
echo ""
echo "📊 สถานะหลังหยุดฉุกเฉิน:"
echo "Bun processes:"
ps aux | grep bun | grep -v grep || echo "ไม่มี bun processes"

echo ""
echo "Node processes:"
ps aux | grep node | grep -v grep || echo "ไม่มี node processes"

echo ""
echo "PM2 status:"
pm2 status 2>/dev/null || echo "PM2 ไม่ทำงาน"

echo ""
echo "Load average:"
uptime

echo ""
echo "Memory usage:"
free -h

echo ""
echo "✅ หยุดฉุกเฉินเสร็จสิ้น!"
echo "💡 หากต้องการเริ่มต้นใหม่: sudo ./start-vps-automation.sh" 