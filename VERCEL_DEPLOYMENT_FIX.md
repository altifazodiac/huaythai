# การแก้ไขปัญหา Vercel Deployment

## ปัญหาที่พบ
```
Error: Cannot find module '../lightningcss.linux-x64-gnu.node'
```

## สาเหตุ
ปัญหาเกิดจากการใช้ `geist` font package ที่ต้องการ binary files สำหรับ Linux แต่ Vercel ไม่สามารถหาไฟล์ได้เนื่องจาก package ถูกติดตั้งบน Windows

## การแก้ไข

### 1. เปลี่ยน Fonts
- เปลี่ยนจาก `geist` fonts เป็น Google Fonts
- ใช้ `Inter` แทน `GeistSans`
- ใช้ `JetBrains_Mono` แทน `GeistMono`

### 2. อัปเดต Dependencies
- ลบ `geist` package ออกจาก `package.json`
- ใช้ Google Fonts ที่มี built-in ใน Next.js

### 3. การตั้งค่า Webpack
เพิ่ม fallback configuration ใน `next.config.js`:
```javascript
config.resolve.fallback = {
  ...config.resolve.fallback,
  fs: false,
  net: false,
  tls: false,
};
```

### 4. ไฟล์ที่แก้ไข
- `app/layout.tsx` - เปลี่ยน font imports
- `app/globals.css` - อัปเดต CSS variables
- `package.json` - ลบ geist dependency
- `next.config.js` - เพิ่ม webpack fallback
- `vercel.json` - เพิ่ม build environment variables
- `.vercelignore` - เพิ่มไฟล์ใหม่

## การ Deploy
1. Commit การเปลี่ยนแปลงทั้งหมด
2. Push ไปยัง GitHub
3. Vercel จะ build ใหม่โดยอัตโนมัติ
4. ตรวจสอบ build logs ว่าสำเร็จ

## หมายเหตุ
- Google Fonts มีประสิทธิภาพดีและไม่ต้องการ binary dependencies
- การใช้ `--legacy-peer-deps` ใน install command ช่วยแก้ปัญหา dependency conflicts
- การเพิ่ม `NEXT_TELEMETRY_DISABLED=1` ช่วยลด build time 