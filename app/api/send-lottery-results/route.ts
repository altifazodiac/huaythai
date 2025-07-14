import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Client } from '@line/bot-sdk';
import { formatInTimeZone } from 'date-fns-tz';
import { subMinutes } from 'date-fns';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface LotteryResult {
  id: string;
  draw_date: string;
  draw_time: string;
  winning_number: string;
  prize_code: string;
  lottery_sub_type_id: number;
  lottery_sub_type: {
    sub_type_name: string;
    country_origin?: string;
    country?: string;
  };
}

// ตรวจสอบ API key สำหรับ internal calls
function validateApiKey(request: NextRequest): boolean {
  const apiKey = request.headers.get('x-api-key');
  const internalKey = process.env.INTERNAL_API_KEY || 'internal';
  return apiKey === internalKey;
}

// ฟังก์ชันสำหรับสร้าง LINE message
function createLotteryMessage(lotteryResults: LotteryResult[]): string {
  if (lotteryResults.length === 0) {
    return '🎰 ไม่มีผลหวยใหม่ในขณะนี้';
  }

  // จัดกลุ่มผลรางวัลตามประเภทหวย
  const groupedResults = lotteryResults.reduce((acc, result) => {
    const lotteryName = result.lottery_sub_type.sub_type_name;
    if (!acc[lotteryName]) {
      acc[lotteryName] = [];
    }
    acc[lotteryName].push(result);
    return acc;
  }, {} as Record<string, LotteryResult[]>);

  let message = '🎰 *ผลรางวัลหวยล่าสุด* 🎰\n\n';
  
  Object.entries(groupedResults).forEach(([lotteryName, results]) => {
    message += `📋 *${lotteryName}*\n`;
    message += `⏰ เวลา: ${results[0].draw_time}\n`;
    message += `📅 วันที่: ${results[0].draw_date}\n`;
    
    // เรียงลำดับรางวัลตามประเภท
    const sortedResults = results.sort((a, b) => {
      const prizeOrder = { '1st': 1, '2nd': 2, '3rd': 3, '4th': 4, '5th': 5 };
      return prizeOrder[a.prize_code as keyof typeof prizeOrder] - prizeOrder[b.prize_code as keyof typeof prizeOrder];
    });
    
    sortedResults.forEach(result => {
      let prizeEmoji = '🏆';
      let prizeName = '';
      
      switch (result.prize_code) {
        case '1st':
          prizeEmoji = '🥇';
          prizeName = 'รางวัลที่ 1';
          break;
        case '2nd':
          prizeEmoji = '🥈';
          prizeName = 'รางวัลที่ 2';
          break;
        case '3rd':
          prizeEmoji = '🥉';
          prizeName = 'รางวัลที่ 3';
          break;
        case '4th':
          prizeEmoji = '🏅';
          prizeName = 'รางวัลที่ 4';
          break;
        case '5th':
          prizeEmoji = '🎖️';
          prizeName = 'รางวัลที่ 5';
          break;
        default:
          prizeEmoji = '🎫';
          prizeName = result.prize_code;
      }
      
      message += `${prizeEmoji} ${prizeName}: *${result.winning_number}*\n`;
    });
    
    message += '\n';
  });
  
  message += '🔔 *ขอให้โชคดีทุกท่าน!* 🔔\n';
  message += `📱 อัปเดตเมื่อ: ${new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}`;
  
  return message;
}

// ฟังก์ชันสำหรับส่งข้อมูลไป LINE
async function sendToLine(message: string): Promise<boolean> {
  try {
    if (!process.env.LINE_CHANNEL_ACCESS_TOKEN) {
      console.error('[LINE] LINE_CHANNEL_ACCESS_TOKEN not configured');
      return false;
    }
    
    const lineClient = new Client({
      channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
    });
    
    // ส่งข้อความไปยัง LINE groups/users ที่ต้องการ
    // ในที่นี้ส่งแบบ broadcast (หรือใช้ push message ไปยัง specific users)
    
    // สำหรับ broadcast (ต้องมี premium account)
    // await lineClient.broadcast({
    //   type: 'text',
    //   text: message
    // });
    
    // สำหรับ push message ไปยัง specific user/group
    // ต้องเก็บ userId หรือ groupId ไว้ในฐานข้อมูล
    const { data: lineUsers, error } = await supabase
      .from('line_users')
      .select('user_id, group_id')
      .eq('active', true);
    
    if (error) {
      console.error('[LINE] Error fetching LINE users:', error);
      return false;
    }
    
    if (!lineUsers || lineUsers.length === 0) {
      console.log('[LINE] No active LINE users found');
      return true; // ไม่ถือว่าเป็น error
    }
    
    // ส่งข้อความไปยังแต่ละ user/group
    for (const lineUser of lineUsers) {
      try {
        const targetId = lineUser.group_id || lineUser.user_id;
        if (targetId) {
          await lineClient.pushMessage(targetId, {
            type: 'text',
            text: message
          });
        }
      } catch (error) {
        console.error(`[LINE] Error sending message to ${lineUser.user_id}:`, error);
      }
    }
    
    console.log(`[LINE] Successfully sent message to ${lineUsers.length} recipients`);
    return true;
    
  } catch (error) {
    console.error('[LINE] Error sending to LINE:', error);
    return false;
  }
}

