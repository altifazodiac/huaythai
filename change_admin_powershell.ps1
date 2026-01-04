# PowerShell Script เพื่อเปลี่ยน email admin
# ต้องมี Service Role Key จาก Supabase Dashboard

# ตัวแปรที่จำเป็น - แก้ไข Service Role Key ตามจริง
$projectUrl = "https://wbvgdqiozztgqodtajui.supabase.co"
$serviceRoleKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndidmdkcWlvenp0Z3FvZHRhanVpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzQzOTAwOSwiZXhwIjoyMDY5MDE1MDA5fQ.qUsBN-9dLWgfpteUFt4y4ytznDvfCX3iuiCJJHMei1k" # จาก Settings > API > service_role (secret)

# Headers สำหรับ API
$headers = @{
    "apikey" = $serviceRoleKey
    "Authorization" = "Bearer $serviceRoleKey"
    "Content-Type" = "application/json"
}

Write-Host "🔍 กำลังค้นหา user admin@gmail.com..." -ForegroundColor Yellow

try {
    # ดึงรายการ users
    $response = Invoke-RestMethod -Uri "$projectUrl/auth/v1/admin/users" -Headers $headers -Method Get
    $adminUser = $response.users | Where-Object { $_.email -eq "admin@gmail.com" }
    
    if ($adminUser) {
        Write-Host "✅ พบ user ID: $($adminUser.id)" -ForegroundColor Green
        
        # เปลี่ยน email
        $updateBody = @{
            "email" = "altifadev@gmail.com"
        } | ConvertTo-Json -Depth 3
        
        Write-Host "🔄 กำลังเปลี่ยน email..." -ForegroundColor Yellow
        
        $updateResult = Invoke-RestMethod -Uri "$projectUrl/auth/v1/admin/users/$($adminUser.id)" -Headers $headers -Method PUT -Body $updateBody
        
        Write-Host "✅ เปลี่ยน email เรียบร้อย: $($updateResult.user.email)" -ForegroundColor Green
        
        # อัปเดต profiles table
        Write-Host "🔄 กำลังอัปเดต profiles table..." -ForegroundColor Yellow
        
        $profilesUpdate = @{
            "email" = "altifadev@gmail.com"
        } | ConvertTo-Json
        
        $profilesResult = Invoke-RestMethod -Uri "$projectUrl/rest/v1/profiles?email=eq.admin@gmail.com" -Headers $headers -Method PATCH -Body $profilesUpdate
        
        Write-Host "✅ อัปเดต profiles table เรียบร้อย" -ForegroundColor Green
        
    } else {
        Write-Host "❌ ไม่พบ user admin@gmail.com" -ForegroundColor Red
    }
    
} catch {
    Write-Host "❌ เกิดข้อผิดพลาด: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "💡 ตรวจสอบว่า Service Role Key ถูกต้องหรือไม่" -ForegroundColor Yellow
}

Write-Host "🎯 เสร็จสิ้นการทำงาน" -ForegroundColor Cyan
