# Dynamic Cron System สำหรับระบบหวยออนไลน์

## ภาพรวมของระบบ

ระบบ Dynamic Cron นี้จะ:
1. ดึงเวลาจาก `drawing_schedules.drawing_time` ในฐานข้อมูล
2. คัดกรองเวลาที่ซ้ำออก
3. สร้าง Cron Jobs อัตโนมัติ โดยเพิ่ม delay ตามที่กำหนด:
   - **Scraping**: เวลาหวยออก + 1 นาที
   - **Sending**: เวลาหวยออก + 3 นาที
4. อัปเดต crontab ใน VPS อัตโนมัติ

## ข้อดีของระบบใหม่

✅ **ความแม่นยำสูง**: ไม่มี delay 5-30 นาที เหมือน GitHub Actions  
✅ **ความยืดหยุ่น**: ปรับเวลาอัตโนมัติตามฐานข้อมูล  
✅ **ประสิทธิภาพ**: รันเฉพาะเวลาที่จำเป็น  
✅ **Logging**: บันทึก log แยกตามเวลาหวยออก  
✅ **Auto-update**: อัปเดตตารางเวลาอัตโนมัติทุกวัน  

---

## การติดตั้งและใช้งาน

### 1. เตรียม Environment Variables

สร้างไฟล์ `.env` ในโฟลเดอร์โปรเจกต์:

```bash
# สร้างไฟล์ .env
nano /root/huaylotto/.env
```

เพิ่มค่าต่อไปนี้:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
LINE_CHANNEL_ACCESS_TOKEN=your_line_token
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

### 2. ติดตั้ง Dependencies

```bash
cd /root/huaylotto
bun install
```

### 3. ทดสอบสคริปต์ก่อนตั้ง Cron

```bash
# ทดสอบ setup-dynamic-cron.ts
bun run setup-dynamic-cron.ts

# ทดสอบ import-lottery-results.ts
bun run import-lottery-results.ts

# ทดสอบ send-lottery-results.ts
bun run send-lottery-results.ts
```

### 4. ตั้งค่า Dynamic Cron (ครั้งแรก)

```bash
# รันสคริปต์ตั้งค่า cron อัตโนมัติ
bun run setup-dynamic-cron.ts
```

สคริปต์จะ:
- ดึงเวลาจาก `drawing_schedules`
- สร้าง cron jobs อัตโนมัติ
- อัปเดต crontab
- แสดงรายการ cron jobs ที่สร้าง

### 5. ตรวจสอบ Cron Jobs

```bash
# ดู crontab ปัจจุบัน
crontab -l

# ดู log การทำงาน
tail -f /root/huaylotto/logs/scrape-*.log
tail -f /root/huaylotto/logs/send-*.log
```

---

## ตัวอย่างการทำงาน

### สมมติ drawing_schedules มีเวลา:
- 09:30
- 14:30
- 16:30
- 19:30

### ระบบจะสร้าง Cron Jobs:

```bash
# Scraping jobs (เวลาหวยออก + 1 นาที)
31 9 * * * cd /root/huaylotto && [ENV_VARS] bun run import-lottery-results.ts >> /root/huaylotto/logs/scrape-0930.log 2>&1
31 14 * * * cd /root/huaylotto && [ENV_VARS] bun run import-lottery-results.ts >> /root/huaylotto/logs/scrape-1430.log 2>&1
31 16 * * * cd /root/huaylotto && [ENV_VARS] bun run import-lottery-results.ts >> /root/huaylotto/logs/scrape-1630.log 2>&1
31 19 * * * cd /root/huaylotto && [ENV_VARS] bun run import-lottery-results.ts >> /root/huaylotto/logs/scrape-1930.log 2>&1

# Sending jobs (เวลาหวยออก + 3 นาที)
33 9 * * * cd /root/huaylotto && [ENV_VARS] bun run send-lottery-results.ts >> /root/huaylotto/logs/send-0930.log 2>&1
33 14 * * * cd /root/huaylotto && [ENV_VARS] bun run send-lottery-results.ts >> /root/huaylotto/logs/send-1430.log 2>&1
33 16 * * * cd /root/huaylotto && [ENV_VARS] bun run send-lottery-results.ts >> /root/huaylotto/logs/send-1630.log 2>&1
33 19 * * * cd /root/huaylotto && [ENV_VARS] bun run send-lottery-results.ts >> /root/huaylotto/logs/send-1930.log 2>&1

# Auto-update job (ทุกวันเวลา 00:05)
5 0 * * * cd /root/huaylotto && [ENV_VARS] bun run setup-dynamic-cron.ts >> /root/huaylotto/logs/update-cron.log 2>&1
```

---

## การจัดการและบำรุงรักษา

### อัปเดตตารางเวลาใหม่

เมื่อมีการเปลี่ยนแปลงเวลาใน `drawing_schedules`:

```bash
# รันสคริปต์อัปเดตใหม่
bun run setup-dynamic-cron.ts
```

### ดู Log การทำงาน

```bash
# ดู log scraping
ls -la /root/huaylotto/logs/scrape-*.log

# ดู log sending
ls -la /root/huaylotto/logs/send-*.log

# ดู log อัปเดต cron
tail -f /root/huaylotto/logs/update-cron.log
```

### ลบ Cron Jobs (ถ้าต้องการ)

```bash
# ลบ crontab ทั้งหมด
crontab -r

# หรือแก้ไข crontab
crontab -e
```

---

## การแก้ไขปัญหา

### 1. สคริปต์ไม่ทำงาน

```bash
# ตรวจสอบ permissions
chmod +x /root/huaylotto/setup-dynamic-cron.ts
chmod +x /root/huaylotto/import-lottery-results.ts
chmod +x /root/huaylotto/send-lottery-results.ts

# ตรวจสอบ bun path
which bun
```

### 2. Environment Variables ไม่ถูกต้อง

```bash
# ตรวจสอบไฟล์ .env
cat /root/huaylotto/.env

# ทดสอบ load environment
cd /root/huaylotto && bun -e "console.log(process.env.NEXT_PUBLIC_SUPABASE_URL)"
```

### 3. Database Connection ผิดพลาด

```bash
# ทดสอบการเชื่อมต่อฐานข้อมูล
cd /root/huaylotto && bun -e "
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const { data, error } = await supabase.from('drawing_schedules').select('drawing_time').limit(1);
console.log('Data:', data, 'Error:', error);
"
```

---

## การย้ายจาก GitHub Actions

### 1. ปิดใช้งาน GitHub Actions

ใน repository GitHub:
- ไปที่ Settings → Actions → General
- เลือก "Disable actions" หรือลบไฟล์ `.github/workflows/`

### 2. ตรวจสอบความถูกต้อง

เปรียบเทียบผลลัพธ์:
- ก่อน: GitHub Actions (delay 5-30 นาที)
- หลัง: VPS Cron (delay 1-3 นาที)

### 3. Monitoring

```bash
# ติดตาม log real-time
tail -f /root/huaylotto/logs/*.log

# ตรวจสอบสถานะ cron service
systemctl status cron
```

---

## สรุป

ระบบ Dynamic Cron นี้จะช่วยให้:
- ดึงผลหวยได้ตรงเวลามากขึ้น (delay เพียง 1-3 นาที)
- จัดการตารางเวลาอัตโนมัติ
- ลด resource usage (รันเฉพาะเวลาที่จำเป็น)
- ติดตาม log ได้ง่ายขึ้น

**หมายเหตุ**: ระบบจะอัปเดต cron jobs อัตโนมัติทุกวันเวลา 00:05 เพื่อให้ตรงกับข้อมูลใหม่ในฐานข้อมูล 