// ฟังก์ชันสำหรับสร้าง notification toast
async function createLotteryToast(results: LotteryResult[], success: boolean) {
  try {
    const currentTime = new Date();
    const lotteryNames = results.map(r => r.lottery_sub_type?.sub_type_name || 'Unknown');
    const message = success 
      ? `ส่งผลหวย ${results.length} รายการไปยัง LINE สำเร็จ`
      : `ไม่สามารถส่งผลหวยไปยัง LINE ได้`;
    
    const { error } = await supabase
      .from('lottery_send_notifications')
      .insert({
        notification_time: currentTime.toISOString(),
        lottery_names: lotteryNames,
        total_results: results.length,
        message: message,
        notification_type: success ? 'send_success' : 'send_error'
      });
    
    if (error) {
      console.error('Error creating toast notification:', error);
    }
    
  } catch (error) {
    console.error('Error creating toast notification:', error);
  }
}

// ฟังก์ชันสำหรับส่งผลหวย
async function sendLotteryResults(drawDate: string, drawingTime?: string, lotterySubTypeId?: number): Promise<{
  sent: boolean;
  count: number;
  results: LotteryResult[];
}> {
  const timeZone = 'Asia/Bangkok';
  const now = new Date();
  const currentTime = formatInTimeZone(now, timeZone, 'HH:mm:ss');
  
  // คำนวณเวลาสำหรับตรวจสอบ (3 นาทีหลังจากเวลาปัจจุบัน)
  const threeMinutesAgo = subMinutes(now, 3);
  const triggerTime = formatInTimeZone(threeMinutesAgo, timeZone, 'HH:mm:ss');
  
  const dayOfMonth = parseInt(formatInTimeZone(now, timeZone, 'd'), 10);
  const hourOfDay = parseInt(formatInTimeZone(now, timeZone, 'H'), 10);
  const minuteOfDay = parseInt(formatInTimeZone(now, timeZone, 'm'), 10);
  
  console.log(`[Send] Processing send for date: ${drawDate}, time: ${drawingTime}, subTypeId: ${lotterySubTypeId}`);
  
  // ดึงข้อมูล lottery results ที่ยังไม่ส่ง
  let query = supabase
    .from('lottery_results')
    .select(`
      id,
      draw_date,
      draw_time,
      winning_number,
      prize_code,
      is_sent_to_line,
      lottery_sub_type_id,
      lottery_sub_type:lottery_sub_types(sub_type_name, country_origin, country)
    `)
    .eq('draw_date', drawDate)
    .eq('is_sent_to_line', false);
  
  if (drawingTime) {
    query = query.eq('draw_time', drawingTime);
  }
  
  if (lotterySubTypeId) {
    query = query.eq('lottery_sub_type_id', lotterySubTypeId);
  }
  
  const { data: allUnsentResults, error: dbError } = await query;
  
  if (dbError) {
    console.error('[Send] Error fetching unsent results:', dbError);
    throw dbError;
  }
  
  if (!allUnsentResults || allUnsentResults.length === 0) {
    console.log('[Send] No unsent lottery results found');
    return { sent: false, count: 0, results: [] };
  }
  
  // กรองเฉพาะผลหวยที่ "ถึงเวลา" ส่งแล้ว
  const eligibleResults = allUnsentResults.filter(result => {
    if (!result.lottery_sub_type) {
      console.warn(`[Send] Skipping result ID ${result.id} - missing lottery_sub_type`);
      return false;
    }
    
    const subTypeName = result.lottery_sub_type.sub_type_name;
    
    // ตรวจสอบกรณีพิเศษสำหรับสลากกินแบ่งรัฐบาล
    if (subTypeName === 'สลากกินแบ่งรัฐบาล') {
      const isAllowedDay = dayOfMonth === 1 || dayOfMonth === 16;
      const isAllowedTime = (hourOfDay > 15) || (hourOfDay === 15 && minuteOfDay >= 43);
      
      if (isAllowedDay && isAllowedTime) {
        console.log(`[Send] Gov lottery is eligible by date/time`);
        return true;
      }
      return false;
    }
    
    // ตรวจสอบเวลาสำหรับหวยอื่นๆ
    if (result.draw_time <= triggerTime) {
      console.log(`[Send] '${subTypeName}' with draw time ${result.draw_time} is eligible`);
      return true;
    }
    
    return false;
  });
  
  if (eligibleResults.length === 0) {
    console.log('[Send] No eligible results to send at this time');
    return { sent: false, count: 0, results: [] };
  }
  
  // กรองเฉพาะผลหวยที่มีเลขรางวัลแล้ว
  const finalResultsToSend = eligibleResults.filter(result => {
    const hasWinningNumber = result.winning_number && 
                           result.winning_number.trim() !== '' && 
                           result.winning_number !== 'รอผล';
    return hasWinningNumber;
  });
  
  if (finalResultsToSend.length === 0) {
    console.log('[Send] No results with winning numbers ready to send');
    return { sent: false, count: 0, results: [] };
  }
  
  console.log(`[Send] Found ${finalResultsToSend.length} results ready to send`);
  
  // สร้างข้อความสำหรับส่งไป LINE
  const lineMessage = createLotteryMessage(finalResultsToSend);
  
  // ส่งข้อความไป LINE
  const sendSuccess = await sendToLine(lineMessage);
  
  if (sendSuccess) {
    // อัปเดตสถานะเป็นส่งแล้ว
    const resultIds = finalResultsToSend.map(r => r.id);
    
    const { error: updateError } = await supabase
      .from('lottery_results')
      .update({ 
        is_sent_to_line: true,
        sent_to_line_at: new Date().toISOString()
      })
      .in('id', resultIds);
    
    if (updateError) {
      console.error('[Send] Error updating sent status:', updateError);
    } else {
      console.log(`[Send] Successfully updated ${resultIds.length} results as sent`);
    }
  }
  
  // สร้าง notification toast
  await createLotteryToast(finalResultsToSend, sendSuccess);
  
  return { 
    sent: sendSuccess, 
    count: finalResultsToSend.length, 
    results: finalResultsToSend 
  };
}

