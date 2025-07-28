#!/bin/bash

echo "🚀 เริ่มต้นการทำงานอัตโนมัติบน Linux VPS..."

# ตรวจสอบว่าเป็น root หรือไม่
if [ "$EUID" -ne 0 ]; then
    echo "⚠️  กรุณารันสคริปต์นี้ด้วย sudo หรือเป็น root user"
    echo "   sudo ./start-vps-automation.sh"
    exit 1
fi

# ตรวจสอบว่า PM2 ติดตั้งหรือไม่
if ! command -v pm2 &> /dev/null; then
    echo "⚠️  PM2 ไม่ได้ติดตั้งในระบบ"
    echo "   npm install -g pm2"
    exit 1
fi

# ตรวจสอบว่า Bun ติดตั้งหรือไม่
if ! command -v bun &> /dev/null; then
    echo "⚠️  Bun ไม่ได้ติดตั้งในระบบ"
    echo "   curl -fsSL https://bun.sh/install | bash"
    exit 1
fi

# ตรวจสอบว่าโฟลเดอร์โปรเจคมีอยู่หรือไม่
if [ ! -d "/root/huaylotto" ]; then
    echo "❌ โฟลเดอร์ /root/huaylotto ไม่มีอยู่"
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
echo "🔄 เริ่มต้นการทำงาน..."

# 1. ติดตั้ง dependencies
echo "📦 ติดตั้ง dependencies..."
bun install

# 2. สร้างโฟลเดอร์ logs ถ้ายังไม่มี
echo "📁 สร้างโฟลเดอร์ logs..."
mkdir -p logs

# 3. เริ่ม PM2 processes
echo "📋 เริ่ม PM2 processes..."
pm2 start ecosystem.background.config.js
pm2 start ecosystem.scheduler.config.js

# 4. บันทึก PM2 configuration
echo "💾 บันทึก PM2 configuration..."
pm2 save

# 5. ตั้งค่า PM2 startup
echo "🔧 ตั้งค่า PM2 startup..."
pm2 startup

# 6. เริ่ม cron jobs
echo "⏰ เริ่ม cron jobs..."
bun run setup-dynamic-cron.ts

# 7. ตรวจสอบสถานะหลังเริ่มต้น
echo ""
echo "📊 สถานะหลังเริ่มต้นการทำงาน:"
echo "PM2 status:"
pm2 status

echo ""
echo "Cron jobs:"
crontab -l 2>/dev/null || echo "ไม่มี cron jobs"

echo ""
echo "Background processes:"
ps aux | grep -E "(background|scheduler|lottery)" | grep -v grep || echo "ไม่มี background processes"

echo ""
echo "Port usage:"
lsof -i:3001 2>/dev/null || echo "Port 3001 ไม่ถูกใช้งาน"
lsof -i:3000 2>/dev/null || echo "Port 3000 ไม่ถูกใช้งาน"

echo ""
echo "✅ เริ่มต้นการทำงานอัตโนมัติบน VPS เสร็จสิ้น!"
echo ""
echo "📊 คำสั่งตรวจสอบสถานะ:"
echo "   pm2 status"
echo "   crontab -l"
echo "   pm2 logs"
echo "   ./check-vps-status.sh"
echo ""
echo "🛑 คำสั่งหยุดการทำงาน:"
echo "   ./stop-vps-automation.sh" 