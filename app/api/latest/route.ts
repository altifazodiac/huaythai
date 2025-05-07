import { NextResponse } from 'next/server';
import { load } from 'cheerio';
import type { CheerioAPI } from 'cheerio';
import { LottoDetailResponse, ApiErrorResponse } from '@/types/lottery';
import { parse, format } from 'date-fns';
import { th } from 'date-fns/locale';

const scrapeText = (cheerio: CheerioAPI) => (selector: string) =>
  cheerio(selector)
    .map((_, el) => cheerio(el).text())
    .toArray();

const generateSwappedThreeDigits = (number: string): string[] => {
  const results: string[] = [];
  const digits = number.split('');
  
  // Original number
  results.push(number);
  
  // All possible permutations for 3 digits (excluding original)
  const permutations = [
    [digits[1], digits[0], digits[2]].join(''),
    [digits[2], digits[0], digits[1]].join(''),
    [digits[0], digits[2], digits[1]].join(''),
    [digits[1], digits[2], digits[0]].join(''),
    [digits[2], digits[1], digits[0]].join('')
  ];
  
  // Add unique permutations, excluding original if already added
  permutations.forEach(perm => {
    if (!results.includes(perm)) {
      results.push(perm);
    }
  });
  
  return results;
};

const getLatestLotteryId = async () => {
  const $ = load(
    await fetch(`https://news.sanook.com/lotto/archive/page/1`).then((o) => o.text())
  );

  const latest = $(
    'div.box-cell.box-cell--lotto.content > div > div > div > article.archive--lotto'
  )
    .first()
    .find('div > div > a')
    .attr('href')
    ?.split('/')[5] || '';

  return latest;
};

