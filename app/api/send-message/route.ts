// app/api/send-message/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { Client, TextMessage } from '@line/bot-sdk';

// ใช้ Configuration เดียวกันกับ Webhook
const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || '',
  channelSecret: process.env.LINE_CHANNEL_SECRET || '',
};

const client = new Client(config);

export async function POST(req: NextRequest) {
  const { message, userIds } = await req.json();

  if (!message) {
    return NextResponse.json({ error: 'Message is required' }, { status: 400 });
  }

  try {
    // --- เลือกวิธีส่งตามข้อมูลที่ได้รับ ---

    // 1. ถ้ามี userIds ถูกส่งมาด้วย ให้ใช้ Multicast
    if (userIds && userIds.length > 0) {
      console.log(`Sending multicast to ${userIds.length} users.`);
      await client.multicast(userIds, [{ type: 'text', text: message }]);
    } 
    // 2. ถ้าไม่มี userIds ให้ใช้ Broadcast (หากแผนบริการรองรับ)
    else {
      console.log('Broadcasting message.');
      await client.broadcast([{ type: 'text', text: message }]);
    }

    return NextResponse.json({ success: true, message: 'Message sent successfully.' });

  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}