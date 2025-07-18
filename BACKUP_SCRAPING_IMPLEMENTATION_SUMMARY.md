# สรุปการปรับปรุงระบบ Scraping สำรอง

## ภาพรวมการเปลี่ยนแปลง

ระบบ scraping สำรองได้ถูกเพิ่มเข้าไปใน `import-lottery-results.ts` เพื่อแก้ไขปัญหาการดึงผลหวยไม่สำเร็จจากเว็บไซต์หลัก โดยเพิ่มเว็บไซต์สำรอง `www.gemlotto.com` เป็นแหล่งข้อมูลสำรอง

## ไฟล์ที่ถูกสร้าง/แก้ไข

### 1. `import-lottery-results.ts` (แก้ไข)
- เพิ่มระบบ scraping สำรอง
- เพิ่ม mapping สำหรับชื่อหวย
- ปรับปรุง retry logic
- เพิ่มฟังก์ชัน `scrapeWithBackup()` และ `scrapeBackupWebsite()`

### 2. `BACKUP_SCRAPING_SYSTEM.md` (ใหม่)
- เอกสารอธิบายการทำงานของระบบ
- คู่มือการบำรุงรักษา
- ข้อควรระวังและการ debug

### 3. `test-backup-scraping.ts` (ใหม่)
- ไฟล์ทดสอบระบบ scraping สำรอง
- ทดสอบการเชื่อมต่อฐานข้อมูล
- ทดสอบการ mapping ชื่อหวย
- ทดสอบการ scraping จากเว็บสำรอง

### 4. `scripts/test-backup-scraping.sh` (ใหม่)
- Script สำหรับ Linux/Mac เพื่อทดสอบระบบ

### 5. `scripts/test-backup-scraping.bat` (ใหม่)
- Script สำหรับ Windows เพื่อทดสอบระบบ

## การเปลี่ยนแปลงหลักใน import-lottery-results.ts

### 1. เพิ่ม Lottery Name Mapping
```typescript
const BACKUP_LOTTERY_NAME_MAPPING: Record<string, string> = {
    // หวยลาว
    'หวยลาวพัฒนา': 'หวยลาวพัฒนา',
    'หวยลาว VIP': 'หวยลาวVIP',
    'หวยลาวเช้า': 'ลาวสันติภาพ',
    // ... และอื่นๆ
};
```

### 2. เพิ่มฟังก์ชัน scrapeBackupWebsite()
```typescript
async function scrapeBackupWebsite(context: BrowserContext, targetLotteryNames: string[]): Promise<LotteryResult[]>
```
- Scrape จากเว็บไซต์สำรอง `https://www.gemlotto.com/`
- Parse โครงสร้าง Angular components
- แปลงชื่อหวยผ่าน mapping

### 3. เพิ่มฟังก์ชัน scrapeWithBackup()
```typescript
async function scrapeWithBackup(context: BrowserContext, targetLotteryNames: string[]): Promise<LotteryResult[]>
```
- จัดการการ scraping จากทั้งสองเว็บไซต์
- ลองเว็บไซต์หลักก่อน หากไม่สำเร็จจะลองเว็บไซต์สำรอง

### 4. ปรับปรุง Retry Logic
- ลดจำนวน retry จาก 20 เป็น 10 ครั้ง
- ลดเวลารอจาก 60 เป็น 30 วินาที
- เหตุผล: มีเว็บไซต์สำรองแล้ว

## การทำงานของระบบใหม่

### ขั้นตอนการทำงาน
1. **ตรวจสอบหวยที่ต้องดึง**: ดูจากตาราง `drawing_schedules`
2. **ลองเว็บไซต์หลักก่อน**: ใช้ฟังก์ชัน `scrapeAndParseResults()`
3. **หากไม่สำเร็จ**: ใช้ฟังก์ชัน `scrapeBackupWebsite()`
4. **Retry Logic**: ลดจำนวน retry และเวลารอ

### การจัดการข้อผิดพลาด
- แยกการจัดการข้อผิดพลาดระหว่างเว็บไซต์หลักและสำรอง
- Log ที่ชัดเจนสำหรับการ debug
- Toast notification สำหรับผลลัพธ์และข้อผิดพลาด

