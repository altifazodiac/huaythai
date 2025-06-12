// file: scraper.ts

import { chromium, Browser, BrowserContext } from 'playwright-core';
import * as cheerio from 'cheerio';
import { createClient } from '@supabase/supabase-js';
import { LOTTERY_METADATA } from '@/lib/utils/lotteryMetadata'; // ตรวจสอบว่า path นี้ถูกต้องในโปรเจกต์ของคุณ

// =================================================================================
// 1. CONFIGURATION & SETUP
// =================================================================================

// ใช้ Service Role Key เพราะสคริปต์นี้ทำงานในสภาพแวดล้อมที่ปลอดภัย (GitHub Actions)
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type LotteryResult = {
    draw_date: string;
    draw_time?: string;
    country: 'LA' | 'VN' | 'MY' | 'STOCK' | 'OTHER';
    lottery_name: string;
    results: string[];
    source_url: string;
};


// =================================================================================
// 2. UTILITY & PARSING FUNCTIONS (จาก import-lottery-results.ts)
// =================================================================================

/**
 * แปลงวันที่จากภาษาไทย (พ.ศ.) เป็นรูปแบบ YYYY-MM-DD (ค.ศ.)
 */
function convertDate(dateStr: string): string {
  const fullMonths: Record<string, string> = { 'มกราคม': '01', 'กุมภาพันธ์': '02', 'มีนาคม': '03', 'เมษายน': '04', 'พฤษภาคม': '05', 'มิถุนายน': '06', 'กรกฎาคม': '07', 'สิงหาคม': '08', 'กันยายน': '09', 'ตุลาคม': '10', 'พฤศจิกายน': '11', 'ธันวาคม': '12' };
  const shortMonths: Record<string, string> = { 'ม.ค.': '01', 'ก.พ.': '02', 'มี.ค.': '03', 'เม.ย.': '04', 'พ.ค.': '05', 'มิ.ย.': '06', 'ก.ค.': '07', 'ส.ค.': '08', 'ก.ย.': '09', 'ต.ค.': '10', 'พ.ย.': '11', 'ธ.ค.': '12' };
  let cleanStr = dateStr.replace(/^(ปิด|เปิด)\s+/, '').replace(/^(อา|จ|อ|พ|พฤ|ศ|ส)\.\s/, '').trim();
  const parts = cleanStr.split(' ');
  if (parts.length < 3) return new Date().toISOString().split('T')[0];
  const day = parts[0].padStart(2, '0');
  const month = fullMonths[parts[1]] || shortMonths[parts[1]];
  const yearPart = parseInt(parts[2]);
  const yearAD = yearPart > 2500 ? yearPart - 543 : (2500 + yearPart) - 543;
  if (!day || !month || !yearAD) return new Date().toISOString().split('T')[0];
  return `${yearAD}-${month}-${day}`;
}

/**
 * ดึงข้อมูลรางวัลจากตารางผลหวย
 */
function parseTable(table: cheerio.Cheerio<any>, $: cheerio.CheerioAPI, url: string): LotteryResult | null {
  const name = table.find('span[style*="color:blue"]').first().text().trim();
  const dateText = table.find('span[style*="color:blue"]').eq(1).text().trim();
  const timeText = table.find('span[style*="color:blue"]').eq(2).text().trim();
  if (!name || !dateText) { return null; }
  const meta = LOTTERY_METADATA[name as keyof typeof LOTTERY_METADATA];
  if (!meta) { return null; }
  
  const getPrize = (label: string): string => {
    const labelSpan = table.find('span').filter((_, el) => $(el).text().trim() === label);
    if (labelSpan.length > 0) {
      return labelSpan.first().closest('th').next('th').text().trim();
    }
    return '';
  };
  
  const availablePrizes: string[] = [];
  const prize3top = getPrize('3 ตัวบน');
  if (prize3top) availablePrizes.push(`3 ตัวบน: ${prize3top}`);
  const prize2bottom = getPrize('2 ตัวล่าง');
  if (prize2bottom) availablePrizes.push(`2 ตัวล่าง: ${prize2bottom}`);
  
  // ในเวอร์ชั่นใหม่นี้ เราไม่จำเป็นต้องดึง '2 ตัวบน' จากหน้าเว็บ
  // เพราะเราจะสร้างมันขึ้นมาเองจาก '3 ตัวบน' ในขั้นตอนการประมวลผล
  if (availablePrizes.length === 0) { return null; }
  
  return {
    draw_date: convertDate(dateText),
    draw_time: timeText ? timeText.replace(/\s*น\./, '').trim() : undefined,
    country: meta.country,
    lottery_name: name,
    results: availablePrizes,
    source_url: url,
  };
}

/**
 * คำนวณเลขสลับ (Permutations) ทั้งหมดของเลข 3 หลัก
 */
