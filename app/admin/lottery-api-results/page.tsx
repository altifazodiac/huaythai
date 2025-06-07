// app/admin/lottery-api-results/page.tsx

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { LotteryDisplay } from './lottery-display'; // <-- import Client Component ใหม่

export type LotteryResult = {
  id: number;
  created_at: string;
  draw_date: string;
  draw_time?: string | null;
  country: string;
  lottery_name: string;
  results: string[];
  source_url: string | null;
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

export const revalidate = 0;

export default async function LotteryResultsPage() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { get: (name: string) => cookieStore.get(name)?.value } }
  );

  const { data: recentResults, error } = await supabase
    .from('lottery_api_results')
    .select<"*", LotteryResult>('*')
    .order('draw_date', { ascending: false })
    .order('draw_time', { ascending: false, nullsFirst: false })
    .limit(300);

  if (error) {
    console.error('Error fetching initial lottery results:', error);
    return <p>เกิดข้อผิดพลาดในการดึงข้อมูล</p>;
  }

  // วันและเวลาปัจจุบัน (เวลาท้องถิ่นเซิร์ฟเวอร์)
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10); // yyyy-mm-dd
  const currentTime = now.toTimeString().slice(0, 5); // HH:mm

  // สร้าง Map เฉพาะผลของวันนี้เท่านั้น (ไม่แสดงผลวันก่อนหน้าในวันหยุด)
  const latestResultsMap = new Map<string, LotteryResult>();
  for (const result of recentResults || []) {
    if (!latestResultsMap.has(result.lottery_name)) {
      let displayResults: string[];
      if (result.draw_date !== todayStr) {
        // ไม่ใช่ของวันนี้ (เช่น วันหยุด)
        displayResults = ["xxx", "xx", "xx"];
      } else if (result.draw_time && result.draw_time > currentTime) {
        // ยังไม่ถึงเวลาหวยออก
        displayResults = ["xxx", "xx", "xx"];
      } else if (!result.results || result.results.length === 0) {
        // ยังไม่มีผลหวย
        displayResults = ["xxx", "xx", "xx"];
      } else {
        // แสดงผลจริง
        displayResults = result.results;
      }
      latestResultsMap.set(result.lottery_name, { ...result, results: displayResults });
    }
  }

  const groupedByCategory = Array.from(latestResultsMap.values()).reduce(
    (acc, result) => {
      const category = result.country;
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(result);
      acc[category].sort((a, b) => a.lottery_name.localeCompare(b.lottery_name));
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
        </header>

        {sortedCategories.length === 0 ? (
          <div className="text-center bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md">
            <p className="text-xl text-gray-500 dark:text-gray-400">ยังไม่มีข้อมูลผลหวย</p>
          </div>
        ) : (
          <div className="space-y-8">
            {sortedCategories.map(([countryCode, results]) => (
              <LotteryDisplay
                key={countryCode}
                categoryName={getCategoryName(countryCode)}
                results={results}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}