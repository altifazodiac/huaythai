import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { chromium } from 'playwright';
import { formatInTimeZone } from 'date-fns-tz';
import {subMinutes} from 'date-fns';
import { LOTTERY_METADATA } from '@/lib/utils/lotteryMetadata';
import * as cheerio from 'cheerio';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ปรับ LotteryResult ให้เหมือน vps script
interface LotteryResult {
  draw_date: string;
  draw_time?: string;
  country: 'LA' | 'VN' | 'MY' | 'STOCK' | 'OTHER' | 'TH';
  lottery_name: string;
  results: string[];
  source_url: string;
}

// ฟังก์ชันแปลงวันที่ไทย
function convertDate(dateStr: string): string {
  const months: Record<string, string> = { 'มกราคม': '01', 'กุมภาพันธ์': '02', 'มีนาคม': '03', 'เมษายน': '04', 'พฤษภาคม': '05', 'มิถุนายน': '06', 'กรกฎาคม': '07', 'สิงหาคม': '08', 'กันยายน': '09', 'ตุลาคม': '10', 'พฤศจิกายน': '11', 'ธันวาคม': '12' };
  const parts = dateStr.trim().split(' ');
  if (parts.length < 3) return new Date().toISOString().split('T')[0];
  const day = parts[parts.length - 3].padStart(2, '0');
  const monthName = parts[parts.length - 2];
  const year = parts[parts.length - 1];
  const month = months[monthName];
  if (!day || !month || !year) return new Date().toISOString().split('T')[0];
  return `${year}-${month}-${day}`;
}

function parseGovLotteryCards($: cheerio.CheerioAPI, url: string): LotteryResult[] {
  const cardResults: LotteryResult[] = [];
  $('div.card.my-3.w-100').each((_, cardEl) => {
    const card = $(cardEl);
    const header = card.find('.card-header').clone().children().remove().end().text().trim();
    let lotteryName = '';
    if (header.includes('หวยรัฐบาลไทย')) lotteryName = 'หวยรัฐบาล';
    else if (header.includes('หวย ธกส.')) lotteryName = 'หวย ธกส.';
    else if (header.includes('หวยออมสิน')) lotteryName = 'หวยออมสิน';
    else return;
    const date = card.find('.dateGovTitle').text().trim();
    if (!date) return;
    const prizeContainer = card.find('.dataGovContainer');
    const prize1 = prizeContainer.find('.colGov2 .txt-num').text().trim();
    if (!prize1 || prize1.includes('XXX')) return;
    const availablePrizes: string[] = [];
    availablePrizes.push(`รางวัลที่ 1: ${prize1}`);
    availablePrizes.push(`3 ตัวบน: ${prize1.slice(-3)}`);
    availablePrizes.push(`2 ตัวบน: ${prize1.slice(-2)}`);
    const front3 = prizeContainer.find('.colGov3 .txt-num').map((_, el) => $(el).text().trim()).get();
    if (front3.length > 0) availablePrizes.push(`3 ตัวหน้า: ${front3.join(', ')}`);
    const bottom3 = prizeContainer.find('.colGov4 .txt-num').map((_, el) => $(el).text().trim()).get();
    if (bottom3.length > 0) availablePrizes.push(`3 ตัวล่าง: ${bottom3.join(', ')}`);
    const bottom2 = prizeContainer.find('.colGov5 .txt-num').text().trim();
    if (bottom2) availablePrizes.push(`2 ตัวล่าง: ${bottom2}`);
    const meta = LOTTERY_METADATA[lotteryName as keyof typeof LOTTERY_METADATA];
    if (!meta) return;
    cardResults.push({ draw_date: convertDate(date), country: meta.country, lottery_name: lotteryName, results: availablePrizes, source_url: url });
  });
  return cardResults;
}

