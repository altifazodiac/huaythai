"use client";
import { useEffect, useState, Fragment } from "react";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { Badge } from "@/components/ui/badge";
import { Calendar, Search, ChevronRight, Loader2, BarChart3, History } from "lucide-react";
import { countryFlagImg } from "@/lib/utils/flags";
import { format, isSameDay } from "date-fns";
import { createClient } from '@supabase/supabase-js';
import { Separator } from "@/components/ui/separator";
import { AppSidebar } from "@/components/app-sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { DirectionProvider } from "@radix-ui/react-direction";
import { supabase } from "@/lib/supabase/supabaseClient";

// --- Unchanged Logic & Utility Functions ---

const LOTTERY_TYPE_COLORS: Record<string, string> = {
  "หวยลาว": "border-blue-500 bg-blue-50 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200",
  "หวยเวียดนาม": "border-red-500 bg-red-50 dark:bg-red-900/40 text-red-800 dark:text-red-200",
  "หวยหุ้น": "border-red-500 bg-red-50 dark:bg-red-900/40 text-red-800 dark:text-red-200",
  "หวยไทย": "border-yellow-500 bg-yellow-50 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-200",
};

function getTypeColor(type: string) {
  return LOTTERY_TYPE_COLORS[type] || "border-gray-300 bg-gray-100 dark:border-gray-700 dark:bg-gray-800/40 text-gray-800 dark:text-gray-200";
}

// ฟังก์ชันแปลง country code เป็นชื่อประเทศที่รองรับใน countryFlagImg
function getCountryName(country: string, lotteryName: string) {
  if (country === 'VN' || /ฮานอย|เวียดนาม/i.test(lotteryName)) return 'เวียดนาม';
  if (country === 'LA' || /ลาว/i.test(lotteryName)) return 'ลาว';
  if (country === 'TH' || /ไทย|ธกส|ออมสิน/i.test(lotteryName)) return 'ไทย';
  if (country === 'MY' || /มาเลย์/i.test(lotteryName)) return 'มาเลเซีย';
  if (country === 'STOCK' || /หุ้น|ดาวโจนส์|นิเคอิ|จีน|ฮั่งเส็ง|ไต้หวัน|เกาหลี|สิงคโปร์/i.test(lotteryName)) return 'หวยหุ้น';
  return 'อื่นๆ';
}

const COUNTRY_GROUPS: Record<string, string> = {
  'TH': 'หวยไทย',
  'LA': 'หวยลาว',
  'VN': 'หวยเวียดนาม',
  'MY': 'หวยมาเลเซีย',
  'STOCK': 'หวยหุ้น',
  'OTHER': 'อื่นๆ',
};

function getCountryGroup(country: string) {
  return COUNTRY_GROUPS[country] || 'อื่นๆ';
}

function renderFlag(country: string, lotteryName: string) {
  const countryName = getCountryName(country, lotteryName);
  if (countryName === "หวยหุ้น") {
    return <BarChart3 className="w-5 h-5 text-red-600 dark:text-red-400" />;
  }
  if (countryName === "อื่นๆ") {
    return <span className="text-2xl" role="img" aria-label="other">🌍</span>;
  }
  return (
    <img
      src={countryFlagImg(countryName)}
      alt={countryName}
      className="w-6 h-6 rounded-full object-cover border border-white/20 shadow-md"
    />
  );
}

