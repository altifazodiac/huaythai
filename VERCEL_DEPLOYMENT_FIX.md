# Vercel Deployment Fix

## ปัญหาที่แก้ไข
- React 19.1.0 ไม่เข้ากันกับ dependencies บางตัว
- `react-day-picker@8.10.1` รองรับเฉพาะ React 16-18
- `react-copy-to-clipboard@5.1.0` (จาก swagger-ui-react) รองรับเฉพาะ React 15-18

## การแก้ไข
1. **Downgrade React เป็น version 18.3.1**
   - `react: ^18.3.1`
   - `react-dom: ^18.3.1`
   - `@types/react: ^18.3.12`
   - `@types/react-dom: ^18.3.1`

2. **สร้างไฟล์ .npmrc**
   ```
   legacy-peer-deps=true
   ```

3. **สร้างไฟล์ vercel.json**
   ```json
   {
     "buildCommand": "npm install --legacy-peer-deps && npm run build",
     "installCommand": "npm install --legacy-peer-deps",
     "framework": "nextjs"
   }
   ```

4. **ลบ package-lock.json** เพื่อให้ npm สร้างใหม่

## การ Deploy
1. Commit การเปลี่ยนแปลงทั้งหมด
2. Push ไปยัง GitHub
3. Deploy บน Vercel - ควรจะสำเร็จแล้ว

## หมายเหตุ
- React 18 ยังคงเป็น version ที่เสถียรและรองรับโดย dependencies ส่วนใหญ่
- การใช้ `--legacy-peer-deps` ช่วยให้ npm ติดตั้ง dependencies ได้แม้จะมี peer dependency conflicts
- หากต้องการใช้ React 19 ในอนาคต ต้องรอให้ dependencies ทั้งหมดอัปเดตรองรับก่อน 