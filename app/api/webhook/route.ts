// app/api/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server';
import {
  Client,
  WebhookRequestBody,
  TextMessage,
} from '@line/bot-sdk';

// ตั้งค่า Configuration
const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || '',
  channelSecret: process.env.LINE_CHANNEL_SECRET || '',
};

const client = new Client(config);

//  <-- ❗️❗️❗️ หัวใจสำคัญอยู่ตรงนี้ ❗️❗️❗️
// ฟังก์ชันจะต้องถูก export ด้วยชื่อ "POST"
export async function POST(req: NextRequest) {
  try {
    const body: WebhookRequestBody = await req.json();
    const events = body.events;

    // ตรวจสอบว่ามี events ใน request body หรือไม่
    if (!events || events.length === 0) {
      // ตอบกลับด้วยสถานะ 200 OK แม้จะไม่มี event ให้ประมวลผล
      // เพื่อยืนยันกับ LINE Platform ว่าได้รับ request แล้ว
      return NextResponse.json({ message: 'No events found, but webhook is connected.' }, { status: 200 });
    }

    // ประมวลผลแต่ละ Event
    const results = await Promise.all(
      events.map(async (event) => {
        if (event.type !== 'message' || event.message.type !== 'text') {
          return;
        }

        const replyMessage: TextMessage = {
          type: 'text',
          text: `คุณส่งข้อความว่า: "${event.message.text}"`,
        };

        return client.replyMessage(event.replyToken, replyMessage);
      })
    );
    
    // เมื่อประมวลผลสำเร็จ ตอบกลับด้วย 200 OK
    return NextResponse.json({ success: true, results }, { status: 200 });

  } catch (err: any) {
    console.error(err);
    // ในกรณีเกิดข้อผิดพลาดภายในเซิร์ฟเวอร์
    return NextResponse.json({ message: err.message }, { status: 500 });
  }
}