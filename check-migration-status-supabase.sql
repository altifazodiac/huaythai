-- =====================================================
-- ตรวจสอบสถานะ Migration ระบบเลขอั้น
-- รันผ่าน Supabase Dashboard > SQL Editor
-- =====================================================

-- 1. ตรวจสอบคอลัมน์ใหม่ในตาราง lottery_ticket_items
-- =====================================================
SELECT '📋 1. ตรวจสอบคอลัมน์ใหม่ในตาราง lottery_ticket_items' as info;

SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    CASE 
        WHEN column_name IN ('effective_prize_rate', 'original_amount', 'number_cap_status', 'number_cap_action') 
        THEN '✅ พบแล้ว'
        ELSE '❌ ไม่พบ'
    END as status
FROM information_schema.columns 
WHERE table_name = 'lottery_ticket_items' 
AND table_schema = 'public'
AND column_name IN ('effective_prize_rate', 'original_amount', 'number_cap_status', 'number_cap_action')
ORDER BY column_name;

-- 2. ตรวจสอบ RPC function ใหม่
-- =====================================================
SELECT '📋 2. ตรวจสอบ RPC function handle_lottery_order' as info;

SELECT 
    routine_name,
    routine_type,
    data_type,
    CASE 
        WHEN routine_name = 'handle_lottery_order' 
        THEN '✅ พบแล้ว'
        ELSE '❌ ไม่พบ'
    END as status
FROM information_schema.routines 
WHERE routine_name = 'handle_lottery_order' 
AND routine_schema = 'public';

-- 3. ตรวจสอบข้อมูลตัวอย่างในตาราง lottery_ticket_items
-- =====================================================
SELECT '📋 3. ตรวจสอบข้อมูลตัวอย่างในตาราง lottery_ticket_items' as info;

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
    created_at,
    CASE 
        WHEN original_amount IS NOT NULL AND effective_prize_rate IS NOT NULL 
        THEN '✅ มีข้อมูลครบ'
        ELSE '⚠️ ข้อมูลไม่ครบ'
    END as data_status
FROM lottery_ticket_items 
ORDER BY created_at DESC 
LIMIT 10;

-- 4. ตรวจสอบจำนวนรายการที่มีข้อมูลเลขอั้น
-- =====================================================
SELECT '📋 4. ตรวจสอบจำนวนรายการที่มีข้อมูลเลขอั้น' as info;

SELECT 
    COUNT(*) as total_items,
    COUNT(original_amount) as items_with_original_amount,
    COUNT(effective_prize_rate) as items_with_effective_prize_rate,
    COUNT(number_cap_action) as items_with_number_cap_action,
    COUNT(number_cap_status) as items_with_number_cap_status,
    ROUND(COUNT(original_amount) * 100.0 / COUNT(*), 2) as percent_with_original_amount,
    ROUND(COUNT(effective_prize_rate) * 100.0 / COUNT(*), 2) as percent_with_effective_prize_rate
FROM lottery_ticket_items;

-- 5. ตรวจสอบรายการที่มี number_cap_action = 'half'
-- =====================================================
SELECT '📋 5. ตรวจสอบรายการที่มี number_cap_action = half' as info;

SELECT 
    id,
    ticket_id,
    numbers,
    amount,
    original_amount,
    effective_prize_rate,
    number_cap_action,
    number_cap_status,
    created_at,
    CASE 
        WHEN effective_prize_rate IS NOT NULL AND original_amount IS NOT NULL 
        THEN '✅ ข้อมูลครบถ้วน'
        ELSE '⚠️ ข้อมูลไม่ครบ'
    END as validation_status
FROM lottery_ticket_items 
WHERE number_cap_action = 'half'
ORDER BY created_at DESC;

-- 6. ตรวจสอบสถิติเลขอั้น
-- =====================================================
SELECT '📋 6. ตรวจสอบสถิติเลขอั้น' as info;

SELECT 
    COALESCE(number_cap_action, 'normal') as action_type,
    COUNT(*) as item_count,
    SUM(amount::numeric) as total_amount,
    AVG(effective_prize_rate::numeric) as avg_effective_rate,
    CASE 
        WHEN number_cap_action IS NULL THEN 'เลขปกติ'
        WHEN number_cap_action = 'half' THEN 'เลขอั้น (หารครึ่ง)'
        WHEN number_cap_action = 'close' THEN 'เลขอั้น (ปิดรับ)'
        ELSE 'ไม่ทราบ'
    END as description
