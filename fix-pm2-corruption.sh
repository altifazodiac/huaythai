#!/bin/bash
echo "🚨 แก้ไข PM2 Corruption..."
echo ""

# หยุด PM2 daemon
echo "🛑 หยุด PM2 daemon..."
pm2 kill
echo ""

# ลบ PM2 cache และ data
echo "🗑️ ลบ PM2 cache และ data..."
rm -rf ~/.pm2
rm -rf /root/.pm2
echo ""

# Kill processes ที่เกี่ยวข้อง
echo "💀 Kill processes ที่เกี่ยวข้อง..."
pkill -f "pm2" 2>/dev/null || echo "ไม่มี pm2 processes"
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

# เริ่มต้น PM2 ใหม่
echo "🚀 เริ่มต้น PM2 ใหม่..."
pm2 start ecosystem.config.js
echo ""

# รอสักครู่
echo "⏳ รอ 5 วินาที..."
sleep 5

# ตรวจสอบสถานะ
echo "📊 ตรวจสอบสถานะ:"
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
echo "🌐 ทดสอบเว็บไซต์:"
echo "   curl -I http://localhost:3000" 