// app/api/scrape/route.ts

import { NextResponse } from 'next/server';
import { chromium, BrowserContext, Page } from 'playwright-core';
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
 country: 'LA' | 'VN' | 'MY' | 'STOCK' | 'OTHER' | 'TH';
 lottery_name: string;
 results: string[];
 source_url: string;
};

export const revalidate = 0;

async function autoScroll(page: Page): Promise<void> {
  await page.evaluate(async () => {
    await new Promise<void>((resolve) => {
      let lastHeight = 0;
      let retries = 0;
      const maxRetries = 5;
      const timer = setInterval(() => {
        const currentHeight = document.body.scrollHeight;
        window.scrollTo(0, currentHeight);
        if (currentHeight === lastHeight) {
          retries++;
          if (retries >= maxRetries) {
            clearInterval(timer);
            resolve();
          }
        } else {
          lastHeight = currentHeight;
          retries = 0;
        }
      }, 500);
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

/**
 * NEW: Parses the special card-based layout for Government, Aom-Sin, etc.
 */
function parseGovLotteryCards($: cheerio.CheerioAPI, url: string): LotteryResult[] {
    const cardResults: LotteryResult[] = [];
    
    $('div.card.my-3.w-100').each((_, cardEl) => {
        const card = $(cardEl);
        const header = card.find('.card-header').clone().children().remove().end().text().trim();
        
        let lotteryName = '';
        if (header.includes('หวยรัฐบาลไทย')) lotteryName = 'หวยรัฐบาล';
        else if (header.includes('หวย ธกส.')) lotteryName = 'หวย ธกส.';
        else if (header.includes('หวยออมสิน')) lotteryName = 'หวยออมสิน';
        else return; // Not a lottery card we are interested in

        const date = card.find('.dateGovTitle').text().trim();
        if (!date) return;
        
        const prizeContainer = card.find('.dataGovContainer');
        const prize1 = prizeContainer.find('.colGov2 .txt-num').text().trim();

        if (!prize1 || prize1.includes('XXX')) return; // Skip if main prize is not out

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

        cardResults.push({
            draw_date: date,
            country: meta.country,
            lottery_name: lotteryName,
            results: availablePrizes,
            source_url: url,
        });
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
        
        // --- PARSE FORMAT 1: THE TABLES ---
        const tableResults: LotteryResult[] = [];
        const resultTables = $('table[id^="example"]'); // Select all tables with id starting with "example"
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

        // --- PARSE FORMAT 2: THE CARDS ---
        const cardResults = parseGovLotteryCards($, url);

        // --- COMBINE ALL RESULTS ---
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


export async function GET(request: Request) {
  const targetUrl = 'https://xn--t3cjebmjd5a.com/';
  let browser: any = null;
  console.log(`[API Route] Starting scrape process for ${targetUrl}`);
  try {
    browser = await chromium.launch({
      args: [...sparticuzChromium.args, '--disable-gpu', '--no-sandbox'],
      executablePath: process.env.CHROME_EXECUTABLE_PATH || await sparticuzChromium.executablePath(),
    });
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
    });
    
    const scrapedData = await scrapeAndParseResults(targetUrl, context);
    
    if (scrapedData.length > 0) {
      console.log(`[DB] Found ${scrapedData.length} items to insert. Clearing table...`);
      const { error: deleteError } = await supabase.from('lottery_api_results').delete().neq('id', 0);
      if (deleteError) throw new Error(`Supabase delete error: ${deleteError.message}`);
      
      console.log(`[DB] Inserting ${scrapedData.length} new results...`);
      const { error: insertError } = await supabase.from('lottery_api_results').insert(scrapedData);
      if (insertError) throw new Error(`Supabase insert error: ${insertError.message}`);
      console.log(`[DB] Insert successful.`);
    } else {
      console.log('[Scraper] No new data was scraped to insert.');
    }

    return NextResponse.json({
      message: `Scraping process completed.`,
      insertedCount: scrapedData.length
    });
  } catch (error) {
    console.error('[API Route] Critical error in GET handler:', error);
    return NextResponse.json({ error: (error as Error).message, details: 'Check server logs for more info.' }, { status: 500 });
  } finally {
    if (browser) {
      await browser.close();
      console.log('[API Route] Browser closed. Process finished.');
    }
  }
}