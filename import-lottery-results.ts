import { createClient } from '@supabase/supabase-js';

// กำหนด ENV ของคุณเอง หรือใช้ dotenv
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// --- ฟังก์ชันเสริมสำหรับสร้างเลขรางวัล ---

/**
 * คำนวณเลขสลับ (Permutations) ทั้งหมดของเลข 3 หลัก
 * @param str เลข 3 หลัก เช่น "123"
 * @returns อาร์เรย์ของเลขสลับทั้งหมดที่ไม่ซ้ำกัน เช่น ["123", "132", "213", "231", "312", "321"]
 */
function getPermutations(str: string): string[] {
  if (str.length <= 1) return [str];
  let perms: string[] = [];
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    const rest = str.slice(0, i) + str.slice(i + 1);
    for (const perm of getPermutations(rest)) {
      perms.push(char + perm);
    }
  }
  return Array.from(new Set(perms)).sort();
}

/**
 * ดึงเลขแต่ละหลักที่ไม่ซ้ำกันออกมา
 * @param str ชุดตัวเลข เช่น "799"
 * @returns อาร์เรย์ของเลขแต่ละหลักที่ไม่ซ้ำกัน เช่น ["7", "9"]
 */
function getUniqueDigits(str: string): string[] {
    return Array.from(new Set(str.split(''))).sort();
}


function getPastDates(days: number): string[] {
  const dates: string[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}

async function automateBatchImportLotteryResults(drawDate: string) {
  // 1. ดึงผลหวยทั้งหมดในวันนั้น
  const { data: apiResults, error: apiError } = await supabase
    .from('lottery_api_results')
    .select('*')
    .eq('draw_date', drawDate);

  if (apiError) throw apiError;
  if (!apiResults || apiResults.length === 0) {
    console.log('No API results found for', drawDate);
    return;
  }

  // ดึงข้อมูลอื่นๆ ที่จำเป็น (aliases, schedules, subTypes)
  const { data: aliases, error: aliasError } = await supabase.from('lottery_name_aliases').select('alias_name, lottery_sub_type_id');
  if (aliasError) throw aliasError;
  const { data: schedules, error: scheduleError } = await supabase.from('drawing_schedules').select('schedule_id, lottery_sub_type_id, drawing_time');
  if (scheduleError) throw scheduleError;
  const { data: subTypes, error: subTypeError } = await supabase.from('lottery_sub_types').select('lottery_sub_type_id, lottery_type_id');
  if (subTypeError) throw subTypeError;

  // เตรียม batch สำหรับ upsert
  const upsertRows: any[] = [];

  for (const apiResult of apiResults) {
    const alias = aliases.find(a => a.alias_name === apiResult.lottery_name);
    if (!alias) continue;
    const schedule = schedules.find(s => s.lottery_sub_type_id === alias.lottery_sub_type_id && s.drawing_time === apiResult.draw_time);
    if (!schedule) continue;
    const subType = subTypes.find(st => st.lottery_sub_type_id === alias.lottery_sub_type_id);
    if (!subType) continue;
    
    const lottery_type_id = subType.lottery_type_id;

    const createRow = (prizeCode: string, number: string) => ({
        lottery_type_id,
        lottery_sub_type_id: alias.lottery_sub_type_id,
        schedule_id: schedule.schedule_id,
        draw_date: apiResult.draw_date,
        draw_time: apiResult.draw_time,
        prize_code: prizeCode,
        winning_number: number,
    });

    for (const result of apiResult.results) {
      if (typeof result !== 'string' || !result.includes(':')) continue;

      const valuePart = result.split(':')[1];
      const winningNumberMatch = valuePart.match(/\d+/);
      const winningNumber = winningNumberMatch ? winningNumberMatch[0] : '';
      
      if (!winningNumber) continue;

      // ====================== ส่วนที่แก้ไข: การสร้างข้อมูล ======================
      if (result.startsWith('3 ตัวบน') && winningNumber.length === 3) {
        // 1. "3 ตัวบน"
        upsertRows.push(createRow('3 ตัวบน', winningNumber));
        // 2. "2 ตัวบน"
        upsertRows.push(createRow('2 ตัวบน', winningNumber.slice(-2)));
        // 3. "3 ตัวโต๊ด" (รวมเป็นแถวเดียว)
        const permutations = getPermutations(winningNumber);
        upsertRows.push(createRow('3 ตัวโต๊ด', permutations.join(',')));
        // 4. "วิ่งบน" (รวมเป็นแถวเดียว)
        const uniqueTopDigits = getUniqueDigits(winningNumber);
        upsertRows.push(createRow('วิ่งบน', uniqueTopDigits.join(',')));
      }
      else if (result.startsWith('2 ตัวล่าง') && winningNumber.length === 2) {
        // 1. "2 ตัวล่าง"
        upsertRows.push(createRow('2 ตัวล่าง', winningNumber));
        // 2. "วิ่งล่าง" (รวมเป็นแถวเดียว)
        const uniqueBottomDigits = getUniqueDigits(winningNumber);
        upsertRows.push(createRow('วิ่งล่าง', uniqueBottomDigits.join(',')));
      }
      // =======================================================================
    }
  }

  if (upsertRows.length === 0) {
    console.log('No rows to upsert.');
    return;
  }

  // Batch upsert
  const { error: upsertError } = await supabase
    .from('lottery_results')
    .upsert(upsertRows, { onConflict: 'schedule_id, draw_date, draw_time, prize_code' });

  if (upsertError) {
    console.error('Batch upsert error:', upsertError.message);
  } else {
    console.log(`Batch upserted ${upsertRows.length} rows successfully.`);
  }
}

// === ส่วนของการรันสคริปต์ ===
const days = 7;
const dates = getPastDates(days);

(async () => {
  for (const date of dates) {
    console.log(`\n=== Importing for ${date} ===`);
    await automateBatchImportLotteryResults(date);
  }
  console.log('\nDone!');
})();