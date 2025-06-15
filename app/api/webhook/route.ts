// app/api/webhook/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { Client, WebhookRequestBody, TextMessage } from '@line/bot-sdk';
import { supabase } from '../../../lib/supabaseClient';
import { formatInTimeZone } from 'date-fns-tz'; // <-- 1. Import เพิ่ม

// --- Type Definition สำหรับจัดรูปแบบผลหวย (ยกมาจาก send-lottery-results.ts) ---
interface FormattedResult {
    name: string;
    time: string;
    flag: string;
    top3: string;
    top2: string;
    bottom2: string;
}

const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || '',
  channelSecret: process.env.LINE_CHANNEL_SECRET || '',
};
const client = new Client(config);

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
        // เพิ่มประเทศอื่นๆ ตามต้องการ
    };
    return map[countryOrigin] || countryOrigin;
}

function countryCodeToFlagEmoji(code: string): string {
    return code
        .toUpperCase()
        .replace(/./g, char => String.fromCodePoint(127397 + char.charCodeAt(0)));
}

export async function POST(req: NextRequest) {
  try {
    const body: WebhookRequestBody = await req.json();
    const events = body.events;

    if (!events || events.length === 0) {
      return NextResponse.json({ message: 'No events found.' }, { status: 200 });
    }

    const results = await Promise.all(
      events.map(async (event) => {
        // --- ส่วนบันทึก userId ยังคงทำงานเหมือนเดิม ---
        if (event.source && event.source.userId) {
          const { error } = await supabase.from('line_users').upsert({ user_id: event.source.userId });
          if (error) console.error('Supabase error:', error.message);
        }

        if (event.type !== 'message' || event.message.type !== 'text') {
          return;
        }

        // --- 2. เพิ่มเงื่อนไขตรวจสอบข้อความ "ผลหวยล่าสุด" ---
        if (event.message.text.trim() === 'ผลหวยล่าสุด') {
          const timeZone = 'Asia/Bangkok';
          const now = new Date();
          const drawDate = formatInTimeZone(now, timeZone, 'yyyy-MM-dd');

          console.log(`User ${event.source?.userId} requested latest results for date: ${drawDate}`);

          // ดึงผลหวยของวันนี้ทั้งหมด (ไม่จำกัดเฉพาะรอบล่าสุด)
          const { data: allTodayResults, error: dbError } = await supabase
            .from('lottery_results')
            .select(`
                draw_time,
                winning_number,
                prize_code,
                lottery_sub_types (
                    sub_type_name,
                    country_origin
                )
            `)
            .eq('draw_date', drawDate)
            .not('winning_number', 'is', null)
            .order('draw_time', { ascending: false }); // เรียงจากล่าสุด

          if (dbError) {
            console.error('Error fetching latest results:', dbError.message);
            return;
          }

          if (!allTodayResults || allTodayResults.length === 0) {
            const replyMessage: TextMessage = { type: 'text', text: `ขออภัยค่ะ ยังไม่พบข้อมูลผลหวยของวันนี้ (${drawDate})` };
            return client.replyMessage(event.replyToken, replyMessage);
          }

          // --- 3. นำ Logic การจัดกลุ่มและสร้างข้อความมาใช้ ---
          const groupedResults = allTodayResults.reduce<Record<string, FormattedResult>>((acc, result: any) => {
              const key = result.lottery_sub_types.sub_type_name + '|' + result.draw_time;
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
              if (['3 ตัวบน', '3top'].includes(result.prize_code)) acc[key].top3 = result.winning_number;
              if (['2 ตัวบน', '2top'].includes(result.prize_code)) acc[key].top2 = result.winning_number;
              if (['2 ตัวล่าง', '2bottom'].includes(result.prize_code)) acc[key].bottom2 = result.winning_number;
              return acc;
          }, {});

          let messageText =  `╔═ ผลหวยวันนี้หวยเศรษฐี789 ═╗\n`;
          messageText += `   ประจำวันที่ ${drawDate}\n`;
          messageText += `╚════════════╝\n\n`;

          Object.values(groupedResults).forEach(lotto => {
              const flagEmoji = countryCodeToFlagEmoji(lotto.flag);
              messageText += `${flagEmoji} ${lotto.name} (${lotto.time})\n`;
              messageText += `  ✨ 3 ตัวบน: ${lotto.top3}\n`;
              messageText += `  💫 2 ตัวบน: ${lotto.top2}\n`;
              messageText += `  ⬇️ 2 ตัวล่าง: ${lotto.bottom2}\n\n`;
          });
          messageText = messageText.trimEnd();

          const replyMessage: TextMessage = { type: 'text', text: messageText };
          
          // --- 4. ตอบกลับผู้ใช้ที่ส่งข้อความมาเท่านั้น ---
          return client.replyMessage(event.replyToken, replyMessage);
        }
        
        // หากเป็นข้อความอื่น ๆ จะไม่ทำอะไรเลย (ลบการตอบกลับแบบเดิมออก)
        return;
      })
    );
    
    return NextResponse.json({ success: true, results }, { status: 200 });

  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ message: err.message }, { status: 500 });
  }
}