import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { chromium as playwrightChromium } from 'playwright';
import { formatInTimeZone } from 'date-fns-tz';
import {subMinutes } from 'date-fns';
import chromium from '@sparticuz/chromium';


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

function toThaiDateString(date: Date) {
  const tzOffset = 7 * 60 * 60 * 1000;
  const tzDate = new Date(date.getTime() + tzOffset);
  return tzDate.toISOString().split('T')[0];
}

// ตรวจสอบ API key สำหรับ internal calls
function validateApiKey(request: NextRequest): boolean {
  const apiKey = request.headers.get('x-api-key');
  const internalKey = process.env.INTERNAL_API_KEY || 'internal';
  return apiKey === internalKey;
}

// ฟังก์ชันสำหรับ scrape ข้อมูล
async function scrapeAndParseResults(targetUrl: string, context: any, targetLotteryNames?: string[]): Promise<LotteryResult[]> {
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
              const today = toThaiDateString(new Date());
              
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
async function importLotteryResults(drawDate: string, drawingTime?: string, lotterySubTypeId?: number): Promise<number> {
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
    .select('schedule_id, lottery_sub_type_id, draw_time');
  
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
      s.draw_time === normalizedScrapedTime
    );
    
    if (!schedule) {
      console.warn(`[Import] No schedule found for: ${apiResult.lottery_name} at ${normalizedScrapedTime}`);
      continue;
    }
    
    const subType = subTypes.find(st => st.lottery_sub_type_id === alias.lottery_sub_type_id);
    if (!subType) {
      console.warn(`[Import] No subType found for: ${apiResult.lottery_name}`);
      continue;
    }
    
    // สร้างรายการรางวัล
    const prizes = [
      { code: '1st', number: apiResult.first_prize },
      { code: '2nd', number: apiResult.second_prize },
      { code: '3rd', number: apiResult.third_prize },
      { code: '4th', number: apiResult.fourth_prize },
      { code: '5th', number: apiResult.fifth_prize },
    ];
    
    for (const prize of prizes) {
      if (prize.number && prize.number.trim() !== '' && prize.number !== 'รอผล') {
        upsertRows.push({
          lottery_type_id: subType.lottery_type_id,
          lottery_sub_type_id: alias.lottery_sub_type_id,
          schedule_id: schedule.schedule_id,
          draw_date: apiResult.draw_date,
          draw_time: apiResult.draw_time,
          prize_code: prize.code,
          winning_number: prize.number,
          is_sent_to_line: false
        });
      }
    }
  }
  
  if (upsertRows.length === 0) {
    console.log('[Import] No valid rows to import');
    return 0;
  }
  
  // Upsert ข้อมูลลง lottery_results
  const { error: upsertError } = await supabase
    .from('lottery_results')
    .upsert(upsertRows, {
      onConflict: 'lottery_sub_type_id, schedule_id, draw_date, draw_time, prize_code'
    });
  
  if (upsertError) {
    console.error('[Import] Error upserting results:', upsertError);
    throw upsertError;
  }
  
  console.log(`[Import] Successfully imported ${upsertRows.length} results`);
  return upsertRows.length;
}

