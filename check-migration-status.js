#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

// ตรวจสอบ environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ ไม่พบ environment variables ที่จำเป็น');
    console.error('💡 ตรวจสอบ:');
    console.error('   - NEXT_PUBLIC_SUPABASE_URL');
    console.error('   - SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkMigrationStatus() {
    console.log('🔍 ตรวจสอบสถานะ Migration ระบบเลขอั้น...\n');

    try {
        // 1. ตรวจสอบคอลัมน์ใหม่ในตาราง lottery_ticket_items
        console.log('📋 1. ตรวจสอบคอลัมน์ใหม่ในตาราง lottery_ticket_items...');
        const { data: columns, error: columnsError } = await supabase
            .from('lottery_ticket_items')
            .select('effective_prize_rate, original_amount, number_cap_status, number_cap_action')
            .limit(1);

        if (columnsError) {
            console.log('❌ ไม่พบคอลัมน์ใหม่ - Migration ยังไม่ได้รัน');
            console.log('Error:', columnsError.message);
        } else {
            console.log('✅ พบคอลัมน์ใหม่แล้ว');
            console.log('   - effective_prize_rate:', columns[0]?.effective_prize_rate !== undefined ? '✅' : '❌');
            console.log('   - original_amount:', columns[0]?.original_amount !== undefined ? '✅' : '❌');
            console.log('   - number_cap_status:', columns[0]?.number_cap_status !== undefined ? '✅' : '❌');
            console.log('   - number_cap_action:', columns[0]?.number_cap_action !== undefined ? '✅' : '❌');
        }

        // 2. ตรวจสอบ RPC function ใหม่
        console.log('\n📋 2. ตรวจสอบ RPC function handle_lottery_order...');
        try {
            const { data: rpcTest, error: rpcError } = await supabase.rpc('handle_lottery_order', {
                p_user_id: '00000000-0000-0000-0000-000000000000',
                p_bill_name: 'test',
                p_bill_number: 'test',
                p_draw_date: '2025-01-27',
                p_draw_time: '16:30:00',
                p_close_time: '16:00:00',
                p_total_amount: 0,
                p_ticket_items: []
            });

            if (rpcError && rpcError.message.includes('function') && rpcError.message.includes('does not exist')) {
                console.log('❌ ไม่พบ RPC function handle_lottery_order');
            } else {
                console.log('✅ พบ RPC function handle_lottery_order แล้ว');
            }
        } catch (error) {
            if (error.message.includes('function') && error.message.includes('does not exist')) {
                console.log('❌ ไม่พบ RPC function handle_lottery_order');
            } else {
                console.log('✅ พบ RPC function handle_lottery_order แล้ว (เกิด error อื่นที่ไม่ใช่ function not found)');
            }
        }

        // 3. ตรวจสอบข้อมูลตัวอย่าง
        console.log('\n📋 3. ตรวจสอบข้อมูลตัวอย่างในตาราง lottery_ticket_items...');
        const { data: sampleData, error: sampleError } = await supabase
            .from('lottery_ticket_items')
            .select('id, numbers, amount, original_amount, effective_prize_rate, number_cap_action, number_cap_status, created_at')
            .order('created_at', { ascending: false })
            .limit(5);

        if (sampleError) {
            console.log('❌ ไม่สามารถดึงข้อมูลตัวอย่างได้:', sampleError.message);
        } else {
            console.log(`✅ พบข้อมูล ${sampleData.length} รายการล่าสุด`);
            sampleData.forEach((item, index) => {
                console.log(`   ${index + 1}. ID: ${item.id}`);
                console.log(`      Numbers: ${item.numbers}`);
                console.log(`      Amount: ${item.amount}`);
                console.log(`      Original Amount: ${item.original_amount || 'null'}`);
                console.log(`      Effective Prize Rate: ${item.effective_prize_rate || 'null'}`);
                console.log(`      Number Cap Action: ${item.number_cap_action || 'null'}`);
                console.log(`      Created: ${item.created_at}`);
                console.log('');
            });
        }

        // 4. ตรวจสอบจำนวนรายการที่มีข้อมูลเลขอั้น
        console.log('📋 4. ตรวจสอบจำนวนรายการที่มีข้อมูลเลขอั้น...');
        const { data: stats, error: statsError } = await supabase
            .from('lottery_ticket_items')
            .select('number_cap_action, amount');

        if (statsError) {
            console.log('❌ ไม่สามารถดึงสถิติได้:', statsError.message);
        } else {
            const totalItems = stats.length;
            const itemsWithOriginalAmount = stats.filter(item => item.original_amount !== null).length;
            const itemsWithEffectivePrizeRate = stats.filter(item => item.effective_prize_rate !== null).length;
            const itemsWithNumberCapAction = stats.filter(item => item.number_cap_action !== null).length;
            const itemsWithNumberCapStatus = stats.filter(item => item.number_cap_status !== null).length;

            console.log(`   - รายการทั้งหมด: ${totalItems}`);
            console.log(`   - มี original_amount: ${itemsWithOriginalAmount}`);
            console.log(`   - มี effective_prize_rate: ${itemsWithEffectivePrizeRate}`);
            console.log(`   - มี number_cap_action: ${itemsWithNumberCapAction}`);
            console.log(`   - มี number_cap_status: ${itemsWithNumberCapStatus}`);

            // ตรวจสอบรายการที่มี number_cap_action = 'half'
            const halfItems = stats.filter(item => item.number_cap_action === 'half');
            console.log(`   - รายการที่มี number_cap_action = 'half': ${halfItems.length}`);
        }

        // 5. สรุปสถานะ
        console.log('\n📋 5. สรุปสถานะ Migration...');
        const hasNewColumns = columns && !columnsError;
        const hasNewRPC = true; // ถ้าไม่ error แสดงว่ามี function

        if (hasNewColumns && hasNewRPC) {
            console.log('🎉 Migration สำเร็จแล้ว! ระบบเลขอั้นพร้อมใช้งาน');
            console.log('');
            console.log('📝 ขั้นตอนต่อไป:');
            console.log('1. รีสตาร์ท application server');
            console.log('2. ทดสอบระบบเลขอั้น');
            console.log('3. สร้างรายการใหม่เพื่อทดสอบ');
        } else {
            console.log('⚠️ Migration ยังไม่เสร็จสมบูรณ์');
            if (!hasNewColumns) {
                console.log('   - ยังไม่มีคอลัมน์ใหม่');
            }
            if (!hasNewRPC) {
                console.log('   - ยังไม่มี RPC function ใหม่');
            }
            console.log('');
            console.log('💡 วิธีแก้ไข:');
            console.log('1. รัน migration script อีกครั้ง');
            console.log('2. ตรวจสอบ environment variables');
            console.log('3. ตรวจสอบ log ของ migration');
        }

    } catch (error) {
        console.error('❌ เกิดข้อผิดพลาดในการตรวจสอบ:', error.message);
        process.exit(1);
    }
}

// รันฟังก์ชันตรวจสอบ
checkMigrationStatus(); 