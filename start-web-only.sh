#!/bin/bash
echo "🌐 เริ่มต้นเฉพาะ Web Server เท่านั้น..."
echo ""

# หยุดและลบ processes ทั้งหมด
echo "🛑 หยุด processes ทั้งหมด..."
pm2 stop all
pm2 delete all
echo ""

# ล้าง cache
echo "🧹 ล้าง cache..."
pm2 cleardump
pm2 reset
echo ""

# Kill processes ที่เกี่ยวข้อง
echo "💀 Kill processes ที่เกี่ยวข้อง..."
pkill -f "next" 2>/dev/null || echo "ไม่มี next processes"
pkill -f "node.*lottery" 2>/dev/null || echo "ไม่มี lottery node processes"
pkill -f "bun.*lottery" 2>/dev/null || echo "ไม่มี lottery bun processes"
echo ""

# เริ่มต้นเฉพาะ web server
echo "🚀 เริ่มต้น Web Server..."
if [ -f "ecosystem.config.js" ]; then
    pm2 start ecosystem.config.js
else
    pm2 start npm --name "huaylotto-web" -- start
fi
echo ""

# รอสักครู่
echo "⏳ รอ 3 วินาที..."
sleep 3

# ตรวจสอบสถานะ
echo "📊 สถานะ:"
pm2 status
echo ""

# ตรวจสอบ port
echo "🔍 ตรวจสอบ port:"
lsof -i:3000 2>/dev/null || echo "Port 3000 ยังไม่ถูกใช้งาน"
echo ""

echo "✅ Web Server เริ่มต้นเสร็จสิ้น!"
echo ""
echo "💡 หมายเหตุ:"
echo "   - ไม่มี background processor"
echo "   - ไม่มี scheduler"
echo "   - ไม่มี cron jobs"
echo "   - ใช้แบบ manual เท่านั้น"
echo ""
echo "🌐 ทดสอบ: curl -I http://localhost:3000" 