## การทดสอบระบบ

### วิธีรันการทดสอบ
```bash
# Linux/Mac
./scripts/test-backup-scraping.sh

# Windows
scripts\test-backup-scraping.bat
```

### การทดสอบที่ครอบคลุม
1. **การเชื่อมต่อฐานข้อมูล**: ตรวจสอบการเชื่อมต่อกับ Supabase
2. **การ mapping ชื่อหวย**: ทดสอบการแปลงชื่อหวย
3. **การ scraping**: ทดสอบการดึงข้อมูลจากเว็บสำรอง

## การบำรุงรักษา

### 1. การอัพเดท Mapping
หากเว็บไซต์สำรองเพิ่มหวยใหม่ ต้องอัพเดท `BACKUP_LOTTERY_NAME_MAPPING`:

```typescript
// เพิ่ม mapping ใหม่
'ชื่อหวยใหม่ในเว็บสำรอง': 'ชื่อหวยในระบบ',
```

### 2. การตรวจสอบโครงสร้างเว็บ
หากเว็บไซต์สำรองเปลี่ยนโครงสร้าง HTML ต้องอัพเดท CSS selectors ใน `scrapeBackupWebsite()`:

```typescript
// ตัวอย่างการอัพเดท selector
const lotteryNameElement = lotteryElement.find('div.col-6 img + *').first();
```

### 3. การทดสอบเป็นประจำ
- ทดสอบการทำงานของเว็บไซต์หลัก
- ทดสอบการทำงานของเว็บไซต์สำรอง
- ทดสอบการ fallback ระหว่างเว็บไซต์

## ประโยชน์ที่ได้รับ

### 1. ความน่าเชื่อถือ
- ลดความเสี่ยงจากการสูญเสียผลหวย
- มีแหล่งข้อมูลสำรองเมื่อเว็บไซต์หลักมีปัญหา

### 2. ประสิทธิภาพ
- ลดจำนวน retry ที่ไม่จำเป็น
- เพิ่มความเร็วในการตอบสนอง

### 3. การบำรุงรักษา
- ระบบที่แยกส่วนชัดเจน
- การ debug ที่ง่ายขึ้น
- เอกสารที่ครบถ้วน

## ข้อควรระวัง

1. **การเปลี่ยนแปลงโครงสร้างเว็บ**: ต้องคอยติดตามการเปลี่ยนแปลงของทั้งสองเว็บไซต์
2. **การอัพเดท Mapping**: ต้องอัพเดท mapping เมื่อมีการเพิ่มหวยใหม่
3. **การจัดการ Rate Limiting**: ระวังการถูกบล็อกจากเว็บไซต์
4. **การตรวจสอบความถูกต้อง**: ต้องตรวจสอบว่าผลหวยที่ได้ถูกต้อง

## การใช้งาน

ระบบจะทำงานอัตโนมัติเมื่อ:
- มีการเรียกใช้ script ผ่าน cron job
- มีหวยที่ต้องดึงตามตารางเวลา
- เว็บไซต์หลักไม่สามารถให้ข้อมูลได้

## การ Monitor และ Log

### Log ระดับต่างๆ
- `[Enhanced Scraper]`: การทำงานของระบบหลัก
- `[Backup Scraper]`: การทำงานของเว็บไซต์สำรอง
- `[Backup Parser]`: การ parse ข้อมูลจากเว็บไซต์สำรอง

### การแจ้งเตือน
- Toast notification สำหรับผลลัพธ์ที่สำเร็จ
- Toast notification สำหรับข้อผิดพลาด
- การบันทึก log ลงฐานข้อมูล

## สรุป

ระบบ scraping สำรองได้ถูกเพิ่มเข้าไปอย่างสมบูรณ์แล้ว โดยมีการจัดการที่ครอบคลุมทั้งการทำงาน การทดสอบ และการบำรุงรักษา ระบบนี้จะช่วยให้การดึงผลหวยมีความน่าเชื่อถือและมีประสิทธิภาพมากขึ้น 