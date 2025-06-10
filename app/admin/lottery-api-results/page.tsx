// app/admin/lottery-api-results/page.tsx

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { LotteryDisplay } from './lottery-display';

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

  // --- [LOGIC ที่แก้ไขสมบูรณ์และยืดหยุ่นที่สุด] ---

  // จัดการกรณีไม่มีข้อมูลในฐานข้อมูลเลย
  if (!recentResults || recentResults.length === 0) {
    return (
      <div className="bg-gray-100 dark:bg-gray-900 min-h-screen">
        <main className="container mx-auto px-2 sm:px-4 py-8">
            <header className="mb-8 text-center">
              <h1 className="text-3xl md:text-4xl font-bold text-gray-800 dark:text-gray-100">ผลการออกรางวัลล่าสุด</h1>
            </header>
            <div className="text-center bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md">
                <p className="text-xl text-gray-500 dark:text-gray-400">ยังไม่มีข้อมูลผลหวย</p>
            </div>
        </main>
      </div>
    );
  }

  // 1. กำหนด "วันเป้าหมาย" จากผลหวยที่ใหม่ที่สุดในระบบ
  const targetDateStr = recentResults[0].draw_date;

  const latestResultsMap = new Map<string, LotteryResult>();
  const now = new Date();
  const currentTime = now.toTimeString().slice(0, 5);

  for (const result of recentResults) {
    if (!latestResultsMap.has(result.lottery_name)) {
      let finalResult = { ...result };
    
      // --- [LOGIC ที่แก้ไขแล้ว] ---
      let needsPlaceholder = false;
    
      // เงื่อนไข 1: วันที่ไม่ตรงกัน หรือ ไม่มีผลรางวัล
      if (result.draw_date !== targetDateStr || !result.results || result.results.length === 0) {
        needsPlaceholder = true;
      } 
      // เงื่อนไข 2: ถ้ามีเวลาออกรางวัล ให้เปรียบเทียบแบบวัน-เวลาที่ถูกต้อง
      else if (result.draw_time) {
        // สร้าง Date object ที่สมบูรณ์ของเวลาออกรางวัล
        const drawDateTime = new Date(`${result.draw_date}T${result.draw_time}:00`);
        // เปรียบเทียบกับเวลาปัจจุบันจริงๆ
        if (now < drawDateTime) {
          needsPlaceholder = true;
        }
      }
      // --- [จบส่วนที่แก้ไข] ---
    
      if (needsPlaceholder) {
        finalResult.results = ["xxx", "xx", "xx"];
        // 3. บังคับให้วันที่เป็น "วันเป้าหมาย" เพื่อความสม่ำเสมอ
        finalResult.draw_date = targetDateStr;
      }
      
      latestResultsMap.set(result.lottery_name, finalResult);
    }
  }

  const groupedByCategory = Array.from(latestResultsMap.values()).reduce(
    (acc, result) => {
      const category = result.country;
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(result);
      // เรียงตามชื่อหวยในแต่ละหมวดหมู่
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

        <div className="space-y-8">
          {sortedCategories.map(([countryCode, results]) => (
            <LotteryDisplay
              key={countryCode}
              categoryName={getCategoryName(countryCode)}
              results={results}
            />
          ))}
        </div>
      </main>
    </div>
  );
}