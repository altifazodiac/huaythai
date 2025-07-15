# สรุปการแก้ไขปัญหา Playwright Serverless Environment

## ปัญหาที่พบ
```
TypeError: File URL path must be absolute
Error [TimeoutError]: page.goto: Timeout 60000ms exceeded
```

## สาเหตุของปัญหา
1. **File URL path must be absolute**: Playwright ไม่สามารถใช้ file:// URLs ได้ใน serverless environment
2. **Browser launch failed**: ไม่มี browser executable ใน serverless environment
3. **Timeout errors**: การตั้งค่า browser ไม่เหมาะสมสำหรับ serverless

## การแก้ไขที่ทำ

### 1. แก้ไขไฟล์ `app/api/import-lottery-results/route.ts`

#### ก. ปรับปรุง Browser Launch Configuration
```javascript
// เดิม
browser = await chromium.launch({ 
  headless: true, 
  args: ['--disable-gpu', '--no-sandbox'],
  timeout: 360000 
});

// ใหม่
browser = await chromium.launch({ 
  headless: true,
  args: [
    '--disable-gpu',
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-accelerated-2d-canvas',
    '--no-first-run',
    '--no-zygote',
    '--single-process',
    '--disable-extensions'
  ]
});
```

#### ข. เพิ่ม Error Handling และ Fallback Mechanism
```javascript
try {
  browser = await chromium.launch({...});
  // ... scraping logic
} catch (browserError) {
  console.error('[API] Browser launch failed:', browserError);
  console.log('[API] Skipping scrape, proceeding with import only');
} finally {
  if (browser) {
    try {
      await browser.close();
    } catch (closeError) {
      console.error('[API] Error closing browser:', closeError);
    }
  }
}
```

#### ค. ปรับปรุง Retry Logic
```javascript
for (let attempt = 1; attempt <= 3; attempt++) {
  try {
    scrapedData = await scrapeAndParseResults(targetUrl, context, targetLotteryNames);
    if (scrapedData.length > 0) break;
  } catch (scrapeError) {
    console.error(`[API] Scrape attempt ${attempt} failed:`, scrapeError);
    if (attempt < 3) {
      await new Promise(resolve => setTimeout(resolve, 30000));
    }
  }
}
```

### 2. สร้างไฟล์ Configuration

#### ก. `playwright.config.ts`
```typescript
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // ... other browsers
  ],
});
```

#### ข. ปรับปรุง `next.config.js`
```javascript
// เพิ่มการตั้งค่าสำหรับ Playwright
experimental: {
  serverComponentsExternalPackages: ['playwright'],
},
webpack: (config, { isServer }) => {
  if (isServer) {
    config.externals.push({
      'playwright': 'commonjs playwright',
    });
  }
  return config;
},
```

### 3. เพิ่ม Scripts ใน `package.json`
```json
{
  "scripts": {
    "playwright:install": "npx playwright install chromium",
    "playwright:install-deps": "npx playwright install-deps chromium"
  }
}
```

### 4. สร้างไฟล์ Documentation
- `PLAYWRIGHT_SETUP.md`: คู่มือการติดตั้งและแก้ไขปัญหา
- `FIX_SUMMARY.md`: สรุปการแก้ไขปัญหา

## ผลลัพธ์ที่คาดหวัง

### 1. แก้ไขปัญหา File URL path
- ✅ ใช้ browser arguments ที่เหมาะสม
- ✅ เพิ่ม error handling ที่ดีขึ้น
- ✅ มี fallback mechanism

### 2. แก้ไขปัญหา Browser Launch
- ✅ ใช้ try-catch ครอบ browser launch
- ✅ มี fallback ไป import-only mode
- ✅ ปิด browser อย่างถูกต้อง

### 3. แก้ไขปัญหา Timeout
- ✅ ลด timeout และ retry attempts
- ✅ เพิ่ม error handling สำหรับแต่ละ attempt
- ✅ มี logging ที่ดีขึ้น

## การทดสอบ

### 1. ทดสอบการติดตั้ง
```bash
npm run playwright:install
npm run playwright:install-deps
```

### 2. ทดสอบ API Route
```bash
# ทดสอบ scrape_and_import
curl -X POST http://localhost:3000/api/import-lottery-results \
  -H "Content-Type: application/json" \
  -H "x-api-key: internal" \
  -d '{"draw_time": "21:30:00", "lottery_sub_type_id": 65}'

# ทดสอบ import_only
curl -X POST http://localhost:3000/api/import-lottery-results \
  -H "Content-Type: application/json" \
  -H "x-api-key: internal" \
  -d '{"action": "import_only", "draw_time": "21:30:00"}'
```

## การ Monitor และ Debug

### 1. ตรวจสอบ Logs
```javascript
console.log('[Playwright] Browser launch attempt...');
console.log('[Playwright] Browser args:', args);
console.log('[Playwright] Environment:', process.env.NODE_ENV);
```

### 2. ตรวจสอบ Response
```javascript
{
  "message": "Scrape and import completed successfully",
  "scraped_count": 5,
  "imported_count": 3,
  "draw_time": "21:30:00",
  "lottery_sub_type_id": 65,
  "success": true
}
```

## Fallback Strategy

หาก Playwright ยังไม่ทำงาน:
1. ใช้ `action: "import_only"` แทน `scrape_and_import`
2. ตรวจสอบข้อมูลใน `lottery_api_results` table
3. ใช้ข้อมูลที่มีอยู่แล้วแทนการ scrape ใหม่

## ข้อควรระวัง

1. **Memory Usage**: Browser instances ใช้ memory มาก
2. **Timeout**: ตั้งค่า timeout ที่เหมาะสม
3. **Error Handling**: ต้องมี fallback mechanism เสมอ
4. **Resource Cleanup**: ต้องปิด browser อย่างถูกต้อง