"use client";
import { useEffect, useState, Fragment } from "react";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
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

// --- Unchanged Logic & Utility Functions ---

// Placeholder for lottery type color mapping
const LOTTERY_TYPE_COLORS: Record<string, string> = {
  "หวยลาว": "border-blue-500 bg-blue-50 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200",
  "หวยเวียดนาม": "border-red-500 bg-red-50 dark:bg-red-900/40 text-red-800 dark:text-red-200",
  "หวยหุ้น": "border-green-500 bg-green-50 dark:bg-green-900/40 text-green-800 dark:text-green-200",
  // Add more as needed
};

function getTypeColor(type: string) {
  return LOTTERY_TYPE_COLORS[type] || "border-gray-300 bg-gray-100 dark:border-gray-700 dark:bg-gray-800/40 text-gray-800 dark:text-gray-200";
}

function get2Top(num: string) {
  // Return last 2 digits of 3-top
  return num?.slice(-2) || "";
}

// ฟังก์ชันแปลง country code เป็นชื่อประเทศที่รองรับใน countryFlagImg
function getCountryName(country: string, lotteryName: string) {
  // ตัวอย่าง mapping เพิ่มเติม
  if (country === 'RU' || /รัสเซีย/i.test(lotteryName)) return 'รัสเซีย';
  if (country === 'VN' || /เวียดนาม/i.test(lotteryName)) return 'เวียดนาม';
  if (country === 'LA' || /ลาว/i.test(lotteryName)) return 'ลาว';
  if (country === 'TH' || /ไทย|สลากกินแบ่ง/i.test(lotteryName)) return 'ไทย';
  if (country === 'MY' || /มาเลเซีย/i.test(lotteryName)) return 'มาเลเซีย';
  if (country === 'SG' || /สิงคโปร์/i.test(lotteryName)) return 'สิงคโปร์';
  if (country === 'HK' || /ฮ่องกง/i.test(lotteryName)) return 'ฮ่องกง';
  if (country === 'TW' || /ตากปลายนาม/i.test(lotteryName)) return 'ไต้หวัน';
  if (country === 'JP' || /ญี่ปุ่น/i.test(lotteryName)) return 'ญี่ปุ่น';
  if (country === 'KR' || /เกาหลีใต้/i.test(lotteryName)) return 'เกาหลีใต้';
  if (country === 'PH' || /ฟิลิปปินส์/i.test(lotteryName)) return 'ฟิลิปปินส์';
  if (country === 'ID' || /อินโดนีเซีย/i.test(lotteryName)) return 'อินโดนีเซีย';
  if (country === 'US' || /สหรัฐอเมริกา/i.test(lotteryName)) return 'สหรัฐอเมริกา';
  if (country === 'AU' || /ออสเตรเลีย/i.test(lotteryName)) return 'ออสเตรเลีย';
  if (country === 'CA' || /แคนาดา/i.test(lotteryName)) return 'แคนาดา';
  if (country === 'NZ' || /นิวซีแลนด์/i.test(lotteryName)) return 'นิวซีแลนด์';
  if (country === 'IE' || /ไอร์แลนด์/i.test(lotteryName)) return 'ไอร์แลนด์';
  if (country === 'DE' || /เยอรมนี/i.test(lotteryName)) return 'เยอรมนี';
  if (country === 'FR' || /ฝรั่งเศส/i.test(lotteryName)) return 'ฝรั่งเศส';
  if (country === 'IT' || /อิตาลี/i.test(lotteryName)) return 'อิตาลี';
  if (country === 'ES' || /สเปน/i.test(lotteryName)) return 'สเปน';
  if (country === 'NL' || /สวิตเซอร์แลนด์/i.test(lotteryName)) return 'สวิตเซอร์แลนด์';
  if (country === 'BE' || /เบลเยียม/i.test(lotteryName)) return 'เบลเยียม';
  if (country === 'SE' || /สวีเดน/i.test(lotteryName)) return 'สวีเดน';
  if (country === 'NO' || /นอร์เวย์/i.test(lotteryName)) return 'นอร์เวย์';
  if (country === 'DK' || /เดนมาร์ก/i.test(lotteryName)) return 'เดนมาร์ก';
  if (country ===  'STOCK' || /หวยหุ้น/i.test(lotteryName)) return 'หวยหุ้น';
  if (country ===  'OTHER' || /อื่นๆ/i.test(lotteryName)) return 'อื่นๆ';
  return country || lotteryName;
}

