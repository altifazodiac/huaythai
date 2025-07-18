@echo off
REM Script สำหรับทดสอบระบบ scraping สำรอง (Windows)
REM Usage: scripts\test-backup-scraping.bat

echo 🧪 Starting Backup Scraping System Test
echo ========================================

REM ตรวจสอบว่าอยู่ในโฟลเดอร์ที่ถูกต้อง
if not exist "package.json" (
    echo ❌ Error: Please run this script from the project root directory
    pause
    exit /b 1
)

REM ตรวจสอบ dependencies
echo 📦 Checking dependencies...

where node >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Error: Node.js is not installed
    pause
    exit /b 1
)

where npm >nul 2>&1
if %errorlevel% neq 0 (
    where bun >nul 2>&1
    if %errorlevel% neq 0 (
        echo ❌ Error: Neither npm nor bun is installed
        pause
        exit /b 1
    )
)

REM ตรวจสอบว่ามีไฟล์ test หรือไม่
if not exist "test-backup-scraping.ts" (
    echo ❌ Error: test-backup-scraping.ts not found
    pause
    exit /b 1
)

echo ✅ Dependencies check passed

REM รันการทดสอบ
echo.
echo 🚀 Running backup scraping tests...
echo ========================================

REM ใช้ bun ถ้ามี หรือใช้ npm
where bun >nul 2>&1
if %errorlevel% equ 0 (
    echo Using Bun to run tests...
    bun run test-backup-scraping.ts
) else (
    echo Using Node.js to run tests...
    REM ต้อง compile TypeScript ก่อน
    if not exist "node_modules\.bin\tsx.cmd" (
        echo Installing tsx for TypeScript execution...
        npm install -g tsx
    )
    tsx test-backup-scraping.ts
)

REM ตรวจสอบ exit code
if %errorlevel% equ 0 (
    echo.
    echo ✅ All tests completed successfully!
    echo.
    echo 📋 Test Summary:
    echo - Database connection: ✅
    echo - Lottery name mapping: ✅
    echo - Backup website scraping: ✅
    echo.
    echo 🎉 Backup scraping system is ready for production use!
) else (
    echo.
    echo ❌ Some tests failed. Please check the output above for details.
    echo.
    echo 🔧 Troubleshooting tips:
    echo 1. Check your internet connection
    echo 2. Verify environment variables are set correctly
    echo 3. Ensure the backup website is accessible
    echo 4. Check if the website structure has changed
)

pause 