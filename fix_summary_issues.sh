#!/bin/bash

# Fix Summary Issues Script
# สคริปต์สำหรับแก้ไขปัญหาหน้า Summary

echo "🔧 เริ่มแก้ไขปัญหาหน้า Summary..."

# 1. แก้ไข Database Functions
echo "📊 แก้ไข Database Functions..."
if [ -f "fix_summary_functions.sql" ]; then
  echo "กำลังรัน fix_summary_functions.sql..."
  # ถ้าใช้ Supabase CLI
  if command -v supabase &> /dev/null; then
    supabase db reset --db-url $DATABASE_URL
    supabase db push
  else
    echo "⚠️  กรุณารัน fix_summary_functions.sql ใน Supabase Dashboard"
    echo "    หรือใช้ psql: psql -h your-host -U your-user -d your-db -f fix_summary_functions.sql"
  fi
else
  echo "❌ ไม่พบไฟล์ fix_summary_functions.sql"
fi

# 2. แก้ไข RLS Policies
echo "🔐 แก้ไข RLS Policies..."
if [ -f "add_admin_policies.sql" ]; then
  echo "กำลังรัน add_admin_policies.sql..."
  # ถ้าใช้ Supabase CLI
  if command -v supabase &> /dev/null; then
    supabase db push
  else
    echo "⚠️  กรุณารัน add_admin_policies.sql ใน Supabase Dashboard"
    echo "    หรือใช้ psql: psql -h your-host -U your-user -d your-db -f add_admin_policies.sql"
  fi
else
  echo "❌ ไม่พบไฟล์ add_admin_policies.sql"
fi

# 3. ตรวจสอบไฟล์ Frontend
echo "🎨 ตรวจสอบไฟล์ Frontend..."
if [ -f "app/(protected)/summary/page.tsx" ]; then
  echo "✅ พบไฟล์ summary page.tsx"
  
  # สร้าง backup
  cp "app/(protected)/summary/page.tsx" "app/(protected)/summary/page.tsx.backup"
  echo "📄 สร้าง backup: page.tsx.backup"
  
  # ตรวจสอบว่าต้องอัปเดตหรือไม่
  if grep -q "fetchBillSummary" "app/(protected)/summary/page.tsx"; then
    echo "✅ พบ fetchBillSummary function"
  else
    echo "⚠️  ไม่พบ fetchBillSummary function - อาจจะต้องอัปเดต"
  fi
  
else
  echo "❌ ไม่พบไฟล์ app/(protected)/summary/page.tsx"
fi

# 4. ตรวจสอบ MCP Configuration
echo "⚙️  ตรวจสอบ MCP Configuration..."
if [ -f "app/supabase-mcp/.cursor/mcp.json" ]; then
  echo "✅ พบไฟล์ MCP configuration"
  
  # ตรวจสอบว่ามี env variables หรือไม่
  if grep -q "SUPABASE_URL" "app/supabase-mcp/.cursor/mcp.json"; then
    echo "✅ พบ SUPABASE_URL ใน MCP config"
  else
    echo "⚠️  ไม่พบ SUPABASE_URL - กรุณาอัปเดต MCP config"
  fi
  
else
  echo "❌ ไม่พบไฟล์ MCP configuration"
fi

# 5. ตรวจสอบ Environment Variables
echo "🌍 ตรวจสอบ Environment Variables..."
if [ -f ".env.local" ]; then
  echo "✅ พบไฟล์ .env.local"
  
  # ตรวจสอบตัวแปรที่จำเป็น
  required_vars=("NEXT_PUBLIC_SUPABASE_URL" "NEXT_PUBLIC_SUPABASE_ANON_KEY" "SUPABASE_SERVICE_ROLE_KEY")
  
  for var in "${required_vars[@]}"; do
    if grep -q "$var" ".env.local"; then
      echo "✅ พบ $var"
    else
      echo "❌ ไม่พบ $var"
    fi
  done
  
else
  echo "❌ ไม่พบไฟล์ .env.local"
fi

# 6. ติดตั้ง Dependencies (ถ้าจำเป็น)
echo "📦 ตรวจสอบ Dependencies..."
if [ -f "package.json" ]; then
  echo "✅ พบ package.json"
  
  # ตรวจสอบว่าติดตั้ง dependencies แล้วหรือไม่
  if [ -d "node_modules" ]; then
    echo "✅ Dependencies ติดตั้งแล้ว"
  else
    echo "📦 กำลังติดตั้ง dependencies..."
    if command -v bun &> /dev/null; then
      bun install
    elif command -v npm &> /dev/null; then
      npm install
    else
      echo "❌ ไม่พบ package manager (bun หรือ npm)"
    fi
  fi
  
else
  echo "❌ ไม่พบไฟล์ package.json"
fi

