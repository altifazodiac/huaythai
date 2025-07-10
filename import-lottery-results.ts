// import-lottery-results.ts
// This script is intended for local or CI/CD execution.
// It contains the complete and upgraded scraping and processing logic.

import { chromium, Browser, BrowserContext, Page } from 'playwright';
import * as cheerio from 'cheerio';
import { createClient } from '@supabase/supabase-js';
import { LOTTERY_METADATA } from '@/lib/utils/lotteryMetadata'; // Ensure this path is correct for your project

// Load environment variables for local execution
import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// =================================================================================
// 1. SETUP
// =================================================================================

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type LotteryResult = {
    draw_date: string;
    draw_time?: string;
    country: 'LA' | 'VN' | 'MY' | 'STOCK' | 'OTHER' | 'TH';
    lottery_name: string;
    results: string[];
    source_url: string;
};

// =================================================================================
// 2. TOAST NOTIFICATION FUNCTIONS
// =================================================================================

/**
 * สร้าง toast notification สำหรับแสดงผลหวยที่ดึงมาตามเวลา
 */
async function createLotteryImportToast(importedResults: LotteryResult[]) {
    const currentTime = new Date().toLocaleString('th-TH', { 
        timeZone: 'Asia/Bangkok',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });

    if (importedResults.length === 0) {
        console.log(`[Toast] ${currentTime} - ไม่มีผลหวยใหม่ที่ต้องดึงมา`);
        return;
    }

    // จัดกลุ่มผลหวยตามชื่อหวย
    const groupedResults = importedResults.reduce((acc, result) => {
        if (!acc[result.lottery_name]) {
            acc[result.lottery_name] = [];
        }
        acc[result.lottery_name].push(result);
        return acc;
    }, {} as Record<string, LotteryResult[]>);

    // สร้างข้อความแจ้งเตือน
    const lotteryNames = Object.keys(groupedResults);
    const toastMessage = `🎯 ดึงผลหวยสำเร็จ (${currentTime})\n📋 หวยที่ดึงมา: ${lotteryNames.join(', ')}\n🔢 รวม ${importedResults.length} รายการ`;

    console.log(`[Toast] ${toastMessage}`);
    
    // เก็บข้อมูลสำหรับ toast ในฐานข้อมูล (สำหรับแสดงใน UI)
    try {
        await supabase.from('lottery_import_notifications').insert({
            notification_time: new Date().toISOString(),
            lottery_names: lotteryNames,
            total_results: importedResults.length,
            message: toastMessage,
            notification_type: 'import_success'
        });
    } catch (error) {
        console.log('[Toast] Note: lottery_import_notifications table not found, skipping notification storage');
    }
}

/**
 * สร้าง toast notification สำหรับแสดงข้อผิดพลาดในการดึงผลหวย
 */
async function createLotteryImportErrorToast(errorMessage: string) {
    const currentTime = new Date().toLocaleString('th-TH', { 
        timeZone: 'Asia/Bangkok',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });

    const toastMessage = `❌ เกิดข้อผิดพลาดในการดึงผลหวย (${currentTime})\n🔍 สาเหตุ: ${errorMessage}`;

    console.log(`[Toast] ${toastMessage}`);
    
    // เก็บข้อมูลสำหรับ toast ในฐานข้อมูล (สำหรับแสดงใน UI)
    try {
        await supabase.from('lottery_import_notifications').insert({
            notification_time: new Date().toISOString(),
            lottery_names: [],
            total_results: 0,
            message: toastMessage,
            notification_type: 'import_error'
        });
    } catch (error) {
        console.log('[Toast] Note: lottery_import_notifications table not found, skipping notification storage');
    }
}

// =================================================================================
// 3. SCRAPING & PARSING FUNCTIONS
// =================================================================================

async function autoScroll(page: Page): Promise<void> {
  await page.evaluate(async () => {
    await new Promise<void>((resolve) => {
      let lastHeight = 0;
      let retries = 0;
      const maxRetries = 5; // Number of times to check for new content before stopping
      const timer = setInterval(() => {
        const currentHeight = document.body.scrollHeight;
        window.scrollTo(0, currentHeight);
        if (currentHeight === lastHeight) {
          retries++;
          if (retries >= maxRetries) {
            console.log(`[AutoScroll] Page height is stable at ${currentHeight}px. Finishing scroll.`);
            clearInterval(timer);
            resolve();
          }
        } else {
          lastHeight = currentHeight;
          retries = 0;
        }
      }, 500); // Check for new content every 500ms
    });
  });
}

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
        cardResults.push({ draw_date: date, country: meta.country, lottery_name: lotteryName, results: availablePrizes, source_url: url });
    });
    console.log(`[Parser] Found ${cardResults.length} results from special cards.`);
    return cardResults;
}