export async function GET() {
  try {
    const id = await getLatestLotteryId();
    if (!id) {
      return NextResponse.json<ApiErrorResponse>(
        {
          status: 'crash',
          response: 'could not find latest lottery',
        },
        { status: 404 }
      );
    }

    const url = `https://news.sanook.com/lotto/check/${id}`;
    const $ = load(await fetch(url).then((o) => o.text()));
    const scraper = scrapeText($);

    // Extract and parse date
    const rawDate = $('#contentPrint > header > h2')
      .text()
      .substring($('#contentPrint > header > h2').text().indexOf(' ') + 1)
      .trim();
    
    let date: string;
    try {
      // Parse Thai date (e.g., "16 พฤษภาคม 2568") to ISO format (e.g., "2025-05-16")
      const parsedDate = parse(rawDate, 'd MMMM yyyy', new Date(), { locale: th });
      if (isNaN(parsedDate.getTime())) {
        throw new Error('Invalid date parsed');
      }
      date = format(parsedDate, 'yyyy-MM-dd');
    } catch (error) {
      console.error('Date parsing error:', error, 'Raw date:', rawDate);
      return NextResponse.json<ApiErrorResponse>(
        {
          status: 'crash',
          response: 'invalid date format',
        },
        { status: 400 }
      );
    }

    const [
      prizeFirst,
      prizeFirstNear,
      prizeSecond,
      prizeThird,
      prizeForth,
      prizeFifth,
      runningNumberFrontThree,
      runningNumberBackThree,
      runningNumberBackTwo,
    ] = await Promise.all([
      scraper(
        '#contentPrint > div.lottocheck__resize > div.lottocheck__sec.lottocheck__sec--bdnone > div.lottocheck__table > div:nth-child(1) > strong.lotto__number'
      ),
      scraper(
        '#contentPrint > div.lottocheck__resize > div.lottocheck__sec.lottocheck__sec--bdnone > div.lottocheck__sec--nearby > strong.lotto__number'
      ),
      scraper(
        '#contentPrint > div.lottocheck__resize > div:nth-child(2) > div > span.lotto__number'
      ),
      scraper(
        '#contentPrint > div.lottocheck__resize > div:nth-child(3) > div > span'
      ),
      scraper(
        '#contentPrint > div.lottocheck__resize > div.lottocheck__sec.lottocheck__sec--font-mini.lottocheck__sec--bdnoneads > div.lottocheck__box-item > span.lotto__number'
      ),
      scraper(
        '#contentPrint > div.lottocheck__resize > div:nth-child(7) > div > span.lotto__number'
      ),
      scraper(
        '#contentPrint > div.lottocheck__resize > div.lottocheck__sec.lottocheck__sec--bdnone > div.lottocheck__table > div:nth-child(2) > strong.lotto__number'
      ),
      scraper(
        '#contentPrint > div.lottocheck__resize > div.lottocheck__sec.lottocheck__sec--bdnone > div.lottocheck__table > div:nth-child(3) > strong.lotto__number'
      ),
      scraper(
        '#contentPrint > div.lottocheck__resize > div.lottocheck__sec.lottocheck__sec--bdnone > div.lottocheck__table > div:nth-child(4) > strong.lotto__number'
      ),
    ]);

    // Extract last three, two, and one digits from prizeFirst
    const lastThreeDigits = prizeFirst.map(num => num.slice(-3));
    const lastTwoDigits = prizeFirst.map(num => num.slice(-2));
    const lastOneDigitPrizeFirst = prizeFirst.map(num => num.slice(-1));
    
    // Extract last one digit from runningNumberBackTwo
    const lastOneDigitBackTwo = runningNumberBackTwo.map(num => num.slice(-1));
    
    // Generate swapped three-digit numbers
    const swappedThreeDigits = lastThreeDigits.flatMap(num => generateSwappedThreeDigits(num));

    const response: LottoDetailResponse = {
      status: 'success',
      response: {
        date,
        endpoint: url,
        prizes: [
          {
            id: 'prizeFirst',
            name: 'รางวัลที่ 1',
            reward: '6000000',
            amount: prizeFirst.length,
            number: prizeFirst,
          },
          {
            id: 'prizeFirstNear',
            name: 'รางวัลข้างเคียงรางวัลที่ 1',
            reward: '100000',
            amount: prizeFirstNear.length,
            number: prizeFirstNear,
          },
          {
            id: 'prizeSecond',
            name: 'รางวัลที่ 2',
            reward: '200000',
            amount: prizeSecond.length,
            number: prizeSecond,
          },
          {
            id: 'prizeThird',
            name: 'รางวัลที่ 3',
            reward: '80000',
            amount: prizeThird.length,
            number: prizeThird,
          },
          {
            id: 'prizeForth',
            name: 'รางวัลที่ 4',
            reward: '40000',
            amount: prizeForth.length,
            number: prizeForth,
          },
          {
            id: 'prizeFifth',
            name: 'รางวัลที่ 5',
            reward: '20000',
            amount: prizeFifth.length,
            number: prizeFifth,
          },
        ],
        runningNumbers: [
          {
            id: 'runningNumberFrontThree',
            name: 'รางวัลเลขหน้า 3 ตัว',
            reward: '4000',
            amount: runningNumberFrontThree.length,
            number: runningNumberFrontThree,
          },
          {
            id: 'runningNumberBackThree',
            name: 'รางวัลเลขท้าย 3 ตัว',
            reward: '4000',
            amount: runningNumberBackThree.length,
            number: runningNumberBackThree,
          },
          {
            id: 'runningNumberBackTwo',
            name: 'รางวัลเลขท้าย 2 ตัว',
            reward: '2000',
            amount: runningNumberBackTwo.length,
            number: runningNumberBackTwo,
          },
        ],
        specialNumbers: {
          lastThreeDigits: {
            id: 'lastThreeDigits',
            name: 'เลขท้าย 3 ตัวของรางวัลที่ 1',
            numbers: lastThreeDigits,
          },
          swappedThreeDigits: {
            id: 'swappedThreeDigits',
            name: 'เลขท้าย 3 ตัวสลับตำแหน่งของรางวัลที่ 1',
            numbers: swappedThreeDigits,
          },
          lastTwoDigits: {
            id: 'lastTwoDigits',
            name: 'เลขท้าย 2 ตัวของรางวัลที่ 1',
            numbers: lastTwoDigits,
          },
          lastOneDigitPrizeFirst: {
            id: 'lastOneDigitPrizeFirst',
            name: 'เลขท้าย 1 ตัวของรางวัลที่ 1',
            numbers: lastOneDigitPrizeFirst,
          },
          lastOneDigitBackTwo: {
            id: 'lastOneDigitBackTwo',
            name: 'เลขท้าย 1 ตัวของเลขท้าย 2 ตัว',
            numbers: lastOneDigitBackTwo,
          },
        },
      },
    };

    return NextResponse.json(response);
  } catch (e) {
    return NextResponse.json<ApiErrorResponse>(
      {
        status: 'crash',
        response: 'api cannot fulfill your request at this time',
      },
      { status: 500 }
    );
  }
}