# Playwright Setup Guide

## การติดตั้ง Playwright สำหรับ Serverless Environment

### 1. ติดตั้ง Playwright Browsers

```bash
# ติดตั้ง Chromium browser
npm run playwright:install

# ติดตั้ง dependencies ที่จำเป็น
npm run playwright:install-deps
```

### 2. การตั้งค่า Environment Variables

เพิ่มในไฟล์ `.env.local`:

```env
# Playwright Configuration
PLAYWRIGHT_BROWSERS_PATH=0
PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=0
```

### 3. การแก้ไขปัญหาใน Serverless Environment

#### ปัญหา: File URL path must be absolute

**สาเหตุ**: Playwright ไม่สามารถใช้ file:// URLs ได้ใน serverless environment

**วิธีแก้ไข**:
1. ใช้ `chromium.launch()` แทน `puppeteer.launch()`
2. เพิ่ม browser arguments สำหรับ serverless:

```javascript
const browser = await chromium.launch({ 
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

#### ปัญหา: Browser launch failed

**สาเหตุ**: ไม่มี browser executable ใน serverless environment

**วิธีแก้ไข**:
1. ใช้ try-catch ครอบ browser launch
2. มี fallback mechanism สำหรับเมื่อ browser ไม่สามารถ launch ได้
3. ใช้ import-only mode แทน

### 4. การทดสอบ

```bash
# ทดสอบการติดตั้ง
npx playwright test --help

# ทดสอบ browser installation
npx playwright install --dry-run
```

### 5. การ Deploy

#### Vercel
- เพิ่ม build command: `npm run playwright:install && npm run build`
- ตั้งค่า environment variables ตามด้านบน

#### Netlify
- เพิ่ม build command: `npm run playwright:install && npm run build`
- ตั้งค่า environment variables ตามด้านบน

### 6. การแก้ไขปัญหาเพิ่มเติม

#### ถ้า browser ยังไม่ทำงาน
1. ตรวจสอบว่า Playwright browsers ติดตั้งแล้ว
2. ตรวจสอบ environment variables
3. ลองใช้ import-only mode แทน

#### ถ้า timeout เกิดขึ้น
1. เพิ่ม timeout ใน browser launch
2. ลดจำนวน retry attempts
3. เพิ่ม error handling ที่ดีขึ้น

### 7. การ Monitor และ Debug

```javascript
// เพิ่ม logging สำหรับ debug
console.log('[Playwright] Browser launch attempt...');
console.log('[Playwright] Browser args:', args);
console.log('[Playwright] Environment:', process.env.NODE_ENV);
```

### 8. Fallback Strategy

หาก Playwright ไม่ทำงาน ให้ใช้ import-only mode:

```javascript
// ใน API route
if (action === 'scrape_and_import') {
  try {
    // ลอง scrape
    scrapedData = await scrapeData();
  } catch (error) {
    console.log('Scraping failed, using import-only mode');
    // ใช้ข้อมูลที่มีอยู่แล้ว
  }
}
```