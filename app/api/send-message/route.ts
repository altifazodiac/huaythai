// app/api/send-message/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { Client } from '@line/bot-sdk';
import { supabase } from '@/lib/supabaseClient'; // ✅ 1. Import Supabase client
import { subMinutes } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';

// --- LINE Bot Configuration ---
const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || '',
  channelSecret: process.env.LINE_CHANNEL_SECRET || '',
};
const client = new Client(config);

// --- Type Definitions for Clarity ---
interface LotteryResult {
  draw_date: string;       // "2025-06-14"
  draw_time: string;       // "22:00:00"
  sub_type_name: string;   // "ลาวสตาร์ VIP"
  prize_code: string;      // "3top", "2top", "2bottom"
  winning_number: string;  // "394"
  country_origin: string;  // "🇱🇦"
  country: string;         // "ลาว"
}

interface FormattedResult {
    name: string;
    time: string;
    flag: string;
    top3: string;
    top2: string;
    bottom2: string;
}

// --- Main API Handler ---
export async function POST(req: NextRequest) {
  // ✅ 3. เพิ่มการตรวจสอบความปลอดภัย (แนะนำ)
  // ให้ GitHub Action ส่ง secret key มากับ header เพื่อป้องกันคนอื่นยิง API เล่น
  const authToken = req.headers.get('authorization');
  if (authToken !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // ✅ 4. คำนวณช่วงเวลาที่จะดึงข้อมูล (30 นาทีล่าสุด)
    const timeZone = 'Asia/Bangkok'; // ตั้งค่า Timezone ของไทย
    const now = new Date();
    const thirtyMinutesAgo = subMinutes(now, 30);

    // Format เวลาให้ตรงกับรูปแบบในฐานข้อมูล (HH:mm:ss)
    const startTime = formatInTimeZone(thirtyMinutesAgo, timeZone, 'HH:mm:ss');
    const endTime = formatInTimeZone(now, timeZone, 'HH:mm:ss');
    const drawDate = formatInTimeZone(now, timeZone, 'yyyy-MM-dd');

    console.log(`Fetching results for date: ${drawDate}, between ${startTime} and ${endTime}`);

    // ✅ 5. ดึงข้อมูลจาก Supabase ตามช่วงเวลา
    const { data: results, error: dbError } = await supabase
      .from('lottery_results')
      .select(`
        draw_date,
        draw_time,
        winning_number,
        prize_code,
        lottery_sub_types (
          sub_type_name,
          country_origin,
          country
        )
      `)
      .eq('draw_date', drawDate)
      .gt('draw_time', startTime)   // > มากกว่าเวลาเริ่มต้น
      .lte('draw_time', endTime)   // <= น้อยกว่าหรือเท่ากับเวลาปัจจุบัน
      .order('draw_time', { ascending: false });

    if (dbError) {
      throw new Error(`Supabase error: ${dbError.message}`);
    }

    // ✅ 6. ถ้าไม่มีข้อมูลใหม่ ให้จบการทำงาน
    if (!results || results.length === 0) {
      console.log('No new lottery results to send.');
      return NextResponse.json({ success: true, message: 'No new results.' });
    }
    
    // ✅ 7. จัดกลุ่มและจัดรูปแบบข้อมูลตามดีไซน์
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
    
    // สร้างข้อความที่จะส่ง
    let messageText = `╔═══════════════════════════════╗\n`;
    messageText += `      📅 ผลหวยรอบ ${endTime} 📅\n`;
    messageText += `      ประจำวันที่ ${drawDate}\n`;
    messageText += `╚═══════════════════════════════╝\n\n`;

    // เรียงตามเวลาจากมากไปน้อย (เนื่องจากเรา order by desc มาแล้ว)
    Object.values(groupedResults).forEach(lotto => {
        messageText += `${lotto.flag} ${lotto.name} (${lotto.time})\n`;
        messageText += `  ✨ 3 ตัวบน: ${lotto.top3}\n`;
        messageText += `  💫 2 ตัวบน: ${lotto.top2}\n`;
        messageText += `  ⬇️ 2 ตัวล่าง: ${lotto.bottom2}\n\n`;
    });

    // ตัด \n\n สุดท้ายออกเพื่อความสวยงาม
    messageText = messageText.trimEnd();

    // ✅ 8. ส่งข้อความแบบ Broadcast
    console.log('Broadcasting formatted message...');
    await client.broadcast([{ type: 'text', text: messageText }]);

    return NextResponse.json({ success: true, message: 'Message sent successfully.' });

  } catch (error: any) {
    console.error('An error occurred:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}