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