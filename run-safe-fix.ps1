# PowerShell script to safely fix handle_lottery_order function
# This script runs the safe SQL migration to prevent "UPDATE requires WHERE clause" error

Write-Host "🔧 รันการแก้ไข handle_lottery_order function อย่างปลอดภัย..." -ForegroundColor Yellow

# Check if safe-fix-handle-lottery-order.sql exists
if (-not (Test-Path "safe-fix-handle-lottery-order.sql")) {
    Write-Host "❌ ไม่พบไฟล์ safe-fix-handle-lottery-order.sql" -ForegroundColor Red
    Write-Host "กรุณาตรวจสอบว่าไฟล์อยู่ในโฟลเดอร์เดียวกันกับ script นี้" -ForegroundColor Red
    exit 1
}

# Get Supabase connection details from environment or prompt user
$SUPABASE_URL = $env:NEXT_PUBLIC_SUPABASE_URL
$SUPABASE_SERVICE_KEY = $env:SUPABASE_SERVICE_ROLE_KEY

if (-not $SUPABASE_URL) {
    $SUPABASE_URL = Read-Host "กรุณาใส่ Supabase URL (https://your-project.supabase.co)"
}

if (-not $SUPABASE_SERVICE_KEY) {
    $SUPABASE_SERVICE_KEY = Read-Host "กรุณาใส่ Supabase Service Role Key" -AsSecureString
    $SUPABASE_SERVICE_KEY = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($SUPABASE_SERVICE_KEY))
}

# Extract project ID from URL
$PROJECT_ID = $SUPABASE_URL -replace "https://", "" -replace ".supabase.co.*", ""

# Build PostgreSQL connection string
$DATABASE_URL = "postgresql://postgres.${PROJECT_ID}:${SUPABASE_SERVICE_KEY}@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres"

Write-Host "📡 กำลังเชื่อมต่อกับ Supabase project: $PROJECT_ID" -ForegroundColor Cyan

try {
    # Check if psql is available
    $psqlVersion = psql --version 2>$null
    if (-not $psqlVersion) {
        Write-Host "❌ ไม่พบ psql command" -ForegroundColor Red
        Write-Host "กรุณาติดตั้ง PostgreSQL client tools หรือ" -ForegroundColor Yellow
        Write-Host "ใช้ Supabase dashboard เพื่อรัน SQL script ใน safe-fix-handle-lottery-order.sql" -ForegroundColor Yellow
        exit 1
    }

    Write-Host "✅ พบ psql: $psqlVersion" -ForegroundColor Green

    # Run the safe SQL migration
    Write-Host "📝 กำลังรัน safe SQL migration..." -ForegroundColor Yellow
    
    $result = psql $DATABASE_URL -f "safe-fix-handle-lottery-order.sql" 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ รัน SQL migration สำเร็จ!" -ForegroundColor Green
        Write-Host "📋 ผลลัพธ์:" -ForegroundColor Cyan
        Write-Host $result -ForegroundColor White
        
        Write-Host "`n🎉 การแก้ไขเสร็จสิ้น!" -ForegroundColor Green
        Write-Host "ตอนนี้ handle_lottery_order function ควรทำงานได้ถูกต้องแล้ว" -ForegroundColor Green
        
        Write-Host "`n📋 สิ่งที่ถูกแก้ไข:" -ForegroundColor Yellow
        Write-Host "- เพิ่มคอลัมน์ที่จำเป็นสำหรับ number cap system" -ForegroundColor White
        Write-Host "- แก้ไข UPDATE statement ให้มี WHERE clause ที่ปลอดภัย" -ForegroundColor White
        Write-Host "- เพิ่ม indexes และ constraints" -ForegroundColor White
        Write-Host "- ตรวจสอบความสมบูรณ์ของ schema" -ForegroundColor White
        
        Write-Host "`n🔄 ขั้นตอนถัดไป:" -ForegroundColor Yellow
        Write-Host "1. ลองใช้ lottery order system ใน website" -ForegroundColor White
        Write-Host "2. ตรวจสอบว่า handle_lottery_order ทำงานได้โดยไม่มี error" -ForegroundColor White
        Write-Host "3. หากยังมีปัญหา ให้ตรวจสอบ logs ใน Supabase dashboard" -ForegroundColor White
        
    } else {
        Write-Host "❌ เกิดข้อผิดพลาดในการรัน SQL migration" -ForegroundColor Red
        Write-Host "Error:" -ForegroundColor Red
        Write-Host $result -ForegroundColor Red
        
        Write-Host "`n💡 วิธีแก้ไขทางเลือก:" -ForegroundColor Yellow
        Write-Host "1. เข้าไปที่ Supabase Dashboard" -ForegroundColor White
        Write-Host "2. ไปที่ SQL Editor" -ForegroundColor White
        Write-Host "3. รัน SQL จากไฟล์ safe-fix-handle-lottery-order.sql แบบแบ่งส่วน" -ForegroundColor White
        Write-Host "4. ตรวจสอบ error message แต่ละส่วน" -ForegroundColor White
    }
    
} catch {
    Write-Host "❌ เกิดข้อผิดพลาด: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "`n💡 วิธีแก้ไขทางเลือก:" -ForegroundColor Yellow
    Write-Host "1. ตรวจสอบ internet connection" -ForegroundColor White
    Write-Host "2. ตรวจสอบ Supabase credentials" -ForegroundColor White
    Write-Host "3. ใช้ Supabase Dashboard แทน" -ForegroundColor White
}

Write-Host "`nกด Enter เพื่อปิด..." -ForegroundColor Gray
Read-Host 