#!/bin/bash

# สีสำหรับ output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ฟังก์ชันแสดงเมนูหลัก
show_main_menu() {
    clear
    echo -e "${BLUE}🖥️  VPS Automation Manager${NC}"
    echo "=================================="
    echo ""
    echo -e "${YELLOW}เลือกตัวเลือก:${NC}"
    echo "1) 📊 ตรวจสอบสถานะระบบ"
    echo "2) 🛑 หยุดการทำงานทั้งหมด"
    echo "3) 🚀 เริ่มต้นการทำงานทั้งหมด"
    echo "4) 🔄 Restart Services"
    echo "5) 📋 จัดการ PM2"
    echo "6) ⏰ จัดการ Cron Jobs"
    echo "7) 📈 Monitor Resources"
    echo "8) 🔧 การแก้ไขปัญหา"
    echo "9) 💾 Backup & Restore"
    echo "0) ออกจากโปรแกรม"
    echo ""
}

# ฟังก์ชันตรวจสอบสถานะ
check_status() {
    echo -e "${BLUE}📊 ตรวจสอบสถานะระบบ...${NC}"
    echo ""
    
    # ตรวจสอบ PM2
    echo -e "${YELLOW}PM2 Status:${NC}"
    if command -v pm2 &> /dev/null; then
        pm2 status
    else
        echo -e "${RED}❌ PM2 ไม่ได้ติดตั้ง${NC}"
    fi
    
    echo ""
    
    # ตรวจสอบ Cron Jobs
    echo -e "${YELLOW}Cron Jobs:${NC}"
    crontab -l 2>/dev/null || echo "ไม่มี cron jobs"
    
    echo ""
    
    # ตรวจสอบ Processes
    echo -e "${YELLOW}Background Processes:${NC}"
    ps aux | grep -E "(background|scheduler|lottery)" | grep -v grep || echo "ไม่มี background processes"
    
    echo ""
    
    # ตรวจสอบ Port
    echo -e "${YELLOW}Port Usage:${NC}"
    echo "Port 3000:"
    lsof -i:3000 2>/dev/null || echo "ไม่ถูกใช้งาน"
    echo "Port 3001:"
    lsof -i:3001 2>/dev/null || echo "ไม่ถูกใช้งาน"
    
    echo ""
    
    # ตรวจสอบ System Resources
    echo -e "${YELLOW}System Resources:${NC}"
    echo "Memory Usage:"
    free -h
    echo ""
    echo "Disk Usage:"
    df -h /
    
    read -p "กด Enter เพื่อกลับไปยังเมนูหลัก..."
}

# ฟังก์ชันหยุดการทำงาน
stop_automation() {
    echo -e "${RED}🛑 หยุดการทำงานทั้งหมด...${NC}"
    echo ""
    
    # หยุด PM2
    echo "📋 หยุด PM2 processes..."
    pm2 stop all
    pm2 delete all
    pm2 save
    
    # ลบ Cron Jobs
    echo "⏰ ลบ cron jobs..."
    crontab -r
    
    # หยุด Processes
    echo "🔄 หยุด background processes..."
    pkill -f "background-task-processor"
    pkill -f "start-background-processor"
    pkill -f "scheduler"
    pkill -f "import-lottery-results"
    pkill -f "send-lottery-results"
    pkill -f "setup-dynamic-cron"
    
    # หยุด Node.js processes
    echo "🟢 หยุด Node.js processes..."
    pkill -f "node.*lottery"
    pkill -f "bun.*lottery"
    
    # หยุด Port
    echo "🔌 หยุด processes ที่ใช้ port..."
    lsof -ti:3001 | xargs kill -9 2>/dev/null || true
    lsof -ti:3000 | xargs kill -9 2>/dev/null || true
    
    echo -e "${GREEN}✅ หยุดการทำงานเสร็จสิ้น!${NC}"
    read -p "กด Enter เพื่อกลับไปยังเมนูหลัก..."
}

