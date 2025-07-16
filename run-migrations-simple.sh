#!/bin/bash

# Script ง่ายๆ สำหรับรัน migration บน VPS
# ใช้ npm/yarn ที่มีอยู่แล้ว

echo "🚀 เริ่มต้นรัน migration สำหรับระบบเลขอั้น..."

# ตรวจสอบว่ามีไฟล์ migration ใหม่หรือไม่
if [ ! -f "supabase/migrations/20250127000000_add_effective_prize_rate_to_lottery_ticket_items.sql" ]; then
    echo "❌ ไม่พบไฟล์ migration 20250127000000_add_effective_prize_rate_to_lottery_ticket_items.sql"
    exit 1
fi

if [ ! -f "supabase/migrations/20250127000001_create_handle_lottery_order_rpc.sql" ]; then
    echo "❌ ไม่พบไฟล์ migration 20250127000001_create_handle_lottery_order_rpc.sql"
    exit 1
fi

echo "✅ พบไฟล์ migration ทั้งสองไฟล์"

# ตรวจสอบว่า Node.js ติดตั้งแล้วหรือไม่
if ! command -v node &> /dev/null; then
    echo "❌ ไม่พบ Node.js"
    echo "📥 ติดตั้ง Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

# ตรวจสอบว่า npm ติดตั้งแล้วหรือไม่
if ! command -v npm &> /dev/null; then
    echo "❌ ไม่พบ npm"
    exit 1
fi

echo "📦 ติดตั้ง dependencies..."
npm install

echo "🔧 รัน migration ผ่าน Node.js script..."
node run-migrations-vps-node.js

if [ $? -eq 0 ]; then
    echo "🎉 Migration สำเร็จ!"
    echo ""
    echo "📝 ขั้นตอนต่อไป:"
    echo "1. รีสตาร์ท application server"
    echo "2. ทดสอบระบบเลขอั้น"
    echo "3. ตรวจสอบข้อมูลในฐานข้อมูล"
else
    echo "❌ Migration ล้มเหลว"
    exit 1
fi 