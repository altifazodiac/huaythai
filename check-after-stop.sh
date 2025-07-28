#!/bin/bash

echo "📊 ตรวจสอบสถานะหลังจากหยุดการทำงาน..."
echo "======================================"

# รอสักครู่เพื่อให้ load average ลดลง
echo "⏳ รอ 30 วินาทีเพื่อให้ระบบปรับตัว..."
sleep 30

echo ""
echo "=== ตรวจสอบ bun processes ==="
ps aux | grep bun | grep -v grep || echo "ไม่มี bun processes"

echo ""
echo "=== ตรวจสอบ node processes ==="
ps aux | grep node | grep -v grep || echo "ไม่มี node processes"

echo ""
echo "=== ตรวจสอบ background processes ==="
ps aux | grep -E "(background|scheduler|lottery)" | grep -v grep || echo "ไม่มี background processes"

echo ""
echo "=== ตรวจสอบ PM2 status ==="
pm2 status 2>/dev/null || echo "PM2 ไม่ทำงาน"

echo ""
echo "=== ตรวจสอบ cron jobs ==="
crontab -l 2>/dev/null || echo "ไม่มี cron jobs"

echo ""
echo "=== ตรวจสอบ load average ==="
uptime

echo ""
echo "=== ตรวจสอบ memory usage ==="
free -h

echo ""
echo "=== ตรวจสอบ port usage ==="
lsof -i:3000 2>/dev/null || echo "Port 3000 ไม่ถูกใช้งาน"
lsof -i:3001 2>/dev/null || echo "Port 3001 ไม่ถูกใช้งาน"
lsof -i:3002 2>/dev/null || echo "Port 3002 ไม่ถูกใช้งาน"

echo ""
echo "=== ตรวจสอบ disk usage ==="
df -h /

echo ""
echo "✅ การตรวจสอบเสร็จสิ้น!"
echo ""
echo "💡 หาก load average ยังสูง ให้รออีกสักครู่หรือรีสตาร์ทระบบ"
echo "🔄 หากต้องการรีสตาร์ท: reboot" 