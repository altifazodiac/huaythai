// app/api/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { Client, WebhookRequestBody, middleware, MessageAPIResponseBase, TextMessage } from '@line/bot-sdk';

// ตั้งค่า Configuration
const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || '',
  channelSecret: process.env.LINE_CHANNEL_SECRET || '',
};

const client = new Client(config);

export async function POST(req: NextRequest) {
  try {
    const body: WebhookRequestBody = await req.json();
    const events = body.events;

    if (!events) {
      return NextResponse.json({ message: 'No events found' }, { status: 400 });
    }

    // ประมวลผลแต่ละ Event
    const results = await Promise.all(
      events.map(async (event) => {
        if (event.type !== 'message' || event.message.type !== 'text') {
          return;
        }

        // สร้างข้อความตอบกลับ
        const replyMessage: TextMessage = {
          type: 'text',
          text: `คุณส่งข้อความว่า: "${event.message.text}"`,
        };

        // ส่งข้อความตอบกลับ
        return client.replyMessage(event.replyToken, replyMessage);
      })
    );
    
    return NextResponse.json({ success: true, results });

  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ message: err.message }, { status: 500 });
  }
}