#!/bin/bash
echo "🔧 แก้ไข PM2 processes ที่มีปัญหา..."
echo ""

# ตรวจสอบสถานะปัจจุบัน
echo "📊 สถานะปัจจุบัน:"
pm2 status
echo ""

# หยุดและลบ processes ทั้งหมด
echo "🛑 หยุดและลบ processes ทั้งหมด..."
pm2 stop all
pm2 delete all
echo ""

# ล้าง PM2 cache
echo "🧹 ล้าง PM2 cache..."
pm2 cleardump
pm2 reset
echo ""

# Kill processes ที่อาจจะยังทำงานอยู่
echo "💀 Kill processes ที่เกี่ยวข้อง..."
pkill -f "next" 2>/dev/null || echo "ไม่มี next processes"
pkill -f "node.*lottery" 2>/dev/null || echo "ไม่มี lottery node processes"
pkill -f "bun.*lottery" 2>/dev/null || echo "ไม่มี lottery bun processes"
echo ""

# ตรวจสอบ port ที่ใช้งาน
echo "🔍 ตรวจสอบ port ที่ใช้งาน..."
lsof -i:3000 2>/dev/null || echo "Port 3000 ไม่ถูกใช้งาน"
lsof -i:3001 2>/dev/null || echo "Port 3001 ไม่ถูกใช้งาน"
lsof -i:3002 2>/dev/null || echo "Port 3002 ไม่ถูกใช้งาน"
echo ""

# เริ่มต้น web server ก่อน
echo "🚀 เริ่มต้น web server..."
if [ -f "ecosystem.config.js" ]; then
    echo "เริ่มต้นด้วย ecosystem.config.js..."
    pm2 start ecosystem.config.js
else
    echo "เริ่มต้นด้วยคำสั่ง manual..."
    pm2 start npm --name "huaylotto-web" -- start
fi
echo ""

# รอสักครู่
echo "⏳ รอ 5 วินาที..."
sleep 5

# ตรวจสอบสถานะ
echo "📊 ตรวจสอบสถานะหลังเริ่มต้น web server:"
pm2 status
echo ""

# ตรวจสอบ logs
echo "📋 ตรวจสอบ logs:"
pm2 logs --lines 5
echo ""

# ตรวจสอบ port อีกครั้ง
echo "🔍 ตรวจสอบ port หลังเริ่มต้น:"
lsof -i:3000 2>/dev/null || echo "Port 3000 ยังไม่ถูกใช้งาน"
echo ""

echo "✅ การแก้ไขเสร็จสิ้น!"
echo ""
echo "💡 หากต้องการเริ่มต้น scheduler และ background processor:"
echo "   pm2 start ecosystem.scheduler.config.js"
echo "   pm2 start ecosystem.background.config.js"
echo ""
echo "🌐 ทดสอบเว็บไซต์:"
echo "   curl -I http://localhost:3000" 