# ฟังก์ชันเริ่มต้นการทำงาน
start_automation() {
    echo -e "${GREEN}🚀 เริ่มต้นการทำงานทั้งหมด...${NC}"
    echo ""
    
    # ตรวจสอบ dependencies
    if ! command -v pm2 &> /dev/null; then
        echo -e "${RED}❌ PM2 ไม่ได้ติดตั้ง${NC}"
        read -p "กด Enter เพื่อกลับไปยังเมนูหลัก..."
        return
    fi
    
    if ! command -v bun &> /dev/null; then
        echo -e "${RED}❌ Bun ไม่ได้ติดตั้ง${NC}"
        read -p "กด Enter เพื่อกลับไปยังเมนูหลัก..."
        return
    fi
    
    # เปลี่ยนไปยังโฟลเดอร์โปรเจค
    cd /root/huaylotto
    
    # ติดตั้ง dependencies
    echo "📦 ติดตั้ง dependencies..."
    bun install
    
    # สร้างโฟลเดอร์ logs
    echo "📁 สร้างโฟลเดอร์ logs..."
    mkdir -p logs
    
    # เริ่ม PM2 processes
    echo "📋 เริ่ม PM2 processes..."
    pm2 start ecosystem.background.config.js
    pm2 start ecosystem.scheduler.config.js
    
    # บันทึก PM2 configuration
    echo "💾 บันทึก PM2 configuration..."
    pm2 save
    
    # ตั้งค่า PM2 startup
    echo "🔧 ตั้งค่า PM2 startup..."
    pm2 startup
    
    # เริ่ม cron jobs
    echo "⏰ เริ่ม cron jobs..."
    bun run setup-dynamic-cron.ts
    
    echo -e "${GREEN}✅ เริ่มต้นการทำงานเสร็จสิ้น!${NC}"
    read -p "กด Enter เพื่อกลับไปยังเมนูหลัก..."
}

# ฟังก์ชัน Restart Services
restart_services() {
    echo -e "${YELLOW}🔄 Restart Services...${NC}"
    echo ""
    echo "1) Restart PM2 processes"
    echo "2) Restart Cron jobs"
    echo "3) Restart ทั้งหมด"
    echo "4) กลับไปยังเมนูหลัก"
    echo ""
    read -p "เลือกตัวเลือก: " restart_choice
    
    case $restart_choice in
        1)
            echo "📋 Restart PM2 processes..."
            pm2 restart all
            ;;
        2)
            echo "⏰ Restart Cron jobs..."
            crontab -r
            bun run setup-dynamic-cron.ts
            ;;
        3)
            echo "🔄 Restart ทั้งหมด..."
            pm2 restart all
            crontab -r
            bun run setup-dynamic-cron.ts
            ;;
        4)
            return
            ;;
        *)
            echo -e "${RED}❌ ตัวเลือกไม่ถูกต้อง${NC}"
            ;;
    esac
    
    echo -e "${GREEN}✅ Restart เสร็จสิ้น!${NC}"
    read -p "กด Enter เพื่อกลับไปยังเมนูหลัก..."
}

# ฟังก์ชันจัดการ PM2
manage_pm2() {
    while true; do
        clear
        echo -e "${BLUE}📋 จัดการ PM2${NC}"
        echo "============="
        echo ""
        echo "1) ดูสถานะ PM2"
        echo "2) ดู logs"
        echo "3) Monitor PM2"
        echo "4) Restart PM2 processes"
        echo "5) Stop PM2 processes"
        echo "6) Delete PM2 processes"
        echo "7) กลับไปยังเมนูหลัก"
        echo ""
        read -p "เลือกตัวเลือก: " pm2_choice
        
        case $pm2_choice in
            1)
                pm2 status
                read -p "กด Enter เพื่อกลับ..."
                ;;
            2)
                pm2 logs --lines 20
                read -p "กด Enter เพื่อกลับ..."
                ;;
            3)
                pm2 monit
                ;;
            4)
                pm2 restart all
                echo -e "${GREEN}✅ Restart PM2 เสร็จสิ้น!${NC}"
                read -p "กด Enter เพื่อกลับ..."
                ;;
            5)
                pm2 stop all
                echo -e "${GREEN}✅ Stop PM2 เสร็จสิ้น!${NC}"
                read -p "กด Enter เพื่อกลับ..."
                ;;
            6)
                pm2 delete all
                echo -e "${GREEN}✅ Delete PM2 เสร็จสิ้น!${NC}"
                read -p "กด Enter เพื่อกลับ..."
                ;;
            7)
                return
                ;;
            *)
                echo -e "${RED}❌ ตัวเลือกไม่ถูกต้อง${NC}"
                read -p "กด Enter เพื่อกลับ..."
                ;;
        esac
    done
}

