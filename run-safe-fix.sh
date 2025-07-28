#!/bin/bash
# Shell script to safely fix handle_lottery_order function
# This script runs the safe SQL migration to prevent "UPDATE requires WHERE clause" error

echo "🔧 รันการแก้ไข handle_lottery_order function อย่างปลอดภัย..."

# Check if safe-fix-handle-lottery-order.sql exists
if [ ! -f "safe-fix-handle-lottery-order.sql" ]; then
    echo "❌ ไม่พบไฟล์ safe-fix-handle-lottery-order.sql"
    echo "กรุณาตรวจสอบว่าไฟล์อยู่ในโฟลเดอร์เดียวกันกับ script นี้"
    exit 1
fi

# Get Supabase connection details from environment or prompt user
if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ]; then
    read -p "กรุณาใส่ Supabase URL (https://your-project.supabase.co): " SUPABASE_URL
else
    SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
fi

if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    read -s -p "กรุณาใส่ Supabase Service Role Key: " SUPABASE_SERVICE_KEY
    echo
else
    SUPABASE_SERVICE_KEY=$SUPABASE_SERVICE_ROLE_KEY
fi

# Extract project ID from URL
PROJECT_ID=$(echo $SUPABASE_URL | sed 's|https://||' | sed 's|\.supabase\.co.*||')

# Build PostgreSQL connection string
DATABASE_URL="postgresql://postgres.${PROJECT_ID}:${SUPABASE_SERVICE_KEY}@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres"

echo "📡 กำลังเชื่อมต่อกับ Supabase project: $PROJECT_ID"

# Check if psql is available
if ! command -v psql &> /dev/null; then
    echo "❌ ไม่พบ psql command"
    echo "กรุณาติดตั้ง PostgreSQL client tools:"
    echo "Ubuntu/Debian: sudo apt-get install postgresql-client"
    echo "CentOS/RHEL: sudo yum install postgresql"
    echo "หรือใช้ Supabase dashboard เพื่อรัน SQL script ใน safe-fix-handle-lottery-order.sql"
    exit 1
fi

PSQL_VERSION=$(psql --version)
echo "✅ พบ psql: $PSQL_VERSION"

# Run the safe SQL migration
echo "📝 กำลังรัน safe SQL migration..."

if psql "$DATABASE_URL" -f "safe-fix-handle-lottery-order.sql"; then
    echo "✅ รัน SQL migration สำเร็จ!"
    
    echo ""
    echo "🎉 การแก้ไขเสร็จสิ้น!"
    echo "ตอนนี้ handle_lottery_order function ควรทำงานได้ถูกต้องแล้ว"
    
    echo ""
    echo "📋 สิ่งที่ถูกแก้ไข:"
    echo "- เพิ่มคอลัมน์ที่จำเป็นสำหรับ number cap system"
    echo "- แก้ไข UPDATE statement ให้มี WHERE clause ที่ปลอดภัย"
    echo "- เพิ่ม indexes และ constraints"
    echo "- ตรวจสอบความสมบูรณ์ของ schema"
    
    echo ""
    echo "🔄 ขั้นตอนถัดไป:"
    echo "1. ลองใช้ lottery order system ใน website"
    echo "2. ตรวจสอบว่า handle_lottery_order ทำงานได้โดยไม่มี error"
    echo "3. หากยังมีปัญหา ให้ตรวจสอบ logs ใน Supabase dashboard"
    
else
    echo "❌ เกิดข้อผิดพลาดในการรัน SQL migration"
    
    echo ""
    echo "💡 วิธีแก้ไขทางเลือก:"
    echo "1. เข้าไปที่ Supabase Dashboard"
    echo "2. ไปที่ SQL Editor"
    echo "3. รัน SQL จากไฟล์ safe-fix-handle-lottery-order.sql แบบแบ่งส่วน"
    echo "4. ตรวจสอบ error message แต่ละส่วน"
    
    exit 1
fi

echo ""
echo "กด Enter เพื่อปิด..."
read 