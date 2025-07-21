# Vercel Deployment Guide

## การแก้ไขปัญหา React 19 Compatibility

### ปัญหาที่พบ
- React 19 ยังไม่รองรับโดย packages บางตัว เช่น `react-day-picker` และ `swagger-ui-react`
- Dependency conflicts ระหว่าง React 19 และ packages ที่รองรับเฉพาะ React 16-18

### การแก้ไขที่ทำ
1. **Downgrade React เป็นเวอร์ชัน 18**
   - เปลี่ยน `react` จาก `^19.1.0` เป็น `^18.3.1`
   - เปลี่ยน `react-dom` จาก `^19.1.0` เป็น `^18.3.1`
   - เปลี่ยน `@types/react` จาก `^19.1.5` เป็น `^18.3.12`
   - เปลี่ยน `@types/react-dom` จาก `^19.1.5` เป็น `^18.3.1`

2. **สร้างไฟล์ `.npmrc`**
   ```ini
   legacy-peer-deps=true
   auto-install-peers=true
   ```

3. **สร้างไฟล์ `vercel.json`**
   ```json
   {
     "buildCommand": "npm run build",
     "installCommand": "npm install --legacy-peer-deps",
     "framework": "nextjs",
     "functions": {
       "app/api/**/*.ts": {
         "maxDuration": 30
       }
     },
     "env": {
       "NODE_ENV": "production"
     }
   }
   ```

4. **ลบไฟล์ lock เก่า**
   - ลบ `package-lock.json`
   - ลบ `bun.lock`

### ขั้นตอนการ Deploy
1. Commit การเปลี่ยนแปลงทั้งหมด
2. Push ไปยัง GitHub
3. Vercel จะ build ใหม่โดยอัตโนมัติ
4. ตรวจสอบ build logs ว่าสำเร็จหรือไม่

### หมายเหตุ
- การใช้ `--legacy-peer-deps` จะช่วยให้ npm install สำเร็จแม้จะมี peer dependency conflicts
- React 18 ยังคงมีประสิทธิภาพและเสถียรภาพดี
- เมื่อ packages อื่นๆ รองรับ React 19 แล้ว สามารถอัปเกรดกลับได้

### การตรวจสอบ
- ตรวจสอบว่า build สำเร็จใน Vercel dashboard
- ทดสอบฟีเจอร์หลักของแอปพลิเคชัน
- ตรวจสอบ console errors ใน browser 