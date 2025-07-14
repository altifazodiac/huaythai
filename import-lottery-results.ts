// import-lottery-results.ts
// This script is intended for local or CI/CD execution.
// It contains the complete and upgraded scraping and processing logic.

import { chromium, Browser, BrowserContext, Page } from 'playwright';
import * as cheerio from 'cheerio';
import { createClient } from '@supabase/supabase-js';
import { LOTTERY_METADATA } from '@/lib/utils/lotteryMetadata'; // Ensure this path is correct for your project
import { formatInTimeZone } from 'date-fns-tz';
import { subMinutes } from 'date-fns';

// Load environment variables for local execution
import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env'), override: false });

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

function toThaiDateString(date: Date) {
  const tzOffset = 7 * 60 * 60 * 1000;
  const tzDate = new Date(date.getTime() + tzOffset);
  return tzDate.toISOString().split('T')[0];
}

function parseGovLotteryCards($: cheerio.CheerioAPI, url: string): LotteryResult[] {
    const cardResults: LotteryResult[] = [];
    $('div.card.my-3.w-100').each((_, cardEl) => {
        const card = $(cardEl);
        const header = card.find('.card-header').clone().children().remove().end().text().trim();
        let lotteryName = '';
        let drawTime: string | undefined = undefined;

        if (header.includes('หวยรัฐบาลไทย')) {
            lotteryName = 'หวยรัฐบาล';
            drawTime = '15:40:00';
        } else if (header.includes('หวย ธกส.')) {
            lotteryName = 'หวย ธกส.';
            drawTime = '08:30:00';
        } else if (header.includes('หวยออมสิน')) {
            lotteryName = 'หวยออมสิน';
            drawTime = '12:30:00';
        } else {
            return;
        }

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
        
        // Use the non-alias name 'หวยรัฐบาล' for metadata lookup
        const metaLookupName = (lotteryName === 'หวยรัฐบาล' || lotteryName === 'หวยออมสิน' || lotteryName === 'หวย ธกส.') ? lotteryName : null;
        if (!metaLookupName) return;

        const meta = LOTTERY_METADATA[metaLookupName as keyof typeof LOTTERY_METADATA];
        if (!meta) return;

        cardResults.push({ draw_date: date, draw_time: drawTime, country: meta.country, lottery_name: lotteryName, results: availablePrizes, source_url: url });
    });
    console.log(`[Parser] Found ${cardResults.length} results from special cards.`);
    return cardResults;
}