const COUNTRY_GROUPS: Record<string, string> = {
  'TH': 'ไทย',
  'LA': 'ลาว',
  'VN': 'เวียดนาม',
  'MY': 'มาเลเซีย',
  'SG': 'สิงคโปร์',
  'HK': 'ฮ่องกง',
  'TW': 'ไต้หวัน',
  'JP': 'ญี่ปุ่น',
  'KR': 'เกาหลีใต้',
  'PH': 'ฟิลิปปินส์',
  'ID': 'อินโดนีเซีย',
  'US': 'สหรัฐอเมริกา',
  'AU': 'ออสเตรเลีย',
  'CA': 'แคนาดา',
  'NZ': 'นิวซีแลนด์',
  'IE': 'ไอร์แลนด์',
  'DE': 'เยอรมนี',
  'FR': 'ฝรั่งเศส',
  'IT': 'อิตาลี',
  'ES': 'สเปน',
  'NL': 'สวิตเซอร์แลนด์',
  'BE': 'เบลเยียม',
  'SE': 'สวีเดน',
  'NO': 'นอร์เวย์',
  'DK': 'เดนมาร์ก',
  'STOCK': 'หวยหุ้น',
  'OTHER': 'อื่นๆ',
};

function getCountryGroup(country: string) {
  return COUNTRY_GROUPS[country] || 'อื่นๆ';
}