async function scrapeAndParseResults(url: string, context: BrowserContext): Promise<LotteryResult[]> {
    let page = null;
    console.log(`[Scraper] Navigating to ${url}`);
    try {
        page = await context.newPage();
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 });
        console.log('[Scraper] Page loaded. Starting auto-scroll...');
        await autoScroll(page);
        console.log('[Scraper] Auto-scroll finished.');
        const html = await page.content();
        const $ = cheerio.load(html);
        const tableResults: LotteryResult[] = [];
        const resultTables = $('table[id^="example"]');
        console.log(`[Parser] Found ${resultTables.length} result tables to process.`);
        resultTables.each((_, tableEl) => {
            const dateHeaderText = $(tableEl).find('thead th[colspan="6"]').first().text().trim();
            if (!dateHeaderText) return;
            const drawDate = convertDate(dateHeaderText);
            $(tableEl).find('tbody tr').each((_, rowEl) => {
                const columns = $(rowEl).find('td');
                if (columns.length < 6) return;
                const prize3Top = $(columns[2]).text().trim();
                const statusText = $(columns[5]).text().trim();
                if (statusText.includes('รอผล') || statusText.includes('ปิด') || prize3Top.includes('XXX') || !prize3Top) return;
                const lotteryName = $(columns[1]).text().trim();
                const meta = LOTTERY_METADATA[lotteryName as keyof typeof LOTTERY_METADATA];
                if (!meta) return;
                const drawTime = $(columns[0]).text().trim();
                const prize2Bottom = $(columns[3]).text().trim();
                const availablePrizes: string[] = [`3 ตัวบน: ${prize3Top}`, `2 ตัวล่าง: ${prize2Bottom}`];
                tableResults.push({ draw_date: drawDate, draw_time: drawTime, country: meta.country, lottery_name: lotteryName, results: availablePrizes, source_url: url });
            });
        });
        console.log(`[Parser] Found ${tableResults.length} results from tables.`);
        const cardResults = parseGovLotteryCards($, url);
        const allPageData = [...tableResults, ...cardResults];
        console.log(`[Scraper] Finished processing. Total valid results found: ${allPageData.length}`);
        return allPageData;
    } catch (error) {
        console.error(`[Scraper] Critical error during scraping:`, error instanceof Error ? error.message : error);
        return [];
    } finally {
        if (page) await page.close();
    }
}

// =================================================================================
// 4. DATA IMPORT & UTILITY LOGIC
// =================================================================================

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

async function automateBatchImportLotteryResults(drawDate: string) {
    console.log(`\n--- Starting data import for date: ${drawDate} ---`);
    const { data: apiResults, error: apiError } = await supabase.from('lottery_api_results').select('*').eq('draw_date', drawDate);
    if (apiError) throw apiError;
    if (!apiResults || apiResults.length === 0) {
        console.log(`No API results found to import for date: ${drawDate}.`);
        return;
    }
    console.log(`[Import][Debug] lottery_api_results for ${drawDate}:`, apiResults);

    const { data: aliases, error: aliasError } = await supabase.from('lottery_name_aliases').select('alias_name, lottery_sub_type_id');
    if (aliasError) throw aliasError;
    console.log(`[Import][Debug] lottery_name_aliases:`, aliases);

    const { data: schedules, error: scheduleError } = await supabase.from('drawing_schedules').select('schedule_id, lottery_sub_type_id, drawing_time');
    if (scheduleError) throw scheduleError;
    const { data: subTypes, error: subTypeError } = await supabase.from('lottery_sub_types').select('lottery_sub_type_id, lottery_type_id');
    if (subTypeError) throw subTypeError;

    const upsertRows: any[] = [];
    for (const apiResult of apiResults) {
        console.log(`[Import][Debug] Processing apiResult.lottery_name: "${apiResult.lottery_name}"`);
        const alias = aliases.find(a => a.alias_name === apiResult.lottery_name);
        if (!alias) { 
            console.warn(`[Import][Warning] No alias found for: "${apiResult.lottery_name}"`);
            continue; 
        }
        const schedule = schedules.find(s => s.lottery_sub_type_id === alias.lottery_sub_type_id);
        if (!schedule) { 
            console.warn(`[Import][Warning] No schedule found for: "${apiResult.lottery_name}" (sub_type_id: ${alias.lottery_sub_type_id})`);
            continue; 
        }
        const subType = subTypes.find(st => st.lottery_sub_type_id === alias.lottery_sub_type_id);
        if (!subType) {
            console.warn(`[Import][Warning] No subType found for: "${apiResult.lottery_name}" (sub_type_id: ${alias.lottery_sub_type_id})`);
            continue;
        }
        const createRow = (prizeCode: string, number: string) => ({ lottery_type_id: subType.lottery_type_id, lottery_sub_type_id: alias.lottery_sub_type_id, schedule_id: schedule.schedule_id, draw_date: apiResult.draw_date, draw_time: apiResult.draw_time, prize_code: prizeCode, winning_number: number });
        for (const result of apiResult.results) {
            if (typeof result !== 'string' || !result.includes(':')) continue;
            const [prizeLabel, prizeValue] = result.split(':').map(s => s.trim());
            if (!prizeValue || prizeValue.includes('X')) continue;
            switch (prizeLabel) {
                case '3 ตัวบน':
                    if (prizeValue.length >= 3) { upsertRows.push(createRow('3 ตัวบน', prizeValue), createRow('2 ตัวบน', prizeValue.slice(-2)), createRow('3 ตัวโต๊ด', getPermutations(prizeValue).join(',')), createRow('วิ่งบน', getUniqueDigits(prizeValue).join(','))); }
                    break;
                case '2 ตัวล่าง':
                    if (prizeValue.length >= 2) { upsertRows.push(createRow('2 ตัวล่าง', prizeValue), createRow('วิ่งล่าง', getUniqueDigits(prizeValue).join(','))); }
                    break;
                case 'รางวัลที่ 1':
                case '3 ตัวหน้า':
                case '3 ตัวล่าง':
                    upsertRows.push(createRow(prizeLabel, prizeValue));
                    break;
            }
        }
    }
    if (upsertRows.length > 0) {
        console.log('[Import][Debug] ตัวอย่างข้อมูลที่จะ upsert ลง lottery_results:');
        upsertRows.slice(0, 3).forEach((row, idx) => {
            console.log(`[Sample ${idx + 1}]`, JSON.stringify(row));
        });
        if (upsertRows.length > 3) {
            console.log(`[Import][Debug] ...ทั้งหมด ${upsertRows.length} rows`);
        }
        console.log(`[Import] Found ${upsertRows.length} rows to upsert into lottery_results.`);
        const { error: upsertError } = await supabase.from('lottery_results').upsert(upsertRows, { onConflict: 'schedule_id, draw_date, prize_code' });
        if (upsertError) console.error('Batch upsert error:', upsertError.message);
        else console.log(`[Import] Batch upserted ${upsertRows.length} rows successfully for date ${drawDate}.`);
    }
}

