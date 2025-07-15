# การแก้ไขปัญหา Scraper - File URL path must be absolute

## ปัญหาที่พบ
ระบบ scraper เกิดข้อผิดพลาด `TypeError: File URL path must be absolute` เนื่องจาก:
1. การใช้ `chromium` จาก `playwright` ในสภาพแวดล้อม serverless
2. ไม่มีการระบุ executable path ที่ถูกต้อง
3. การจัดการ timeout และ error ที่ไม่เหมาะสม

## การแก้ไข

### 1. เปลี่ยนการ import
```typescript
// เดิม
import { chromium } from 'playwright';

// ใหม่
import chromium from '@sparticuz/chromium';
import playwright from 'playwright-core';
```

### 2. แก้ไขการ launch browser
```typescript
// เดิม
browser = await chromium.launch({ 
  headless: true, 
  args: ['--disable-gpu', '--no-sandbox'],
  timeout: 360000 
});

// ใหม่
browser = await playwright.chromium.launch({ 
  headless: true, 
  args: chromium.args,
  executablePath: await chromium.executablePath(),
  timeout: 360000 
});
```

### 3. ปรับปรุงการตั้งค่า context
```typescript
const context = await browser.newContext({ 
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
  viewport: { width: 1280, height: 720 },
  ignoreHTTPSErrors: true,
  extraHTTPHeaders: {
    'Accept-Language': 'th-TH,th;q=0.9,en;q=0.8'
  }
});
```

### 4. ปรับปรุงการจัดการ timeout
```typescript
// ลด timeout และเปลี่ยน waitUntil
await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForTimeout(2000); // ลดจาก 3000ms
```

### 5. เพิ่มการจัดการ error ที่ดีขึ้น
```typescript
// ใน finally block
try {
  await page.close();
} catch (closeError) {
  console.error('[Scraper] Error closing page:', closeError);
}

// สำหรับ browser
if (browser) {
  try {
    await browser.close();
  } catch (closeError) {
    console.error('[API] Error closing browser:', closeError);
  }
}
```

## การทดสอบ

### รันการทดสอบ
```bash
npm run test:scraper
# หรือ
bun run test:scraper
```

### ไฟล์ทดสอบ
- `test-scraper.js` - ไฟล์ทดสอบการทำงานของ scraper

## ข้อดีของการแก้ไข

1. **รองรับ Serverless**: ใช้ `@sparticuz/chromium` ที่ออกแบบมาสำหรับ serverless environments
2. **ลด Timeout**: ลดโอกาสเกิด timeout error
3. **การจัดการ Error ที่ดีขึ้น**: ป้องกันการ crash ของระบบ
4. **ประสิทธิภาพที่ดีขึ้น**: ใช้ `domcontentloaded` แทน `networkidle`

## การใช้งาน

หลังจากแก้ไขแล้ว ระบบ scraper จะทำงานได้ปกติในสภาพแวดล้อม serverless และ production environments ต่างๆ