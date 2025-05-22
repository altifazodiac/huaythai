import { LotteryResult } from '@/types/lottery';
import * as cheerio from 'cheerio';

export async function fetchLotteryResult(date: string): Promise<LotteryResult> {
  const url = `https://news.sanook.com/lotto/check/${date}/`;
  const response = await fetch(url);
  const html = await response.text();

  const $ = cheerio.load(html);
  
  // Extract the results
  const result: LotteryResult = {
    date,
    firstPrize: $('.lotto__number--first').text().trim(),
    secondPrize: $('.lotto__number--second').map((_, el) => $(el).text().trim()).get(),
    thirdPrize: $('.lotto__number--third').map((_, el) => $(el).text().trim()).get(),
    fourthPrize: $('.lotto__number--fourth').map((_, el) => $(el).text().trim()).get(),
    fifthPrize: $('.lotto__number--fifth').map((_, el) => $(el).text().trim()).get(),
    lastTwoDigits: $('.lotto__number--last2').map((_, el) => $(el).text().trim()).get(),
    lastThreeDigits: $('.lotto__number--last3').map((_, el) => $(el).text().trim()).get(),
    lastThreeDigitsFront: $('.lotto__number--last3-front').map((_, el) => $(el).text().trim()).get(),
    lastThreeDigitsBack: $('.lotto__number--last3-back').map((_, el) => $(el).text().trim()).get(),
  };

  return result;
} 