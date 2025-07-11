# 🐛 Debug Background Processor

## 🔍 **ปัญหาที่พบ:**
```
│ 2  │ lottery-backgroun… │ cluster  │ 0    │         │ 0%       │ 0b       │
```
- Process แสดงว่า "online" แต่ memory เป็น 0b
- ไม่มี status icon แสดง
- อาจเกิดจาก process crash หรือไม่สามารถเริ่มต้นได้

---

## 🔧 **ขั้นตอนการ Debug:**

### **1. ตรวจสอบ Logs**
```bash
# ดู logs ของ background processor
pm2 logs lottery-background-processor --lines 50

# ดู logs แบบ real-time
pm2 logs lottery-background-processor --follow
```

### **2. ตรวจสอบรายละเอียด Process**
```bash
# ดูข้อมูลละเอียดของ process
pm2 show lottery-background-processor

# ดูสถานะทั้งหมด
pm2 status
```

### **3. ตรวจสอบ Environment Variables**
```bash
# ตรวจสอบ .env.local
cat .env.local

# ตรวจสอบว่ามีครบ 4 ตัวแปรหลัก:
# - NEXT_PUBLIC_SUPABASE_URL
# - SUPABASE_SERVICE_ROLE_KEY  
# - LINE_CHANNEL_ACCESS_TOKEN
# - NEXT_PUBLIC_SUPABASE_ANON_KEY
```

### **4. ทดสอบรัน Manual**
```bash
# ลองรัน background processor แบบ manual
cd ~/huaylotto
bun run scripts/start-background-processor.ts

# หากมี error จะเห็นทันที
```

---

## 🛠️ **วิธีแก้ไขที่เป็นไปได้:**

### **Problem 1: Missing Dependencies**
```bash
# ติดตั้ง dependencies ใหม่
bun install

# ตรวจสอบว่า Bun ทำงานได้
bun --version
```

### **Problem 2: Environment Variables**
```bash
# ตรวจสอบว่า .env.local ถูกต้อง
ls -la .env.local

# ถ้าไม่มี ให้สร้างใหม่
cp .env.example .env.local
nano .env.local
```

### **Problem 3: Permission Issues**
```bash
# ตรวจสอบ permission ของไฟล์
ls -la scripts/start-background-processor.ts

# ให้สิทธิ์ execute หากจำเป็น
chmod +x scripts/start-background-processor.ts
```

### **Problem 4: Port/Database Connection**
```bash
# ทดสอบการเชื่อมต่อ database
echo "SELECT 1;" | psql $DATABASE_URL

# หรือทดสอบ API
curl -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
     "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/scheduled_tasks?select=count"
```

---

## 🔄 **วิธีแก้ไขและ Restart:**

### **Method 1: Restart Process**
```bash
# Stop และ Start ใหม่
pm2 stop lottery-background-processor
pm2 start ecosystem.background.config.js

# หรือ restart
pm2 restart lottery-background-processor
```

### **Method 2: Re-deploy**
```bash
# ลบ process เก่า
pm2 delete lottery-background-processor

# เริ่มใหม่
pm2 start ecosystem.background.config.js

# Save configuration
pm2 save
```

### **Method 3: Manual Debug**
```bash
# รัน manual เพื่อดู error
cd ~/huaylotto
NODE_ENV=production bun run scripts/start-background-processor.ts
```

---

## 📊 **ตรวจสอบการทำงาน:**

### **Healthy Process ควรเป็น:**
```
│ 2  │ lottery-backgroun… │ cluster  │ 0    │ online    │ 0-5%     │ 20-50mb  │
```

### **Signs ว่าทำงานได้:**
- Memory > 0b (ปกติ 20-50mb)
- Status = "online" 
- CPU usage 0-5% (เวลา idle)
- ไม่มี restart ซ้ำๆ

### **Logs ที่ดีควรเป็น:**
```
[2025-XX-XX XX:XX:XX] [TaskProcessor] Background Task Processor initialized
[2025-XX-XX XX:XX:XX] [TaskProcessor] Starting background task processor...
```

---

## 🚨 **Common Issues:**

### **1. Environment Variables ผิด**
- ตรวจสอบ SUPABASE_SERVICE_ROLE_KEY ไม่ใช่ anon key
- URL ต้องมี https://

### **2. Database Connection ล้มเหลว**
- ตรวจสอบ Supabase project ว่า active
- ตรวจสอบ RLS policies

### **3. Bun/Node Version**
- ใช้ Bun เวอร์ชันล่าสุด
- อาจต้องใช้ Node.js แทน

---

## 🎯 **Quick Fix Commands:**

```bash
# 1. ตรวจสอบ status
pm2 status

# 2. ดู logs
pm2 logs lottery-background-processor --lines 20

# 3. Restart
pm2 restart lottery-background-processor

# 4. หากยังไม่ได้ ลองรัน manual
cd ~/huaylotto && bun run scripts/start-background-processor.ts

# 5. ตรวจสอบ environment
printenv | grep SUPABASE
```

---

**💡 Tip:** หากยังแก้ไม่ได้ ให้รัน manual mode ก่อนเพื่อดู error message แล้วค่อยแก้ไขเฉพาะจุด 