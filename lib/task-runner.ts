import { createClient } from '@supabase/supabase-js';
import { chromium } from 'playwright';
import { formatInTimeZone } from 'date-fns-tz';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface LotteryResult {
  lottery_name: string;
  draw_date: string;
  draw_time: string;
  first_prize?: string;
  second_prize?: string;
  third_prize?: string;
  fourth_prize?: string;
  fifth_prize?: string;
  sixth_prize?: string;
  seventh_prize?: string;
  eighth_prize?: string;
  ninth_prize?: string;
  tenth_prize?: string;
  [key: string]: string | undefined;
}

// ฟังก์ชันสำหรับ scrape ข้อมูล
export async function scrapeAndParseResults(targetUrl: string, context: any, targetLotteryNames?: string[]): Promise<LotteryResult[]> {
  console.log(`[Scraper] Starting scrape for URL: ${targetUrl}`);
  
  const page = await context.newPage();
  
  try {
    await page.goto(targetUrl, { waitUntil: 'networkidle', timeout: 60000 });
    
    // รอให้ข้อมูลโหลดเสร็จ
    await page.waitForTimeout(3000);
    
    // ดึงข้อมูลจากหน้าเว็บ
    const scrapedData = await page.evaluate(() => {
      const results: LotteryResult[] = [];
      
      // ตรวจสอบว่ามีตารางข้อมูลหรือไม่
      const tables = document.querySelectorAll('table');
      
      tables.forEach(table => {
        const rows = table.querySelectorAll('tr');
        
        rows.forEach(row => {
          const cells = row.querySelectorAll('td');
          
          if (cells.length >= 3) {
            const lottery_name = cells[0]?.textContent?.trim();
            const draw_time = cells[1]?.textContent?.trim();
            const first_prize = cells[2]?.textContent?.trim();
            
            if (lottery_name && draw_time && first_prize && first_prize !== 'รอผล') {
              const today = new Date().toISOString().split('T')[0];
              
              results.push({
                lottery_name,
                draw_date: today,
                draw_time,
                first_prize,
                second_prize: cells[3]?.textContent?.trim(),
                third_prize: cells[4]?.textContent?.trim(),
                fourth_prize: cells[5]?.textContent?.trim(),
                fifth_prize: cells[6]?.textContent?.trim(),
                sixth_prize: cells[7]?.textContent?.trim(),
                seventh_prize: cells[8]?.textContent?.trim(),
                eighth_prize: cells[9]?.textContent?.trim(),
                ninth_prize: cells[10]?.textContent?.trim(),
                tenth_prize: cells[11]?.textContent?.trim(),
              });
            }
          }
        });
      });
      
      return results;
    });
    
    console.log(`[Scraper] Found ${scrapedData.length} results`);
    
    // กรองเฉพาะ lottery ที่ต้องการ (ถ้าระบุ)
    if (targetLotteryNames && targetLotteryNames.length > 0) {
      const filteredData = scrapedData.filter((item: LotteryResult) => 
        targetLotteryNames.includes(item.lottery_name)
      );
      
      console.log(`[Scraper] Filtered to ${filteredData.length} results for target lotteries`);
      return filteredData;
    }
    
    return scrapedData;
    
  } catch (error) {
    console.error('[Scraper] Error during scraping:', error);
    return [];
  } finally {
    await page.close();
  }
}