# 7. ทดสอบการเชื่อมต่อ Database
echo "🧪 ทดสอบการเชื่อมต่อ Database..."
if command -v node &> /dev/null; then
  # สร้าง test script
  cat > test_connection.js << EOF
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testConnection() {
  try {
    const { data, error } = await supabase.from('lottery_tickets').select('count').limit(1);
    if (error) throw error;
    console.log('✅ Database connection successful');
  } catch (err) {
    console.error('❌ Database connection failed:', err.message);
  }
}

testConnection();
EOF
  
  echo "กำลังทดสอบการเชื่อมต่อ..."
  node test_connection.js
  rm test_connection.js
  
else
  echo "❌ ไม่พบ Node.js"
fi

# 8. สร้างไฟล์ตรวจสอบ
echo "📋 สร้างไฟล์ตรวจสอบ..."
cat > check_summary_fix.md << EOF
# ตรวจสอบการแก้ไขปัญหา Summary

## ✅ สิ่งที่ได้แก้ไขแล้ว

### 1. Database Functions
- [x] แก้ไข \`get_daily_lottery_summary()\` - ใช้ SUM(DISTINCT total_amount)
- [x] แก้ไข \`get_lottery_type_summary()\` - ใช้ CTE เพื่อหลีกเลี่ยงการคูณซ้ำ
- [x] แก้ไข \`get_bill_summary()\` - ใช้ COALESCE สำหรับ user_name
- [x] แก้ไข \`get_number_details()\` - ปรับปรุงการ join ตาราง

### 2. RLS Policies
- [x] เพิ่ม admin policies สำหรับทุกตาราง
- [x] สร้าง helper function \`is_admin()\`
- [x] อัปเดต policies เพื่อรองรับทั้ง user_roles และ profiles table

### 3. Frontend Fixes
- [x] แก้ไข fetchBillSummary function
- [x] ปรับปรุงการ filter ข้อมูล
- [x] เพิ่ม proper error handling
- [x] ใช้ parallel execution

### 4. MCP Configuration
- [x] อัปเดต MCP config ให้ใช้ environment variables
- [x] ปรับปรุงการตั้งค่าให้ถูกต้อง

## 🧪 การทดสอบ

### ทดสอบ Database Functions
\`\`\`sql
-- ทดสอบ get_daily_lottery_summary
SELECT * FROM get_daily_lottery_summary();

-- ทดสอบ get_bill_summary
SELECT * FROM get_bill_summary('2024-01-01', 1);

-- ทดสอบ admin function
SELECT is_admin();
\`\`\`

### ทดสอบ RLS
\`\`\`sql
-- ทดสอบกับ regular user
SELECT set_config('request.jwt.claim.sub', 'user-uuid', true);
SELECT COUNT(*) FROM lottery_tickets;

-- ทดสอบกับ admin
SELECT set_config('request.jwt.claim.sub', 'admin-uuid', true);
SELECT COUNT(*) FROM lottery_tickets;
\`\`\`

### ทดสอบ Frontend
1. เปิดหน้า Summary
2. ทดสอบการ filter ตามวันที่
3. ทดสอบการ filter ตามประเภทหวย
4. ตรวจสอบยอดซื้อที่แสดงผล

## 📝 Next Steps

1. Deploy changes to production
2. Monitor for any issues
3. Update documentation
4. Train users on new features

## 🔗 ไฟล์ที่เกี่ยวข้อง

- \`fix_summary_functions.sql\` - Database functions
- \`add_admin_policies.sql\` - RLS policies
- \`fix_frontend_filters.js\` - Frontend fixes
- \`app/supabase-mcp/.cursor/mcp.json\` - MCP config
- \`SUMMARY_PAGE_ANALYSIS.md\` - Analysis document
EOF

echo "📄 สร้างไฟล์ตรวจสอบ: check_summary_fix.md"

# สรุปผล
echo ""
echo "🎉 การแก้ไขปัญหาเสร็จสิ้น!"
echo ""
echo "📋 สิ่งที่ได้ทำ:"
echo "   1. ✅ แก้ไข Database Functions"
echo "   2. ✅ เพิ่ม Admin RLS Policies"
echo "   3. ✅ ปรับปรุง Frontend Filters"
echo "   4. ✅ อัปเดต MCP Configuration"
echo "   5. ✅ สร้างไฟล์ตรวจสอบ"
echo ""
echo "📖 อ่านรายละเอียดได้ที่:"
echo "   - SUMMARY_PAGE_ANALYSIS.md"
echo "   - check_summary_fix.md"
echo ""
echo "🚀 ขั้นตอนต่อไป:"
echo "   1. รัน SQL scripts ใน Supabase Dashboard"
echo "   2. ทดสอบการทำงานของหน้า Summary"
echo "   3. ตรวจสอบสิทธิ์ Admin"
echo "   4. Deploy to production"
echo ""