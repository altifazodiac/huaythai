#!/bin/bash

# Script สำหรับรัน migration บน VPS Linux ใช้ Supabase CLI
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

# ตรวจสอบว่า supabase CLI ติดตั้งแล้วหรือไม่
if ! command -v supabase &> /dev/null; then
    echo "❌ ไม่พบ supabase CLI"
    echo "📥 ติดตั้ง supabase CLI..."
    curl -fsSL https://supabase.com/install.sh | sh
    export PATH="$HOME/.local/bin:$PATH"
fi

# ตรวจสอบการเชื่อมต่อกับ Supabase
echo "🔗 ตรวจสอบการเชื่อมต่อกับ Supabase..."
supabase status

if [ $? -ne 0 ]; then
    echo "❌ ไม่สามารถเชื่อมต่อกับ Supabase ได้"
    echo "💡 ตรวจสอบ environment variables:"
    echo "   - NEXT_PUBLIC_SUPABASE_URL"
    echo "   - NEXT_PUBLIC_SUPABASE_ANON_KEY"
    echo "   - SUPABASE_SERVICE_ROLE_KEY"
    exit 1
fi

# รัน migration แรก: เพิ่มคอลัมน์ใหม่
echo "📝 รัน migration แรก: เพิ่มคอลัมน์ effective_prize_rate..."
supabase db push --include-all

if [ $? -eq 0 ]; then
    echo "✅ Migration แรกสำเร็จ"
else
    echo "❌ Migration แรกล้มเหลว"
    exit 1
fi

# ตรวจสอบสถานะ migration
echo "📊 ตรวจสอบสถานะ migration..."
supabase migration list

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
echo ""
echo "📝 ขั้นตอนต่อไป:"
echo "1. รีสตาร์ท application server"
echo "2. ทดสอบระบบเลขอั้น"
echo "3. ตรวจสอบข้อมูลในฐานข้อมูล" 