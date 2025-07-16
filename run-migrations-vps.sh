#!/bin/bash

# Script สำหรับรัน migration บน VPS Linux
# ใช้สำหรับอัปเดตฐานข้อมูลให้รองรับระบบเลขอั้น

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

# รัน migration แรก: เพิ่มคอลัมน์ใหม่
echo "📝 รัน migration แรก: เพิ่มคอลัมน์ effective_prize_rate..."
psql $DATABASE_URL -f supabase/migrations/20250127000000_add_effective_prize_rate_to_lottery_ticket_items.sql

if [ $? -eq 0 ]; then
    echo "✅ Migration แรกสำเร็จ"
else
    echo "❌ Migration แรกล้มเหลว"
    exit 1
fi

# รัน migration ที่สอง: สร้าง RPC function ใหม่
echo "📝 รัน migration ที่สอง: สร้าง handle_lottery_order RPC..."
psql $DATABASE_URL -f supabase/migrations/20250127000001_create_handle_lottery_order_rpc.sql

if [ $? -eq 0 ]; then
    echo "✅ Migration ที่สองสำเร็จ"
else
    echo "❌ Migration ที่สองล้มเหลว"
    exit 1
fi

echo "🎉 Migration ทั้งหมดสำเร็จ!"
echo ""
echo "📋 สรุปการเปลี่ยนแปลง:"
echo "1. เพิ่มคอลัมน์ effective_prize_rate, original_amount, number_cap_status, number_cap_action"
echo "2. สร้าง RPC function handle_lottery_order ใหม่"
echo "3. อัปเดตข้อมูลเก่าให้มีค่าเริ่มต้น"
echo ""
echo "🔧 ระบบเลขอั้นพร้อมใช้งานแล้ว!"
echo "   - ลูกค้าจะจ่ายเต็มราคา"
echo "   - เลขอั้นจะได้รับรางวัลครึ่งหนึ่ง"
echo "   - ข้อมูลจะถูกบันทึกในคอลัมน์ใหม่" 