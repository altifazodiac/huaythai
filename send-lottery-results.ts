// send-lottery-results.ts

import { Client } from '@line/bot-sdk';
import { createClient } from '@supabase/supabase-js';
import { subMinutes } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import 'dotenv/config'; // สำหรับทดสอบบนเครื่อง Local

// --- Type Definitions ---
// นิยาม Type เพื่อให้โค้ดชัดเจนและลดข้อผิดพลาด
interface FormattedResult {
    name: string;
    time: string;
    flag: string;
    top3: string;
    top2: string;
    bottom2: string;
}

// --- Main Logic Function ---
async function main() {
    console.log('Starting lottery result script...');

    // ตั้งค่า Clients ที่จะใช้งาน
    const lineClient = new Client({
        channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || '',
    });

    const supabaseClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || '',
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    );

    // ตรวจสอบว่า Environment Variables ครบถ้วนหรือไม่
    if (!process.env.LINE_CHANNEL_ACCESS_TOKEN || !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        console.error('Error: Missing required environment variables.');
        process.exit(1);
    }
    
    try {
        // คำนวณช่วงเวลาที่จะดึงข้อมูล (30 นาทีล่าสุด)
        const timeZone = 'Asia/Bangkok';
        const now = new Date();
        const thirtyMinutesAgo = subMinutes(now, 30);

        // Format เวลาให้ตรงกับรูปแบบในฐานข้อมูล (HH:mm:ss) และวันที่ (yyyy-MM-dd)
        const startTime = formatInTimeZone(thirtyMinutesAgo, timeZone, 'HH:mm:ss');
        const endTime = formatInTimeZone(now, timeZone, 'HH:mm:ss');
        const drawDate = formatInTimeZone(now, timeZone, 'yyyy-MM-dd');

        console.log(`Fetching results for date: ${drawDate}, from ${startTime} to ${endTime}`);

        // ดึงข้อมูลจาก Supabase ตามช่วงเวลาที่กำหนด
        const { data: results, error: dbError } = await supabaseClient
            .from('lottery_results')
            .select(`
                draw_date,
                draw_time,
                winning_number,
                prize_code,
                lottery_sub_types (
                    sub_type_name,
                    country_origin
                )
            `)
            .eq('draw_date', drawDate)
            .gt('draw_time', startTime)
            .lte('draw_time', endTime)
            .order('draw_time', { ascending: false });

        if (dbError) {
            throw new Error(`Supabase error: ${dbError.message}`);
        }

        // หากไม่พบข้อมูลใหม่ ให้จบการทำงาน
        if (!results || results.length === 0) {
            console.log('No new lottery results to send. Exiting gracefully.');
            return; 
        }
        
        // จัดกลุ่มผลลัพธ์ตามชื่อหวย
        const groupedResults = results.reduce<Record<string, FormattedResult>>((acc, result: any) => {
            const key = result.lottery_sub_types.sub_type_name;
            if (!acc[key]) {
                acc[key] = {
                    name: result.lottery_sub_types.sub_type_name,
                    time: result.draw_time,
                    flag: result.lottery_sub_types.country_origin,
                    top3: 'ไม่มี',
                    top2: 'ไม่มี',
                    bottom2: 'ไม่มี',
                };
            }
            if (result.prize_code === '3top') acc[key].top3 = result.winning_number;
            if (result.prize_code === '2top') acc[key].top2 = result.winning_number;
            if (result.prize_code === '2bottom') acc[key].bottom2 = result.winning_number;

            return acc;
        }, {});
        
        // สร้างข้อความที่จะส่งจากข้อมูลที่จัดกลุ่มแล้ว
    let messageText =  `╔══════ หวยเศรษฐี789 ═════╗\n`;
        messageText += `📅 ผลหวยรอบ ${endTime} 📅\n`;
        messageText += `   ประจำวันที่ ${drawDate}\n`;
        messageText += `╚════════════════════════╝\n\n`;

        Object.values(groupedResults).forEach(lotto => {
            messageText += `${lotto.flag} ${lotto.name} (${lotto.time})\n`;
            messageText += `  ✨ 3 ตัวบน: ${lotto.top3}\n`;
            messageText += `  💫 2 ตัวบน: ${lotto.top2}\n`;
            messageText += `  ⬇️ 2 ตัวล่าง: ${lotto.bottom2}\n\n`;
        });

        // ตัดบรรทัดว่างสุดท้ายออกเพื่อความสวยงาม
        messageText = messageText.trimEnd();

        // ส่งข้อความแบบ Broadcast ไปยังผู้ใช้ LINE ทุกคน
        console.log('Broadcasting formatted message to LINE...');
        await lineClient.broadcast([{ type: 'text', text: messageText }]);

        console.log('Message has been sent successfully!');

    } catch (error: any) {
        // จัดการ Error และจบการทำงานแบบไม่สำเร็จเพื่อให้ GitHub Actions ทราบ
        console.error('An error occurred during script execution:', error);
        process.exit(1);
    }
}

// เรียกใช้ฟังก์ชันหลักเพื่อเริ่มการทำงานของ Script
main();