# ระบบ Scheduler ใหม่สำหรับ Lottery System

## ภาพรวม

ระบบ Scheduler ใหม่นี้ได้รับการออกแบบมาเพื่อแก้ไขปัญหาของระบบ cron jobs เดิมที่ไม่ทำงานบน Windows และมีข้อจำกัดต่างๆ

### ข้อดีของระบบใหม่

✅ **รองรับ Cross-Platform**: ทำงานได้ทั้ง Windows, Linux, และ macOS  
✅ **Auto-Initialize**: เริ่มต้นอัตโนมัติเมื่อแอปพลิเคชันเริ่มทำงาน  
✅ **Real-time Monitoring**: สามารถตรวจสอบสถานะผ่าน Web UI  
✅ **Database-driven**: ใช้ฐานข้อมูลเป็นหลักในการจัดการ tasks  
✅ **Error Handling**: จัดการข้อผิดพลาดและ retry อัตโนมัติ  
✅ **Flexible Scheduling**: ปรับเวลาตามข้อมูลในฐานข้อมูล  
✅ **Comprehensive Logging**: บันทึก logs ทุกการทำงาน  

---

## สถาปัตยกรรมระบบ

### 1. Core Components

```
┌─────────────────────────────────────────────────────────┐
│                   Next.js Application                  │
├─────────────────────────────────────────────────────────┤
│  SchedulerInitializer (Auto-start on app launch)       │
├─────────────────────────────────────────────────────────┤
│                  Task Scheduler API                    │
│  - /api/scheduler (Main scheduler control)             │
│  - /api/import-lottery-results (Scraping tasks)        │
│  - /api/send-lottery-results (Sending tasks)           │
├─────────────────────────────────────────────────────────┤
│                   Task Manager                         │
│  - TaskScheduler Class (In-memory scheduler)           │
│  - Database-driven task management                     │
├─────────────────────────────────────────────────────────┤
│                    Database Tables                     │
│  - scheduled_tasks (Task definitions)                  │
│  - task_logs (Execution history)                       │
│  - drawing_schedules (Source of truth)                 │
└─────────────────────────────────────────────────────────┘
```

### 2. Task Flow

```
1. App starts → SchedulerInitializer initializes
2. Scheduler reads drawing_schedules from database
3. Creates scheduled_tasks with calculated times
4. Every 30 seconds: checks for pending tasks
5. Executes eligible tasks (scrape/send/cleanup)
6. Logs execution results
7. Updates next run times
```

---

## การติดตั้งและใช้งาน

### 1. ข้อกำหนดระบบ

- **Node.js** 18+ หรือ **Bun** latest
- **Supabase** database ที่ตั้งค่าแล้ว
- **LINE Bot** token (สำหรับส่งข้อความ)
- **Internet connection** (สำหรับ scraping)

### 2. ตั้งค่า Environment Variables

สร้างไฟล์ `.env` ในโฟลเดอร์ root:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# LINE Bot Configuration
LINE_CHANNEL_ACCESS_TOKEN=your_line_token

# Internal API Security
INTERNAL_API_KEY=your_secure_internal_key

# Application URL (for internal API calls)
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### 3. รัน Database Migrations

```bash
# Apply migrations to create scheduler tables
bun run supabase migration up
```

### 4. เริ่มต้นระบบ

#### สำหรับ Windows (Development):
```bash
# ใช้ batch script
scripts\start-scheduler-windows.bat

# หรือรันด้วยมือ
bun run dev
```

#### สำหรับ Linux (Production):
```bash
# ทำให้ script รันได้
chmod +x scripts/start-scheduler-linux.sh

# รัน script
./scripts/start-scheduler-linux.sh

# หรือรันด้วยมือ
NODE_ENV=production bun run build && bun run start
```

---

## การใช้งานผ่าน Web UI

### 1. Task Manager Dashboard

เข้าถึงได้ที่: `http://localhost:3000/admin/task-manager`

**คุณสมบัติ:**
- ดูสถานะ Scheduler (running/stopped)
- รายการ Scheduled Tasks ทั้งหมด
- ประวัติการทำงาน (Recent Logs)
- ควบคุม Scheduler (start/stop/refresh)
- รัน Tasks ทันที

