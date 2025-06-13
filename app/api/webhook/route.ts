// app/api/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { Client, WebhookRequestBody, TextMessage } from '@line/bot-sdk';
import { supabase } from '../../../lib/supabaseClient'; // <-- 1. Import supabase

// ... (ส่วน config และ client ของ LINE เหมือนเดิม) ...
const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || '',
  channelSecret: process.env.LINE_CHANNEL_SECRET || '',
};
const client = new Client(config);

export async function POST(req: NextRequest) {
  try {
    const body: WebhookRequestBody = await req.json();
    const events = body.events;

    if (!events || events.length === 0) {
      return NextResponse.json({ message: 'No events found.' }, { status: 200 });
    }

    const results = await Promise.all(
      events.map(async (event) => {
        // --- 2. ส่วนบันทึกข้อมูลลง SUPABASE ---
        if (event.source && event.source.userId) {
          const userId = event.source.userId;
          
          // ใช้ upsert เพื่อ "เพิ่มถ้ายังไม่มี" หรือ "อัปเดตถ้ามีอยู่แล้ว"
          // ในกรณีนี้ ถ้า userId ซ้ำกัน ก็จะไม่ทำอะไรเลย ซึ่งป้องกันข้อมูลซ้ำได้ดี
          const { error } = await supabase
            .from('line_users')
            .upsert({ user_id: userId });

          if (error) {
            console.error('Supabase error:', error.message);
          } else {
            console.log('Successfully saved userId to Supabase:', userId);
          }
        }
        // --- จบส่วนบันทึกข้อมูล ---

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
    
    return NextResponse.json({ success: true, results }, { status: 200 });

  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ message: err.message }, { status: 500 });
  }
}