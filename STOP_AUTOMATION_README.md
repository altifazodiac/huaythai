# 🛑 คู่มือการหยุดการทำงานอัตโนมัติ

## ภาพรวม

ระบบการทำงานอัตโนมัติของโปรเจคนี้ประกอบด้วย:
- **PM2 Processes**: Background Task Processor และ Scheduler
- **Cron Jobs**: การทำงานตามเวลาที่กำหนด
- **Background Scripts**: Scripts ที่ทำงานต่อเนื่อง

## 📁 ไฟล์สคริปต์

### Linux/Mac
- `stop-all-automation.sh` - หยุดทุกอย่างทันที
- `stop-specific-automation.sh` - หยุดเฉพาะส่วน (Interactive Menu)

### Windows
- `stop-all-automation.bat` - หยุดทุกอย่างทันที

## 🚀 วิธีการใช้งาน

### 1. หยุดทุกอย่างทันที (Linux/Mac)
```bash
chmod +x stop-all-automation.sh
./stop-all-automation.sh
```

### 2. หยุดเฉพาะส่วน (Linux/Mac)
```bash
chmod +x stop-specific-automation.sh
./stop-specific-automation.sh
```

### 3. หยุดทุกอย่างทันที (Windows)
```cmd
stop-all-automation.bat
```

## 📋 เมนูตัวเลือก (Interactive Mode)

เมื่อรัน `stop-specific-automation.sh` จะมีตัวเลือกดังนี้:

1. **หยุด PM2 processes ทั้งหมด**
   - หยุดและลบ PM2 processes ทั้งหมด

2. **หยุด Background Task Processor**
   - หยุดเฉพาะ Background Task Processor

3. **หยุด Scheduler**
   - หยุดเฉพาะ Scheduler

4. **ลบ Cron Jobs ทั้งหมด**
   - ลบ cron jobs ทั้งหมดออกจากระบบ

5. **หยุด Lottery Scraping Jobs**
   - หยุดการทำงานของ import-lottery-results

6. **หยุด Lottery Sending Jobs**
   - หยุดการทำงานของ send-lottery-results

7. **หยุดทุกอย่าง (Full Stop)**
   - หยุดทุกอย่างพร้อมกัน

8. **ตรวจสอบสถานะ**
   - แสดงสถานะปัจจุบันของระบบ

9. **ออกจากโปรแกรม**
   - ออกจากสคริปต์

## 🔧 คำสั่งเพิ่มเติม

### ตรวจสอบสถานะ PM2
```bash
pm2 status
```

### ดู Cron Jobs
```bash
crontab -l
```

### ตรวจสอบ Background Processes
```bash
ps aux | grep -E "(background|scheduler|lottery)" | grep -v grep
```

### ตรวจสอบ Node.js Processes
```bash
ps aux | grep node | grep -v grep
```

## 🔄 การเริ่มต้นใหม่

หลังจากหยุดการทำงานแล้ว หากต้องการเริ่มต้นใหม่:

### 1. เริ่ม PM2 Processes
```bash
pm2 start ecosystem.background.config.js
pm2 start ecosystem.scheduler.config.js
```

### 2. เริ่ม Cron Jobs
```bash
bun run setup-dynamic-cron.ts
```

### 3. ตรวจสอบสถานะ
```bash
pm2 status
crontab -l
```

## ⚠️ ข้อควรระวัง

1. **การหยุด PM2**: จะหยุดการทำงานของ Background Task Processor และ Scheduler
2. **การลบ Cron Jobs**: จะลบการทำงานตามเวลาทั้งหมด
3. **การหยุด Processes**: อาจส่งผลต่อการทำงานของระบบที่กำลังดำเนินอยู่

## 🆘 การแก้ไขปัญหา

### ปัญหา: PM2 ไม่หยุด
```bash
pm2 kill
pm2 resurrect
```

### ปัญหา: Processes ยังทำงานอยู่
```bash
pkill -f "background-task-processor"
pkill -f "scheduler"
```

### ปัญหา: Cron Jobs ไม่หาย
```bash
crontab -r
```

## 📞 การติดต่อ

หากมีปัญหาหรือต้องการความช่วยเหลือ กรุณาติดต่อทีมพัฒนา 