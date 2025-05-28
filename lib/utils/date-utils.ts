import { toZonedTime } from "date-fns-tz";
import { format, set, addMonths, isAfter, isBefore } from "date-fns";
import { supabase } from "@/lib/supabase/supabaseClient";

const THAILAND_TZ = "Asia/Bangkok";

export const getThailandTime = () => {
  const now = new Date();
  return toZonedTime(now, THAILAND_TZ);
};

export const getNextDrawDate = async (supabase: any, thailandTime: Date): Promise<string> => {
  const day = thailandTime.getDate();
  const hours = thailandTime.getHours();
  const minutes = thailandTime.getMinutes();

  let drawDate: Date;

  // Set cutoff times
  const day1Cutoff = set(thailandTime, { date: 1, hours: 15, minutes: 0, seconds: 0, milliseconds: 0 });
  const day16Cutoff = set(thailandTime, { date: 16, hours: 15, minutes: 0, seconds: 0, milliseconds: 0 });
  const day1Evening = set(thailandTime, { date: 1, hours: 17, minutes: 0, seconds: 0, milliseconds: 0 });
  const day16Evening = set(thailandTime, { date: 16, hours: 17, minutes: 0, seconds: 0, milliseconds: 0 });

  // Calculate the target draw date based on purchase time
  if (
    (isAfter(thailandTime, day1Evening) && isBefore(thailandTime, day16Cutoff)) ||
    (day === 1 && hours >= 17) ||
    (day === 16 && hours < 15)
  ) {
    drawDate = set(thailandTime, { date: 16 });
  } else if (
    (isAfter(thailandTime, day16Evening) && isBefore(thailandTime, addMonths(day1Cutoff, 1))) ||
    (day === 16 && hours >= 17) ||
    (day > 16) ||
    (day === 1 && hours < 15)
  ) {
    drawDate = set(addMonths(thailandTime, 1), { date: 1 });
  } else {
    drawDate = set(thailandTime, { date: 16 });
    if (isAfter(thailandTime, day16Cutoff)) {
      drawDate = set(addMonths(thailandTime, 1), { date: 1 });
    }
  }

  const formattedDrawDate = format(drawDate, "yyyy-MM-dd");

  // Query the lottery_draw_dates table for the next draw date
  const { data: drawDates, error: drawError } = await supabase
    .from("lottery_draw_dates")
    .select("draw_date")
    .gte("draw_date", format(thailandTime, "yyyy-MM-dd"))
    .order("draw_date", { ascending: true })
    .limit(1)
    .single();

  if (drawError && drawError.code !== "PGRST116") {
    throw new Error(`Error fetching draw date: ${drawError.message}`);
  }

  if (drawDates) {
    return drawDates.draw_date;
  }

  // If no draw date is found, insert the calculated draw date
  const { error: insertError } = await supabase
    .from("lottery_draw_dates")
    .insert({ draw_date: formattedDrawDate });

  if (insertError) {
    throw new Error(`Error inserting draw date: ${insertError.message}`);
  }

  return formattedDrawDate;
};

/**
 * แปลงข้อความวัน (ภาษาไทย) เป็น array ของเลขวัน (0=อาทิตย์, 1=จันทร์, ... 6=เสาร์)
 * @param dayOfWeekStr เช่น 'จันทร์-ศุกร์', 'เสาร์-อาทิตย์', 'จันทร์, พุธ, ศุกร์', 'จันทร์–อาทิตย์'
 */
export function parseThaiDayOfWeek(dayOfWeekStr: string): number[] {
  const dayMap: Record<string, number> = {
    'อาทิตย์': 0,
    'จันทร์': 1,
    'อังคาร': 2,
    'พุธ': 3,
    'พฤหัสบดี': 4,
    'ศุกร์': 5,
    'เสาร์': 6,
  };
  // Normalize dash
  const normalized = dayOfWeekStr.replace(/–|—/g, '-').replace(/\s+/g, '');
  if (normalized === 'จันทร์-อาทิตย์') return [0,1,2,3,4,5,6];
  if (normalized === 'เสาร์-อาทิตย์') return [6,0];
  if (normalized === 'จันทร์-ศุกร์') return [1,2,3,4,5];
  if (normalized === 'อาทิตย์-พฤหัสบดี') return [0,1,2,3,4];
  // กรณีคั่นด้วย ,
  if (normalized.includes(',')) {
    return normalized.split(',').map(d => dayMap[d]).filter(x => x !== undefined);
  }
  // กรณีคั่นด้วย -
  if (normalized.includes('-')) {
    const [start, end] = normalized.split('-');
    const startIdx = dayMap[start];
    const endIdx = dayMap[end];
    if (startIdx !== undefined && endIdx !== undefined) {
      if (startIdx <= endIdx) {
        return Array.from({length: endIdx - startIdx + 1}, (_,i) => startIdx + i);
      } else {
        // เช่น ศุกร์-จันทร์ (5-1) => [5,6,0,1]
        return Array.from({length: 7 - startIdx + endIdx + 1}, (_,i) => (startIdx + i)%7);
      }
    }
  }
  // กรณีวันเดียว
  if (dayMap[normalized] !== undefined) return [dayMap[normalized]];
  // fallback
  return [];
} 