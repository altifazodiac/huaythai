# PowerShell script to run the new migrations that fix handle_lottery_order
# This script runs the migrations directly using curl to Supabase REST API

Write-Host "🔧 Running migrations to fix handle_lottery_order function..." -ForegroundColor Yellow

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

# Function to run SQL
function Run-SQL {
    param(
        [string]$sql,
        [string]$description
    )
    
    Write-Host "📝 $description..." -ForegroundColor Cyan
    
    $headers = @{
        "apikey" = $serviceKey
        "Authorization" = "Bearer $serviceKey"
        "Content-Type" = "application/json"
        "Prefer" = "return=minimal"
    }
    
    $body = @{
        query = $sql
    } | ConvertTo-Json -Depth 10
    
    try {
        $response = Invoke-RestMethod -Uri "$supabaseUrl/rest/v1/rpc/exec_sql" -Method POST -Headers $headers -Body $body
        Write-Host "✅ $description completed successfully" -ForegroundColor Green
        return $true
    }
    catch {
        Write-Host "❌ Error in $description`: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Migration 1: Add number cap columns to lottery_ticket_items
$migration1 = @'
-- Add number cap support columns to lottery_ticket_items table
ALTER TABLE public.lottery_ticket_items 
ADD COLUMN IF NOT EXISTS original_amount DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS effective_prize_rate DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS number_cap_action TEXT,
ADD COLUMN IF NOT EXISTS number_cap_status JSONB;

-- Update existing records to have default values
UPDATE public.lottery_ticket_items 
SET 
    original_amount = amount,
    effective_prize_rate = 0,
    number_cap_action = NULL,
    number_cap_status = NULL
WHERE original_amount IS NULL;

-- Add constraints to ensure data integrity
ALTER TABLE public.lottery_ticket_items 
ADD CONSTRAINT IF NOT EXISTS check_original_amount_positive 
CHECK (original_amount IS NULL OR original_amount > 0),
ADD CONSTRAINT IF NOT EXISTS check_effective_prize_rate_positive 
CHECK (effective_prize_rate IS NULL OR effective_prize_rate >= 0),
ADD CONSTRAINT IF NOT EXISTS check_number_cap_action_valid 
CHECK (number_cap_action IS NULL OR number_cap_action IN ('close', 'half'));
'@

# Migration 2: Add draw_time and close_time columns to lottery_tickets
$migration2 = @'
-- Add draw_time and close_time columns to lottery_tickets table
ALTER TABLE public.lottery_tickets 
ADD COLUMN IF NOT EXISTS draw_time TIME,
ADD COLUMN IF NOT EXISTS close_time TIME,
ADD COLUMN IF NOT EXISTS bill_name TEXT,
ADD COLUMN IF NOT EXISTS bill_number TEXT;

-- Create unique constraint for bill_number to ensure uniqueness
ALTER TABLE public.lottery_tickets 
ADD CONSTRAINT IF NOT EXISTS unique_bill_number 
UNIQUE (bill_number);
'@

# Run migrations
$success1 = Run-SQL $migration1 "Adding number cap columns to lottery_ticket_items"
$success2 = Run-SQL $migration2 "Adding draw_time and close_time columns to lottery_tickets"

if ($success1 -and $success2) {
    Write-Host "🎉 All migrations completed successfully!" -ForegroundColor Green
    Write-Host "The handle_lottery_order function should now work correctly." -ForegroundColor Green
} else {
    Write-Host "❌ Some migrations failed. Please check the errors above." -ForegroundColor Red
    exit 1
} 