# 🔧 Scheduler System Fix Documentation

## 🎯 **ปัญหาที่แก้ไข**

### **🔴 ปัญหาเดิม:**
- **558 Scheduled Tasks** ส่วนใหญ่ค้างเป็น "pending" (548 tasks)
- **ไม่มี Background Task Processor** ที่ทำงานอย่างต่อเนื่อง
- **Tasks ถูกใส่ลง `task_queue` แต่ไม่มีใครมา process**
- **Cron Jobs ไม่ทำงานบน Linux VPS**

### **✅ สิ่งที่แก้ไขแล้ว:**
1. **สร้าง RPC Functions** สำหรับ task processing
2. **สร้าง Background Task Processor** ที่ทำงานอย่างต่อเนื่อง
3. **ปรับปรุง Task Manager UI** เพื่อแสดง queue status
4. **สร้าง PM2 ecosystem** สำหรับ production deployment
5. **สร้าง setup scripts** สำหรับ Linux VPS

---

## 🏗️ **โครงสร้างใหม่**

### **📁 ไฟล์ใหม่ที่สร้าง:**
```
lib/
├── background-task-processor.ts      # Background task processor
└── task-runner.ts                    # (ปรับปรุงแล้ว)

scripts/
├── start-background-processor.ts     # Script สำหรับรัน processor
└── setup-linux-vps.sh               # Setup script สำหรับ Linux VPS

ecosystem.background.config.js        # PM2 config สำหรับ processor
SCHEDULER_FIX_README.md               # Documentation นี้
```

### **🔧 RPC Functions ที่เพิ่ม:**
- `process_next_task()` - ดึง task ถัดไปจาก queue
- `complete_task()` - อัปเดตสถานะ task เมื่อเสร็จสิ้น
- `get_queue_status()` - ดูสถานะ queue

---

## 🚀 **วิธีการใช้งาน**

### **1. การรันบน Local Development**
```bash
# รัน background processor
bun run scripts/start-background-processor.ts

# หรือรัน Next.js app ตามปกติ
npm run dev
```

### **2. การ Deploy บน Linux VPS**
```bash
# 1. Clone repository
git clone <your-repo>
cd <your-project>

# 2. สร้าง .env.local
cp .env.example .env.local
# แก้ไข .env.local ให้ถูกต้อง

# 3. รัน setup script
chmod +x scripts/setup-linux-vps.sh
./scripts/setup-linux-vps.sh

# 4. ตรวจสอบสถานะ
pm2 status
pm2 logs lottery-background-processor
```

### **3. การจัดการด้วย PM2**
```bash
# ดูสถานะ
pm2 status

# ดู logs
pm2 logs lottery-background-processor
pm2 logs lottery-scheduler

# Restart services
pm2 restart lottery-background-processor
pm2 restart lottery-scheduler

# Stop services
pm2 stop lottery-background-processor
pm2 stop lottery-scheduler

# Monitor
pm2 monit
```

---

## 📊 **การตรวจสอบการทำงาน**

### **1. Task Manager UI**
- เข้าไปที่ `/admin/task-manager`
- ดูสถานะ **Queue Status** card
- ตรวจสอบ **Recent Logs** tab

### **2. Database Monitoring**
```sql
-- ดูสถานะ scheduled_tasks
SELECT status, COUNT(*) FROM scheduled_tasks GROUP BY status;

-- ดูสถานะ task_queue
SELECT status, COUNT(*) FROM task_queue GROUP BY status;

-- ดู recent task_logs
SELECT * FROM task_logs ORDER BY created_at DESC LIMIT 10;
```

### **3. คำสั่งสำหรับ Debug**
```bash
# ดู logs แบบ real-time
pm2 logs lottery-background-processor --lines 50

# ดูรายละเอียด process
pm2 show lottery-background-processor

# Restart หาก process ค้าง
pm2 restart lottery-background-processor
```

---

## 🔄 **Flow การทำงาน**

### **1. การ Enqueue Task**
```
Task Manager UI → กด "รัน" → startTask() → enqueue_task RPC → task_queue
```

### **2. การ Process Task**
```
Background Processor → process_next_task RPC → executeTask() → complete_task RPC
```

### **3. การ Schedule Task**
```
Cron Jobs → เรียก import/send scripts → สร้าง scheduled_tasks → enqueue_task
```

---

## 🐛 **Troubleshooting**

### **Problem: Background Processor ไม่ทำงาน**
```bash
# ตรวจสอบ process
pm2 status

# ดู logs
pm2 logs lottery-background-processor

# Restart
pm2 restart lottery-background-processor
```

### **Problem: Tasks ค้างเป็น pending**
```bash
# ตรวจสอบ queue
SELECT * FROM task_queue WHERE status = 'queued';

# ตรวจสอบ scheduled_tasks
SELECT * FROM scheduled_tasks WHERE status = 'pending' LIMIT 10;
```

### **Problem: Environment Variables**
```bash
# ตรวจสอบ .env.local
cat .env.local

# ตรวจสอบใน PM2
pm2 show lottery-background-processor
```

---

## 📈 **Performance Monitoring**

### **1. Key Metrics**
- **Queue Status**: queued, running, completed, failed
- **Task Completion Rate**: จำนวน tasks ที่เสร็จสิ้นต่อชั่วโมง
- **Error Rate**: จำนวน failed tasks
- **Processing Time**: เวลาที่ใช้ในการ process แต่ละ task

### **2. Monitoring Commands**
```bash
# ดูสถานะ queue
echo "SELECT status, COUNT(*) FROM task_queue GROUP BY status;" | psql $DATABASE_URL

# ดู recent performance
echo "SELECT status, COUNT(*) FROM task_logs WHERE created_at > NOW() - INTERVAL '1 hour' GROUP BY status;" | psql $DATABASE_URL
```

---

## 🎯 **Next Steps**

1. **Monitor การทำงาน** ใน production 1-2 วัน
2. **Adjust polling interval** ตามความเหมาะสม
3. **Add more metrics** สำหรับ monitoring
4. **Scale up** หากจำเป็น (เพิ่ม worker instances)

---

## 📞 **Support**

หากมีปัญหา:
1. ตรวจสอบ PM2 logs
2. ดูสถานะ database
3. ตรวจสอบ environment variables
4. Restart services หากจำเป็น

---

**✅ ระบบพร้อมใช้งาน!** 🎉 