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
  // 1. ดึง schedule ทั้งหมด
  const { data: schedules, error } = await supabase
    .from('scrape_schedules')
    .select('*');

  if (error) throw error;

  for (const schedule of schedules) {
    // Trigger /api/scrape
    console.log(`Triggering scrape for drawing_time ${schedule.drawing_time}`);
    await fetch('https://www.xn--789-2llyfg0ajkp0jrf.com/api/scrape');

    // Trigger /api/import-lottery-results หลัง scrape เสร็จ
    console.log(`Triggering import-lottery-results for drawing_time ${schedule.drawing_time}`);
    await fetch('https://www.xn--789-2llyfg0ajkp0jrf.com/api/import-lottery-results');

    // อัปเดต last_run, status
    await supabase
      .from('scrape_schedules')
      .update({ last_run: new Date().toISOString(), status: 'success' })
      .eq('id', schedule.id);
  }
}

main().catch((err) => {
  console.error('Script error:', err);
  process.exit(1);
}); 