function getPermutations(str: string): string[] {
    if (str.length <= 1) return [str];
    const perms: string[] = [];
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
 */
function getUniqueDigits(str: string): string[] {
    return Array.from(new Set(str.split(''))).sort();
}

// =================================================================================
// 3. CORE LOGIC FUNCTIONS
// =================================================================================

/**
 * Scrape ข้อมูลจากหน้าเว็บเป้าหมาย
 */
async function scrapePage(url: string, context: BrowserContext): Promise<LotteryResult[]> {
  let page = null;
  const lotteryNameFromUrl = decodeURIComponent(url.split('/')[4] || 'Unknown');
  try {
    page = await context.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    try {
      await page.waitForSelector('table[width="100%"][border="1"] tbody', { timeout: 15000 });
    } catch (e) { return []; }
    const html = await page.content();
    const $ = cheerio.load(html);
    const resultTables = $('table[width="100%"][border="1"]');
    if (resultTables.length === 0) { return []; }
    const allPageData: LotteryResult[] = [];
    for (const tableEl of resultTables.toArray()) {
      const parsedData = parseTable($(tableEl), $, url);
      if (parsedData) { allPageData.push(parsedData); }
    }
    return allPageData;
  } catch (error) {
    console.error(`[Error] Failed to process page for ${lotteryNameFromUrl}:`, error as Error);
    return [];
  } finally {
    if (page) await page.close();
  }
}

/**
 * ประมวลผลและนำเข้าข้อมูลจากตาราง `lottery_api_results` ไปยัง `lottery_results`
 */
async function processAndImportResults(drawDate: string) {
    console.log(`\n--- [Processor] Starting data import for date: ${drawDate} ---`);

    const { data: apiResults, error: apiError } = await supabase
        .from('lottery_api_results')
        .select('*')
        .eq('draw_date', drawDate);

    if (apiError) throw apiError;
    if (!apiResults || apiResults.length === 0) {
        console.log(`[Processor] No API results found to import for ${drawDate}.`);
        return;
    }

    const { data: aliases, error: aliasError } = await supabase.from('lottery_name_aliases').select('alias_name, lottery_sub_type_id');
    if (aliasError) throw aliasError;
    const { data: schedules, error: scheduleError } = await supabase.from('drawing_schedules').select('schedule_id, lottery_sub_type_id, drawing_time');
    if (scheduleError) throw scheduleError;
    const { data: subTypes, error: subTypeError } = await supabase.from('lottery_sub_types').select('lottery_sub_type_id, lottery_type_id');
    if (subTypeError) throw subTypeError;

    const upsertRows: any[] = [];

    for (const apiResult of apiResults) {
        const alias = aliases.find(a => a.alias_name === apiResult.lottery_name);
        if (!alias) continue;

        const schedule = schedules.find(s => s.lottery_sub_type_id === alias.lottery_sub_type_id && s.drawing_time === apiResult.draw_time);
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
            winning_number: number,
        });

        for (const result of apiResult.results) {
            const valuePart = result.split(':')[1];
            const winningNumber = valuePart.match(/\d+/)?.[0] || '';
            if (!winningNumber) continue;

            if (result.startsWith('3 ตัวบน') && winningNumber.length === 3) {
                upsertRows.push(
                    createRow('3 ตัวบน', winningNumber),
                    createRow('2 ตัวบน', winningNumber.slice(-2)), // สร้าง 2 ตัวบนจาก 3 ตัวบน
                    createRow('3 ตัวโต๊ด', getPermutations(winningNumber).join(',')),
                    createRow('วิ่งบน', getUniqueDigits(winningNumber).join(','))
                );
            } else if (result.startsWith('2 ตัวล่าง') && winningNumber.length === 2) {
                upsertRows.push(
                    createRow('2 ตัวล่าง', winningNumber),
                    createRow('วิ่งล่าง', getUniqueDigits(winningNumber).join(','))
                );
            }
        }
    }

    if (upsertRows.length > 0) {
        console.log(`[Processor] Found ${upsertRows.length} rows to upsert into 'lottery_results'.`);
        const { error: upsertError } = await supabase
            .from('lottery_results')
            .upsert(upsertRows, { onConflict: 'schedule_id, draw_date, draw_time, prize_code' });

        if (upsertError) {
            console.error('[Processor] Batch upsert error:', upsertError.message);
        } else {
            console.log(`[Processor] Batch upserted ${upsertRows.length} rows successfully.`);
        }
    }
}


// =================================================================================
// 4. MAIN ORCHESTRATOR FUNCTION (ที่จะถูกเรียกจาก Dispatcher)
// =================================================================================

export async function scrapeAndStoreLottery(lotteryName: string): Promise<void> {
  const baseUrl = 'https://www.raakaadee.com/ตรวจหวย-หุ้น/';
  const targetUrl = `${baseUrl}${(lotteryName)}/`;

  console.log(`\n🚀 [Task Start] Scraping for: ${lotteryName}`);

  let browser: Browser | null = null;
  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
    });

    // --- PART 1: SCRAPING ---
    const scrapedResults = await scrapePage(targetUrl, context);

    if (scrapedResults && scrapedResults.length > 0) {
      console.log(`[Scraper] Found ${scrapedResults.length} result(s). Upserting to 'lottery_api_results'...`);
      
      const { error: upsertApiError } = await supabase
        .from('lottery_api_results')
        .upsert(scrapedResults, { onConflict: 'draw_date,lottery_name,draw_time' }); // เพิ่ม draw_time เพื่อความแม่นยำ

      if (upsertApiError) {
        console.error(`[Scraper] DB Error on upserting raw data:`, upsertApiError.message);
      } else {
        console.log(`[Scraper] Successfully upserted raw data for ${lotteryName}.`);
        
        // --- PART 2: PROCESSING ---
        const drawDate = scrapedResults[0].draw_date;
        await processAndImportResults(drawDate);
      }

    } else {
      console.log(`[Scraper] No new results found on the page for ${lotteryName}.`);
    }

  } catch (error) {
    console.error(`[Critical Error] A critical error occurred during task for ${lotteryName}:`, error);
  } finally {
    if (browser) {
      await browser.close();
    }
    console.log(`✅ [Task End] Finished processing for: ${lotteryName}`);
  }
}