### 2. การจัดการ Tasks

**การเริ่ม/หยุด Scheduler:**
```
1. เข้าไปที่ Task Manager
2. คลิกปุ่ม "เริ่ม Scheduler" หรือ "หยุด Scheduler"
3. ระบบจะอัปเดตสถานะทันที
```

**การรัน Task ทันที:**
```
1. ไปที่แท็บ "Scheduled Tasks"
2. คลิกปุ่ม "รันทันที" ในแถวของ task ที่ต้องการ
3. ตรวจสอบผลลัพธ์ในแท็บ "Recent Logs"
```

**การอัปเดต Schedules:**
```
1. แก้ไขข้อมูลในตาราง drawing_schedules
2. คลิกปุ่ม "อัปเดต Schedules" ใน Task Manager
3. ระบบจะสร้าง tasks ใหม่ตามข้อมูลที่อัปเดต
```

---

## การทำงานของ Tasks

### 1. Scrape Tasks
- **ทำงานเมื่อ**: เวลาออกหวย + 1 นาที
- **หน้าที่**: ดึงข้อมูลผลหวยจากเว็บไซต์
- **API Endpoint**: `/api/import-lottery-results`
- **ผลลัพธ์**: บันทึกลง `lottery_api_results` และ `lottery_results`

### 2. Send Tasks
- **ทำงานเมื่อ**: เวลาออกหวย + 3 นาที
- **หน้าที่**: ส่งผลหวยไปยัง LINE
- **API Endpoint**: `/api/send-lottery-results`
- **ผลลัพธ์**: ส่งข้อความใน LINE และอัปเดต `is_sent_to_line`

### 3. Cleanup Tasks
- **ทำงานเมื่อ**: ทุกวันเวลา 00:30
- **หน้าที่**: ลบข้อมูล logs และ tasks เก่า
- **ผลลัพธ์**: ระบบสะอาดและมีประสิทธิภาพ

---

## การ Monitor และ Debug

### 1. การตรวจสอบ Logs

**ผ่าน Web UI:**
```
1. เข้าไปที่ Task Manager
2. ดูแท็บ "Recent Logs"
3. ตรวจสอบ status และ error messages
```

**ผ่าน Database:**
```sql
-- ดู task logs ล่าสุด
SELECT * FROM task_logs 
ORDER BY execution_time DESC 
LIMIT 20;

-- ดู tasks ที่ failed
SELECT * FROM task_logs 
WHERE status = 'failed' 
ORDER BY execution_time DESC;
```

**ผ่าน Browser Console:**
```
1. เปิด Developer Tools (F12)
2. ดู Console tab
3. ตรวจสอบ logs จาก SchedulerInitializer
```

### 2. การแก้ไขปัญหา

**Scheduler ไม่เริ่มต้น:**
```
1. ตรวจสอบ environment variables
2. ตรวจสอบการเชื่อมต่อ database
3. ดู browser console สำหรับ errors
4. ลองรีสตาร์ทแอปพลิเคชัน
```

**Tasks ไม่ทำงาน:**
```
1. ตรวจสอบว่า Scheduler กำลัง running
2. ดูข้อมูลใน scheduled_tasks table
3. ตรวจสอบ next_run times
4. ดู task_logs สำหรับ error messages
```

**API calls ล้มเหลว:**
```
1. ตรวจสอบ INTERNAL_API_KEY
2. ตรวจสอบ NEXT_PUBLIC_SITE_URL
3. ตรวจสอบ network connectivity
4. ดู API logs ใน browser network tab
```

---

## API Reference

### 1. Scheduler Control API

**GET /api/scheduler**

Query Parameters:
- `action`: `status` | `init` | `stop` | `process`

Examples:
```bash
# ตรวจสอบสถานะ
curl "http://localhost:3000/api/scheduler?action=status"

# เริ่มต้น scheduler
curl "http://localhost:3000/api/scheduler?action=init"

# หยุด scheduler
curl "http://localhost:3000/api/scheduler?action=stop"

# ประมวลผล pending tasks
curl "http://localhost:3000/api/scheduler?action=process"
```

