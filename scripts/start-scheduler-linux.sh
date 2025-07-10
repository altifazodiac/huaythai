#!/bin/bash

echo "======================================================="
echo "       Lottery Scheduler for Linux (Production)"
echo "======================================================="

# ตรวจสอบว่าเป็น Linux หรือไม่
if [[ "$OSTYPE" != "linux-gnu"* ]]; then
    echo "This script is designed for Linux systems"
    exit 1
fi

echo "Linux detected - Starting production scheduler"

# ตรวจสอบว่าไฟล์ .env มีอยู่หรือไม่
if [ ! -f .env ]; then
    echo "Error: .env file not found"
    echo "Please create .env file with required environment variables"
    exit 1
fi

# โหลด environment variables
export $(cat .env | xargs)
echo "Environment variables loaded from .env"

# ตรวจสอบ required environment variables
required_vars=("NEXT_PUBLIC_SUPABASE_URL" "SUPABASE_SERVICE_ROLE_KEY" "LINE_CHANNEL_ACCESS_TOKEN")
for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        echo "Error: Required environment variable $var is not set"
        exit 1
    fi
done

echo "All required environment variables are set"

# ตรวจสอบ Bun
if ! command -v bun &> /dev/null; then
    echo "Error: Bun not found"
    echo "Please install Bun: curl -fsSL https://bun.sh/install | bash"
    exit 1
fi

echo "Bun found: $(bun --version)"

# สร้างโฟลเดอร์ logs ถ้ายังไม่มี
mkdir -p logs
echo "Logs directory created/verified"

# ฟังก์ชันสำหรับจัดการ signal interrupts
cleanup() {
    echo ""
    echo "Received interrupt signal, shutting down..."
    
    # หยุด scheduler ก่อนปิดแอป
    echo "Stopping scheduler..."
    curl -s "http://localhost:3000/api/scheduler?action=stop" > /dev/null 2>&1
    
    # ปิด background jobs
    jobs -p | xargs -r kill
    
    echo "Scheduler stopped gracefully"
    exit 0
}

# ตั้งค่า signal handlers
trap cleanup SIGINT SIGTERM

echo "======================================================="
echo "Starting Next.js application with scheduler..."
echo "Scheduler will auto-initialize after application start"
echo "Press Ctrl+C to stop gracefully"
echo "======================================================="

# เริ่มต้น Next.js application ใน production mode
if [ "$NODE_ENV" = "production" ]; then
    echo "Starting in production mode..."
    bun run build
    bun run start
else
    echo "Starting in development mode..."
    bun run dev
fi 