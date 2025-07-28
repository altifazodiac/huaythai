#!/bin/bash

echo "📊 ตรวจสอบสถานะระบบบน Linux VPS..."
echo "=================================="

# ตรวจสอบว่าเป็น root หรือไม่
if [ "$EUID" -ne 0 ]; then
    echo "⚠️  กรุณารันสคริปต์นี้ด้วย sudo หรือเป็น root user"
    echo "   sudo ./check-vps-status.sh"
    exit 1
fi

echo ""
echo "🖥️  ข้อมูลระบบ:"
echo "OS: $(cat /etc/os-release | grep PRETTY_NAME | cut -d'"' -f2)"
echo "Kernel: $(uname -r)"
echo "Uptime: $(uptime -p)"
echo "Load Average: $(uptime | awk -F'load average:' '{print $2}')"

echo ""
echo "💾 ข้อมูล Memory:"
free -h

echo ""
echo "💻 ข้อมูล CPU:"
echo "CPU Usage: $(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | awk -F'%' '{print $1}')%"
echo "CPU Cores: $(nproc)"

echo ""
echo "📋 PM2 Status:"
if command -v pm2 &> /dev/null; then
    pm2 status
else
    echo "❌ PM2 ไม่ได้ติดตั้ง"
fi

echo ""
echo "⏰ Cron Jobs:"
crontab -l 2>/dev/null || echo "ไม่มี cron jobs"

echo ""
echo "🔄 Background Processes:"
ps aux | grep -E "(background|scheduler|lottery)" | grep -v grep || echo "ไม่มี background processes"

echo ""
echo "🟢 Node.js Processes:"
ps aux | grep node | grep -v grep || echo "ไม่มี Node.js processes"

echo ""
echo "🟡 Bun Processes:"
ps aux | grep bun | grep -v grep || echo "ไม่มี Bun processes"

echo ""
echo "🔌 Port Usage:"
echo "Port 3000:"
lsof -i:3000 2>/dev/null || echo "ไม่ถูกใช้งาน"
echo ""
echo "Port 3001:"
lsof -i:3001 2>/dev/null || echo "ไม่ถูกใช้งาน"

echo ""
echo "📁 Log Files:"
if [ -d "/root/huaylotto/logs" ]; then
    echo "Log directory exists:"
    ls -la /root/huaylotto/logs/ 2>/dev/null || echo "ไม่สามารถเข้าถึง log directory"
else
    echo "❌ Log directory ไม่มีอยู่"
fi

echo ""
echo "💾 Disk Usage:"
df -h /

echo ""
echo "🌐 Network Connections:"
netstat -tuln | grep -E ":(3000|3001)" || echo "ไม่มี network connections ที่เกี่ยวข้อง"

echo ""
echo "📈 System Resources:"
echo "Memory Usage:"
free -m | awk 'NR==2{printf "%.2f%%", $3*100/$2}'
echo ""
echo "Disk Usage:"
df -h / | awk 'NR==2{printf "%.2f%%", $5}' | sed 's/%//'

echo ""
echo "✅ การตรวจสอบเสร็จสิ้น!" 