async function scrapeAndParseResults(url: string, context: any, targetLotteryNames: string[]): Promise<LotteryResult[]> {
  let page = null;
  try {
    page = await context.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.waitForTimeout(2000);
    const html = await page.content();
    const $ = cheerio.load(html);
    const tableResults: LotteryResult[] = [];
    const resultTables = $('table[id^="example"]');
    resultTables.each((_, tableEl) => {
      const dateHeaderText = $(tableEl).find('thead th[colspan="6"]').first().text().trim();
      if (!dateHeaderText) return;
      const drawDate = convertDate(dateHeaderText);
      $(tableEl).find('tbody tr').each((_, rowEl) => {
        const columns = $(rowEl).find('td');
        if (columns.length < 6) return;
        const lotteryName = $(columns[1]).text().trim();
        if (!targetLotteryNames.includes(lotteryName)) return;
        const prize3Top = $(columns[2]).text().trim();
        const statusText = $(columns[5]).text().trim();
        if (statusText.includes('รอผล') || statusText.includes('ปิด') || prize3Top.includes('XXX') || !prize3Top) return;
        const meta = LOTTERY_METADATA[lotteryName as keyof typeof LOTTERY_METADATA];
        if (!meta) return;
        const drawTime = $(columns[0]).text().trim();
        const prize2Bottom = $(columns[3]).text().trim();
        const availablePrizes: string[] = [`3 ตัวบน: ${prize3Top}`, `2 ตัวล่าง: ${prize2Bottom}`];
        tableResults.push({ draw_date: drawDate, draw_time: drawTime, country: meta.country, lottery_name: lotteryName, results: availablePrizes, source_url: url });
      });
    });
    const cardResults = parseGovLotteryCards($, url);
    const filteredCardResults = cardResults.filter(result => targetLotteryNames.includes(result.lottery_name));
    return [...tableResults, ...filteredCardResults];
  } catch (error) {
    console.error(`[Scraper] Critical error during scraping:`, error instanceof Error ? error.message : error);
    return [];
  } finally {
    if (page) await page.close();
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

// ฟังก์ชันแปลงวันที่เป็น yyyy-MM-dd (Asia/Bangkok)
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
    if (!validateApiKey(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const body = await request.json();
    const { draw_time, lottery_sub_type_id, action = 'scrape_and_import' } = body;
    const timeZone = 'Asia/Bangkok';
    const now = new Date();
    const drawDate = toThaiDateString(now);
    // 1. ดึง alias ทั้งหมด
    const { data: aliases, error: aliasError } = await supabase
      .from('lottery_name_aliases')
      .select('alias_name, lottery_sub_type_id');
    if (aliasError) throw new Error(`Error fetching aliases: ${aliasError.message}`);
    // 2. หา targetLotteryNames
    let targetLotteryNames: string[] = [];
    if (lottery_sub_type_id) {
      targetLotteryNames = aliases
        .filter(a => a.lottery_sub_type_id === lottery_sub_type_id)
        .map(a => a.alias_name);
    } else if (draw_time) {
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
    } else {
      targetLotteryNames = aliases.map(a => a.alias_name);
    }
    if (targetLotteryNames.length === 0) {
      return NextResponse.json({ message: 'No target lottery names found', imported_count: 0 });
    }
    // 3. Scrape & Retry logic
    let scrapedData: LotteryResult[] = [];
    if (action === 'scrape_and_import') {
      let browser: any = null;
      try {
        browser = await chromium.launch({ headless: true, args: ['--disable-gpu', '--no-sandbox'] });
        const context = await browser.newContext({
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
        });
        const targetUrl = 'https://xn--t3cjebmjd5a.com/';
        const maxRetries = 10;
        const retryInterval = 30000; // 30s
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          scrapedData = await scrapeAndParseResults(targetUrl, context, targetLotteryNames);
          if (scrapedData.length > 0) break;
          if (attempt < maxRetries) await new Promise(res => setTimeout(res, retryInterval));
        }
      } catch (err) {
        console.error('[API] Browser launch/scrape failed:', err);
      } finally {
        if (browser) await browser.close();
      }
      // 4. upsert ลง lottery_api_results
      if (scrapedData.length > 0) {
        const { error: upsertError } = await supabase
          .from('lottery_api_results')
          .upsert(scrapedData, { onConflict: 'lottery_name, draw_date, draw_time' });
        if (upsertError) {
          console.error('[API] Error saving scraped data:', upsertError);
        } else {
          // 5. สร้าง toast notification
          try {
            await createLotteryImportToast(scrapedData);
          } catch (error: unknown) {
            console.error('[API] Error creating toast:', error);
          }
        }
      }
    }
    // 6. import ไป lottery_results (ใช้ logic automateBatchImportLotteryResults)
    let importedCount = 0;
    try {
      // ดึงข้อมูลจาก lottery_api_results เฉพาะ draw_date นี้
      const { data: apiResults, error: apiError } = await supabase
        .from('lottery_api_results')
        .select('*')
        .eq('draw_date', drawDate);
      if (apiError) throw apiError;
      if (apiResults && apiResults.length > 0) {
        // ดึง aliases, schedules, subTypes
        const { data: aliases, error: aliasError } = await supabase.from('lottery_name_aliases').select('alias_name, lottery_sub_type_id');
        if (aliasError) throw aliasError;
        const { data: schedules, error: scheduleError } = await supabase.from('drawing_schedules').select('schedule_id, lottery_sub_type_id, draw_time');
        if (scheduleError) throw scheduleError;
        const { data: subTypes, error: subTypeError } = await supabase.from('lottery_sub_types').select('lottery_sub_type_id, lottery_type_id');
        if (subTypeError) throw subTypeError;
        const upsertRows: any[] = [];
        for (const apiResult of apiResults) {
          const alias = aliases.find(a => a.alias_name === apiResult.lottery_name);
          if (!alias) continue;
          let normalizedScrapedTime = apiResult.draw_time;
          if (normalizedScrapedTime && /^\d{2}:\d{2}$/.test(normalizedScrapedTime)) {
            normalizedScrapedTime += ':00';
          }
          const schedule = schedules.find(s => s.lottery_sub_type_id === alias.lottery_sub_type_id && s.draw_time === normalizedScrapedTime);
          if (!schedule) continue;
          const subType = subTypes.find(st => st.lottery_sub_type_id === alias.lottery_sub_type_id);
          if (!subType) continue;
          const createRow = (prizeCode: string, number: string) => ({
            lottery_type_id: subType.lottery_type_id,
            lottery_sub_type_id: alias.lottery_sub_type_id,
            schedule_id: schedule.schedule_id,
            draw_date: apiResult.draw_date,
            draw_time: apiResult.draw_time,
            prize_code: prizeCode,
            winning_number: number
          });
          if (Array.isArray(apiResult.results)) {
            for (const result of apiResult.results) {
              if (typeof result !== 'string' || !result.includes(':')) continue;
              const [prizeLabel, prizeValue] = result.split(':').map(s => s.trim());
              if (!prizeValue || prizeValue.includes('X')) continue;
              switch (prizeLabel) {
                case '3 ตัวบน':
                  if (prizeValue.length >= 3) {
                    upsertRows.push(createRow('3 ตัวบน', prizeValue), createRow('2 ตัวบน', prizeValue.slice(-2)), createRow('3 ตัวโต๊ด', getPermutations(prizeValue).join(',')), createRow('วิ่งบน', getUniqueDigits(prizeValue).join(',')));
                  }
                  break;
                case '2 ตัวล่าง':
                  if (prizeValue.length >= 2) {
                    upsertRows.push(createRow('2 ตัวล่าง', prizeValue), createRow('วิ่งล่าง', getUniqueDigits(prizeValue).join(',')));
                  }
                  break;
                case 'รางวัลที่ 1':
                case '3 ตัวหน้า':
                case '3 ตัวล่าง':
                  upsertRows.push(createRow(prizeLabel, prizeValue));
                  break;
              }
            }
          }
        }
        if (upsertRows.length > 0) {
          const { error: upsertError } = await supabase.from('lottery_results').upsert(upsertRows, { onConflict: 'schedule_id, draw_date, prize_code' });
          if (!upsertError) importedCount = upsertRows.length;
        }
      }
    } catch (error) {
      console.error('[API] Error during import:', error);
    }
    return NextResponse.json({
      message: 'Scrape and import completed successfully',
      scraped_count: scrapedData.length,
      imported_count: importedCount,
      draw_time,
      lottery_sub_type_id,
      success: true
    });
  } catch (error) {
    console.error('Error in import POST API:', error);
    return NextResponse.json({ error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error', timestamp: new Date().toISOString() }, { status: 500 });
  }
}

// ===== Helper functions for import logic =====
function getPermutations(str: string): string[] {
  if (str.length <= 1) return [str];
  const perms: string[] = [];
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    const rest = str.slice(0, i) + str.slice(i + 1);
    for (const perm of getPermutations(rest)) { perms.push(char + perm); }
  }
  return Array.from(new Set(perms)).sort();
}
function getUniqueDigits(str: string): string[] {
  return Array.from(new Set(str.split(''))).sort();
} 