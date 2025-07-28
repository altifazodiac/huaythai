#!/bin/bash

echo "🛑 หยุดการทำงานอัตโนมัติบน Linux VPS..."

# ตรวจสอบว่าเป็น root หรือไม่
if [ "$EUID" -ne 0 ]; then
    echo "⚠️  กรุณารันสคริปต์นี้ด้วย sudo หรือเป็น root user"
    echo "   sudo ./stop-vps-automation.sh"
    exit 1
fi

# ตรวจสอบว่า PM2 ติดตั้งหรือไม่
if ! command -v pm2 &> /dev/null; then
    echo "⚠️  PM2 ไม่ได้ติดตั้งในระบบ"
    echo "   npm install -g pm2"
    exit 1
fi

echo "📋 ตรวจสอบสถานะปัจจุบัน..."

# แสดงสถานะ PM2 ปัจจุบัน
echo "PM2 Status:"
pm2 status

echo ""
echo "Cron Jobs:"
crontab -l 2>/dev/null || echo "ไม่มี cron jobs"

echo ""
echo "🔄 เริ่มหยุดการทำงาน..."

# 1. หยุด PM2 processes ทั้งหมด
echo "📋 หยุด PM2 processes..."
pm2 stop all
pm2 delete all
pm2 save

# 2. ลบ cron jobs ทั้งหมด
echo "⏰ ลบ cron jobs..."
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

# 5. หยุด processes ที่ใช้ port ที่เกี่ยวข้อง
echo "🔌 หยุด processes ที่ใช้ port..."
lsof -ti:3001 | xargs kill -9 2>/dev/null || true
lsof -ti:3000 | xargs kill -9 2>/dev/null || true

# 6. ลบไฟล์ log ที่เก่า
echo "🗑️ ลบไฟล์ log เก่า..."
rm -f /root/huaylotto/logs/*.log 2>/dev/null || true
rm -f /root/huaylotto/logs/scrape-*.log 2>/dev/null || true
rm -f /root/huaylotto/logs/send-*.log 2>/dev/null || true

# 7. ตรวจสอบสถานะหลังหยุด
echo ""
echo "📊 สถานะหลังหยุดการทำงาน:"
echo "PM2 status:"
pm2 status

echo ""
echo "Cron jobs:"
crontab -l 2>/dev/null || echo "ไม่มี cron jobs"

echo ""
echo "Background processes:"
ps aux | grep -E "(background|scheduler|lottery)" | grep -v grep || echo "ไม่มี background processes"

echo ""
echo "Node.js processes:"
ps aux | grep node | grep -v grep || echo "ไม่มี Node.js processes"

echo ""
echo "Bun processes:"
ps aux | grep bun | grep -v grep || echo "ไม่มี Bun processes"

echo ""
echo "Port usage:"
lsof -i:3001 2>/dev/null || echo "Port 3001 ไม่ถูกใช้งาน"
lsof -i:3000 2>/dev/null || echo "Port 3000 ไม่ถูกใช้งาน"

echo ""
echo "✅ หยุดการทำงานอัตโนมัติบน VPS เสร็จสิ้น!"
echo ""
echo "📝 หากต้องการเริ่มต้นใหม่:"
echo "   cd /root/huaylotto"
echo "   pm2 start ecosystem.background.config.js"
echo "   pm2 start ecosystem.scheduler.config.js"
echo "   bun run setup-dynamic-cron.ts"
echo "   pm2 save"
echo ""
echo "📊 ตรวจสอบสถานะ:"
echo "   pm2 status"
echo "   crontab -l"
echo "   pm2 logs" 