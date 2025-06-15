// send-lottery-results.ts (ฉบับแก้ไข)

import { Client } from '@line/bot-sdk';
import { createClient } from '@supabase/supabase-js';
import { formatInTimeZone } from 'date-fns-tz';
import 'dotenv/config';

// --- Type Definitions ---
interface FormattedResult {
    name: string;
    time: string;
    flag: string;
    top3: string;
    top2: string;
    bottom2: string;
}

// --- Utility Functions ---
function getCountryCode(countryOrigin: string): string {
    const map: Record<string, string> = {
        'ไทย': 'TH',
        'ลาว': 'LA',
        'เวียดนาม': 'VN',
        'มาเลเซีย': 'MY',
        'สหรัฐอเมริกา': 'US',
        'อังกฤษ': 'GB',
        'รัสเซีย': 'RU',
        'จีน': 'CN',
        'ญี่ปุ่น': 'JP',
        'เยอรมัน': 'DE',
        'อินเดีย': 'IN',
        'สิงคโปร์': 'SG',
        'อิตาลี': 'IT',
        'สเปน': 'ES',
        'ฟิลิปปินส์': 'PH',
        'ออสเตรีย': 'AT',
        "เกาหลี": "KR",
        "ฮั่งเส็ง": "HK",
        "ไต้หวัน": "TW",
        
        
    };
    return map[countryOrigin] || countryOrigin;
}

function countryCodeToFlagEmoji(code: string): string {
    return code
        .toUpperCase()
        .replace(/./g, char => String.fromCodePoint(127397 + char.charCodeAt(0)));
}

// --- Main Logic Function ---
async function main() {
    console.log('Starting stateful lottery result script...');

    // --- Setup Clients ---
    const lineClient = new Client({
        channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || '',
    });

    const supabaseClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || '',
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    );

    if (!process.env.LINE_CHANNEL_ACCESS_TOKEN || !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        console.error('Error: Missing required environment variables.');
        process.exit(1);
    }

    try {
        const timeZone = 'Asia/Bangkok';
        const now = new Date();
        const drawDate = formatInTimeZone(now, timeZone, 'yyyy-MM-dd');
        const currentTime = formatInTimeZone(now, timeZone, 'HH:mm:ss');

        // 1. ดึงผลหวยของวันนี้เท่านั้น (และยังไม่เคยส่ง LINE)
        console.log(`Fetching results for today only (not sent to LINE): ${drawDate}`);
        const { data: results, error: dbError } = await supabaseClient
            .from('lottery_results')
            .select(`
                id,
                draw_date,
                draw_time,
                winning_number,
                prize_code,
                is_sent_to_line,
                lottery_sub_types (
                    sub_type_name,
                    country_origin,
                    country
                )
            `)
            .eq('draw_date', drawDate)
            .eq('is_sent_to_line', false)
            .order('draw_time', { ascending: false });

        if (dbError) {
            throw new Error(`Supabase select error: ${dbError.message}`);
        }

        if (!results || results.length === 0) {
            console.log('No lottery results for today. Exiting gracefully.');
            return;
        }
        
        console.log(`Found ${results.length} new results to process.`);

        // 2. จัดกลุ่มผลลัพธ์ (Logic เดิม)
        const groupedResults = results.reduce<Record<string, FormattedResult>>((acc, result: any) => {
            const key = result.lottery_sub_types.sub_type_name;
            if (!acc[key]) {
                acc[key] = {
                    name: result.lottery_sub_types.sub_type_name,
                    time: result.draw_time,
                    flag: getCountryCode(result.lottery_sub_types.country_origin),
                    top3: 'รอผล',
                    top2: 'รอผล',
                    bottom2: 'รอผล',
                };
            }
            if (result.prize_code === '3 ตัวบน') acc[key].top3 = result.winning_number;
            if (result.prize_code === '2 ตัวบน') acc[key].top2 = result.winning_number;
            if (result.prize_code === '2 ตัวล่าง') acc[key].bottom2 = result.winning_number;

            return acc;
        }, {});
        
        // 3. สร้างและส่งข้อความ (Logic เดิม)
    let messageText =  `╔══ หวยเศรษฐี789 ══╗\n`;
        messageText += `📅 ผลหวยรอบล่าสุด (${currentTime}) 📅\n`;
        messageText += `   ประจำวันที่ ${drawDate}\n`;
        messageText += `╚══════════════╝\n\n`;

        Object.values(groupedResults).forEach(lotto => {
            const flagEmoji = countryCodeToFlagEmoji(lotto.flag);
            messageText += `${flagEmoji} ${lotto.name} (${lotto.time})\n`;
            messageText += `  ✨ 3 ตัวบน: ${lotto.top3}\n`;
            messageText += `  💫 2 ตัวบน: ${lotto.top2}\n`;
            messageText += `  ⬇️ 2 ตัวล่าง: ${lotto.bottom2}\n\n`;
        });
        messageText = messageText.trimEnd();

        console.log('Broadcasting formatted message to LINE...');
        await lineClient.broadcast([{ type: 'text', text: messageText }]);
        console.log('Message has been sent successfully!');

        // 4. อัปเดตสถานะในฐานข้อมูล (ส่วนนี้จะทำงานถูกต้องแล้ว)
        const resultIds = results.map(r => r.id);
        console.log(`Updating ${resultIds.length} rows in database to is_sent_to_line = true`);
        
        const { error: updateError } = await supabaseClient
            .from('lottery_results')
            .update({ is_sent_to_line: true })
            .in('id', resultIds);

        if (updateError) {
            throw new Error(`Supabase update error: ${updateError.message}`);
        }

        console.log('Database updated successfully. Script finished.');

    } catch (error: any) {
        console.error('An error occurred during script execution:', error);
        process.exit(1);
    }
}

main();