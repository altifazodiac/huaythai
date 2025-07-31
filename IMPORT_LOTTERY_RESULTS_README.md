# Import Lottery Results Script - Setup Guide

## ไฟล์ที่ต้องมี

### 1. Environment Variables
สร้างไฟล์ `.env.local` ในโฟลเดอร์หลักของโปรเจค:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 2. Dependencies
ตรวจสอบว่าได้ติดตั้ง dependencies ที่จำเป็นแล้ว:

```bash
npm install playwright cheerio @supabase/supabase-js dotenv
# หรือ
bun install playwright cheerio @supabase/supabase-js dotenv
```

## การรันสคริปต์

### ใช้ Bun (แนะนำ)
```bash
bun run import-lottery-results-vps.ts
```

### ใช้ Node.js
```bash
npx ts-node import-lottery-results-vps.ts
```

## ปัญหาที่อาจเกิดขึ้น

### 1. Import Path Error
**ปัญหา:** `Cannot find module '@/lib/utils/lotteryMetadata'`
**แก้ไข:** เปลี่ยน import path เป็น relative path:
```typescript
import { LOTTERY_METADATA } from './lib/utils/lotteryMetadata';
```

### 2. Environment Variables Missing
**ปัญหา:** `Missing required environment variable`
**แก้ไข:** สร้างไฟล์ `.env.local` และใส่ค่า Supabase credentials

### 3. Supabase Connection Error
**ปัญหา:** `Failed to connect to Supabase`
**แก้ไข:** 
- ตรวจสอบ URL และ Service Role Key
- ตรวจสอบว่า Supabase project ยัง active อยู่
- ตรวจสอบ Network connectivity

### 4. Playwright Installation
**ปัญหา:** `playwright not found`
**แก้ไข:** ติดตั้ง Playwright browsers:
```bash
npx playwright install chromium
```

### 5. Timeout Issues
**ปัญหา:** Script หยุดทำงานกลางคัน
**แก้ไข:** 
- เพิ่ม timeout ใน browser launch options
- ตรวจสอบ network connection
- ลองรันใหม่ในเวลาที่ต่างกัน

## การ Debug

### 1. Enable Debug Logs
เพิ่ม debug logs ในโค้ด:
```typescript
console.log('[DEBUG] Current step:', step);
```

### 2. Test Individual Components
ทดสอบแต่ละส่วนแยกกัน:
- Test Supabase connection
- Test web scraping
- Test data processing

### 3. Check Database Tables
ตรวจสอบว่าตารางที่จำเป็นมีอยู่:
- `lottery_name_aliases`
- `lottery_api_results`
- `lottery_results`
- `drawing_schedules`
- `lottery_sub_types`

## Performance Tips

1. **Reduce Retry Count:** ลด `maxRetries` จาก 20 เป็น 5-10
2. **Increase Timeout:** เพิ่ม browser timeout เป็น 10 นาที
3. **Use Headless Mode:** ใช้ `headless: true` เพื่อประหยัด memory
4. **Optimize Browser Args:** เพิ่ม browser arguments เพื่อความเสถียร

## Monitoring

สคริปต์จะแสดง logs ดังนี้:
- ✅ Success messages
- ⚠️ Warning messages  
- ❌ Error messages
- 📊 Progress indicators

## Troubleshooting

### Common Issues:
1. **Network Issues:** ลองรันใหม่ในเวลาที่ต่างกัน
2. **Memory Issues:** ปิดโปรแกรมอื่นๆ ที่ใช้ memory มาก
3. **Rate Limiting:** ลองรันช้าลงหรือใช้ proxy
4. **Website Changes:** ตรวจสอบว่า website ยังมีโครงสร้างเดิมหรือไม่ 