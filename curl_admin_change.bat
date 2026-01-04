@echo off
REM ต้องแทนที่ YOUR_SERVICE_ROLE_KEY ด้วย key จริง

set PROJECT_URL=https://wbvgdqiozztgqodtajui.supabase.co
set SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndidmdkcWlvenp0Z3FvZHRhanVpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzQzOTAwOSwiZXhwIjoyMDY5MDE1MDA5fQ.qUsBN-9dLWgfpteUFt4y4ytznDvfCX3iuiCJJHMei1k

echo 🔍 กำลังค้นหา user admin@gmail.com...

REM ค้นหา user ID
curl -X GET "%PROJECT_URL%/auth/v1/admin/users" ^
-H "apikey: %SERVICE_ROLE_KEY%" ^
-H "Authorization: Bearer %SERVICE_ROLE_KEY%" ^
-H "Content-Type: application/json"

echo.
echo 🔄 กำลังเปลี่ยน email...
echo กรุณาคัดลอก user ID จากด้านบนและแทนที่ USER_ID_HERE ในคำสั่งถัดไป

REM คำสั่งเปลี่ยน email (ต้องแทนที่ USER_ID_HERE)
REM curl -X PUT "%PROJECT_URL%/auth/v1/admin/users/USER_ID_HERE" ^
REM -H "apikey: %SERVICE_ROLE_KEY%" ^
REM -H "Authorization: Bearer %SERVICE_ROLE_KEY%" ^
REM -H "Content-Type: application/json" ^
REM -d "{\"email\":\"altifadev@gmail.com\"}"

pause