function renderFlag(country: string, lotteryName: string) {
  const countryName = getCountryName(country, lotteryName);
  if (countryName === "หวยหุ้น") {
    return <BarChart3 className="w-5 h-5 text-green-600 dark:text-green-400" />;
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
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [selected, setSelected] = useState<any | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    setLoading(true);
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    supabase
      .from('lottery_api_results')
      .select('id, created_at, draw_date, country, lottery_name, results, source_url, draw_time')
      .order('draw_date', { ascending: false })
      .order('draw_time', { ascending: false })
      .then(({ data, error }) => {
        setResults(data || []);
        setLoading(false);
      });
  }, []);

  const filteredResults = results.filter((r) => {
    if (!filter) return true;
    return (r.lottery_name || '').toLowerCase().includes(filter.toLowerCase());
  });

  const today = new Date();
  const todayResults = filteredResults.filter(r => r.draw_date && isSameDay(new Date(r.draw_date), today));

  let displayResults = todayResults;
  let displayDateLabel = '';
  if (todayResults.length === 0 && filteredResults.length > 0) {
    const sorted = [...filteredResults].sort((a, b) => new Date(b.draw_date).getTime() - new Date(a.draw_date).getTime());
    const latestDate = sorted[0].draw_date;
    displayResults = filteredResults.filter(r => r.draw_date === latestDate);
    displayDateLabel = `* แสดงผลล่าสุดของวันที่ ${format(new Date(latestDate), 'dd/MM/yyyy')}`;
  } else if (todayResults.length > 0) {
    displayDateLabel = `ผลหวยวันนี้ (${format(today, 'dd/MM/yyyy')})`;
  } else {
    displayDateLabel = '* ไม่มีข้อมูลสำหรับวันนี้';
  }
  
  const grouped = displayResults.reduce((acc, r) => {
    const group = getCountryGroup(r.country);
    if (!acc[group]) acc[group] = [];
    acc[group].push(r);
    return acc;
  }, {} as Record<string, any[]>);

  const countryOrder = ['ไทย', 'ลาว', 'เวียดนาม', 'มาเลเซีย', 'หวยหุ้น'];
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
        <div className="flex flex-col min-h-screen bg-green-50/50 dark:bg-green-900/10 text-gray-800 dark:text-gray-200 w-full">
            {/* --- Sticky Header --- */}
            <header className="sticky top-0 z-20 flex flex-col gap-2 bg-green-100/80 dark:bg-green-950/80 backdrop-blur-sm border-b border-green-200 dark:border-green-800/50 shadow-sm transition-all duration-300">
                <div className="flex h-12 items-center px-3 md:px-4">
                     <div className="flex items-center gap-2">
                        <SidebarTrigger className="-ml-1 scale-90" />
                        <Separator orientation="vertical" className="mr-1 data-[orientation=vertical]:h-4 bg-green-300 dark:bg-green-700" />
                        <Breadcrumb>
                        <BreadcrumbList>
                            <BreadcrumbItem className="hidden md:block">
                            <BreadcrumbLink href="/" className="text-xs font-light text-green-800 dark:text-green-300">แดชบอร์ด</BreadcrumbLink>
                            </BreadcrumbItem>
                            <BreadcrumbSeparator className="hidden md:block" />
                            <BreadcrumbItem>
                            <BreadcrumbPage className="text-xs font-light text-green-900 dark:text-green-200">รายการผลหวย</BreadcrumbPage>
                            </BreadcrumbItem>
                        </BreadcrumbList>
                        </Breadcrumb>
                    </div>
                    <div className="ml-auto flex items-center gap-2">
                      <div className="relative">
                          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-green-700 dark:text-green-400" />
                          <Input
                            type="search"
                            placeholder="ค้นหาชื่อหวย..."
                            className="w-full pl-9 text-xs font-light rounded-full bg-green-50 dark:bg-green-900 border-green-200 dark:border-green-800 focus:border-green-400 dark:focus:border-green-600 h-9 max-w-xs"
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                          />
                      </div>
                    </div>
                </div>
            </header>
            
            {/* --- Main Content --- */}
            <main className="flex-1 w-full p-2 sm:p-4 transition-all duration-300">
                {loading ? (
                    <div className="flex justify-center items-center h-64">
                        <Loader2 className="animate-spin w-10 h-10 text-green-600 dark:text-green-400" />
                    </div>
                ) : (
                    <>
                        {displayDateLabel && (
                            <div className="text-center text-sm font-light text-green-700 dark:text-green-300 mb-4 animate-fade-in">{displayDateLabel}</div>
                        )}
                        {displayResults.length === 0 ? (
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
                                            <TableHead className="w-[10%] sm:w-[8%] font-normal text-xs text-green-800 dark:text-green-300 p-1 sm:p-2">เวลา</TableHead>
                                            <TableHead className="w-[45%] sm:w-[40%] font-normal text-xs text-green-800 dark:text-green-300 p-1 sm:p-2">ชื่อหวย</TableHead>
                                            <TableHead className="text-center font-normal text-xs text-green-800 dark:text-green-300 p-1 sm:p-2">3 ตัวบน</TableHead>
                                            <TableHead className="text-center font-normal text-xs text-green-800 dark:text-green-300 p-1 sm:p-2 hidden sm:table-cell">2 ตัวบน</TableHead>
                                            <TableHead className="text-center font-normal text-xs text-green-800 dark:text-green-300 p-1 sm:p-2">2 ตัวล่าง</TableHead>
                                            <TableHead className="w-[5%] p-1 sm:p-2"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {sortedGroups.map(group => (
                                            <Fragment key={group}>
                                                <TableRow key={group} className="border-b-2 border-green-200 dark:border-green-800/60 bg-green-100/80 dark:bg-green-950/50 sticky top-[48px] z-10">
                                                    <TableCell colSpan={6} className="p-2 text-sm font-semibold text-green-900 dark:text-green-200">
                                                        {group}
                                                    </TableCell>
                                                </TableRow>
                                                {grouped[group].map((r: any) => {
                                                    const time = r.draw_time || "-";
                                                    const top3 = (r.results?.[0] || "xxx,xx").replace(/^3 ตัวบน ?: ?/, '');
                                                    const top2 = (r.results?.[1] || "xx").replace(/^2 ตัวบน ?: ?/, '');
                                                    const bottom2 = (r.results?.[2] || "xx").replace(/^2 ตัวล่าง ?: ?/, '');
                                                    const isPending = top3.includes('x') || top2.includes('x') || bottom2.includes('x');

                                                    return (
                                                        <TableRow
                                                            key={r.id}
                                                            className="border-b border-green-100/80 dark:border-green-900/50 hover:bg-green-200/50 dark:hover:bg-green-800/40 transition-colors duration-200 cursor-pointer"
                                                            onClick={() => { setSelected(r); setDrawerOpen(true); }}
                                                        >
                                                            <TableCell className="p-2 text-xs font-mono text-green-800 dark:text-green-300">{time}</TableCell>
                                                            <TableCell className="p-2 flex items-center gap-3">
                                                                {renderFlag(r.country, r.lottery_name)}
                                                                <span className="text-xs sm:text-sm font-light text-green-900 dark:text-green-200 truncate">{r.lottery_name || group}</span>
                                                            </TableCell>
                                                            <TableCell className={`p-2 text-center text-sm font-mono transition-colors ${isPending ? 'text-gray-400 dark:text-gray-500' : 'text-green-700 dark:text-green-300 font-semibold'}`}>{top3}</TableCell>
                                                            <TableCell className={`p-2 text-center text-sm font-mono transition-colors hidden sm:table-cell ${isPending ? 'text-gray-400 dark:text-gray-500' : 'text-green-700 dark:text-green-300 font-semibold'}`}>{top2}</TableCell>
                                                            <TableCell className={`p-2 text-center text-sm font-mono transition-colors ${isPending ? 'text-gray-400 dark:text-gray-500' : 'text-green-700 dark:text-green-300 font-semibold'}`}>{bottom2}</TableCell>
                                                            <TableCell className="p-2">
                                                                <ChevronRight className="w-4 h-4 text-green-400 dark:text-green-600" />
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                })}
                                            </Fragment>
                                        ))}
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
          {selected ? (
            <div className="p-4 flex flex-col gap-4 text-sm font-light">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                {renderFlag(selected.country, selected.lottery_name)}
                <div className="flex flex-col">
                    <span className="font-semibold">{selected.lottery_name}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                        {selected.draw_date ? format(new Date(selected.draw_date), "dd MMMM yyyy") : "-"}
                        {' @ '}{selected.draw_time || "-"}
                    </span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                    <div className="text-xs text-gray-500 dark:text-gray-400">3 ตัวบน</div>
                    <div className={`text-lg font-mono font-semibold ${getTypeColor(selected.lottery_name)}`}>{(selected.results?.[0] || "xxx,xx").replace(/^3 ตัวบน ?: ?/, '')}</div>
                </div>
                <div className="p-2 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                    <div className="text-xs text-gray-500 dark:text-gray-400">2 ตัวบน</div>
                    <div className={`text-lg font-mono font-semibold ${getTypeColor(selected.lottery_name)}`}>{(selected.results?.[1] || "xx").replace(/^2 ตัวบน ?: ?/, '')}</div>
                </div>
                <div className="p-2 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                    <div className="text-xs text-gray-500 dark:text-gray-400">2 ตัวบน</div>
                    <div className={`text-lg font-mono font-semibold ${getTypeColor(selected.lottery_name)}`}>{(selected.results?.[1] || "xx").replace(/^2 ตัวบน ?: ?/, '')}</div>
                </div>
                <div className="p-2 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                    <div className="text-xs text-gray-500 dark:text-gray-400">2 ตัวล่าง</div>
                    <div className={`text-lg font-mono font-semibold ${getTypeColor(selected.lottery_name)}`}>{(selected.results?.[2] || "xx")}</div>
                </div>
              </div>
              
              <Separator className="my-2 bg-gray-200 dark:bg-gray-800"/>

              <div className="space-y-3 flex-1 overflow-y-auto" style={{maxHeight: 'calc(100vh - 300px)'}}>
                {filteredResults.filter(r => r.lottery_name === selected.lottery_name)
                    .sort((a, b) => new Date(b.draw_date).getTime() - new Date(a.draw_date).getTime())
                    .slice(0, 30) // Limit to last 30 results for performance
                    .map((r:any) => (
                      <div key={r.id} className="grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-1 text-xs">
                        <div className="text-gray-500 dark:text-gray-400 row-span-2">{r.draw_date ? format(new Date(r.draw_date), "dd/MM") : "-"}</div>
                        <div className="col-start-2 flex items-center gap-2 text-mono">
                           <span className="w-12 text-gray-500 dark:text-gray-400 font-light">3 บน:</span>
                           <span className="font-semibold text-gray-700 dark:text-gray-300">{(r.results?.[0] || "xxx,xx").replace(/^3 ตัวบน ?: ?/, '')}</span>
                        </div>
                        <div className="col-start-2 flex items-center gap-2 text-mono">
                           <span className="w-12 text-gray-500 dark:text-gray-400 font-light">2 บน:</span>
                           <span className="font-semibold text-gray-700 dark:text-gray-300">{(r.results?.[1] || "xx")}</span>
                        </div>
                         <div className="col-start-2 flex items-center gap-2 text-mono">
                           <span className="w-12 text-gray-500 dark:text-gray-400 font-light">2 ล่าง:</span>
                           <span className="font-semibold text-gray-700 dark:text-gray-300">{(r.results?.[2] || "xx")}</span>
                        </div>
                      </div>
                    ))}
              </div>

            </div>
          ) : (
            <div className="p-4 text-center text-gray-500 dark:text-gray-400 font-light">ไม่พบข้อมูล</div>
          )}
        </DrawerContent>
      </Drawer>
      </SidebarInset>
    </SidebarProvider>
    </DirectionProvider>
  );
}