// --- Main Page Component ---
export default function LotteryResultsPage() {
  const [results, setResults] = useState<any[]>([]);
  const [allAliases, setAllAliases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [selected, setSelected] = useState<any | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    setLoading(true);
    const fetchData = async () => {
      // 1. ดึง alias + sub_type
      const { data: aliases, error: aliasError } = await supabase
        .from("lottery_name_aliases")
        .select("alias_name, lottery_sub_type_id, lottery_sub_types(country, country_origin)");
      // 2. ดึง schedule
      const { data: schedules, error: scheduleError } = await supabase
        .from("drawing_schedules")
        .select("lottery_sub_type_id, drawing_time");
      // 3. ดึงผลรางวัลวันนี้
      const todayStr = format(new Date(), "yyyy-MM-dd");
      const { data: apiResults, error: apiError } = await supabase
        .from("lottery_api_results")
        .select("id, created_at, draw_date, country, lottery_name, results, source_url, draw_time")
        .eq("draw_date", todayStr);

      if (aliasError || apiError || scheduleError) {
        setLoading(false);
        return;
      }
      // 4. รวมข้อมูล schedule เข้า alias
      const aliasesWithTime = (aliases || []).map(alias => {
        const schedule = (schedules || []).find(s => s.lottery_sub_type_id === alias.lottery_sub_type_id);
        return { ...alias, drawing_time: schedule?.drawing_time || null };
      });
      setAllAliases(aliasesWithTime);
      setResults(apiResults || []);
      setLoading(false);
    };
    fetchData();
  }, []);

  // รวมข้อมูล alias + ผลจริง (ถ้าไม่มีผลจริงให้ placeholder)
  const today = format(new Date(), "yyyy-MM-dd");
  const mergedResults = allAliases.map((alias: any) => {
    const found = results.find(
      (r) => r.lottery_name === alias.alias_name && r.draw_date === today
    );
    if (found) return found;
    return {
      id: `placeholder-${alias.alias_name}`,
      draw_date: today,
      country: alias.lottery_sub_types?.country || "OTHER",
      lottery_name: alias.alias_name,
      results: ["3 ตัวบน: xxx", "2 ตัวล่าง: xx"],
      draw_time: alias.drawing_time || null,
      source_url: null,
      created_at: null,
      isPlaceholder: true,
    };
  });

  // filter/search
  const filteredResults = mergedResults.filter((r) => {
    if (!filter) return true;
    return (r.lottery_name || "").toLowerCase().includes(filter.toLowerCase());
  });

  // group by country
  const grouped = filteredResults.reduce((acc, r) => {
    const group = getCountryGroup(r.country);
    if (!acc[group]) acc[group] = [];
    acc[group].push(r);
    return acc;
  }, {} as Record<string, any[]>);

  const countryOrder = ['หวยไทย', 'หวยลาว', 'หวยเวียดนาม', 'หวยมาเลเซีย', 'หวยหุ้น', 'อื่นๆ'];
  const sortedGroups = [
    ...countryOrder.filter(g => grouped[g]),
    ...Object.keys(grouped).filter(g => !countryOrder.includes(g)).sort(),
  ];

  // --- NEW UI STRUCTURE ---
  return (
    <DirectionProvider dir="ltr">
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <div className="flex flex-col min-h-screen bg-red-50/50 dark:bg-red-900/10 text-gray-800 dark:text-gray-200 w-full">
            {/* --- Sticky Header --- */}
            <header className="sticky top-0 z-20 flex flex-col gap-2 bg-red-100/80 dark:bg-red-950/80 backdrop-blur-sm border-b border-red-200 dark:border-red-800/50 shadow-sm transition-all duration-300">
                <div className="flex h-12 items-center px-3 md:px-4">
                     <div className="flex items-center gap-2">
                        <SidebarTrigger className="-ml-1 scale-90" />
                        <Separator orientation="vertical" className="mr-1 data-[orientation=vertical]:h-4 bg-red-300 dark:bg-red-700" />
                        <Breadcrumb>
                        <BreadcrumbList>
                            <BreadcrumbItem className="hidden md:block">
                            <BreadcrumbLink href="/" className="text-xs font-light text-red-800 dark:text-red-300">แดชบอร์ด</BreadcrumbLink>
                            </BreadcrumbItem>
                            <BreadcrumbSeparator className="hidden md:block" />
                            <BreadcrumbItem>
                            <BreadcrumbPage className="text-xs font-light text-red-900 dark:text-red-200">รายการผลหวย</BreadcrumbPage>
                            </BreadcrumbItem>
                        </BreadcrumbList>
                        </Breadcrumb>
                    </div>
                    <div className="ml-auto flex items-center gap-2">
                      <div className="relative">
                          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-red-700 dark:text-red-400" />
                          <Input
                            type="search"
                            placeholder="ค้นหาชื่อหวย..."
                            className="w-full pl-9 text-xs font-light rounded-full bg-red-50 dark:bg-red-900 border-red-200 dark:border-red-800 focus:border-red-400 dark:focus:border-red-600 h-9 max-w-xs"
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                          />
                      </div>
                    </div>
                </div>
            </header>
            
            {/* --- Main Content --- */}
            <main className="flex-1 w-full p-2 sm:p-4 transition-all duration-300">
                {/* วันที่แสดงบนสุด */}
                <div className="w-full flex justify-center mb-4">
                  <div className="bg-red-200 dark:bg-red-800 text-red-900 dark:text-red-100 rounded-lg px-6 py-2 text-lg font-bold shadow animate-fade-in">
                    {`ผลหวยประจำวันที่ ${format(new Date(today), 'dd MMMM yyyy', { locale: undefined })}`}
                  </div>
                </div>
                {loading ? (
                    <div className="flex justify-center items-center h-64">
                        <Loader2 className="animate-spin w-10 h-10 text-red-600 dark:text-red-400" />
                    </div>
                ) : (
                    <>
                        {filteredResults.length === 0 && !loading ? (
                            <div className="flex flex-col justify-center items-center h-64 text-center text-gray-500 dark:text-gray-400 animate-fade-in">
                               <Calendar className="w-12 h-12 mb-4"/>
                               <p className="font-light">ไม่พบข้อมูลผลหวย</p>
                               <p className="text-xs font-light mt-1">ลองค้นหาด้วยชื่ออื่น หรือกลับมาใหม่ภายหลัง</p>
                            </div>
                        ) : (
                            <div className="animate-fade-in-up">
                                <Table>
                                    <TableHeader className="[&_tr]:border-b-0">
                                        <TableRow className="hover:bg-transparent">
                                            <TableHead className="w-[10%] sm:w-[8%] font-normal text-xs text-red-800 dark:text-red-300 p-1 sm:p-2">เวลา</TableHead>
                                            <TableHead className="w-[45%] sm:w-[40%] font-normal text-xs text-red-800 dark:text-red-300 p-1 sm:p-2">ชื่อหวย</TableHead>
                                            <TableHead className="text-center font-normal text-xs text-red-800 dark:text-red-300 p-1 sm:p-2">3 ตัวบน</TableHead>
                                            <TableHead className="text-center font-normal text-xs text-red-800 dark:text-red-300 p-1 sm:p-2 hidden sm:table-cell">2 ตัวบน</TableHead>
                                            <TableHead className="text-center font-normal text-xs text-red-800 dark:text-red-300 p-1 sm:p-2">2 ตัวล่าง</TableHead>
                                            <TableHead className="w-[5%] p-1 sm:p-2"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {sortedGroups.map(group => {
                                            // Sort by draw_time ascending (null/undefined last)
                                            const sortedByTime = [...grouped[group]].sort((a, b) => {
                                                if (!a.draw_time && !b.draw_time) return 0;
                                                if (!a.draw_time) return 1;
                                                if (!b.draw_time) return -1;
                                                return a.draw_time.localeCompare(b.draw_time);
                                            });
                                            return (
                                                <Fragment key={group}>
                                                    <TableRow key={group} className="border-b-2 border-red-200 dark:border-red-800/60 bg-red-100/80 dark:bg-red-950/50 sticky top-[48px] z-10">
                                                        <TableCell colSpan={6} className="p-2 text-sm font-semibold text-red-900 dark:text-red-200">
                                                            {group}
                                                        </TableCell>
                                                    </TableRow>
                                                    {sortedByTime.map((r: any) => {
                                                        // --- START: CORRECTED LOGIC ---
                                                        const time = r.draw_time ? r.draw_time.substring(0, 5) : "-";
                                                        
                                                        const top3Result = r.results?.find((res: string) => res.startsWith('3 ตัวบน')) || 'xxx';
                                                        const top3 = top3Result.replace(/^3 ตัวบน ?: ?/, '');

                                                        const bottom2Result = r.results?.find((res: string) => res.startsWith('2 ตัวล่าง')) || 'xx';
                                                        const bottom2 = bottom2Result.replace(/^2 ตัวล่าง ?: ?/, '');

                                                        const top2 = top3.slice(-2);
                                                        
                                                        const isPending = top3.includes('x') || bottom2.includes('x');
                                                        // --- END: CORRECTED LOGIC ---

                                                        return (
                                                            <TableRow
                                                                key={r.id}
                                                                className="border-b border-red-100/80 dark:border-red-900/50 hover:bg-red-200/50 dark:hover:bg-red-800/40 transition-colors duration-200 cursor-pointer"
                                                                onClick={() => { setSelected(r); setDrawerOpen(true); }}
                                                            >
                                                                <TableCell className="p-2 text-xs font-mono text-red-800 dark:text-red-300">{time}</TableCell>
                                                                <TableCell className="p-2 flex items-center gap-3">
                                                                    {renderFlag(r.country, r.lottery_name)}
                                                                    <span className="text-xs sm:text-sm font-light text-red-900 dark:text-red-200 truncate">{r.lottery_name || group}</span>
                                                                </TableCell>
                                                                <TableCell className={`p-2 text-center text-sm font-mono transition-colors ${isPending ? 'text-gray-400 dark:text-gray-500' : 'text-red-700 dark:text-red-300 font-semibold'}`}>{top3}</TableCell>
                                                                <TableCell className={`p-2 text-center text-sm font-mono transition-colors hidden sm:table-cell ${isPending || top2.length < 2 ? 'text-gray-400 dark:text-gray-500' : 'text-red-700 dark:text-red-300 font-semibold'}`}>{isPending ? 'xx' : top2}</TableCell>
                                                                <TableCell className={`p-2 text-center text-sm font-mono transition-colors ${isPending ? 'text-gray-400 dark:text-gray-500' : 'text-red-700 dark:text-red-300 font-semibold'}`}>{bottom2}</TableCell>
                                                                <TableCell className="p-2">
                                                                    <ChevronRight className="w-4 h-4 text-red-400 dark:text-red-600" />
                                                                </TableCell>
                                                            </TableRow>
                                                        );
                                                    })}
                                                </Fragment>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </>
                )}
            </main>
        </div>

      {/* --- Redesigned Drawer for detail/history --- */}
      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen} direction="right">
        <DrawerContent className="w-full max-w-sm bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200">
          <DrawerHeader className="border-b dark:border-gray-800 p-4">
            <DrawerTitle className="flex items-center gap-3">
                <History className="w-5 h-5 text-gray-500"/>
                <span className="font-normal">ผลย้อนหลัง</span>
            </DrawerTitle>
            <DrawerDescription className="font-light mt-1">
                {selected ? selected.lottery_name : 'ไม่พบข้อมูล'}
            </DrawerDescription>
          </DrawerHeader>
          {selected ? (() => {
            // --- Re-calculate values inside the drawer for consistency ---
            const top3Result = selected.results?.find((res: string) => res.startsWith('3 ตัวบน')) || '';
            const top3 = top3Result.replace(/^3 ตัวบน ?: ?/, '');
            const top2 = top3.slice(-2);
            
            const bottom2Result = selected.results?.find((res: string) => res.startsWith('2 ตัวล่าง')) || '';
            const bottom2 = bottom2Result.replace(/^2 ตัวล่าง ?: ?/, '');

            return (
              <div className="p-4 flex flex-col gap-4 text-sm font-light">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                  {renderFlag(selected.country, selected.lottery_name)}
                  <div className="flex flex-col">
                      <span className="font-semibold">{selected.lottery_name}</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                          {selected.draw_date ? format(new Date(selected.draw_date), "dd MMMM yyyy") : "-"}
                          {' @ '}{selected.draw_time ? selected.draw_time.substring(0,5) : "-"}
                      </span>
                  </div>
                </div>
  
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                      <div className="text-xs text-gray-500 dark:text-gray-400">3 ตัวบน</div>
                      <div className="text-lg font-mono font-semibold text-gray-800 dark:text-gray-200">{top3 || '...'}</div>
                  </div>
                  <div className="p-2 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                      <div className="text-xs text-gray-500 dark:text-gray-400">2 ตัวบน</div>
                      <div className="text-lg font-mono font-semibold text-gray-800 dark:text-gray-200">{top2 || '..'}</div>
                  </div>
                  <div className="p-2 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                      <div className="text-xs text-gray-500 dark:text-gray-400">2 ตัวล่าง</div>
                      <div className="text-lg font-mono font-semibold text-gray-800 dark:text-gray-200">{bottom2 || '..'}</div>
                  </div>
                </div>
                
                <Separator className="my-2 bg-gray-200 dark:bg-gray-800"/>
  
                <div className="space-y-3 flex-1 overflow-y-auto" style={{maxHeight: 'calc(100vh - 300px)'}}>
                  {filteredResults.filter(r => r.lottery_name === selected.lottery_name)
                      .sort((a, b) => new Date(b.draw_date).getTime() - new Date(a.draw_date).getTime())
                      .slice(0, 30)
                      .map((r:any) => {
                          const histTop3 = (r.results?.find((res: string) => res.startsWith('3 ตัวบน')) || '').replace(/^3 ตัวบน ?: ?/, '');
                          const histBottom2 = (r.results?.find((res: string) => res.startsWith('2 ตัวล่าง')) || '').replace(/^2 ตัวล่าง ?: ?/, '');
                          const histTop2 = histTop3.slice(-2);

                          return (
                            <div key={r.id} className="grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-1 text-xs">
                              <div className="text-gray-500 dark:text-gray-400 row-span-3">{r.draw_date ? format(new Date(r.draw_date), "dd/MM") : "-"}</div>
                              <div className="col-start-2 flex items-center gap-2 text-mono">
                                 <span className="w-12 text-gray-500 dark:text-gray-400 font-light">3 บน:</span>
                                 <span className="font-semibold text-gray-700 dark:text-gray-300">{histTop3}</span>
                              </div>
                              <div className="col-start-2 flex items-center gap-2 text-mono">
                                 <span className="w-12 text-gray-500 dark:text-gray-400 font-light">2 บน:</span>
                                 <span className="font-semibold text-gray-700 dark:text-gray-300">{histTop2}</span>
                              </div>
                               <div className="col-start-2 flex items-center gap-2 text-mono">
                                 <span className="w-12 text-gray-500 dark:text-gray-400 font-light">2 ล่าง:</span>
                                 <span className="font-semibold text-gray-700 dark:text-gray-300">{histBottom2}</span>
                              </div>
                            </div>
                          )
                      })}
                </div>
              </div>
            )
          })() : (
            <div className="p-4 text-center text-gray-500 dark:text-gray-400 font-light">ไม่พบข้อมูล</div>
          )}
        </DrawerContent>
      </Drawer>
      </SidebarInset>
    </SidebarProvider>
    </DirectionProvider>
  );
}