function toThaiDateString(date: Date) {
  const tzOffset = 7 * 60 * 60 * 1000;
  const tzDate = new Date(date.getTime() + tzOffset);
  return tzDate.toISOString().split('T')[0];
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const drawDate = searchParams.get('draw_date') || toThaiDateString(new Date());
    const drawingTime = searchParams.get('draw_time');
    const lotterySubTypeId = searchParams.get('lottery_sub_type_id');
    
    console.log(`[API] GET request - drawDate: ${drawDate}, drawingTime: ${drawingTime}, subTypeId: ${lotterySubTypeId}`);
    
    const result = await sendLotteryResults(
      drawDate,
      drawingTime || undefined,
      lotterySubTypeId ? parseInt(lotterySubTypeId) : undefined
    );
    
    return NextResponse.json({
      message: result.sent ? 'Results sent successfully' : 'No results sent',
      sent: result.sent,
      count: result.count,
      draw_date: drawDate,
      draw_time: drawingTime,
      lottery_sub_type_id: lotterySubTypeId
    });
    
  } catch (error) {
    console.error('Error in send lottery results GET API:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // ตรวจสอบ API key สำหรับ internal calls
    if (!validateApiKey(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    const { draw_time, lottery_sub_type_id, draw_date } = body;
    
    const timeZone = 'Asia/Bangkok';
    const now = new Date();
    const targetDrawDate = draw_date || formatInTimeZone(now, timeZone, 'yyyy-MM-dd');
    
    console.log(`[API] POST request - drawDate: ${targetDrawDate}, drawingTime: ${draw_time}, subTypeId: ${lottery_sub_type_id}`);
    
    const result = await sendLotteryResults(
      targetDrawDate,
      draw_time,
      lottery_sub_type_id
    );
    
    return NextResponse.json({
      message: result.sent ? 'Results sent successfully' : 'No results sent',
      sent: result.sent,
      count: result.count,
      results: result.results.map(r => ({
        id: r.id,
        lottery_name: r.lottery_sub_type.sub_type_name,
        draw_time: r.draw_time,
        prize_code: r.prize_code,
        winning_number: r.winning_number
      })),
      draw_date: targetDrawDate,
      draw_time,
      lottery_sub_type_id
    });
    
  } catch (error) {
    console.error('Error in send lottery results POST API:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 