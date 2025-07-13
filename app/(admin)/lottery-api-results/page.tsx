// app/admin/lottery-api-results/page.tsx

import { cookies } from 'next/headers';
import { format } from 'date-fns';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';

export type LotteryResult = {
  id: number | string;
  created_at: string | null;
  draw_date: string;
  draw_time?: string | null;
  country: string;
  lottery_name: string;
  results: string[];
  source_url: string | null;
  isPlaceholder?: boolean;
  day_of_week?: string | null;
};

// ฟังก์ชันสำหรับจัดหมวดหมู่หวย
const getCategoryName = (countryCode: string) => {
  switch (countryCode) {
    case 'TH': return 'หวยไทย';
    case 'LA': return 'หวยลาว/แม่โขง';
    case 'VN': return 'หวยเวียดนาม';
    case 'STOCK': return 'หวยหุ้น';
    case 'MY': return 'หวยมาเลย์';
    default: return 'อื่นๆ';
  }
};

// ฟังก์ชันแปลงชื่อวันอังกฤษเป็นไทย
const dayOfWeekTH: Record<string, string> = {
  'Monday': 'จันทร์',
  'Tuesday': 'อังคาร',
  'Wednesday': 'พุธ',
  'Thursday': 'พฤหัสบดี',
  'Friday': 'ศุกร์',
  'Saturday': 'เสาร์',
  'Sunday': 'อาทิตย์',
};

function getDayOfWeekTH(day: string | null | undefined): string {
  if (!day) return '';
  return dayOfWeekTH[day] || day;
}

export const revalidate = 0;

export default async function LotteryResultsPage() {
  const supabase = createServerComponentClient({ cookies });
 

  // 1. ดึง alias + sub_type
  const { data: aliases } = await supabase
    .from('lottery_name_aliases')
    .select('alias_name, lottery_sub_type_id, lottery_sub_types(country, country_origin)');
  // 2. ดึง schedule
  const { data: schedules } = await supabase
    .from('drawing_schedules')
    .select('lottery_sub_type_id, draw_time, day_of_week');
  // 3. ดึงผลรางวัลวันนี้
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const { data: apiResults } = await supabase
    .from('lottery_api_results')
    .select('id, created_at, draw_date, country, lottery_name, results, source_url, draw_time')
    .eq('draw_date', todayStr);

  // 4. รวมข้อมูล schedule เข้า alias
  const aliasesWithTime = (aliases || []).map(alias => {
    const schedule = (schedules || []).find(s => s.lottery_sub_type_id === alias.lottery_sub_type_id);
    return { ...alias, draw_time: schedule?.draw_time || null, day_of_week: schedule?.day_of_week || null };
  });

  // 5. Merge alias + api + placeholder
  const mergedResults: LotteryResult[] = aliasesWithTime.map((alias: any) => {
    const found = (apiResults || []).find(
      (r: any) => r.lottery_name === alias.alias_name && r.draw_date === todayStr
    );
    if (found) return found;
    return {
      id: `placeholder-${alias.alias_name}`,
      draw_date: todayStr,
      country: alias.lottery_sub_types?.country || 'OTHER',
      lottery_name: alias.alias_name,
      results: ['3 ตัวบน: xxx', '2 ตัวล่าง: xx'],
      draw_time: alias.draw_time || null,
      day_of_week: alias.day_of_week || null,
      source_url: null,
      created_at: null,
      isPlaceholder: true,
    };
  });

  // 6. Group by country
  const groupedByCategory = mergedResults.reduce(
    (acc, result) => {
      const category = result.country;
      if (!acc[category]) acc[category] = [];
      acc[category].push(result);
      acc[category].sort((a, b) => {
        if (!a.draw_time && !b.draw_time) return 0;
        if (!a.draw_time) return 1;
        if (!b.draw_time) return -1;
        return a.draw_time.localeCompare(b.draw_time);
      });
      return acc;
    },
    {} as Record<string, LotteryResult[]>
  );
  const categoryOrder = ['TH', 'LA', 'VN', 'STOCK', 'MY', 'OTHER'];
  const sortedCategories = Object.entries(groupedByCategory).sort(
    ([a], [b]) => categoryOrder.indexOf(a) - categoryOrder.indexOf(b)
  );

  return (
    <div className="bg-gray-100 dark:bg-gray-900 min-h-screen">
      <main className="container mx-auto px-2 sm:px-4 py-8">
        <header className="mb-8 text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-800 dark:text-gray-100">ผลการออกรางวัลล่าสุด</h1>
          <div className="mt-2 text-lg text-red-800 dark:text-red-200 font-semibold">
            {`ผลหวยประจำวันที่ ${format(new Date(todayStr), 'dd MMMM yyyy')}`}
          </div>
        </header>
        <div className="space-y-8">
          {sortedCategories.map(([countryCode, results]) => (
            <div key={countryCode} className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
              <h2 className="text-xl md:text-2xl font-bold mb-4 text-indigo-700 dark:text-indigo-300">
                {getCategoryName(countryCode)}
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-3">
                {results.map((result) => (
                  <div key={result.id} className="border bg-card text-card-foreground rounded-lg p-3 shadow-sm flex flex-col justify-between h-full">
                    <div>
                      <h4 className="text-xs font-bold tracking-tight text-indigo-600 dark:text-indigo-400">
                        {result.lottery_name}
                      </h4>
                      <p className="text-[10px] text-muted-foreground">
                        {format(new Date(result.draw_date), 'dd MMM yy')}
                        {result.draw_time && ` - ${result.draw_time.substring(0, 5)}`}
                        {result.day_of_week && ` (${getDayOfWeekTH(result.day_of_week)})`}
                      </p>
                    </div>
                    <ul className="mt-2 space-y-1">
                      {result.results.map((prize, index) => (
                        <li key={index} className="text-xs flex justify-between">
                          <span>{prize.split(':')[0]}</span>
                          <span className="font-semibold">{prize.split(':')[1]}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}