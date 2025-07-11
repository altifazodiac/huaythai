const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function debugAliasesAndSchedules() {
  console.log('🔍 Debug: Checking aliases and schedules...\n');

  // 1. ตรวจสอบ alias ที่เกี่ยวข้องกับ ฮานอยEXTRA
  console.log('--- 1. Checking aliases for "ฮานอยEXTRA" ---');
  const { data: aliases, error: aliasError } = await supabase
    .from('lottery_name_aliases')
    .select('alias_name, lottery_sub_type_id')
    .or('alias_name.ilike.%ฮานอย%,alias_name.ilike.%EXTRA%');
  
  if (aliasError) {
    console.error('Error fetching aliases:', aliasError);
    return;
  }
  
  console.log('Found aliases:', aliases);
  
  // 2. ตรวจสอบ schedule สำหรับ sub_type_id = 29
  console.log('\n--- 2. Checking schedules for sub_type_id = 29 ---');
  const { data: schedules, error: scheduleError } = await supabase
    .from('drawing_schedules')
    .select('schedule_id, lottery_sub_type_id, drawing_time')
    .eq('lottery_sub_type_id', 29);
  
  if (scheduleError) {
    console.error('Error fetching schedules:', scheduleError);
    return;
  }
  
  console.log('Found schedules for sub_type_id 29:', schedules);
  
  // 3. ตรวจสอบ schedule สำหรับเวลา 08:30:00
  console.log('\n--- 3. Checking schedules for time 08:30:00 ---');
  const { data: schedules830, error: schedule830Error } = await supabase
    .from('drawing_schedules')
    .select('schedule_id, lottery_sub_type_id, drawing_time')
    .eq('drawing_time', '08:30:00');
  
  if (schedule830Error) {
    console.error('Error fetching schedules for 08:30:00:', schedule830Error);
    return;
  }
  
  console.log('Found schedules for 08:30:00:', schedules830);
  
  // 4. ตรวจสอบ schedule สำหรับเวลา 22:30:00
  console.log('\n--- 4. Checking schedules for time 22:30:00 ---');
  const { data: schedules2230, error: schedule2230Error } = await supabase
    .from('drawing_schedules')
    .select('schedule_id, lottery_sub_type_id, drawing_time')
    .eq('drawing_time', '22:30:00');
  
  if (schedule2230Error) {
    console.error('Error fetching schedules for 22:30:00:', schedule2230Error);
    return;
  }
  
  console.log('Found schedules for 22:30:00:', schedules2230);
  
  // 5. ตรวจสอบข้อมูลใน lottery_api_results วันนี้
  console.log('\n--- 5. Checking today\'s lottery_api_results ---');
  const today = new Date().toISOString().split('T')[0];
  const { data: apiResults, error: apiError } = await supabase
    .from('lottery_api_results')
    .select('lottery_name, draw_time')
    .eq('draw_date', today)
    .or('lottery_name.ilike.%ฮานอย%,lottery_name.ilike.%EXTRA%');
  
  if (apiError) {
    console.error('Error fetching API results:', apiError);
    return;
  }
  
  console.log('Found API results for today:', apiResults);
  
  // 6. สรุปปัญหา
  console.log('\n--- 6. Summary ---');
  const hanoyExtraAlias = aliases.find(a => a.alias_name === 'ฮานอยEXTRA');
  if (hanoyExtraAlias) {
    console.log(`✅ Found alias: "ฮานอยEXTRA" -> sub_type_id: ${hanoyExtraAlias.lottery_sub_type_id}`);
    
    const matchingSchedule = schedules.find(s => s.lottery_sub_type_id === hanoyExtraAlias.lottery_sub_type_id);
    if (matchingSchedule) {
      console.log(`✅ Found schedule: sub_type_id ${hanoyExtraAlias.lottery_sub_type_id} -> time: ${matchingSchedule.drawing_time}`);
    } else {
      console.log(`❌ No schedule found for sub_type_id: ${hanoyExtraAlias.lottery_sub_type_id}`);
    }
  } else {
    console.log('❌ No alias found for "ฮานอยEXTRA"');
  }
}

debugAliasesAndSchedules().catch(console.error); 