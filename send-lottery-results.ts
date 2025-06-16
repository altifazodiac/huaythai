// send-lottery-results.ts (ฉบับแก้ไข Error [null])

import { Client } from '@line/bot-sdk';
import { createClient } from '@supabase/supabase-js';
import { formatInTimeZone } from 'date-fns-tz';
import { subMinutes } from 'date-fns';
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
        "สลากกินแบ่งรัฐบาล": "TH",
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
        
        const threeMinutesAgo = subMinutes(now, 3);
        const triggerTime = formatInTimeZone(threeMinutesAgo, timeZone, 'HH:mm:ss');

        const dayOfMonth = parseInt(formatInTimeZone(now, timeZone, 'd'), 10);
        const hourOfDay = parseInt(formatInTimeZone(now, timeZone, 'H'), 10);
        const minuteOfDay = parseInt(formatInTimeZone(now, timeZone, 'm'), 10);

        // 1. ดึง lottery_results เฉพาะ field ที่ต้องใช้
        const { data: allUnsentResults, error: dbError } = await supabaseClient
            .from('lottery_results')
            .select(`
                id,
                draw_date,
                draw_time,
                winning_number,
                prize_code,
                is_sent_to_line,
                lottery_sub_type_id
            `)
            .eq('draw_date', drawDate)
            .eq('is_sent_to_line', false);

        if (dbError) {
            throw new Error(`Supabase select error: ${dbError.message}`);
        }

        if (!allUnsentResults || allUnsentResults.length === 0) {
            console.log('No unsent lottery results for today. Exiting gracefully.');
            return;
        }

        // 2. ดึง lottery_sub_types เฉพาะ id ที่ต้องใช้
        const subTypeIds = allUnsentResults.map(r => r.lottery_sub_type_id).filter(Boolean);
        const { data: subTypes, error: subTypeError } = await supabaseClient
            .from('lottery_sub_types')
            .select('lottery_sub_type_id, sub_type_name, country_origin, country')
            .in('lottery_sub_type_id', subTypeIds);
        if (subTypeError) {
            throw new Error(`Supabase subType select error: ${subTypeError.message}`);
        }
        const subTypeMap = Object.fromEntries((subTypes || []).map(st => [st.lottery_sub_type_id, st]));

        // 3. รวมข้อมูล
        const allUnsentResultsWithSubType = allUnsentResults.map(r => ({
            ...r,
            lottery_sub_type: subTypeMap[r.lottery_sub_type_id] || null
        }));

        console.log(`Current time: ${currentTime}, Trigger time (3 mins ago): ${triggerTime}`);
        
        // 2. กรองเฉพาะหวยที่ "ถึงเวลา" ที่จะส่ง (Time-Eligible)
        const eligibleResults = allUnsentResultsWithSubType.filter(result => {
            if (!result.lottery_sub_type) {
                console.warn(`Skipping result ID ${result.id} due to missing or invalid lottery_sub_type relation.`);
                return false;
            }
            const subTypeName = result.lottery_sub_type.sub_type_name;
            
            if (subTypeName === 'สลากกินแบ่งรัฐบาล') {
                const isAllowedDay = dayOfMonth === 1 || dayOfMonth === 16;
                const isAllowedTime = (hourOfDay > 15) || (hourOfDay === 15 && minuteOfDay >= 43);
                if (isAllowedDay && isAllowedTime) {
                    console.log(`Gov lottery is eligible by date/time.`);
                    return true;
                }
                return false;
            }
            
            if (result.draw_time <= triggerTime) {
                console.log(`'${subTypeName}' with draw time ${result.draw_time} is eligible.`);
                return true;
            }

            return false;
        });

        if (eligibleResults.length === 0) {
            console.log("No results are eligible for sending at this time. Exiting.");
            return;
        }

        // 3. กรองอีกชั้น เฉพาะหวยที่มี "เลขรางวัล" แล้วเท่านั้น
        const finalResultsToSend = eligibleResults.filter(result => {
            const hasWinningNumber = result.winning_number && result.winning_number.trim() !== '' && result.winning_number !== 'รอผล';
            if (!hasWinningNumber) {
                const subTypeName = (result.lottery_sub_type && result.lottery_sub_type.sub_type_name)
                    ? result.lottery_sub_type.sub_type_name
                    : 'Unknown';
                console.log(`Skipping '${subTypeName}' (ID: ${result.id}) because winning_number is missing.`);
            }
            return hasWinningNumber;
        });

        if (finalResultsToSend.length === 0) {
            console.log("Eligible results found, but none have winning numbers yet. Exiting.");
            return;
        }
        
        // 4. จัดกลุ่มผลลัพธ์
        const groupedResults = finalResultsToSend.reduce<Record<string, FormattedResult>>((acc, result: any) => {
            if (!result.lottery_sub_type) {
                return acc; 
            }
            const subType = result.lottery_sub_type;
            const key = subType.sub_type_name;

            if (!acc[key]) {
                acc[key] = {
                    name: subType.sub_type_name,
                    time: result.draw_time,
                    flag: getCountryCode(subType.country_origin),
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
        
        // 5. สร้างและส่งข้อความ
        let messageText =  `╔══ หวยเศรษฐี789 ══╗\n`;
        messageText += `📅 ผลหวยรอบล่าสุด (${currentTime}) 📅\n`;
        messageText += `    ประจำวันที่ ${drawDate}\n`;
        messageText += `╚════════════╝\n\n`;

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

        // 6. อัปเดตสถานะในฐานข้อมูล (เฉพาะรายการที่ส่งสำเร็จ)
        const resultIds = finalResultsToSend.map(r => r.id);
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