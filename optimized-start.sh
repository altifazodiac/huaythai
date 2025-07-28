#!/bin/bash

echo "🚀 เริ่มต้นระบบแบบปรับปรุงแล้ว..."
echo "================================"

# ตรวจสอบว่าเป็น root หรือไม่
if [ "$EUID" -ne 0 ]; then
    echo "⚠️  กรุณารันสคริปต์นี้ด้วย sudo หรือเป็น root user"
    echo "   sudo ./optimized-start.sh"
    exit 1
fi

# เปลี่ยนไปยังโฟลเดอร์โปรเจค
cd /root/huaylotto

echo "📋 ตรวจสอบสถานะปัจจุบัน..."
echo "Load average:"
uptime

echo ""
echo "Memory usage:"
free -h

echo ""
echo "🔄 เริ่มต้นแบบปรับปรุง..."

# 1. เริ่มต้นเฉพาะ web server (ไม่ใช่ background processor)
echo "🌐 เริ่มต้น web server..."
pm2 start ecosystem.config.js

# 2. ตรวจสอบสถานะ
echo ""
echo "📊 สถานะหลังเริ่มต้น:"
pm2 status

echo ""
echo "Load average:"
uptime

echo ""
echo "Memory usage:"
free -h

echo ""
echo "✅ เริ่มต้นแบบปรับปรุงเสร็จสิ้น!"
echo ""
echo "💡 ระบบจะทำงานแบบ manual mode:"
echo "   - ไม่มี background processor ที่กินทรัพยากร"
echo "   - ไม่มี scheduler ที่ตรวจสอบบ่อย"
echo "   - ไม่มี cron jobs ที่มากเกินไป"
echo ""
echo "📊 หากต้องการรัน tasks:"
echo "   - ใช้ Task Manager UI ในเว็บไซต์"
echo "   - รันคำสั่ง manual เมื่อต้องการ"
echo ""
echo "🛑 หากต้องการหยุด:"
echo "   pm2 stop all"
echo "   pm2 delete all" 