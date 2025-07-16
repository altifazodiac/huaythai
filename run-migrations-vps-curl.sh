#!/bin/bash

# Script สำหรับรัน migration บน VPS Linux ใช้ curl
# ใช้สำหรับอัปเดตฐานข้อมูลให้รองรับระบบเลขอั้น

echo "🚀 เริ่มต้นรัน migration สำหรับระบบเลขอั้น..."

# ตรวจสอบ environment variables
if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo "❌ ไม่พบ environment variables ที่จำเป็น"
    echo "💡 ตรวจสอบ:"
    echo "   - NEXT_PUBLIC_SUPABASE_URL"
    echo "   - SUPABASE_SERVICE_ROLE_KEY"
    exit 1
fi

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

# ฟังก์ชันสำหรับรัน SQL ผ่าน Supabase REST API
run_sql() {
    local sql_file=$1
    local description=$2
    
    echo "📝 $description..."
    
    # อ่าน SQL จากไฟล์
    local sql_content=$(cat "$sql_file")
    
    # รัน SQL ผ่าน Supabase REST API
    local response=$(curl -s -X POST \
        -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
        -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
        -H "Content-Type: application/json" \
        -H "Prefer: return=minimal" \
        -d "{\"query\": \"$sql_content\"}" \
        "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/rpc/exec_sql")
    
    if [ $? -eq 0 ]; then
        echo "✅ $description สำเร็จ"
    else
        echo "❌ $description ล้มเหลว"
        echo "Response: $response"
        return 1
    fi
}

# รัน migration แรก: เพิ่มคอลัมน์ใหม่
run_sql "supabase/migrations/20250127000000_add_effective_prize_rate_to_lottery_ticket_items.sql" "เพิ่มคอลัมน์ effective_prize_rate"

if [ $? -ne 0 ]; then
    echo "❌ Migration แรกล้มเหลว"
    exit 1
fi

# รัน migration ที่สอง: สร้าง RPC function ใหม่
run_sql "supabase/migrations/20250127000001_create_handle_lottery_order_rpc.sql" "สร้าง handle_lottery_order RPC"

if [ $? -ne 0 ]; then
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
echo ""
echo "📝 ขั้นตอนต่อไป:"
echo "1. รีสตาร์ท application server"
echo "2. ทดสอบระบบเลขอั้น"
echo "3. ตรวจสอบข้อมูลในฐานข้อมูล" 