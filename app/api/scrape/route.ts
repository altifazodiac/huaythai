// app/api/scrape/route.ts
import { NextResponse } from 'next/server';
import { chromium } from 'playwright-core';
import { load } from 'cheerio';
import { createClient } from '@supabase/supabase-js';
import sparticuzChromium from '@sparticuz/chromium';
import { LOTTERY_METADATA } from '@/lib/utils/lotteryMetadata';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const revalidate = 0;

// --- ฟังก์ชันแปลงวันที่ (ยังคงเดิม) ---
function convertThaiDate(dateStr: string): string {
    const [day, month, yearBE] = dateStr.split('/');
    if (!day || !month || !yearBE) return new Date().toISOString().split('T')[0]; // fallback
    const yearAD = parseInt(yearBE) + 2000 - 543; // 68 -> 2568 -> 2025
    return `${yearAD}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

 
  export async function GET(request: Request) {
    // Security Check
    // if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    //   return new Response('Unauthorized', { status: 401 });
    // }
  
  let browser = null;
  try {
    console.log('Launching browser...');
    browser = await chromium.launch({
      args: sparticuzChromium.args,
      executablePath: process.env.CHROME_EXECUTABLE_PATH || await sparticuzChromium.executablePath(),
      headless: true,
    });
    const context = await browser.newContext();
    const page = await context.newPage();

    const targetUrl = 'https://www.gemlotto.com/#/';
    console.log(`Navigating to ${targetUrl}`);
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded' });

    // รอให้ JavaScript ของเว็บทำงานและสร้างเนื้อหาขึ้นมา
    await page.waitForSelector('div.th-result-login-game-color.ng-star-inserted', { timeout: 15000 });

    const html = await page.content();
    const $ = load(html);

    const dataToInsert = [];

    // --- ส่วนหลัก: Dynamic Discovery ---

    // 1. ดึงวันที่หลักมาก่อน (ใช้ร่วมกัน)
    const dateText = $('.text-period-login').first().text().trim().split(' - ')[1];
    const drawDate = dateText ? convertThaiDate(dateText) : new Date().toISOString().split('T')[0];

    // 2. วนลูปหา "หวยต่างประเทศ" และ "หวยหุ้น" ทั้งหมด
    $('div.th-result-login-game-color.ng-star-inserted').each((i, el) => {
      const name = $(el).find('.col-6.p-0.offset-0').text().trim();
      const metadata = LOTTERY_METADATA;
      const meta = metadata[name];

      if (meta) {
        const prize3 = $(el).find('.bot-col3-result-number').eq(0).text().trim();
        const prize2 = $(el).find('.bot-col3-result-number').eq(1).text().trim();

        if (prize3 && prize2 && prize3.toLowerCase() !== 'xxx') {
           dataToInsert.push({
            draw_date: drawDate,
            country: meta.country,
            lottery_name: name,
            results: [`3 ตัวบน: ${prize3}`, `2 ตัวล่าง: ${prize2}`],
            source_url: targetUrl,
          });
        }
      } else {
        // console.log(`Skipping unknown lottery: ${name}`); // เปิดเพื่อ debug
      }
    });
    
    // 3. จัดการ "หวยรัฐบาลไทย" แยกต่างหาก (เพราะโครงสร้างไม่เหมือนเพื่อน)
    const thaiLottoName = 'หวยรัฐบาลไทย';
    const thaiLottoMetadata = LOTTERY_METADATA;
    if (thaiLottoMetadata[thaiLottoName]) {
        const prize1 = $('.col-8 .th-result-login-bg').text().trim();
        if(prize1) {
            const prize2lower = $('.col-4 .th-result-login-bg').text().trim();
            const prize3front = $('.col-6 .th-result-login-bg3').eq(0).text().trim();
            const prize3lower = $('.col-6 .th-result-login-bg3').eq(1).text().trim();
            dataToInsert.push({
                draw_date: drawDate,
                country: thaiLottoMetadata[thaiLottoName].country,
                lottery_name: thaiLottoName,
                results: [
                    `รางวัลที่ 1: ${prize1}`,
                    `2 ตัวล่าง: ${prize2lower}`,
                    `3 ตัวหน้า: ${prize3front}`,
                    `3 ตัวล่าง: ${prize3lower}`,
                ],
                source_url: targetUrl,
            });
        }
    }


    // --- ส่วนการบันทึกข้อมูล (เหมือนเดิม) ---
    if (dataToInsert.length > 0) {
      console.log(`Discovered and inserting ${dataToInsert.length} lottery results...`);
      const { error } = await supabase.from('lottery_api_results').insert(dataToInsert);
      if (error && error.code !== '23505') {
          throw new Error(`Supabase insert error: ${error.message}`);
      } else if (error) {
          console.log('Some results were duplicates and were skipped.');
      } else {
          console.log(`Successfully processed ${dataToInsert.length} items.`);
      }
    } else {
      console.log('No new data to insert.');
    }

    return NextResponse.json({ message: 'Dynamic scraping process completed successfully.', insertedCount: dataToInsert.length });

  } catch (error) {
    console.error('Critical error in scraping process:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  } finally {
    if (browser) await browser.close();
    console.log('Browser closed.');
  }
}