// /utils/scraperConfigs.ts
import { CheerioAPI } from 'cheerio';

// โครงสร้างข้อมูลดิบที่ parser ควรจะคืนค่ากลับมา
export interface ParsedResult {
  drawDate: string; // รูปแบบ YYYY-MM-DD
  numbers: string[];
}

export interface SiteConfig {
  lotteryName: string;
  country: 'TH' | 'US'; // กำหนดประเทศที่รองรับ
  url: string;
  // Parser function รับ Cheerio instance ($) และคืนค่าข้อมูลที่จัดรูปแบบแล้ว
  parser: ($: CheerioAPI) => ParsedResult | null;
}

export const siteConfigs: SiteConfig[] = [
  {
    lotteryName: 'สลากกินแบ่งรัฐบาล',
    country: 'TH',
    url: 'https://www.myhora.com/lottery/latest.aspx', // ตัวอย่าง URL
    parser: ($) => {
      try {
        const dateStr = $('div.lot-title b').first().text(); // "ตรวจสลากกินแบ่งรัฐบาล งวดวันที่ 1 มิถุนายน 2568"
        // แปลงข้อความเป็นวันที่ YYYY-MM-DD (ส่วนนี้อาจต้องใช้ library อย่าง date-fns หรือเขียนฟังก์ชันช่วย)
        // ตัวอย่างแบบง่าย:
        const [day, monthStr, yearBE] = dateStr.split(' ').slice(-3);
        const yearAD = parseInt(yearBE) - 543;
        const monthMap: { [key: string]: string } = { 'มกราคม': '01', 'มิถุนายน': '06', /*... all months*/ };
        const drawDate = `<span class="math-inline">\{yearAD\}\-</span>{monthMap[monthStr]}-${day.padStart(2, '0')}`;

        const prize1 = $('div.lot-prize-1 > div.lot-number').text().trim();
        const prize3digits = $('div.lot-prize-3f > div.lot-number').map((i, el) => $(el).text().trim()).get();
        const prize2digits = $('div.lot-prize-2t > div.lot-number').text().trim();

        return {
          drawDate,
          numbers: [
            `รางวัลที่ 1: ${prize1}`,
            `เลขหน้า 3 ตัว: ${prize3digits.join(', ')}`,
            `เลขท้าย 2 ตัว: ${prize2digits}`
          ],
        };
      } catch (error) {
        console.error('Error parsing Thai lottery:', error);
        return null;
      }
    },
  },
  // สามารถเพิ่ม Config สำหรับเว็บอื่นๆ ที่นี่
  // {
  //   lotteryName: 'Powerball',
  //   country: 'US',
  //   url: 'https://www.powerball.com/',
  //   parser: ($) => { ... }
  // }
];