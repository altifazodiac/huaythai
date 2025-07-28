#!/bin/bash

echo "🎯 หยุดการทำงานอัตโนมัติเฉพาะส่วน..."

# ฟังก์ชันแสดงเมนู
show_menu() {
    echo ""
    echo "เลือกตัวเลือกที่ต้องการหยุด:"
    echo "1) หยุด PM2 processes ทั้งหมด"
    echo "2) หยุด Background Task Processor"
    echo "3) หยุด Scheduler"
    echo "4) ลบ Cron Jobs ทั้งหมด"
    echo "5) หยุด Lottery Scraping Jobs"
    echo "6) หยุด Lottery Sending Jobs"
    echo "7) หยุดทุกอย่าง (Full Stop)"
    echo "8) ตรวจสอบสถานะ"
    echo "9) ออกจากโปรแกรม"
    echo ""
}

# ฟังก์ชันหยุด PM2
stop_pm2() {
    echo "📋 หยุด PM2 processes..."
    pm2 stop all
    pm2 delete all
    echo "✅ หยุด PM2 เสร็จสิ้น"
}

# ฟังก์ชันหยุด Background Task Processor
stop_background_processor() {
    echo "🔄 หยุด Background Task Processor..."
    pm2 stop lottery-background-processor
    pm2 delete lottery-background-processor
    pkill -f "background-task-processor"
    pkill -f "start-background-processor"
    echo "✅ หยุด Background Task Processor เสร็จสิ้น"
}

# ฟังก์ชันหยุด Scheduler
stop_scheduler() {
    echo "📅 หยุด Scheduler..."
    pm2 stop huaylotto-scheduler
    pm2 delete huaylotto-scheduler
    pkill -f "scheduler"
    echo "✅ หยุด Scheduler เสร็จสิ้น"
}

# ฟังก์ชันลบ Cron Jobs
stop_cron() {
    echo "⏰ ลบ Cron Jobs..."
    crontab -r
    echo "✅ ลบ Cron Jobs เสร็จสิ้น"
}

# ฟังก์ชันหยุด Scraping Jobs
stop_scraping() {
    echo "🔍 หยุด Lottery Scraping Jobs..."
    pkill -f "import-lottery-results"
    echo "✅ หยุด Scraping Jobs เสร็จสิ้น"
}

# ฟังก์ชันหยุด Sending Jobs
stop_sending() {
    echo "📤 หยุด Lottery Sending Jobs..."
    pkill -f "send-lottery-results"
    echo "✅ หยุด Sending Jobs เสร็จสิ้น"
}

# ฟังก์ชันหยุดทุกอย่าง
stop_all() {
    echo "🛑 หยุดทุกอย่าง..."
    stop_pm2
    stop_background_processor
    stop_scheduler
    stop_cron
    stop_scraping
    stop_sending
    echo "✅ หยุดทุกอย่างเสร็จสิ้น"
}

# ฟังก์ชันตรวจสอบสถานะ
check_status() {
    echo "📊 สถานะปัจจุบัน:"
    echo ""
    echo "PM2 Processes:"
    pm2 status
    echo ""
    echo "Cron Jobs:"
    crontab -l 2>/dev/null || echo "ไม่มี cron jobs"
    echo ""
    echo "Background Processes:"
    ps aux | grep -E "(background|scheduler|lottery)" | grep -v grep || echo "ไม่มี background processes"
}

# Main loop
while true; do
    show_menu
    read -p "เลือกตัวเลือก (1-9): " choice
    
    case $choice in
        1) stop_pm2 ;;
        2) stop_background_processor ;;
        3) stop_scheduler ;;
        4) stop_cron ;;
        5) stop_scraping ;;
        6) stop_sending ;;
        7) stop_all ;;
        8) check_status ;;
        9) echo "👋 ออกจากโปรแกรม"; exit 0 ;;
        *) echo "❌ ตัวเลือกไม่ถูกต้อง กรุณาเลือก 1-9" ;;
    esac
    
    echo ""
    read -p "กด Enter เพื่อกลับไปยังเมนู..."
done 