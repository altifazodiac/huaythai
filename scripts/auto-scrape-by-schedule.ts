console.log('--- Script file loaded ---');
console.log('ENV:', !!process.env.NEXT_PUBLIC_SUPABASE_URL, !!process.env.SUPABASE_SERVICE_ROLE_KEY);

import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  console.log('--- Script started ---');
  // 1. ดึงเวลาปัจจุบัน (UTC)
  const now = new Date();
  const nowMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();

  // 2. ดึง schedule ทั้งหมดที่ยังไม่ได้รันวันนี้
  const { data: schedules, error } = await supabase
    .from('scrape_schedules')
    .select('*');

  if (error) throw error;

  for (const schedule of schedules) {
    // แปลง drawing_time เป็นนาที (UTC)
    const [hour, minute] = schedule.drawing_time.split(':').map(Number);
    const scheduleMinutes = hour * 60 + minute;

    // เงื่อนไข: เวลาปัจจุบัน >= drawing_time + 2 นาที และ <= drawing_time + 5 นาที
    if (
      nowMinutes >= scheduleMinutes + 2 &&
      nowMinutes <= scheduleMinutes + 5 &&
      (schedule.last_run == null || !isToday(new Date(schedule.last_run)))
    ) {
      // 3. Trigger /api/scrape
      console.log(`Triggering scrape for drawing_time ${schedule.drawing_time}`);
      await fetch('https://www.xn--789-2llyfg0ajkp0jrf.com/api/scrape');

      // 4. Trigger /api/import-lottery-results หลัง scrape เสร็จ
      console.log(`Triggering import-lottery-results for drawing_time ${schedule.drawing_time}`);
      await fetch('https://www.xn--789-2llyfg0ajkp0jrf.com/api/import-lottery-results');

      // 5. อัปเดต last_run, status
      await supabase
        .from('scrape_schedules')
        .update({ last_run: now.toISOString(), status: 'success' })
        .eq('id', schedule.id);
    }
  }
}

function isToday(date: Date) {
  const now = new Date();
  return (
    date.getUTCFullYear() === now.getUTCFullYear() &&
    date.getUTCMonth() === now.getUTCMonth() &&
    date.getUTCDate() === now.getUTCDate()
  );
}

main().catch((err) => {
  console.error('Script error:', err);
  process.exit(1);
}); 