// ฟังก์ชันสำหรับ import ข้อมูลจาก lottery_api_results ไปยัง lottery_results
export async function importLotteryResults(drawDate: string, drawingTime?: string, lotterySubTypeId?: number): Promise<number> {
  console.log(`[Import] Starting import for date: ${drawDate}, time: ${drawingTime}, subTypeId: ${lotterySubTypeId}`);
  
  // ดึงข้อมูลจาก lottery_api_results
  let query = supabase
    .from('lottery_api_results')
    .select('*')
    .eq('draw_date', drawDate);
  
  if (drawingTime) {
    query = query.eq('draw_time', drawingTime);
  }
  
  const { data: apiResults, error: apiError } = await query;
  
  if (apiError) {
    console.error('[Import] Error fetching API results:', apiError);
    throw apiError;
  }
  
  if (!apiResults || apiResults.length === 0) {
    console.log(`[Import] No API results found for date: ${drawDate}`);
    return 0;
  }
  
  // ดึงข้อมูล aliases และ schedules
  const { data: aliases, error: aliasError } = await supabase
    .from('lottery_name_aliases')
    .select('alias_name, lottery_sub_type_id');
  
  if (aliasError) {
    console.error('[Import] Error fetching aliases:', aliasError);
    throw aliasError;
  }
  
  const { data: schedules, error: scheduleError } = await supabase
    .from('drawing_schedules')
    .select('schedule_id, lottery_sub_type_id, drawing_time');
  
  if (scheduleError) {
    console.error('[Import] Error fetching schedules:', scheduleError);
    throw scheduleError;
  }
  
  const { data: subTypes, error: subTypeError } = await supabase
    .from('lottery_sub_types')
    .select('lottery_sub_type_id, lottery_type_id');
  
  if (subTypeError) {
    console.error('[Import] Error fetching sub types:', subTypeError);
    throw subTypeError;
  }
  
  // ประมวลผลข้อมูล
  const upsertRows: any[] = [];
  
  for (const apiResult of apiResults) {
    const alias = aliases.find(a => a.alias_name === apiResult.lottery_name);
    if (!alias) {
      console.warn(`[Import] No alias found for: ${apiResult.lottery_name}`);
      continue;
    }
    
    // ถ้าระบุ lottery_sub_type_id และไม่ตรงกับ alias ให้ข้าม
    if (lotterySubTypeId && alias.lottery_sub_type_id !== lotterySubTypeId) {
      continue;
    }
    
    // ปรับ normalize เวลา
    let normalizedScrapedTime = apiResult.draw_time;
    if (normalizedScrapedTime && /^\d{2}:\d{2}$/.test(normalizedScrapedTime)) {
      normalizedScrapedTime += ':00';
    }
    
    const schedule = schedules.find(s => 
      s.lottery_sub_type_id === alias.lottery_sub_type_id && 
      s.drawing_time === normalizedScrapedTime
    );
    
    if (!schedule) {
      console.warn(`[Import] No schedule found for: ${apiResult.lottery_name} at ${normalizedScrapedTime}`);
      continue;
    }
    
    const subType = subTypes.find(st => st.lottery_sub_type_id === alias.lottery_sub_type_id);
    if (!subType) {
      console.warn(`[Import] No sub type found for: ${alias.lottery_sub_type_id}`);
      continue;
    }
    
    // สร้าง upsert row
    const row = {
      lottery_type_id: subType.lottery_type_id,
      lottery_sub_type_id: alias.lottery_sub_type_id,
      schedule_id: schedule.schedule_id,
      draw_date: drawDate,
      result_data: apiResult,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    upsertRows.push(row);
  }
  
  if (upsertRows.length === 0) {
    console.log('[Import] No rows to upsert');
    return 0;
  }
  
  // บันทึกลง lottery_results
  const { error: upsertError } = await supabase
    .from('lottery_results')
    .upsert(upsertRows, {
      onConflict: 'lottery_sub_type_id, schedule_id, draw_date'
    });
  
  if (upsertError) {
    console.error('[Import] Error upserting results:', upsertError);
    throw upsertError;
  }
  
  console.log(`[Import] Successfully imported ${upsertRows.length} results`);
  return upsertRows.length;
}

// ฟังก์ชันสำหรับสร้าง notification toast
export async function createLotteryImportToast(scrapedData: LotteryResult[]) {
  try {
    const message = `✅ เก็บข้อมูลผลหวยสำเร็จ: ${scrapedData.length} รายการ`;
    
    const { error } = await supabase
      .from('lottery_notifications')
      .insert({
        title: 'Import Lottery Results',
        message: message,
        type: 'import',
        data: { scraped_count: scrapedData.length },
        created_at: new Date().toISOString()
      });
    
    if (error) {
      console.error('Error creating toast notification:', error);
    }
    
  } catch (error) {
    console.error('Error creating toast notification:', error);
  }
}

// ฟังก์ชันหลักสำหรับรัน scrape task
export async function runScrapeTask(drawingTime?: string, lotterySubTypeId?: number): Promise<{ scrapedCount: number; importedCount: number }> {
  const timeZone = 'Asia/Bangkok';
  const now = new Date();
  const drawDate = formatInTimeZone(now, timeZone, 'yyyy-MM-dd');
  
  console.log(`[Task] Starting SMART POLLING scrape task for drawing_time: ${drawingTime}, sub_type_id: ${lotterySubTypeId}`);
  
  const POLLING_TIMEOUT = 5 * 60 * 1000; // 5 นาที
  const POLLING_INTERVAL_SUCCESS = 15 * 1000; // 15 วินาที
  const POLLING_INTERVAL_ERROR = 30 * 1000; // 30 วินาที
  const startTime = Date.now();

  let browser: any = null;
  let scrapedData: LotteryResult[] = [];
  
  try {
    // ดึงข้อมูล aliases และ target lottery names มาก่อนนอกลูป
    const { data: aliases, error: aliasError } = await supabase
      .from('lottery_name_aliases')
      .select('alias_name, lottery_sub_type_id');
    
    if (aliasError) throw new Error(`Error fetching aliases: ${aliasError.message}`);
    
    let targetLotteryNames: string[] = [];
    if (lotterySubTypeId) {
      targetLotteryNames = aliases.filter(a => a.lottery_sub_type_id === lotterySubTypeId).map(a => a.alias_name);
    } else if (drawingTime) {
      const { data: schedules } = await supabase.from('drawing_schedules').select('lottery_sub_type_id').eq('drawing_time', drawingTime);
      if (schedules && schedules.length > 0) {
        const subTypeIds = schedules.map(s => s.lottery_sub_type_id);
        targetLotteryNames = aliases.filter(a => subTypeIds.includes(a.lottery_sub_type_id)).map(a => a.alias_name);
      }
    }
    
    if (targetLotteryNames.length === 0) {
      console.log('[Task] No target lottery names found, skipping scrape.');
      return { scrapedCount: 0, importedCount: 0 };
    }
    
    console.log(`[Task] Target lottery names: ${targetLotteryNames.join(', ')}`);

    // เปิด browser และ context ครั้งเดียว
    browser = await chromium.launch({ headless: true, args: ['--disable-gpu', '--no-sandbox'], timeout: 360000 });
    const context = await browser.newContext({ userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36' });
    const targetUrl = 'https://xn--t3cjebmjd5a.com/';

    // เริ่ม Smart Polling Loop
    while (Date.now() - startTime < POLLING_TIMEOUT) {
      const elapsedTime = Math.round((Date.now() - startTime) / 1000);
      console.log(`[Task] Polling attempt... (Elapsed: ${elapsedTime}s)`);
      
      try {
        scrapedData = await scrapeAndParseResults(targetUrl, context, targetLotteryNames);
        
        // ตรวจสอบว่ามีข้อมูลจริงหรือไม่ (ไม่ใช่แค่ "รอผล")
        if (scrapedData.length > 0) {
          console.log(`[Task] ✅ Success! Found ${scrapedData.length} valid results.`);
          break; // เจอข้อมูลแล้ว ออกจากลูป
        }
        
        console.log(`[Task] ⏱️ No valid results yet (or still 'รอผล'). Waiting ${POLLING_INTERVAL_SUCCESS / 1000}s...`);
        await new Promise(resolve => setTimeout(resolve, POLLING_INTERVAL_SUCCESS));
        
      } catch (scrapeError) {
        console.error(`[Task] ⚠️ Scrape attempt failed:`, scrapeError);
        console.log(`[Task] Retrying after ${POLLING_INTERVAL_ERROR / 1000}s...`);
        await new Promise(resolve => setTimeout(resolve, POLLING_INTERVAL_ERROR));
      }
    }

    if (browser) await browser.close();

    if (scrapedData.length === 0) {
      console.warn(`[Task] 🚫 Polling timed out after ${POLLING_TIMEOUT / 1000}s. No results found.`);
      // ไม่ต้อง throw error แต่ return ค่าว่างไป เพื่อให้ task อื่นทำงานต่อได้
    }
    
  } catch (error) {
    console.error('[Task] A critical error occurred during the scrape setup:', error);
    if (browser) await browser.close();
    throw error; // throw error ที่ร้ายแรงจริงๆ เช่น ดึง alias ไม่ได้
  }
  
  // ส่วนของการบันทึกข้อมูลจะทำงานเฉพาะเมื่อมีข้อมูลที่ scrape มาได้
  if (scrapedData.length > 0) {
    console.log(`[Task] Saving ${scrapedData.length} results to lottery_api_results`);
    
    const { error: upsertError } = await supabase
      .from('lottery_api_results')
      .upsert(scrapedData, {
        onConflict: 'lottery_name, draw_date, draw_time'
      });
    
    if (upsertError) {
      throw new Error(`Error saving scraped data: ${upsertError.message}`);
    }
    
    await createLotteryImportToast(scrapedData);
  }
  
  const importedCount = await importLotteryResults(
    drawDate,
    drawingTime,
    lotterySubTypeId
  );
  
  return {
    scrapedCount: scrapedData.length,
    importedCount
  };
}

// ฟังก์ชันสำหรับส่งผลหวย
export async function runSendTask(drawingTime?: string, lotterySubTypeId?: number): Promise<{ sentCount: number }> {
  console.log(`[Task] Starting send task for drawing_time: ${drawingTime}, sub_type_id: ${lotterySubTypeId}`);
  
  // TODO: เพิ่มการส่งผลหวยผ่าน Line หรือ notification อื่น ๆ
  // ตอนนี้ return mock data
  
  return { sentCount: 1 };
} 