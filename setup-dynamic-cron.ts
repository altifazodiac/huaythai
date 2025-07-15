 import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'fs';
import { execSync } from 'child_process';
import 'dotenv/config';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface DrawingTime {
    draw_time: string;
}

async function setupDynamicCron() {
    try {
        console.log('🚀 Setting up dynamic cron jobs...');
        
        // 1. ดึงเวลาทั้งหมดจาก drawing_schedules
        const { data: drawingTimes, error } = await supabase
            .from('drawing_schedules')
            .select('draw_time')
            .not('draw_time', 'is', null);

        if (error) {
            throw new Error(`Failed to fetch drawing times: ${error.message}`);
        }

        if (!drawingTimes || drawingTimes.length === 0) {
            console.log('No drawing times found in database');
            return;
        }

        // 2. คัดกรองเวลาที่ซ้ำออก และเรียงลำดับ
        const uniqueTimes = [...new Set(drawingTimes.map(dt => dt.draw_time))]
            .filter(time => time && time.trim() !== '')
            .sort();

        console.log(`Found ${uniqueTimes.length} unique drawing times:`, uniqueTimes);

        // 3. สร้าง cron entries
        const cronEntries: string[] = [];
        const projectPath = process.cwd();
        const logDir = `${projectPath}/logs`;

        // สร้างโฟลเดอร์ logs ถ้ายังไม่มี
        try {
            execSync(`mkdir -p ${logDir}`);
        } catch (e) {
            console.log('Log directory already exists or creation failed');
        }

        // Environment variables สำหรับ cron
        const envVars = [
            `NEXT_PUBLIC_SUPABASE_URL=${process.env.NEXT_PUBLIC_SUPABASE_URL}`,
            `SUPABASE_SERVICE_ROLE_KEY=${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
            `LINE_CHANNEL_ACCESS_TOKEN=${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
            `NEXT_PUBLIC_SUPABASE_ANON_KEY=${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
        ].join(' ');

        // 4. สร้าง cron jobs สำหรับแต่ละเวลา
        const bunPath = '/root/.bun/bin/bun'; // ใช้ path เต็มของ bun
        uniqueTimes.forEach(time => {
            const [hour, minute] = time.split(':');
            const hourNum = parseInt(hour, 10);
            const minuteNum = parseInt(minute, 10);

            // Scrape job: รันที่เวลาหวยออก + 1 นาที
            const scrapeMinute = (minuteNum + 1) % 60;
            const scrapeHour = scrapeMinute === 0 ? (hourNum + 1) % 24 : hourNum;
            
            const scrapeCron = `${scrapeMinute} ${scrapeHour} * * * cd ${projectPath} && ${envVars} ${bunPath} run import-lottery-results.ts >> ${logDir}/scrape-${time.replace(':', '')}.log 2>&1`;
            cronEntries.push(scrapeCron);

            // Send job: รันที่เวลาหวยออก + 3 นาที
            const sendMinute = (minuteNum + 3) % 60;
            const sendHour = sendMinute < 3 ? (hourNum + 1) % 24 : hourNum;
            
            const sendCron = `${sendMinute} ${sendHour} * * * cd ${projectPath} && ${envVars} ${bunPath} run send-lottery-results.ts >> ${logDir}/send-${time.replace(':', '')}.log 2>&1`;
            cronEntries.push(sendCron);
        });

        // 5. เพิ่ม cron สำหรับอัปเดตตารางเวลาอัตโนมัติ (ทุกวันเวลา 00:05)
        const updateCron = `5 0 * * * cd ${projectPath} && ${envVars} ${bunPath} run setup-dynamic-cron.ts >> ${logDir}/update-cron.log 2>&1`;
        cronEntries.push(updateCron);

        // 6. เพิ่ม cron สำหรับรัน background task processor (restart ทุกชั่วโมง)
        const processorCron = `0 * * * * cd ${projectPath} && ${envVars} ${bunPath} run scripts/start-background-processor.ts >> ${logDir}/background-processor.log 2>&1`;
        cronEntries.push(processorCron);

        // 6. สร้างไฟล์ crontab ใหม่
        const crontabContent = [
            '# Dynamic Cron Jobs for Lottery System',
            '# Auto-generated from drawing_schedules table',
            '# DO NOT EDIT MANUALLY - Use setup-dynamic-cron.ts instead',
            '',
            ...cronEntries,
            ''
        ].join('\n');

        // 7. ตรวจสอบ OS ก่อนสร้าง crontab
        const isWindows = process.platform === 'win32';
        
        if (isWindows) {
            console.log('⚠️  Windows detected - Cron jobs cannot be set up automatically');
            console.log('📋 Generated crontab content:');
            console.log(crontabContent);
            console.log('\n📝 Please set up these cron jobs manually on your Linux VPS');
            return;
        }

        // 8. เขียนไฟล์ crontab ชั่วคราว (Linux only)
        const tempCronFile = '/tmp/lottery-crontab';
        writeFileSync(tempCronFile, crontabContent);

        // 9. อัปเดต crontab
        execSync(`crontab ${tempCronFile}`);
        execSync(`rm ${tempCronFile}`);

        console.log('✅ Dynamic cron jobs have been set up successfully!');
        console.log('\n📋 Generated cron jobs:');
        cronEntries.forEach((entry, index) => {
            console.log(`${index + 1}. ${entry}`);
        });

        // 10. แสดงสถานะ crontab ปัจจุบัน
        console.log('\n📅 Current crontab:');
        try {
            const currentCrontab = execSync('crontab -l', { encoding: 'utf8' });
            console.log(currentCrontab);
        } catch (e) {
            console.log('No crontab found or error reading crontab');
        }

    } catch (error) {
        console.error('❌ Error setting up dynamic cron:', error);
        process.exit(1);
    }
}

// เรียกใช้งานหลักถ้ารันไฟล์โดยตรง
if (typeof require !== 'undefined' && require.main === module) {
    setupDynamicCron();
} else if (typeof (globalThis as any).Bun !== 'undefined') {
    setupDynamicCron();
}

export { setupDynamicCron }; 