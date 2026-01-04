# เปลี่ยน Email Admin ผ่าน CMD/PowerShell

## วิธีที่ 1: ใช้ Supabase CLI (แนะนำ)

### ขั้นตอนการติดตั้งและใช้งาน:

1. **ติดตั้ง Supabase CLI:**
```bash
npm install -g supabase
# หรือ
choco install supabase
```

2. **Login ใน Supabase:**
```bash
supabase login
```

3. **Link กับ project:**
```bash
supabase link --project-ref wbvgdqiozztgqodtajui
```

4. **เปลี่ยน email admin:**
```bash
supabase auth users update admin@gmail.com --email altifadev@gmail.com
```

## วิธีที่ 2: ใช้ cURL กับ Supabase API

### สร้าง script PowerShell:

```powershell
# ตัวแปรที่จำเป็น
$projectUrl = "https://wbvgdqiozztgqodtajui.supabase.co"
$serviceRoleKey = "YOUR_SERVICE_ROLE_KEY" # จาก Settings > API

# ค้นหา user ID ของ admin@gmail.com
$headers = @{
    "apikey" = $serviceRoleKey
    "Authorization" = "Bearer $serviceRoleKey"
}

# ดึงรายการ users
$users = Invoke-RestMethod -Uri "$projectUrl/auth/v1/admin/users" -Headers $headers -Method Get
$adminUser = $users | Where-Object { $_.email -eq "admin@gmail.com" }

if ($adminUser) {
    Write-Host "พบ user ID: $($adminUser.id)"
    
    # เปลี่ยน email
    $updateBody = @{
        "email" = "altifadev@gmail.com"
    } | ConvertTo-Json
    
    $updateResult = Invoke-RestMethod -Uri "$projectUrl/auth/v1/admin/users/$($adminUser.id)" -Headers $headers -Method PUT -Body $updateBody -ContentType "application/json"
    
    Write-Host "อัปเดต email เรียบร้อย: $($updateResult.email)"
} else {
    Write-Host "ไม่พบ user admin@gmail.com"
}
```

## วิธีที่ 3: ใช้ Node.js Script

### สร้างไฟล์ change-admin-email.js:

```javascript
const { createClient } = require('@supabase/supabase-js');

// Service Role Key จาก Supabase Dashboard > Settings > API
const supabase = createClient(
  'https://wbvgdqiozztgqodtajui.supabase.co',
  'YOUR_SERVICE_ROLE_KEY'
);

async function changeAdminEmail() {
  try {
    // ค้นหา admin user
    const { data: { users }, error } = await supabase.auth.admin.listUsers();
    
    if (error) {
      console.error('Error:', error);
      return;
    }
    
    const adminUser = users.find(u => u.email === 'admin@gmail.com');
    
    if (!adminUser) {
      console.log('ไม่พบ user admin@gmail.com');
      return;
    }
    
    console.log('พบ user ID:', adminUser.id);
    
    // เปลี่ยน email
    const { data, error: updateError } = await supabase.auth.admin.updateUserById(
      adminUser.id,
      { email: 'altifadev@gmail.com' }
    );
    
    if (updateError) {
      console.error('Update error:', updateError);
    } else {
      console.log('✅ เปลี่ยน email เรียบร้อย:', data.user.email);
    }
    
  } catch (err) {
    console.error('Error:', err);
  }
}

changeAdminEmail();
```

### รัน script:
```bash
npm install @supabase/supabase-js
node change-admin-email.js
```

## วิธีที่ 4: ใช้ Environment Variables

### สร้าง .env file:
```
SUPABASE_URL=https://wbvgdqiozztgqodtajui.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
```

### รันคำสั่ง PowerShell:
```powershell
$env:SUPABASE_URL = "https://wbvgdqiozztgqodtajui.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY = "YOUR_SERVICE_ROLE_KEY"

# ใช้คำสั่งจากวิธีที่ 2
```

## หมายเหตุ:
- ต้องมี Service Role Key (ไม่ใช่ anon key)
- Service Role Key มีสิทธิ์ admin สูงสุด
- รักษา key ให้ปลอดภัย อย่าเผยแพร่

## แนะนำให้ใช้วิธีที่ 1 (Supabase CLI)
เพราะง่ายและปลอดภัยที่สุด
