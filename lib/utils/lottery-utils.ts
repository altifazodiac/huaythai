import { SupabaseClient } from '@supabase/supabase-js';

// Interface for LotteryResult Map
interface LotteryResult {
  draw_date: string;
  lottery_sub_type_id: number;
  prize_code: string;
  winning_number: string;
}

// Function to create a map of lottery results for quick lookup
export const createResultsMap = async (supabase: any, startDate?: string, endDate?: string): Promise<Record<string, LotteryResult>> => {
  try {
  let query = supabase
    .from('lottery_results')
      .select('*');
  
    if (startDate) query = query.gte('draw_date', startDate);
    if (endDate) query = query.lte('draw_date', endDate);

    const { data: results, error } = await query;
    if (error) throw error;

    const resultsMap: Record<string, LotteryResult> = {};
    
    (results || []).forEach((result: any) => {
      const key = `${result.draw_date}|${result.lottery_sub_type_id}|${result.prize_code}`;
      resultsMap[key] = result;
    });

    return resultsMap;
  } catch (err) {
    console.error('Error creating results map:', err);
    return {};
  }
};

// Central function to calculate winnings for a single ticket item
export const calculateWinningsForItem = (
  item: any,
  ticketDrawDate: string,
  resultsMap: Record<string, LotteryResult>
): { prize: number; isWinning: boolean; winningNumberDisplay?: string; matchedNumber?: string } => {
  if (!item.lottery_sub_number || !item.numbers) {
    return { prize: 0, isWinning: false };
  }

  const { digit_number, type_number, price_paid } = item.lottery_sub_number;
  
  // 🔧 สร้าง prize_code patterns ทั้งแบบไทยและภาษาอังกฤษ
  const prizeCodePatterns = [];
  
  if (type_number === 'โต๊ด') {
    prizeCodePatterns.push(`${digit_number} ตัวโต๊ด`);
  } else if (type_number === 'บน') {
    prizeCodePatterns.push(`${digit_number} ตัวบน`);
    // สำหรับ 2 ตัวบน อาจมีในรูปแบบ 2nd
    if (digit_number === 2) {
      prizeCodePatterns.push('2nd');
    }
    // สำหรับ 3 ตัวบน อาจมีในรูปแบบ 1st
    if (digit_number === 3) {
      prizeCodePatterns.push('1st');
    }
  } else if (type_number === 'ล่าง') {
    prizeCodePatterns.push(`${digit_number} ตัวล่าง`);
    // สำหรับ 2 ตัวล่าง อาจมีในรูปแบบ 2nd
    if (digit_number === 2) {
      prizeCodePatterns.push('2nd');
    }
  } else if (type_number === 'วิ่งบน') {
    prizeCodePatterns.push('วิ่งบน');
    // อาจมีในรูปแบบ 3rd, 4th, 5th
    prizeCodePatterns.push('3rd', '4th', '5th');
  } else if (type_number === 'วิ่งล่าง') {
    prizeCodePatterns.push('วิ่งล่าง');
    // อาจมีในรูปแบบ 3rd, 4th, 5th
    prizeCodePatterns.push('3rd', '4th', '5th');
  }

  // 🔧 ลองหาผลรางวัลจาก patterns ทั้งหมด
  let matchingResult: LotteryResult | undefined;
  let usedPattern = '';

  for (const pattern of prizeCodePatterns) {
    const resultMapKey = `${ticketDrawDate}|${item.lottery_sub_type_id}|${pattern}`;
    const result = resultsMap[resultMapKey];
    
    if (result && result.winning_number) {
      matchingResult = result;
      usedPattern = pattern;
      break;
    }
  }

  if (!matchingResult || !matchingResult.winning_number) {
    return { prize: 0, isWinning: false };
  }

  let matchedNumbers: string[] = [];
  
  if (type_number === 'โต๊ด') {
    const winningSet = new Set(matchingResult.winning_number.split(",").map(s => s.trim()));
    matchedNumbers = item.numbers.filter((num: string) => winningSet.has(num));
  } else if (type_number === 'วิ่งบน' || type_number === 'วิ่งล่าง') {
    const winningDigits = new Set(matchingResult.winning_number.split('').filter(d => d !== ','));
    item.numbers.forEach((num: string) => {
      for (const digit of num) {
        if (winningDigits.has(digit)) {
          matchedNumbers.push(num);
          break;
        }
      }
    });
  } else {
    matchedNumbers = item.numbers.filter((num: string) => num === matchingResult.winning_number);
  }

  if (matchedNumbers.length > 0) {
    const effectiveRate = item.effective_prize_rate ?? price_paid ?? 0;
    const prize = parseFloat(item.amount.toString()) * parseFloat(String(effectiveRate)) * matchedNumbers.length;
    
    return { 
      prize, 
      isWinning: true, 
      winningNumberDisplay: matchingResult.winning_number, 
      matchedNumber: matchedNumbers.join(', ')
    };
  }

  return { prize: 0, isWinning: false };
}; 