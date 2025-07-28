# PowerShell script to run SQL migration using curl
# This script fixes the handle_lottery_order function by adding missing columns

Write-Host "🔧 Running SQL migration to fix handle_lottery_order..." -ForegroundColor Yellow

# Check if environment variables are set
$supabaseUrl = $env:NEXT_PUBLIC_SUPABASE_URL
$serviceKey = $env:SUPABASE_SERVICE_ROLE_KEY

if (-not $supabaseUrl -or -not $serviceKey) {
    Write-Host "❌ Missing environment variables!" -ForegroundColor Red
    Write-Host "Please set:" -ForegroundColor Red
    Write-Host "  - NEXT_PUBLIC_SUPABASE_URL" -ForegroundColor Red
    Write-Host "  - SUPABASE_SERVICE_ROLE_KEY" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Environment variables found" -ForegroundColor Green

# Read the SQL file
$sqlContent = Get-Content "fix-handle-lottery-order.sql" -Raw

if (-not $sqlContent) {
    Write-Host "❌ Could not read SQL file" -ForegroundColor Red
    exit 1
}

Write-Host "📝 Running SQL migration..." -ForegroundColor Cyan

# Prepare curl command
$headers = @(
    "apikey: $serviceKey",
    "Authorization: Bearer $serviceKey",
    "Content-Type: application/json",
    "Prefer: return=minimal"
)

$body = @{
    query = $sqlContent
} | ConvertTo-Json -Depth 10

# Run the migration using curl
try {
    $response = curl.exe -X POST "$supabaseUrl/rest/v1/rpc/exec_sql" `
        -H "apikey: $serviceKey" `
        -H "Authorization: Bearer $serviceKey" `
        -H "Content-Type: application/json" `
        -H "Prefer: return=minimal" `
        -d $body

    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Migration completed successfully!" -ForegroundColor Green
        Write-Host "The handle_lottery_order function should now work correctly." -ForegroundColor Green
    } else {
        Write-Host "❌ Migration failed with exit code: $LASTEXITCODE" -ForegroundColor Red
        Write-Host "Response: $response" -ForegroundColor Red
        exit 1
    }
}
catch {
    Write-Host "❌ Error running migration: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
} 