**POST /api/scheduler**

Body:
```json
{
  "action": "update_schedules" | "run_task",
  "taskId": "task_id_here" // required for run_task
}
```

### 2. Import API

**GET /api/import-lottery-results**

Query Parameters:
- `draw_date`: วันที่ดึงข้อมูล (YYYY-MM-DD)
- `drawing_time`: เวลาที่ออกหวย (HH:mm:ss)
- `lottery_sub_type_id`: ID ของประเภทหวย

**POST /api/import-lottery-results**

Headers:
- `x-api-key`: INTERNAL_API_KEY

Body:
```json
{
  "drawing_time": "09:30:00",
  "lottery_sub_type_id": 123,
  "action": "scrape_and_import" | "import_only"
}
```

### 3. Send API

**GET /api/send-lottery-results**

Query Parameters:
- `draw_date`: วันที่ส่งข้อมูล (YYYY-MM-DD)
- `drawing_time`: เวลาที่ออกหวย (HH:mm:ss)
- `lottery_sub_type_id`: ID ของประเภทหวย

**POST /api/send-lottery-results**

Headers:
- `x-api-key`: INTERNAL_API_KEY

Body:
```json
{
  "drawing_time": "09:30:00",
  "lottery_sub_type_id": 123,
  "draw_date": "2024-01-01"
}
```

---

## Database Schema

### 1. scheduled_tasks

```sql
CREATE TABLE scheduled_tasks (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT CHECK (type IN ('scrape', 'send', 'cleanup')),
    scheduled_time TIME NOT NULL,
    drawing_time TIME NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
    last_run TIMESTAMP WITH TIME ZONE,
    next_run TIMESTAMP WITH TIME ZONE NOT NULL,
    schedule_id INTEGER REFERENCES drawing_schedules(schedule_id),
    lottery_sub_type_id INTEGER REFERENCES lottery_sub_types(lottery_sub_type_id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 2. task_logs

```sql
CREATE TABLE task_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    task_id TEXT NOT NULL REFERENCES scheduled_tasks(id),
    task_name TEXT NOT NULL,
    task_type TEXT NOT NULL,
    status TEXT CHECK (status IN ('completed', 'failed')),
    error_message TEXT,
    execution_time TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## การปรับแต่งและขยายระบบ

### 1. เพิ่ม Task Type ใหม่

1. อัปเดต type enum ใน database
2. เพิ่ม case ใน `TaskScheduler.processPendingTasks()`
3. สร้าง API endpoint สำหรับ task ใหม่
4. อัปเดต UI ใน Task Manager

### 2. ปรับแต่งช่วงเวลา

แก้ไขใน `TaskScheduler.updateScheduledTasks()`:
```typescript
// เปลี่ยนจาก 1 นาทีเป็น 2 นาที
const scrapeTime = addMinutes(new Date(2024, 0, 1, hour, minute), 2);

// เปลี่ยนจาก 3 นาทีเป็น 5 นาที
const sendTime = addMinutes(new Date(2024, 0, 1, hour, minute), 5);
```

### 3. เพิ่ม Notification Channels

1. สร้าง function ใหม่ใน send API
2. เพิ่มการตั้งค่าใน environment variables
3. อัปเดต `sendToLine()` function

---

## การ Deploy

### 1. Development Environment

```bash
# Clone repository
git clone <repository>
cd huaylotto

# Install dependencies
bun install

# Setup environment
cp .env.example .env
# แก้ไข .env ให้ถูกต้อง

# Run migrations
bun run supabase migration up

# Start development server
bun run dev
```

### 2. Production Environment (Linux VPS)

```bash
# Prerequisites
sudo apt update
sudo apt install curl unzip

# Install Bun
curl -fsSL https://bun.sh/install | bash
source ~/.bashrc

# Deploy application
git clone <repository>
cd huaylotto

# Setup environment
cp .env.example .env
# แก้ไข .env สำหรับ production

# Install dependencies
bun install

# Run migrations
bun run supabase migration up

# Build application
bun run build

# Start with production script
chmod +x scripts/start-scheduler-linux.sh
./scripts/start-scheduler-linux.sh
```

