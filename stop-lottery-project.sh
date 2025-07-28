#!/bin/bash

echo "🎰 หยุดการทำงานของโปรเจคหวยออนไลน์..."
echo "======================================"

# ตรวจสอบว่าเป็น root หรือไม่
if [ "$EUID" -ne 0 ]; then
    echo "⚠️  กรุณารันสคริปต์นี้ด้วย sudo หรือเป็น root user"
    echo "   sudo ./stop-lottery-project.sh"
    exit 1
fi

# เปลี่ยนไปยังโฟลเดอร์โปรเจค
cd /root/huaylotto

echo "📋 ตรวจสอบสถานะปัจจุบัน..."

# แสดงสถานะ PM2 ปัจจุบัน
echo "PM2 Status:"
pm2 status

echo ""
echo "Cron Jobs:"
crontab -l 2>/dev/null || echo "ไม่มี cron jobs"

echo ""
echo "🛑 เริ่มหยุดการทำงาน..."

# 1. หยุด PM2 processes ทั้งหมด
echo "📋 หยุด PM2 processes..."
pm2 stop all
pm2 delete all
pm2 kill
pm2 save

# 2. ลบ cron jobs ทั้งหมด
echo "⏰ ลบ cron jobs..."
crontab -r

# 3. หยุด background processes ที่เกี่ยวข้องกับโปรเจค
echo "🔄 หยุด background processes..."
pkill -9 -f "background-task-processor"
pkill -9 -f "start-background-processor"
pkill -9 -f "scheduler"
pkill -9 -f "import-lottery-results"
pkill -9 -f "send-lottery-results"
pkill -9 -f "setup-dynamic-cron"
pkill -9 -f "task-runner"
pkill -9 -f "lottery"

# 4. หยุด bun processes ทั้งหมด (เนื่องจากโปรเจคใช้ bun)
echo "🟡 หยุด bun processes..."
pkill -9 -f bun

# 5. หยุด node processes ที่เกี่ยวข้อง
echo "🟢 หยุด node processes..."
pkill -9 -f "node.*lottery"
pkill -9 -f "node.*background"
pkill -9 -f "node.*scheduler"

# 6. หยุด processes ที่ใช้ port ที่เกี่ยวข้อง
echo "🔌 หยุด processes ที่ใช้ port..."
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
lsof -ti:3001 | xargs kill -9 2>/dev/null || true
lsof -ti:3002 | xargs kill -9 2>/dev/null || true

# 7. หยุด Next.js development server
echo "🌐 หยุด Next.js server..."
pkill -9 -f "next"
pkill -9 -f "npm"
pkill -9 -f "bun.*dev"

# 8. ลบไฟล์ log ที่เก่า
echo "🗑️ ลบไฟล์ log เก่า..."
rm -f logs/*.log 2>/dev/null || true
rm -f logs/scrape-*.log 2>/dev/null || true
rm -f logs/send-*.log 2>/dev/null || true
rm -f logs/background-*.log 2>/dev/null || true
rm -f logs/scheduler-*.log 2>/dev/null || true

# 9. ตรวจสอบสถานะหลังหยุด
echo ""
echo "📊 สถานะหลังหยุดการทำงาน:"
echo "PM2 status:"
pm2 status 2>/dev/null || echo "PM2 ไม่ทำงาน"

echo ""
echo "Cron jobs:"
crontab -l 2>/dev/null || echo "ไม่มี cron jobs"

echo ""
echo "Bun processes:"
ps aux | grep bun | grep -v grep || echo "ไม่มี bun processes"

echo ""
echo "Node processes:"
ps aux | grep node | grep -v grep || echo "ไม่มี node processes"

echo ""
echo "Background processes:"
ps aux | grep -E "(background|scheduler|lottery)" | grep -v grep || echo "ไม่มี background processes"

echo ""
echo "Port usage:"
lsof -i:3000 2>/dev/null || echo "Port 3000 ไม่ถูกใช้งาน"
lsof -i:3001 2>/dev/null || echo "Port 3001 ไม่ถูกใช้งาน"
lsof -i:3002 2>/dev/null || echo "Port 3002 ไม่ถูกใช้งาน"

echo ""
echo "Load average:"
uptime

echo ""
echo "Memory usage:"
free -h

echo ""
echo "✅ หยุดการทำงานของโปรเจคหวยออนไลน์เสร็จสิ้น!"
echo ""
echo "💡 หากต้องการเริ่มต้นใหม่:"
echo "   cd /root/huaylotto"
echo "   sudo ./start-vps-automation.sh"
echo ""
echo "📊 ตรวจสอบสถานะ:"
echo "   sudo ./check-vps-status.sh" 