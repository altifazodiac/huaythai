#!/bin/bash
echo "🔧 แก้ไขปัญหา 502 Bad Gateway และ PM2 process หายไป..."
echo ""

# ตรวจสอบสถานะปัจจุบัน
echo "📊 ตรวจสอบสถานะปัจจุบัน..."
echo "PM2 status:"
pm2 status
echo ""

echo "Load average:"
uptime
echo ""

echo "Memory usage:"
free -h
echo ""

# หยุด PM2 ทั้งหมด
echo "🛑 หยุด PM2 ทั้งหมด..."
pm2 stop all 2>/dev/null || echo "ไม่มี PM2 processes ที่ทำงานอยู่"
pm2 delete all 2>/dev/null || echo "ไม่มี PM2 processes ที่จะลบ"
pm2 kill 2>/dev/null || echo "PM2 daemon หยุดแล้ว"
echo ""

# ล้าง PM2 cache
echo "🧹 ล้าง PM2 cache..."
pm2 cleardump
pm2 reset
echo ""

# ตรวจสอบ port ที่ใช้งาน
echo "🔍 ตรวจสอบ port ที่ใช้งาน..."
lsof -i:3000 2>/dev/null || echo "Port 3000 ไม่ถูกใช้งาน"
lsof -i:3001 2>/dev/null || echo "Port 3001 ไม่ถูกใช้งาน"
lsof -i:3002 2>/dev/null || echo "Port 3002 ไม่ถูกใช้งาน"
echo ""

# Kill processes ที่อาจจะยังทำงานอยู่
echo "💀 Kill processes ที่เกี่ยวข้อง..."
pkill -f "next" 2>/dev/null || echo "ไม่มี next processes"
pkill -f "node.*lottery" 2>/dev/null || echo "ไม่มี lottery node processes"
pkill -f "bun.*lottery" 2>/dev/null || echo "ไม่มี lottery bun processes"
echo ""

# ตรวจสอบไฟล์ ecosystem
echo "📁 ตรวจสอบไฟล์ ecosystem..."
if [ -f "ecosystem.config.js" ]; then
    echo "✅ พบ ecosystem.config.js"
    cat ecosystem.config.js | head -20
else
    echo "❌ ไม่พบ ecosystem.config.js"
fi
echo ""

# เริ่มต้น PM2 ใหม่
echo "🚀 เริ่มต้น PM2 ใหม่..."
if [ -f "ecosystem.config.js" ]; then
    echo "เริ่มต้นด้วย ecosystem.config.js..."
    pm2 start ecosystem.config.js
else
    echo "เริ่มต้นด้วยคำสั่ง manual..."
    pm2 start npm --name "huaylotto-web" -- start
fi
echo ""

# ตรวจสอบสถานะหลังเริ่มต้น
echo "📊 ตรวจสอบสถานะหลังเริ่มต้น..."
sleep 3
pm2 status
echo ""

# ตรวจสอบ logs
echo "📋 ตรวจสอบ logs..."
pm2 logs --lines 10
echo ""

# ตรวจสอบ port อีกครั้ง
echo "🔍 ตรวจสอบ port หลังเริ่มต้น..."
lsof -i:3000 2>/dev/null || echo "Port 3000 ยังไม่ถูกใช้งาน"
echo ""

echo "✅ การแก้ไขเสร็จสิ้น!"
echo ""
echo "💡 หากยังมีปัญหา:"
echo "   1. ตรวจสอบ logs: pm2 logs"
echo "   2. รีสตาร์ท PM2: pm2 restart all"
echo "   3. ตรวจสอบ nginx: systemctl status nginx"
echo "   4. ตรวจสอบ firewall: ufw status"
echo ""
echo "🌐 ทดสอบเว็บไซต์:"
echo "   curl -I http://localhost:3000"
echo "   curl -I http://your-domain.com" 