async function scrapeAndParseResults(url: string, context: BrowserContext, targetLotteryNames: string[]): Promise<LotteryResult[]> {
    let page = null;
    console.log(`[Scraper] Navigating to ${url}`);
    console.log(`[Scraper] Targeting ${targetLotteryNames.length} lotteries: ${targetLotteryNames.join(', ')}`);
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
                
                const lotteryName = $(columns[1]).text().trim();
                console.log(`[Parser] Evaluating row for lottery: "${lotteryName}"...`);
                
                // --- FILTERING LOGIC ---
                // Skip if not a target lottery for this specific cron run
                if (!targetLotteryNames.includes(lotteryName)) {
                    console.log(`[Parser] -> Skipping "${lotteryName}" as it's not a target.`);
                    return; 
                }
                console.log(`[Parser] -> MATCH! "${lotteryName}" is a target. Processing...`);

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
        console.log(`[Parser] Found ${tableResults.length} relevant results from tables.`);
        const cardResults = parseGovLotteryCards($, url);
        // Also filter the special government lottery cards
        const filteredCardResults = cardResults.filter(result => targetLotteryNames.includes(result.lottery_name));

        const allPageData = [...tableResults, ...filteredCardResults];
        console.log(`[Scraper] Finished processing. Total valid, targeted results found: ${allPageData.length}`);
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
    
    const unaliasedNames = new Set<string>();

    const { data: schedules, error: scheduleError } = await supabase.from('drawing_schedules').select('schedule_id, lottery_sub_type_id, draw_time');
    if (scheduleError) throw scheduleError;
    const { data: subTypes, error: subTypeError } = await supabase.from('lottery_sub_types').select('lottery_sub_type_id, lottery_type_id');
    if (subTypeError) throw subTypeError;

    const upsertRows: any[] = [];
    for (const apiResult of apiResults) {
        console.log(`[Import][Debug] Processing apiResult.lottery_name: "${apiResult.lottery_name}"`);
        const alias = aliases.find(a => a.alias_name === apiResult.lottery_name);
        if (!alias) {
            unaliasedNames.add(apiResult.lottery_name);
            continue;
        }
        
        // Normalize scraped time to HH:mm:ss format to match database
        let normalizedScrapedTime = apiResult.draw_time;
        if (normalizedScrapedTime && /^\d{2}:\d{2}$/.test(normalizedScrapedTime)) {
            normalizedScrapedTime += ':00';
        }

        const schedule = schedules.find(s => s.lottery_sub_type_id === alias.lottery_sub_type_id && s.draw_time === normalizedScrapedTime);
        
        if (!schedule) { 
            console.warn(`[Import][Warning] No matching schedule found for: "${apiResult.lottery_name}" at time "${apiResult.draw_time}" (normalized to "${normalizedScrapedTime}") (sub_type_id: ${alias.lottery_sub_type_id}). Skipping.`);
            continue; 
        }
        console.log(`[Import] Match found for "${apiResult.lottery_name}": Alias -> SubTypeID ${alias.lottery_sub_type_id} -> ScheduleID ${schedule.schedule_id}`);
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
                    if (prizeValue.length >= 3) { 
                        console.log(`[Import] -> Generating prizes for '3 ตัวบน': '3 ตัวบน', '2 ตัวบน', '3 ตัวโต๊ด', 'วิ่งบน'`);
                        upsertRows.push(createRow('3 ตัวบน', prizeValue), createRow('2 ตัวบน', prizeValue.slice(-2)), createRow('3 ตัวโต๊ด', getPermutations(prizeValue).join(',')), createRow('วิ่งบน', getUniqueDigits(prizeValue).join(','))); 
                    }
                    break;
                case '2 ตัวล่าง':
                    if (prizeValue.length >= 2) { 
                        console.log(`[Import] -> Generating prizes for '2 ตัวล่าง': '2 ตัวล่าง', 'วิ่งล่าง'`);
                        upsertRows.push(createRow('2 ตัวล่าง', prizeValue), createRow('วิ่งล่าง', getUniqueDigits(prizeValue).join(','))); 
                    }
                    break;
                case 'รางวัลที่ 1':
                case '3 ตัวหน้า':
                case '3 ตัวล่าง':
                    console.log(`[Import] -> Generating prize for '${prizeLabel}'`);
                    upsertRows.push(createRow(prizeLabel, prizeValue));
                    break;
            }
        }
    }

    if (unaliasedNames.size > 0) {
        console.warn(`\n[Import][CRITICAL WARNING] The following ${unaliasedNames.size} lottery names were found on the source website but do not have an alias in the 'lottery_name_aliases' table. Their results were SKIPPED:`);
        unaliasedNames.forEach(name => console.warn(`- ${name}`));
        console.warn(`\nPlease add these aliases to the database to ensure all results are imported.`);
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
        const timeZone = 'Asia/Bangkok';
        const now = new Date();
        console.log('🚀 Starting the TARGETED scrape and import process...');
        console.log(`⏰ Started at: ${now.toLocaleString('th-TH', { timeZone })}`);
        
        // --- Determine Target Lotteries based on Schedule ---
        console.log('\n[Step 1/4] Determining Target Lotteries...');
        const currentTime = formatInTimeZone(now, timeZone, 'HH:mm:ss');
        const windowStartTime = formatInTimeZone(subMinutes(now, 10), timeZone, 'HH:mm:ss');
        
        console.log(`Checking for scheduled draws between ${windowStartTime} and ${currentTime}`);

        const { data: scheduledDraws, error: scheduleError } = await supabase
            .from('drawing_schedules')
            .select('lottery_sub_type_id, draw_time')
            .gte('draw_time', windowStartTime)
            .lte('draw_time', currentTime);

        if (scheduleError) throw new Error(`Error fetching schedules: ${scheduleError.message}`);

        if (!scheduledDraws || scheduledDraws.length === 0) {
            console.log('No lotteries scheduled to draw in the current time window. Exiting gracefully.');
            return;
        }

        console.log(`Found ${scheduledDraws.length} scheduled draws:`, scheduledDraws.map(s => `ID ${s.lottery_sub_type_id} at ${s.draw_time}`).join('; '));
        
        const { data: nextDraw, error: nextDrawError } = await supabase
            .from('drawing_schedules')
            .select('draw_time')
            .gt('draw_time', currentTime)
            .order('draw_time', { ascending: true })
            .limit(1)
            .single();

        const nextDrawTime = nextDraw?.draw_time;
        if (nextDrawTime) {
            console.log(`[Info] Next scheduled draw is at: ${nextDrawTime}`);
        } else {
            console.log('[Info] No subsequent draws found for today.');
        }

        const scheduledSubTypeIds = scheduledDraws.map(s => s.lottery_sub_type_id);
        const { data: aliases, error: aliasError } = await supabase
            .from('lottery_name_aliases')
            .select('alias_name')
            .in('lottery_sub_type_id', scheduledSubTypeIds);

        if (aliasError) throw new Error(`Error fetching aliases: ${aliasError.message}`);
        
        if (!aliases || aliases.length === 0) {
            console.warn(`Warning: Found scheduled draws but no corresponding aliases. Check sub_type_ids: ${scheduledSubTypeIds.join(', ')}`);
            return;
        }

        const targetLotteryNames = aliases.map(a => a.alias_name);

        // --- Scraping Phase with Retry Logic ---
        console.log('\n[Step 2/4] Scraping Phase (with up to 20 retries)...');
        browser = await chromium.launch({ 
            headless: true, 
            args: ['--disable-gpu', '--no-sandbox'],
            timeout: 360000 
        });
        const context = await browser.newContext({ userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36' });
        
        const targetUrl = 'https://xn--t3cjebmjd5a.com/';
        
        let scrapedData: LotteryResult[] = [];
        const maxRetries = 20;
        const retryInterval = 60000; // 60 seconds

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            console.log(`\n[Attempt ${attempt}/${maxRetries}] Scraping for: ${targetLotteryNames.join(', ')}`);
            
            scrapedData = await scrapeAndParseResults(targetUrl, context, targetLotteryNames);

            if (scrapedData.length > 0) {
                console.log(`✅ Success! Found results on attempt ${attempt}.`);
                break; 
            }
            
            console.log(`[Attempt ${attempt}/${maxRetries}] No results found yet.`);

            if (attempt === maxRetries) {
                console.warn(`[MAX RETRIES] Reached maximum of ${maxRetries} attempts. Stopping.`);
                break;
            }

            const nowForCheck = new Date();
            const currentTimeForCheck = formatInTimeZone(nowForCheck, timeZone, 'HH:mm:ss');
            if (nextDrawTime && currentTimeForCheck >= nextDrawTime) {
                console.warn(`[STOP] Current time (${currentTimeForCheck}) has passed the next scheduled draw time (${nextDrawTime}). Stopping retries for the current target.`);
                break;
            }

            console.log(`Waiting for ${retryInterval / 1000} seconds before retrying...`);
            await new Promise(resolve => setTimeout(resolve, retryInterval));
        }


        if (scrapedData.length > 0) {
            console.log(`\n[Step 3/4] Upserting ${scrapedData.length} results to temporary table...`);
            const { error } = await supabase.from('lottery_api_results').upsert(scrapedData, {
                onConflict: 'lottery_name, draw_date, draw_time'
            });
            if (error) throw new Error(`Supabase upsert error: ${error.message}`);
            console.log(`[Step 3/4] ✅ Success: Upserted to 'lottery_api_results'.`);
            
            await createLotteryImportToast(scrapedData);
        } else {
            console.log('\nNo new data was ultimately scraped for the targeted lotteries after all attempts.');
            const expectedLotteries = scheduledDraws.map(d => `ID ${d.lottery_sub_type_id} at ${d.draw_time}`);
            console.warn(`Warning: The script was triggered for scheduled lotteries, but no results were found on the website after multiple attempts. This might be due to a publication delay. Expected: ${expectedLotteries.join(', ')}`);
            await createLotteryImportToast([]);
        }

        // --- Processing & Importing for all scraped dates (which are now targeted) ---
        if (scrapedData.length > 0) {
            const uniqueDates = [...new Set(scrapedData.map(item => item.draw_date))];
            console.log(`\n[Step 4/4] Processing and Importing to final 'lottery_results' table for dates: ${uniqueDates.join(', ')}...`);
            for (const date of uniqueDates) {
                await automateBatchImportLotteryResults(date);
            }
            console.log(`[Step 4/4] ✅ Success: Finished processing all dates.`);
        } else {
            console.log('\nNo new data to process. This might be normal if results are not yet available.');
        }

        console.log('\n✅ Process completed successfully!');
        console.log(`⏰ Finished at: ${new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}`);
    } catch (error) {
        console.error('\n❌ A critical error occurred during the main process:', error);
        console.error(`⏰ Failed at: ${new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}`);
        
        // Create a toast notification for the error
        await createLotteryImportErrorToast(error instanceof Error ? error.message : 'Unknown error');
        
        process.exit(1);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

main();