# ฟังก์ชันจัดการ Cron Jobs
manage_cron() {
    while true; do
        clear
        echo -e "${BLUE}⏰ จัดการ Cron Jobs${NC}"
        echo "=================="
        echo ""
        echo "1) ดู Cron jobs ปัจจุบัน"
        echo "2) ลบ Cron jobs ทั้งหมด"
        echo "3) สร้าง Cron jobs ใหม่"
        echo "4) แก้ไข Cron jobs"
        echo "5) กลับไปยังเมนูหลัก"
        echo ""
        read -p "เลือกตัวเลือก: " cron_choice
        
        case $cron_choice in
            1)
                echo -e "${YELLOW}Cron Jobs ปัจจุบัน:${NC}"
                crontab -l 2>/dev/null || echo "ไม่มี cron jobs"
                read -p "กด Enter เพื่อกลับ..."
                ;;
            2)
                echo "⏰ ลบ Cron jobs ทั้งหมด..."
                crontab -r
                echo -e "${GREEN}✅ ลบ Cron jobs เสร็จสิ้น!${NC}"
                read -p "กด Enter เพื่อกลับ..."
                ;;
            3)
                echo "⏰ สร้าง Cron jobs ใหม่..."
                bun run setup-dynamic-cron.ts
                echo -e "${GREEN}✅ สร้าง Cron jobs เสร็จสิ้น!${NC}"
                read -p "กด Enter เพื่อกลับ..."
                ;;
            4)
                crontab -e
                ;;
            5)
                return
                ;;
            *)
                echo -e "${RED}❌ ตัวเลือกไม่ถูกต้อง${NC}"
                read -p "กด Enter เพื่อกลับ..."
                ;;
        esac
    done
}

# ฟังก์ชัน Monitor Resources
monitor_resources() {
    while true; do
        clear
        echo -e "${BLUE}📈 Monitor Resources${NC}"
        echo "=================="
        echo ""
        echo "1) ดู System Resources (htop)"
        echo "2) ดู Memory Usage"
        echo "3) ดู Disk Usage"
        echo "4) ดู Network Connections"
        echo "5) ดู Load Average"
        echo "6) กลับไปยังเมนูหลัก"
        echo ""
        read -p "เลือกตัวเลือก: " monitor_choice
        
        case $monitor_choice in
            1)
                htop
                ;;
            2)
                echo -e "${YELLOW}Memory Usage:${NC}"
                free -h
                read -p "กด Enter เพื่อกลับ..."
                ;;
            3)
                echo -e "${YELLOW}Disk Usage:${NC}"
                df -h
                read -p "กด Enter เพื่อกลับ..."
                ;;
            4)
                echo -e "${YELLOW}Network Connections:${NC}"
                netstat -tuln
                read -p "กด Enter เพื่อกลับ..."
                ;;
            5)
                echo -e "${YELLOW}Load Average:${NC}"
                uptime
                read -p "กด Enter เพื่อกลับ..."
                ;;
            6)
                return
                ;;
            *)
                echo -e "${RED}❌ ตัวเลือกไม่ถูกต้อง${NC}"
                read -p "กด Enter เพื่อกลับ..."
                ;;
        esac
    done
}

# ฟังก์ชันการแก้ไขปัญหา
troubleshoot() {
    while true; do
        clear
        echo -e "${BLUE}🔧 การแก้ไขปัญหา${NC}"
        echo "================"
        echo ""
        echo "1) PM2 ไม่หยุด"
        echo "2) Processes ยังทำงานอยู่"
        echo "3) Cron Jobs ไม่หาย"
        echo "4) Port ถูกใช้งาน"
        echo "5) Memory เต็ม"
        echo "6) กลับไปยังเมนูหลัก"
        echo ""
        read -p "เลือกตัวเลือก: " troubleshoot_choice
        
        case $troubleshoot_choice in
            1)
                echo "🔧 แก้ไขปัญหา PM2 ไม่หยุด..."
                pm2 kill
                pm2 resurrect
                echo -e "${GREEN}✅ แก้ไขเสร็จสิ้น!${NC}"
                read -p "กด Enter เพื่อกลับ..."
                ;;
            2)
                echo "🔧 หยุด Processes ที่ยังทำงานอยู่..."
                pkill -f "background-task-processor"
                pkill -f "scheduler"
                pkill -f "import-lottery-results"
                pkill -f "send-lottery-results"
                echo -e "${GREEN}✅ หยุด Processes เสร็จสิ้น!${NC}"
                read -p "กด Enter เพื่อกลับ..."
                ;;
            3)
                echo "🔧 ลบ Cron Jobs..."
                crontab -r
                echo -e "${GREEN}✅ ลบ Cron Jobs เสร็จสิ้น!${NC}"
                read -p "กด Enter เพื่อกลับ..."
                ;;
            4)
                echo "🔧 หยุด Processes ที่ใช้ Port..."
                lsof -ti:3001 | xargs kill -9 2>/dev/null || true
                lsof -ti:3000 | xargs kill -9 2>/dev/null || true
                echo -e "${GREEN}✅ หยุด Port Processes เสร็จสิ้น!${NC}"
                read -p "กด Enter เพื่อกลับ..."
                ;;
            5)
                echo "🔧 แก้ไขปัญหา Memory เต็ม..."
                swapoff -a && swapon -a
                echo -e "${GREEN}✅ แก้ไข Memory เสร็จสิ้น!${NC}"
                read -p "กด Enter เพื่อกลับ..."
                ;;
            6)
                return
                ;;
            *)
                echo -e "${RED}❌ ตัวเลือกไม่ถูกต้อง${NC}"
                read -p "กด Enter เพื่อกลับ..."
                ;;
        esac
    done
}