// ฟังก์ชันสำหรับสร้าง notification toast
async function createLotteryImportToast(scrapedData: LotteryResult[]) {
  try {
    const currentTime = new Date();
    const lotteryNames = scrapedData.map(item => item.lottery_name);
    const message = scrapedData.length > 0 
      ? `นำเข้าข้อมูลหวย ${scrapedData.length} รายการสำเร็จ`
      : 'ไม่พบข้อมูลหวยใหม่ในขณะนี้';
    
    const { error } = await supabase
      .from('lottery_import_notifications')
      .insert({
        notification_time: currentTime.toISOString(),
        lottery_names: lotteryNames,
        total_results: scrapedData.length,
        message: message,
        notification_type: scrapedData.length > 0 ? 'import_success' : 'import_error'
      });
    
    if (error) {
      console.error('Error creating toast notification:', error);
    }
    
  } catch (error) {
    console.error('Error creating toast notification:', error);
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const drawDate = searchParams.get('draw_date') || toThaiDateString(new Date());
    const drawingTime = searchParams.get('draw_time');
    const lotterySubTypeId = searchParams.get('lottery_sub_type_id');
    
    // Import ข้อมูลจาก lottery_api_results
    const importedCount = await importLotteryResults(
      drawDate,
      drawingTime || undefined,
      lotterySubTypeId ? parseInt(lotterySubTypeId) : undefined
    );
    
    return NextResponse.json({
      message: `Import completed successfully`,
      imported_count: importedCount,
      draw_date: drawDate,
      draw_time: drawingTime,
      lottery_sub_type_id: lotterySubTypeId
    });
    
  } catch (error) {
    console.error('Error in import API:', error);
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
    const { draw_time, lottery_sub_type_id, action = 'scrape_and_import' } = body;
    
    const timeZone = 'Asia/Bangkok';
    const now = new Date();
    const drawDate = toThaiDateString(now);
    const currentTime = formatInTimeZone(now, timeZone, 'HH:mm:ss');
    
    console.log(`[API] Starting ${action} for draw_time: ${draw_time}, sub_type_id: ${lottery_sub_type_id}`);
    
    if (action === 'scrape_and_import') {
      // ขั้นตอนที่ 1: Scrape ข้อมูลจากเว็บไซต์
      let browser: any = null;
      let scrapedData: LotteryResult[] = [];
      
      try {
        console.log('[API] Starting scrape process...');
        
        // ดึงข้อมูล aliases สำหรับหา target lottery names
        const { data: aliases, error: aliasError } = await supabase
          .from('lottery_name_aliases')
          .select('alias_name, lottery_sub_type_id');
        
        if (aliasError) {
          throw new Error(`Error fetching aliases: ${aliasError.message}`);
        }
        
        // กรองเฉพาะ lottery ที่ต้องการ
        let targetLotteryNames: string[] = [];
        if (lottery_sub_type_id) {
          targetLotteryNames = aliases
            .filter(a => a.lottery_sub_type_id === lottery_sub_type_id)
            .map(a => a.alias_name);
        } else if (draw_time) {
          // ถ้าไม่มี sub_type_id ให้ใช้ draw_time หา
          const { data: schedules } = await supabase
            .from('drawing_schedules')
            .select('lottery_sub_type_id')
            .eq('draw_time', draw_time);
          
          if (schedules && schedules.length > 0) {
            const subTypeIds = schedules.map(s => s.lottery_sub_type_id);
            targetLotteryNames = aliases
              .filter(a => subTypeIds.includes(a.lottery_sub_type_id))
              .map(a => a.alias_name);
          }
        }
        
        if (targetLotteryNames.length === 0) {
          console.log('[API] No target lottery names found');
          return NextResponse.json({
            message: 'No target lottery names found',
            imported_count: 0
          });
        }
        
        console.log(`[API] Target lottery names: ${targetLotteryNames.join(', ')}`);
        
        // เปิด browser และ scrape
        const executablePath = await chromium.executablePath;
        browser = await playwrightChromium.launch({ 
          headless: true, 
          args: chromium.args,
          executablePath,
          timeout: 360000 
        });
        
        const context = await browser.newContext({ 
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36' 
        });
        
        const targetUrl = 'https://xn--t3cjebmjd5a.com/';
        
        // ลองสครีป 3 ครั้ง
        for (let attempt = 1; attempt <= 3; attempt++) {
          console.log(`[API] Scrape attempt ${attempt}/3`);
          
          scrapedData = await scrapeAndParseResults(targetUrl, context, targetLotteryNames);
          
          if (scrapedData.length > 0) {
            console.log(`[API] Found ${scrapedData.length} results on attempt ${attempt}`);
            break;
          }
          
          if (attempt < 3) {
            console.log(`[API] No results found, waiting 30s before retry...`);
            await new Promise(resolve => setTimeout(resolve, 30000));
          }
        }
        
        await browser.close();
        
      } catch (error) {
        console.error('[API] Error during scraping:', error);
        if (browser) await browser.close();
        throw error;
      }
      
      // ขั้นตอนที่ 2: บันทึกข้อมูลลง lottery_api_results
      if (scrapedData.length > 0) {
        console.log(`[API] Saving ${scrapedData.length} results to lottery_api_results`);
        
        const { error: upsertError } = await supabase
          .from('lottery_api_results')
          .upsert(scrapedData, {
            onConflict: 'lottery_name, draw_date, draw_time'
          });
        
        if (upsertError) {
          throw new Error(`Error saving scraped data: ${upsertError.message}`);
        }
        
        // สร้าง notification toast
        await createLotteryImportToast(scrapedData);
      }
      
      // ขั้นตอนที่ 3: Import ข้อมูลไปยัง lottery_results
      const importedCount = await importLotteryResults(
        drawDate,
        draw_time,
        lottery_sub_type_id
      );
      
      return NextResponse.json({
        message: 'Scrape and import completed successfully',
        scraped_count: scrapedData.length,
        imported_count: importedCount,
        draw_time,
        lottery_sub_type_id
      });
      
    } else if (action === 'import_only') {
      // เฉพาะ import ข้อมูลจาก lottery_api_results
      const importedCount = await importLotteryResults(
        drawDate,
        draw_time,
        lottery_sub_type_id
      );
      
      return NextResponse.json({
        message: 'Import completed successfully',
        imported_count: importedCount,
        draw_time,
        lottery_sub_type_id
      });
      
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
    
  } catch (error) {
    console.error('Error in import POST API:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 