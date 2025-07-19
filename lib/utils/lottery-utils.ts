import { SupabaseClient } from '@supabase/supabase-js';

// Interface for LotteryResult Map
interface LotteryResult {
  draw_date: string;
  lottery_sub_type_id: number;
  prize_code: string;
  winning_number: string;
}

// Function to create a map of lottery results for quick lookup
export const createResultsMap = async (supabase: SupabaseClient, startDate?: string): Promise<Record<string, LotteryResult>> => {
  let query = supabase
    .from('lottery_results')
    .select('draw_date, lottery_sub_type_id, prize_code, winning_number');
  
  if (startDate && startDate.trim() !== '') {
    query = query.gte('draw_date', startDate);
  }
  
  const { data, error } = await query;

  if (error) {
    console.error('Error fetching lottery results:', error);
    return {};
  }

  const resultsMap: Record<string, LotteryResult> = {};
  (data || []).forEach(res => {
    const key = `${res.draw_date}|${res.lottery_sub_type_id}|${res.prize_code}`;
    resultsMap[key] = res;
  });

  return resultsMap;
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
  let prizeCodePattern = '';

  if (type_number === 'โต๊ด') prizeCodePattern = `${digit_number} ตัวโต๊ด`;
  else if (type_number === 'บน') prizeCodePattern = `${digit_number} ตัวบน`;
  else if (type_number === 'ล่าง') prizeCodePattern = `${digit_number} ตัวล่าง`;
  else if (type_number === 'วิ่งบน') prizeCodePattern = 'วิ่งบน';
  else if (type_number === 'วิ่งล่าง') prizeCodePattern = 'วิ่งล่าง';

  const resultMapKey = `${ticketDrawDate}|${item.lottery_sub_type_id}|${prizeCodePattern}`;
  const matchingResult = resultsMap[resultMapKey];

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