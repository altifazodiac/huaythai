#!/bin/bash
echo "🚨 แก้ไขปัญหา 502 Bad Gateway แบบเร็ว..."

# หยุด PM2 ทั้งหมด
pm2 stop all 2>/dev/null
pm2 delete all 2>/dev/null
pm2 kill 2>/dev/null

# ล้าง cache
pm2 cleardump
pm2 reset

# Kill processes ที่เกี่ยวข้อง
pkill -f "next" 2>/dev/null
pkill -f "node.*lottery" 2>/dev/null
pkill -f "bun.*lottery" 2>/dev/null

# เริ่มต้นใหม่
if [ -f "ecosystem.config.js" ]; then
    pm2 start ecosystem.config.js
else
    pm2 start npm --name "huaylotto-web" -- start
fi

echo "✅ เสร็จสิ้น! ตรวจสอบ: pm2 status" 