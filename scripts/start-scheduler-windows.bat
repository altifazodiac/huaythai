@echo off
echo =======================================================
echo       Lottery Scheduler for Windows (Fallback)
echo =======================================================

REM ตรวจสอบว่าเป็น Windows หรือไม่
if "%OS%"=="Windows_NT" (
    echo Windows detected - Using fallback scheduler
) else (
    echo This script is for Windows only
    pause
    exit /b 1
)

REM ตั้งค่า environment variables
if not exist .env (
    echo Error: .env file not found
    echo Please create .env file with required environment variables
    pause
    exit /b 1
)

REM อ่าน environment variables จาก .env
for /f "usebackq tokens=1,2 delims==" %%a in (.env) do (
    set %%a=%%b
)

echo Environment variables loaded from .env

REM ตรวจสอบ Node.js/Bun
where bun >nul 2>nul
if %errorlevel% neq 0 (
    echo Error: Bun not found in PATH
    echo Please install Bun or use npm/yarn instead
    pause
    exit /b 1
)

echo Bun found, starting lottery scheduler...

REM สร้างโฟลเดอร์ logs ถ้ายังไม่มี
if not exist logs mkdir logs

echo =======================================================
echo Starting Next.js application with scheduler...
echo Press Ctrl+C to stop
echo =======================================================

REM เริ่มต้น Next.js application
REM Scheduler จะเริ่มอัตโนมัติผ่าน SchedulerInitializer component
bun run dev

pause 