### 3. Process Management (Linux)

**ใช้ PM2:**
```bash
# Install PM2
npm install -g pm2

# Create ecosystem file
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'lottery-scheduler',
    script: 'bun',
    args: 'run start',
    env: {
      NODE_ENV: 'production'
    }
  }]
}
EOF

# Start with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

**ใช้ systemd:**
```bash
# Create service file
sudo cat > /etc/systemd/system/lottery-scheduler.service << EOF
[Unit]
Description=Lottery Scheduler
After=network.target

[Service]
Type=simple
User=your-user
WorkingDirectory=/path/to/huaylotto
Environment=NODE_ENV=production
ExecStart=/home/your-user/.bun/bin/bun run start
Restart=always

[Install]
WantedBy=multi-user.target
EOF

# Enable and start service
sudo systemctl enable lottery-scheduler
sudo systemctl start lottery-scheduler
sudo systemctl status lottery-scheduler
```

---

## Best Practices

### 1. Security

- ✅ ใช้ INTERNAL_API_KEY สำหรับ internal API calls
- ✅ ตั้งค่า RLS (Row Level Security) ใน Supabase
- ✅ ไม่ expose sensitive information ใน logs
- ✅ ใช้ HTTPS ใน production

### 2. Performance

- ✅ ใช้ database indexes ที่เหมาะสม
- ✅ ลบข้อมูล logs เก่าออกเป็นประจำ
- ✅ ใช้ connection pooling สำหรับ database
- ✅ Monitor memory usage ของ scheduler

### 3. Reliability

- ✅ ใช้ try-catch ทุกที่ที่อาจเกิด error
- ✅ Log ทุกการทำงานสำคัญ
- ✅ ใช้ retry mechanism สำหรับ external API calls
- ✅ ตั้งค่า monitoring และ alerting

### 4. Maintenance

- ✅ Backup database เป็นประจำ
- ✅ Update dependencies เป็นประจำ
- ✅ Monitor disk space สำหรับ logs
- ✅ ทดสอบระบบเป็นประจำ

---

## Troubleshooting Guide

### Problem: "Scheduler not running"

**สาเหตุ:**
- แอปพลิเคชันยังไม่เริ่มต้นเสร็จ
- Database connection ล้มเหลว
- Environment variables ไม่ถูกต้อง

**วิธีแก้:**
1. ตรวจสอบ browser console
2. ตรวจสอบ `.env` file
3. ทดสอบ database connection
4. รีสตาร์ทแอปพลิเคชัน

### Problem: "Tasks not executing"

**สาเหตุ:**
- Scheduler ไม่ได้รัน
- Next run time ยังไม่ถึง
- Task เกิด error

**วิธีแก้:**
1. ตรวจสอบสถานะ Scheduler
2. ดูข้อมูลใน `scheduled_tasks`
3. ตรวจสอบ `task_logs` สำหรับ errors
4. รัน task ทันทีเพื่อทดสอบ

### Problem: "API calls failing"

**สาเหตุ:**
- INTERNAL_API_KEY ไม่ถูกต้อง
- URL configuration ผิด
- Network issues

**วิธีแก้:**
1. ตรวจสอบ environment variables
2. ทดสอบ API endpoints ด้วยมือ
3. ตรวจสอบ network connectivity
4. ดู API response ใน logs

---

## สรุป

ระบบ Scheduler ใหม่นี้ให้ความยืดหยุ่นและความน่าเชื่อถือมากกว่าระบบ cron jobs เดิม โดยเฉพาะการรองรับ Windows และการมี Web UI สำหรับการจัดการ

หากมีปัญหาหรือต้องการความช่วยเหลือเพิ่มเติม กรุณาตรวจสอบ:
1. Browser console logs
2. Task Manager dashboard
3. Database logs ใน Supabase
4. API endpoints ด้วย tools เช่น Postman

ระบบนี้ออกแบบมาให้ทำงานได้อย่างต่อเนื่องและมีความยืดหยุ่นสูง เหมาะสำหรับการใช้งานจริงในสภาพแวดล้อมทั้ง development และ production 