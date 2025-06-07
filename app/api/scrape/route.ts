// app/api/scrape/route.ts
import { NextResponse } from 'next/server';
import { chromium, BrowserContext } from 'playwright-core';
import * as cheerio from 'cheerio';
import { createClient } from '@supabase/supabase-js';
import sparticuzChromium from '@sparticuz/chromium';
import { LOTTERY_METADATA } from '@/lib/utils/lotteryMetadata';

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

export const revalidate = 0;

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
        if (allPageData.length > 0) {
          console.log(`[Success] Scraped ${allPageData.length} result(s) from ${lotteryNameFromUrl}`);
        }
        return allPageData;
    } catch (error) {
        if (error instanceof Error && error.name === 'TimeoutError') {
          console.warn(`[Timeout] Timed out processing page for ${lotteryNameFromUrl}. Skipping.`);
        } else {
          console.error(`[Error] Failed to process page for ${lotteryNameFromUrl}:`, error as Error);
        }
        return [];
    } finally {
        if (page) await page.close();
    }
}

function parseTable(table: cheerio.Cheerio<any>, $: cheerio.CheerioAPI, url: string): LotteryResult | null {
    const headerSelectors = ['h2 a', 'h2', 'h1 a', 'h1', 'h3 a', 'h3'];
    let header: cheerio.Cheerio<any> | null = null;
    for (const selector of headerSelectors) {
        const foundHeader = table.find(selector);
        if (foundHeader.length > 0) {
            header = foundHeader;
            break;
        }
    }
    if (!header) { return null; }
    
    const name = header.find('span[style*="color:blue"]').first().text().trim();
    const dateText = header.find('span[style*="color:blue"]').eq(1).text().trim();
    const timeText = header.find('span[style*="color:blue"]').eq(2).text().trim();

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
    const prize2top = getPrize('2 ตัวบน');
    if (prize2top) availablePrizes.push(`2 ตัวบน: ${prize2top}`);
    const prize2bottom = getPrize('2 ตัวล่าง');
    if (prize2bottom) availablePrizes.push(`2 ตัวล่าง: ${prize2bottom}`);

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

export async function GET(request: Request) {
    const baseUrl = 'https://www.raakaadee.com/ตรวจหวย-หุ้น/';
    const lotteryNames = Object.keys(LOTTERY_METADATA);
    const targetUrls = lotteryNames.map(name => `${baseUrl}${encodeURIComponent(name)}/`);
    const batchSize = 10;
    const allDataToInsert: LotteryResult[] = [];
    console.log(`Starting to scrape ${targetUrls.length} pages in batches of ${batchSize}...`);

    let browser: any = null;
    try {
        browser = await chromium.launch({
            args: sparticuzChromium.args,
            executablePath: process.env.CHROME_EXECUTABLE_PATH || await sparticuzChromium.executablePath(),
            headless: true,
        });

        const context = await browser.newContext({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
            viewport: { width: 1920, height: 1080 },
            locale: 'en-US',
            extraHTTPHeaders: {
                'Accept-Language': 'en-US,en;q=0.9'
            }
        });

        for (let i = 0; i < targetUrls.length; i += batchSize) {
            const batchUrls = targetUrls.slice(i, i + batchSize);
            console.log(`--- Processing Batch ${Math.floor(i / batchSize) + 1} (${batchUrls.length} URLs) ---`);
            const scrapingPromises = batchUrls.map(url => scrapePage(url, context));
            const results = await Promise.allSettled(scrapingPromises);
            results.forEach((result) => {
                if (result.status === 'fulfilled' && result.value.length > 0) {
                    allDataToInsert.push(...result.value); 
                }
            });
            const randomDelay = Math.floor(Math.random() * 3000) + 2000;
            console.log(`--- Delaying for ${randomDelay / 1000} seconds before next batch... ---`);
            await new Promise(resolve => setTimeout(resolve, randomDelay));
        }

        console.log(`Discovered ${allDataToInsert.length} total valid results from all batches.`);

        if (allDataToInsert.length > 0) {
            console.log(`Attempting to insert ${allDataToInsert.length} lottery results...`);
            const chunkSize = 100;
            for (let i = 0; i < allDataToInsert.length; i += chunkSize) {
                const chunk = allDataToInsert.slice(i, i + chunkSize);
                const { error } = await supabase.from('lottery_api_results').insert(chunk);
                if (error) {
                    if (error.code === '23505') {
                        console.log(`Chunk ${i/chunkSize + 1}: Some results were duplicates and were skipped.`);
                    } else {
                        throw new Error(`Supabase insert error in chunk ${i/chunkSize + 1}: ${error.message}`);
                    }
                } else {
                    console.log(`Chunk ${i/chunkSize + 1} with ${chunk.length} items inserted successfully.`);
                }
            }
        } else {
            console.log('No new data to insert from any page.');
        }

        return NextResponse.json({ 
            message: `Scraping process completed for ${targetUrls.length} URLs.`, 
            insertedCount: allDataToInsert.length 
        });
    } catch (error) {
        console.error('Critical error in main GET handler:', error);
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    } finally {
        if (browser) await browser.close();
        console.log('Browser closed. Process finished.');
    }
}