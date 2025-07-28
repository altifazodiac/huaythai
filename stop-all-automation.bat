@echo off
chcp 65001 >nul
echo 🛑 หยุดการทำงานอัตโนมัติทั้งหมด...

REM 1. หยุด PM2 processes
echo 📋 หยุด PM2 processes...
pm2 stop all
pm2 delete all

REM 2. หยุด background processes ที่อาจจะยังทำงานอยู่
echo 🔄 หยุด background processes...
taskkill /f /im node.exe 2>nul
taskkill /f /im bun.exe 2>nul

REM 3. หยุด processes ที่เกี่ยวข้องกับ lottery
echo 🎰 หยุด lottery processes...
taskkill /f /fi "WINDOWTITLE eq *lottery*" 2>nul
taskkill /f /fi "WINDOWTITLE eq *background*" 2>nul
taskkill /f /fi "WINDOWTITLE eq *scheduler*" 2>nul

REM 4. ตรวจสอบสถานะ
echo 📊 ตรวจสอบสถานะ...
echo PM2 status:
pm2 status

echo.
echo Background processes:
tasklist /fi "IMAGENAME eq node.exe" 2>nul
tasklist /fi "IMAGENAME eq bun.exe" 2>nul

echo.
echo ✅ หยุดการทำงานอัตโนมัติทั้งหมดเสร็จสิ้น!
echo.
echo 📝 หากต้องการเริ่มต้นใหม่:
echo    pm2 start ecosystem.background.config.js
echo    pm2 start ecosystem.scheduler.config.js
echo    bun run setup-dynamic-cron.ts

pause 