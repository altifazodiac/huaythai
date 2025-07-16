-- Script สำหรับทดสอบระบบเลขอั้น
-- รันด้วย: psql $DATABASE_URL -f test-number-cap-system.sql

-- 1. ทดสอบการสร้างรายการใหม่ที่มีเลขอั้น
-- สมมติว่ามี user_id และ lottery_sub_type_id ที่มีอยู่จริง

-- ตรวจสอบ user และ lottery_sub_type ที่มีอยู่
SELECT 'Available users:' as info;
SELECT id, email FROM auth.users LIMIT 3;

SELECT 'Available lottery sub types:' as info;
SELECT lottery_sub_type_id, sub_type_name FROM lottery_sub_types LIMIT 3;

-- 2. ทดสอบการเรียก RPC function ด้วยข้อมูลตัวอย่าง
-- (ต้องแทนที่ user_id และ lottery_sub_type_id ด้วยค่าจริง)

/*
-- ตัวอย่างการเรียก RPC function (uncomment เมื่อพร้อมทดสอบ)
SELECT handle_lottery_order(
    'user-uuid-here'::uuid,  -- แทนที่ด้วย user_id จริง
    'ทดสอบระบบเลขอั้น',
    'TEST001',
    '2025-01-27'::date,
    '16:30:00'::time,
    '16:00:00'::time,
    60.00,
    '[
        {
            "lottery_sub_type_id": 3,
            "lottery_sub_number_id": 13,
            "numbers": ["123"],
            "amount": "20.00",
            "original_amount": "20.00",
            "effective_prize_rate": "900.00",
            "number_cap_action": null,
            "number_cap_status": null
        },
        {
            "lottery_sub_type_id": 3,
            "lottery_sub_number_id": 13,
            "numbers": ["456"],
            "amount": "20.00",
            "original_amount": "20.00",
            "effective_prize_rate": "450.00",
            "number_cap_action": "half",
            "number_cap_status": "{\"action\": \"half\", \"reason\": \"ทดสอบระบบ\"}"
        },
        {
            "lottery_sub_type_id": 3,
            "lottery_sub_number_id": 15,
            "numbers": ["78"],
            "amount": "20.00",
            "original_amount": "20.00",
            "effective_prize_rate": "90.00",
            "number_cap_action": null,
            "number_cap_status": null
        }
    ]'::jsonb
);
*/

-- 3. ตรวจสอบข้อมูลที่บันทึกในตาราง lottery_ticket_items
SELECT 'Recent lottery ticket items:' as info;
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
LIMIT 10;

-- 4. ตรวจสอบรายการที่มีเลขอั้น
SELECT 'Items with number cap action:' as info;
SELECT 
    id,
    numbers,
    amount,
    effective_prize_rate,
    number_cap_action,
    number_cap_status,
    created_at
FROM lottery_ticket_items 
WHERE number_cap_action IS NOT NULL
ORDER BY created_at DESC;

-- 5. ตรวจสอบสถิติเลขอั้น
SELECT 'Number cap statistics:' as info;
SELECT 
    COALESCE(number_cap_action, 'normal') as action_type,
    COUNT(*) as item_count,
    SUM(amount::numeric) as total_amount,
    AVG(effective_prize_rate::numeric) as avg_effective_rate
FROM lottery_ticket_items 
GROUP BY number_cap_action
ORDER BY action_type;

-- 6. ตรวจสอบความถูกต้องของข้อมูล
SELECT 'Data validation:' as info;
SELECT 
    CASE 
        WHEN number_cap_action = 'half' AND effective_prize_rate IS NULL 
        THEN 'ERROR: Half action without effective_prize_rate'
        WHEN number_cap_action = 'half' AND original_amount IS NULL 
        THEN 'ERROR: Half action without original_amount'
        ELSE 'OK'
    END as validation_status,
    COUNT(*) as count
FROM lottery_ticket_items 
WHERE number_cap_action = 'half'
GROUP BY 
    CASE 
        WHEN number_cap_action = 'half' AND effective_prize_rate IS NULL 
        THEN 'ERROR: Half action without effective_prize_rate'
        WHEN number_cap_action = 'half' AND original_amount IS NULL 
        THEN 'ERROR: Half action without original_amount'
        ELSE 'OK'
    END;

-- 7. ตรวจสอบ lottery_tickets ที่เกี่ยวข้อง
SELECT 'Recent lottery tickets:' as info;
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

-- 8. ตรวจสอบ credit_transactions
SELECT 'Recent credit transactions:' as info;
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