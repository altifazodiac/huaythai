#!/bin/bash

# Script สำหรับทดสอบระบบ scraping สำรอง
# Usage: ./scripts/test-backup-scraping.sh

echo "🧪 Starting Backup Scraping System Test"
echo "========================================"

# ตรวจสอบว่าอยู่ในโฟลเดอร์ที่ถูกต้อง
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

# ตรวจสอบ environment variables
if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo "⚠️  Warning: Environment variables not found, loading from .env files..."
    
    if [ -f ".env.local" ]; then
        export $(cat .env.local | grep -v '^#' | xargs)
    fi
    
    if [ -f ".env" ]; then
        export $(cat .env | grep -v '^#' | xargs)
    fi
fi

# ตรวจสอบ dependencies
echo "📦 Checking dependencies..."
if ! command -v node &> /dev/null; then
    echo "❌ Error: Node.js is not installed"
    exit 1
fi

if ! command -v npm &> /dev/null && ! command -v bun &> /dev/null; then
    echo "❌ Error: Neither npm nor bun is installed"
    exit 1
fi

# ตรวจสอบว่ามีไฟล์ test หรือไม่
if [ ! -f "test-backup-scraping.ts" ]; then
    echo "❌ Error: test-backup-scraping.ts not found"
    exit 1
fi

echo "✅ Dependencies check passed"

# รันการทดสอบ
echo ""
echo "🚀 Running backup scraping tests..."
echo "========================================"

# ใช้ bun ถ้ามี หรือใช้ npm
if command -v bun &> /dev/null; then
    echo "Using Bun to run tests..."
    bun run test-backup-scraping.ts
else
    echo "Using Node.js to run tests..."
    # ต้อง compile TypeScript ก่อน
    if [ ! -f "node_modules/.bin/tsx" ]; then
        echo "Installing tsx for TypeScript execution..."
        npm install -g tsx
    fi
    tsx test-backup-scraping.ts
fi

# ตรวจสอบ exit code
if [ $? -eq 0 ]; then
    echo ""
    echo "✅ All tests completed successfully!"
    echo ""
    echo "📋 Test Summary:"
    echo "- Database connection: ✅"
    echo "- Lottery name mapping: ✅"
    echo "- Backup website scraping: ✅"
    echo ""
    echo "🎉 Backup scraping system is ready for production use!"
else
    echo ""
    echo "❌ Some tests failed. Please check the output above for details."
    echo ""
    echo "🔧 Troubleshooting tips:"
    echo "1. Check your internet connection"
    echo "2. Verify environment variables are set correctly"
    echo "3. Ensure the backup website is accessible"
    echo "4. Check if the website structure has changed"
    exit 1
fi 