FROM lottery_ticket_items 
GROUP BY number_cap_action
ORDER BY action_type;

-- 7. ตรวจสอบความถูกต้องของข้อมูล
-- =====================================================
SELECT '📋 7. ตรวจสอบความถูกต้องของข้อมูล' as info;

SELECT 
    CASE 
        WHEN number_cap_action = 'half' AND effective_prize_rate IS NULL 
        THEN '❌ ERROR: Half action without effective_prize_rate'
        WHEN number_cap_action = 'half' AND original_amount IS NULL 
        THEN '❌ ERROR: Half action without original_amount'
        WHEN number_cap_action = 'half' AND effective_prize_rate IS NOT NULL AND original_amount IS NOT NULL
        THEN '✅ OK: Half action with complete data'
        ELSE '✅ OK: Normal data'
    END as validation_status,
    COUNT(*) as count
FROM lottery_ticket_items 
WHERE number_cap_action = 'half'
GROUP BY 
    CASE 
        WHEN number_cap_action = 'half' AND effective_prize_rate IS NULL 
        THEN '❌ ERROR: Half action without effective_prize_rate'
        WHEN number_cap_action = 'half' AND original_amount IS NULL 
        THEN '❌ ERROR: Half action without original_amount'
        WHEN number_cap_action = 'half' AND effective_prize_rate IS NOT NULL AND original_amount IS NOT NULL
        THEN '✅ OK: Half action with complete data'
        ELSE '✅ OK: Normal data'
    END;

-- 8. ตรวจสอบ lottery_tickets ที่เกี่ยวข้อง
-- =====================================================
SELECT '📋 8. ตรวจสอบ lottery_tickets ที่เกี่ยวข้อง' as info;

SELECT 
    id,
    bill_number,
    bill_name,
    total_amount,
    status,
    created_at
FROM lottery_tickets 
ORDER BY created_at DESC 
LIMIT 5;

-- 9. ตรวจสอบ credit_transactions
-- =====================================================
SELECT '📋 9. ตรวจสอบ credit_transactions' as info;

SELECT 
    id,
    user_id,
    amount,
    transaction_type,
    description,
    created_at
FROM credit_transactions 
ORDER BY created_at DESC 
LIMIT 5;

-- 10. สรุปสถานะ Migration
-- =====================================================
SELECT '📋 10. สรุปสถานะ Migration' as info;

WITH migration_status AS (
    SELECT 
        (SELECT COUNT(*) FROM information_schema.columns 
         WHERE table_name = 'lottery_ticket_items' 
         AND table_schema = 'public'
         AND column_name IN ('effective_prize_rate', 'original_amount', 'number_cap_status', 'number_cap_action')) as new_columns_count,
        
        (SELECT COUNT(*) FROM information_schema.routines 
         WHERE routine_name = 'handle_lottery_order' 
         AND routine_schema = 'public') as new_rpc_count,
        
        (SELECT COUNT(*) FROM lottery_ticket_items 
         WHERE original_amount IS NOT NULL AND effective_prize_rate IS NOT NULL) as updated_records_count,
        
        (SELECT COUNT(*) FROM lottery_ticket_items 
         WHERE number_cap_action = 'half') as half_action_count
)
SELECT 
    CASE 
        WHEN new_columns_count = 4 THEN '✅'
        ELSE '❌'
    END as columns_status,
    'คอลัมน์ใหม่' as columns_description,
    new_columns_count as columns_count,
    
    CASE 
        WHEN new_rpc_count = 1 THEN '✅'
        ELSE '❌'
    END as rpc_status,
    'RPC function ใหม่' as rpc_description,
    new_rpc_count as rpc_count,
    
    CASE 
        WHEN updated_records_count > 0 THEN '✅'
        ELSE '⚠️'
    END as records_status,
    'รายการที่อัปเดตแล้ว' as records_description,
    updated_records_count as records_count,
    
    CASE 
        WHEN half_action_count >= 0 THEN '✅'
        ELSE '❌'
    END as half_status,
    'รายการเลขอั้น (half)' as half_description,
    half_action_count as half_count,
    
    CASE 
        WHEN new_columns_count = 4 AND new_rpc_count = 1 
        THEN '🎉 Migration สำเร็จแล้ว! ระบบเลขอั้นพร้อมใช้งาน'
        ELSE '⚠️ Migration ยังไม่เสร็จสมบูรณ์'
    END as overall_status
FROM migration_status; 