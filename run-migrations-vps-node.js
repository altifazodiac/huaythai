#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

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

console.log('🚀 เริ่มต้นรัน migration สำหรับระบบเลขอั้น...');

// ตรวจสอบไฟล์ migration
const migration1Path = 'supabase/migrations/20250127000000_add_effective_prize_rate_to_lottery_ticket_items.sql';
const migration2Path = 'supabase/migrations/20250127000001_create_handle_lottery_order_rpc.sql';

if (!fs.existsSync(migration1Path)) {
    console.error('❌ ไม่พบไฟล์ migration แรก');
    process.exit(1);
}

if (!fs.existsSync(migration2Path)) {
    console.error('❌ ไม่พบไฟล์ migration ที่สอง');
    process.exit(1);
}

console.log('✅ พบไฟล์ migration ทั้งสองไฟล์');

// ฟังก์ชันสำหรับรัน SQL
async function runSQL(sqlContent, description) {
    console.log(`📝 ${description}...`);
    
    try {
        const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
            method: 'POST',
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal'
            },
            body: JSON.stringify({ query: sqlContent })
        });

        if (response.ok) {
            console.log(`✅ ${description} สำเร็จ`);
            return true;
        } else {
            const errorText = await response.text();
            console.error(`❌ ${description} ล้มเหลว`);
            console.error(`Response: ${errorText}`);
            return false;
        }
    } catch (error) {
        console.error(`❌ ${description} ล้มเหลว`);
        console.error(`Error: ${error.message}`);
        return false;
    }
}

// ฟังก์ชันหลัก
async function main() {
    try {
        // อ่าน SQL จากไฟล์
        const sql1 = fs.readFileSync(migration1Path, 'utf8');
        const sql2 = fs.readFileSync(migration2Path, 'utf8');

        // รัน migration แรก
        const success1 = await runSQL(sql1, 'เพิ่มคอลัมน์ effective_prize_rate');
        if (!success1) {
            console.error('❌ Migration แรกล้มเหลว');
            process.exit(1);
        }

        // รัน migration ที่สอง
        const success2 = await runSQL(sql2, 'สร้าง handle_lottery_order RPC');
        if (!success2) {
            console.error('❌ Migration ที่สองล้มเหลว');
            process.exit(1);
        }

        console.log('🎉 Migration ทั้งหมดสำเร็จ!');
        console.log('');
        console.log('📋 สรุปการเปลี่ยนแปลง:');
        console.log('1. เพิ่มคอลัมน์ effective_prize_rate, original_amount, number_cap_status, number_cap_action');
        console.log('2. สร้าง RPC function handle_lottery_order ใหม่');
        console.log('3. อัปเดตข้อมูลเก่าให้มีค่าเริ่มต้น');
        console.log('');
        console.log('🔧 ระบบเลขอั้นพร้อมใช้งานแล้ว!');
        console.log('   - ลูกค้าจะจ่ายเต็มราคา');
        console.log('   - เลขอั้นจะได้รับรางวัลครึ่งหนึ่ง');
        console.log('   - ข้อมูลจะถูกบันทึกในคอลัมน์ใหม่');
        console.log('');
        console.log('📝 ขั้นตอนต่อไป:');
        console.log('1. รีสตาร์ท application server');
        console.log('2. ทดสอบระบบเลขอั้น');
        console.log('3. ตรวจสอบข้อมูลในฐานข้อมูล');

    } catch (error) {
        console.error('❌ เกิดข้อผิดพลาด:', error.message);
        process.exit(1);
    }
}

// รันฟังก์ชันหลัก
main(); 