# ฟังก์ชัน Backup & Restore
backup_restore() {
    while true; do
        clear
        echo -e "${BLUE}💾 Backup & Restore${NC}"
        echo "=================="
        echo ""
        echo "1) Backup PM2 Configuration"
        echo "2) Backup Cron Jobs"
        echo "3) Restore Cron Jobs"
        echo "4) กลับไปยังเมนูหลัก"
        echo ""
        read -p "เลือกตัวเลือก: " backup_choice
        
        case $backup_choice in
            1)
                echo "💾 Backup PM2 Configuration..."
                pm2 save
                pm2 startup
                echo -e "${GREEN}✅ Backup PM2 เสร็จสิ้น!${NC}"
                read -p "กด Enter เพื่อกลับ..."
                ;;
            2)
                echo "💾 Backup Cron Jobs..."
                crontab -l > backup-cron-$(date +%Y%m%d-%H%M%S).txt
                echo -e "${GREEN}✅ Backup Cron Jobs เสร็จสิ้น!${NC}"
                read -p "กด Enter เพื่อกลับ..."
                ;;
            3)
                echo "💾 Restore Cron Jobs..."
                ls -la backup-cron-*.txt 2>/dev/null || echo "ไม่พบไฟล์ backup"
                read -p "ใส่ชื่อไฟล์ backup: " backup_file
                if [ -f "$backup_file" ]; then
                    crontab "$backup_file"
                    echo -e "${GREEN}✅ Restore Cron Jobs เสร็จสิ้น!${NC}"
                else
                    echo -e "${RED}❌ ไม่พบไฟล์ backup${NC}"
                fi
                read -p "กด Enter เพื่อกลับ..."
                ;;
            4)
                return
                ;;
            *)
                echo -e "${RED}❌ ตัวเลือกไม่ถูกต้อง${NC}"
                read -p "กด Enter เพื่อกลับ..."
                ;;
        esac
    done
}

# ฟังก์ชันหลัก
main() {
    # ตรวจสอบว่าเป็น root หรือไม่
    if [ "$EUID" -ne 0 ]; then
        echo -e "${RED}⚠️  กรุณารันสคริปต์นี้ด้วย sudo หรือเป็น root user${NC}"
        echo "   sudo ./vps-automation-manager.sh"
        exit 1
    fi
    
    # ตรวจสอบว่า PM2 ติดตั้งหรือไม่
    if ! command -v pm2 &> /dev/null; then
        echo -e "${RED}⚠️  PM2 ไม่ได้ติดตั้งในระบบ${NC}"
        echo "   npm install -g pm2"
        exit 1
    fi
    
    # เปลี่ยนไปยังโฟลเดอร์โปรเจค
    cd /root/huaylotto
    
    # Main loop
    while true; do
        show_main_menu
        read -p "เลือกตัวเลือก: " choice
        
        case $choice in
            1)
                check_status
                ;;
            2)
                stop_automation
                ;;
            3)
                start_automation
                ;;
            4)
                restart_services
                ;;
            5)
                manage_pm2
                ;;
            6)
                manage_cron
                ;;
            7)
                monitor_resources
                ;;
            8)
                troubleshoot
                ;;
            9)
                backup_restore
                ;;
            0)
                echo -e "${GREEN}👋 ขอบคุณที่ใช้งาน!${NC}"
                exit 0
                ;;
            *)
                echo -e "${RED}❌ ตัวเลือกไม่ถูกต้อง${NC}"
                read -p "กด Enter เพื่อกลับไปยังเมนูหลัก..."
                ;;
        esac
    done
}

# เริ่มต้นโปรแกรม
main 