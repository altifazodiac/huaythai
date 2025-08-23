# PowerShell script to run soft delete migration for lottery tickets

Write-Host "Running soft delete migration for lottery tickets..." -ForegroundColor Green

# Check if supabase CLI is available
try {
    $supabaseVersion = supabase --version
    Write-Host "Supabase CLI found: $supabaseVersion" -ForegroundColor Green
} catch {
    Write-Host "Supabase CLI not found. Please install it first." -ForegroundColor Red
    Write-Host "Visit: https://supabase.com/docs/guides/cli" -ForegroundColor Yellow
    exit 1
}

# Run the migration
Write-Host "Applying migration: 20250101000000_create_soft_delete_lottery_ticket_function.sql" -ForegroundColor Yellow
supabase db push

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Migration applied successfully!" -ForegroundColor Green
    Write-Host "You can now soft delete lottery tickets without draw_date validation errors." -ForegroundColor Green
} else {
    Write-Host "❌ Migration failed. Please check the error messages above." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Migration completed. The soft delete functionality should now work properly." -ForegroundColor Green
