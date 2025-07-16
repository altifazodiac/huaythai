-- Script สำหรับตรวจสอบสถานะของ migration ระบบเลขอั้น
-- รันด้วย: psql $DATABASE_URL -f check-migration-status.sql

-- ตรวจสอบคอลัมน์ใหม่ในตาราง lottery_ticket_items
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'lottery_ticket_items' 
AND table_schema = 'public'
AND column_name IN ('effective_prize_rate', 'original_amount', 'number_cap_status', 'number_cap_action')
ORDER BY column_name;

-- ตรวจสอบ RPC function ใหม่
SELECT 
    routine_name,
    routine_type,
    data_type
FROM information_schema.routines 
WHERE routine_name = 'handle_lottery_order' 
AND routine_schema = 'public';

-- ตรวจสอบข้อมูลตัวอย่างในตาราง lottery_ticket_items
SELECT 
    id,
    ticket_id,
    lottery_sub_type_id,
    lottery_sub_number_id,
    numbers,
    amount,
    original_amount,
    effective_prize_rate,
    number_cap_action,
    number_cap_status,
    created_at
FROM lottery_ticket_items 
ORDER BY created_at DESC 
LIMIT 5;

-- ตรวจสอบจำนวนรายการที่มีข้อมูลเลขอั้น
SELECT 
    COUNT(*) as total_items,
    COUNT(original_amount) as items_with_original_amount,
    COUNT(effective_prize_rate) as items_with_effective_prize_rate,
    COUNT(number_cap_action) as items_with_number_cap_action,
    COUNT(number_cap_status) as items_with_number_cap_status
FROM lottery_ticket_items;

-- ตรวจสอบรายการที่มี number_cap_action = 'half'
SELECT 
    id,
    ticket_id,
    numbers,
    amount,
    original_amount,
    effective_prize_rate,
    number_cap_action,
    number_cap_status,
    created_at
FROM lottery_ticket_items 
WHERE number_cap_action = 'half'
ORDER BY created_at DESC; 