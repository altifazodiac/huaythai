import { Client } from '@line/bot-sdk';
import { createClient } from '@supabase/supabase-js';
import { formatInTimeZone } from 'date-fns-tz';
import { subMinutes } from 'date-fns';
import type { NextApiRequest, NextApiResponse } from 'next';

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

// --- Handler for Vercel Serverless Function ---
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
 
    // --- Setup Clients ---
    const lineClient = new Client({
        channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || '',
    });
    const authHeader = (req.headers['authorization'] as string | undefined) ?? '';

    const expected = `Bearer ${process.env.CRON_SECRET}`;
    if (authHeader !== expected) {
      return res.status(401).send("Unauthorized");
    }
    const supabaseClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || '',
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    );

    if (!process.env.LINE_CHANNEL_ACCESS_TOKEN ||
        !process.env.NEXT_PUBLIC_SUPABASE_URL ||
        !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        console.error('Error: Missing required environment variables.');
        res.status(500).send('Missing required environment variables.');
        return;
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
            res.status(200).send('No unsent lottery results for today.');
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

        // 4. กรองเฉพาะหวยที่ "ถึงเวลา" ที่จะส่ง (Time-Eligible)
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
                    return true;
                }
                return false;
            }

            if (result.draw_time <= triggerTime) {
                return true;
            }

            return false;
        });

        if (eligibleResults.length === 0) {
            res.status(200).send("No results are eligible for sending at this time.");
            return;
        }

        // 5. กรองอีกชั้น เฉพาะหวยที่มี "เลขรางวัล" แล้วเท่านั้น
        const finalResultsToSend = eligibleResults.filter(result => {
            const hasWinningNumber = result.winning_number && result.winning_number.trim() !== '' && result.winning_number !== 'รอผล';
            return hasWinningNumber;
        });

        if (finalResultsToSend.length === 0) {
            res.status(200).send("Eligible results found, but none have winning numbers yet.");
            return;
        }

        // 6. จัดกลุ่มผลลัพธ์
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

        // 7. สร้างและส่งข้อความ
        let messageText = `╔══ หวยเศรษฐี789 ══╗\n`;
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

        await lineClient.broadcast([{ type: 'text', text: messageText }]);

        // 8. อัปเดตสถานะในฐานข้อมูล (เฉพาะรายการที่ส่งสำเร็จ)
        const resultIds = finalResultsToSend.map(r => r.id);
        const { error: updateError } = await supabaseClient
            .from('lottery_results')
            .update({ is_sent_to_line: true })
            .in('id', resultIds);

        if (updateError) {
            throw new Error(`Supabase update error: ${updateError.message}`);
        }

        res.status(200).send('Lottery results sent and database updated successfully.');
    } catch (error: any) {
        console.error('An error occurred during script execution:', error);
        res.status(500).send('An error occurred: ' + (error?.message || error));
    }
    return new Response("Success", { status: 200 });
}