# 🖥️ คู่มือการจัดการการทำงานอัตโนมัติบน Linux VPS

## 📋 ภาพรวม

คู่มือนี้สำหรับการจัดการการทำงานอัตโนมัติของระบบหวยออนไลน์บน Cloud VPS Linux

## 📁 ไฟล์สคริปต์สำหรับ VPS

### 1. หยุดการทำงาน
- `stop-vps-automation.sh` - หยุดการทำงานทั้งหมด

### 2. เริ่มต้นการทำงาน
- `start-vps-automation.sh` - เริ่มต้นการทำงานทั้งหมด

### 3. ตรวจสอบสถานะ
- `check-vps-status.sh` - ตรวจสอบสถานะระบบ

## 🚀 วิธีการใช้งาน

### การเชื่อมต่อ VPS
```bash
ssh root@your-vps-ip
cd /root/huaylotto
```

### 1. หยุดการทำงานทั้งหมด
```bash
chmod +x stop-vps-automation.sh
sudo ./stop-vps-automation.sh
```

### 2. เริ่มต้นการทำงานทั้งหมด
```bash
chmod +x start-vps-automation.sh
sudo ./start-vps-automation.sh
```

### 3. ตรวจสอบสถานะ
```bash
chmod +x check-vps-status.sh
sudo ./check-vps-status.sh
```

## 📊 คำสั่งตรวจสอบสถานะ

### ตรวจสอบ PM2
```bash
pm2 status
pm2 logs
pm2 monit
```

### ตรวจสอบ Cron Jobs
```bash
crontab -l
```

### ตรวจสอบ Processes
```bash
ps aux | grep -E "(background|scheduler|lottery)"
ps aux | grep node
ps aux | grep bun
```

### ตรวจสอบ Port
```bash
lsof -i:3000
lsof -i:3001
netstat -tuln | grep -E ":(3000|3001)"
```

### ตรวจสอบ System Resources
```bash
free -h
df -h
top
htop
```

## 🔧 การแก้ไขปัญหา

### ปัญหา: PM2 ไม่หยุด
```bash
pm2 kill
pm2 resurrect
```

### ปัญหา: Processes ยังทำงานอยู่
```bash
pkill -f "background-task-processor"
pkill -f "scheduler"
pkill -f "import-lottery-results"
pkill -f "send-lottery-results"
```

### ปัญหา: Cron Jobs ไม่หาย
```bash
crontab -r
```

### ปัญหา: Port ถูกใช้งาน
```bash
lsof -ti:3001 | xargs kill -9
lsof -ti:3000 | xargs kill -9
```

### ปัญหา: Memory เต็ม
```bash
free -h
swapoff -a && swapon -a
```

## 📈 การ Monitor ระบบ

### 1. Real-time Monitoring
```bash
# ดู PM2 logs แบบ real-time
pm2 logs --lines 50

# ดู system resources
htop

# ดู network connections
netstat -tuln
```

### 2. Log Files
```bash
# ดู log files
ls -la /root/huaylotto/logs/
tail -f /root/huaylotto/logs/background-processor-out.log
tail -f /root/huaylotto/logs/scheduler-out.log
```

### 3. System Health Check
```bash
# ตรวจสอบ disk usage
df -h

# ตรวจสอบ memory usage
free -h

# ตรวจสอบ load average
uptime
```

## 🔄 การ Restart Services

### Restart PM2 Processes
```bash
pm2 restart all
pm2 restart lottery-background-processor
pm2 restart huaylotto-scheduler
```

### Restart Cron Jobs
```bash
# ลบ cron jobs เก่า
crontab -r

# สร้าง cron jobs ใหม่
bun run setup-dynamic-cron.ts
```

### Restart System
```bash
# Restart VPS
reboot

# หลังจาก restart ให้ตรวจสอบ
pm2 status
crontab -l
```

## 💾 การ Backup และ Restore

### Backup PM2 Configuration
```bash
pm2 save
pm2 startup
```

### Backup Cron Jobs
```bash
crontab -l > backup-cron.txt
```

### Restore Cron Jobs
```bash
crontab backup-cron.txt
```

## ⚠️ ข้อควรระวัง

1. **Root Access**: สคริปต์ทั้งหมดต้องรันด้วย sudo หรือ root user
2. **Dependencies**: ต้องติดตั้ง PM2 และ Bun ก่อนใช้งาน
3. **Project Path**: โปรเจคต้องอยู่ที่ `/root/huaylotto`
4. **Log Files**: ไฟล์ log จะถูกเก็บใน `/root/huaylotto/logs/`
5. **Port Usage**: ระบบใช้ port 3000 และ 3001

## 🆘 การติดต่อ

หากมีปัญหาหรือต้องการความช่วยเหลือ:
- ตรวจสอบ log files ใน `/root/huaylotto/logs/`
- ใช้คำสั่ง `./check-vps-status.sh` เพื่อตรวจสอบสถานะ
- ติดต่อทีมพัฒนา

## 📝 ตัวอย่างการใช้งาน

### สถานการณ์: หยุดการทำงานเพื่อประหยัดทรัพยากร
```bash
# 1. เชื่อมต่อ VPS
ssh root@your-vps-ip

# 2. ไปยังโฟลเดอร์โปรเจค
cd /root/huaylotto

# 3. หยุดการทำงาน
sudo ./stop-vps-automation.sh

# 4. ตรวจสอบสถานะ
sudo ./check-vps-status.sh
```

### สถานการณ์: เริ่มต้นการทำงานใหม่
```bash
# 1. เชื่อมต่อ VPS
ssh root@your-vps-ip

# 2. ไปยังโฟลเดอร์โปรเจค
cd /root/huaylotto

# 3. เริ่มต้นการทำงาน
sudo ./start-vps-automation.sh

# 4. ตรวจสอบสถานะ
sudo ./check-vps-status.sh
```

---

**🕐 อัปเดตล่าสุด**: $(date)
**👤 ผู้จัดทำ**: System Administrator
**✅ สถานะ**: พร้อมใช้งาน 