// =================================================================================
// 5. MAIN ORCHESTRATOR
// =================================================================================

async function main() {
    let browser: Browser | null = null;
    try {
        console.log('🚀 Starting the scrape and import process...');
        console.log(`⏰ Started at: ${new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}`);
        
        browser = await chromium.launch({ headless: true, args: ['--disable-gpu', '--no-sandbox'] });
        const context = await browser.newContext({ userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36' });
        
        const targetUrl = 'https://xn--t3cjebmjd5a.com/';
        
        console.log('--- Scraping Phase ---');
        // ไม่ลบข้อมูลเก่าทั้งหมด เพื่อป้องกันการสูญเสียข้อมูล
        console.log('Scraping new lottery results...');

        const scrapedData = await scrapeAndParseResults(targetUrl, context);

        if (scrapedData.length > 0) {
            console.log(`Attempting to upsert ${scrapedData.length} scraped results...`);
            // ใช้ upsert แทน insert เพื่อป้องกันข้อมูลซ้ำ
            const { error } = await supabase.from('lottery_api_results').upsert(scrapedData, {
                onConflict: 'lottery_name, draw_date, draw_time'
            });
            if (error) throw new Error(`Supabase upsert error: ${error.message}`);
            console.log(`${scrapedData.length} items upserted into temporary table successfully.`);
            
            // สร้าง toast notification สำหรับผลหวยที่ดึงมาสำเร็จ
            await createLotteryImportToast(scrapedData);
        } else {
            console.log('No new data was scraped to insert.');
            // สร้าง toast notification สำหรับกรณีไม่มีข้อมูลใหม่
            await createLotteryImportToast([]);
        }

        // --- IMPROVED: PROCESSING & IMPORTING FOR ALL SCRAPED DATES ---
        if (scrapedData.length > 0) {
            const uniqueDates = [...new Set(scrapedData.map(item => item.draw_date))];
            console.log(`\nFound unique dates to process: ${uniqueDates.join(', ')}`);
            for (const date of uniqueDates) {
                await automateBatchImportLotteryResults(date);
            }
        } else {
            console.log('No new data to process. This might be normal if results are not yet available.');
        }

        console.log('\n✅ Process completed successfully!');
        console.log(`⏰ Finished at: ${new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}`);
    } catch (error) {
        console.error('\n❌ A critical error occurred during the main process:', error);
        console.error(`⏰ Failed at: ${new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}`);
        
        // สร้าง toast notification สำหรับข้อผิดพลาด
        await createLotteryImportErrorToast(error instanceof Error ? error.message : 'Unknown error');
        
        process.exit(1);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

main();
