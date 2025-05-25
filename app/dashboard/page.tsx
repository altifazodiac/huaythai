"use client";
import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { Card } from "@/components/ui/card";
import { AppSidebar } from "@/components/app-sidebar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Icon } from "@iconify/react";
 
import { CardContent } from "@/components/ui/card";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Map country_origin to flag image file name
const countryFlagImg = (country: string) => {
  // Normalize country name to file name (e.g. "ลาว" => "laos.jpg")
  const map: Record<string, string> = {
    "ลาว": "Laos.jpg",
    "เวียดนาม": "Vietnam.jpg",
    "มาเลเซีย": "Malaysia.jpg",
    "สิงคโปร์": "Singapore.jpg",
    "เยอรมัน": "Germany.jpg",
    "อังกฤษ": "England.jpg",
    "ญี่ปุ่น": "Japan.jpg",
    "เกาหลีใต้": "Korea.jpg",
    "อินเดีย": "India.jpg",
    "ไทย": "Thai.jpg",
    "สหรัฐอเมริกา": "USA.jpg",
    "ฮ่องกง": "HongKong.jpg",
    "เยอรมนี": "Germany.jpg",
    "ไต้หวัน": "Taiwan.jpg",
    "สหราชอาณาจักร": "England.jpg",
    "รัสเซีย": "Russia.jpg",
    "สหรัฐอินเดีย": "India.jpg",
    "อิตาลี": "Italy.jpg",
    "สเปน": "Spain.jpg",
    "คอสโทรีกา": "CostaRica.jpg",
    "จีน": "China.jpg",
    "อียิปต์": "Egypt.jpg",
      
    
    
  };
  return map[country] || "Unknown.jpg";
};

const dayOfWeekTH = (days: string) => {
  if (!days) return "";
  const arr = days.split(",").map(d => d.trim());
  if (arr.length === 5 && arr[0] === "Monday" && arr[4] === "Friday") return "จันทร์-ศุกร์";
  if (arr.length === 7) return "ทุกวัน";
  const map: Record<string, string> = {
    Monday: "จันทร์", Tuesday: "อังคาร", Wednesday: "พุธ",
    Thursday: "พฤหัส", Friday: "ศุกร์", Saturday: "เสาร์", Sunday: "อาทิตย์"
  };
  return arr.map(d => map[d] || d).join(", ");
};

// ปรับ BouncingCard ให้เด้งแบบสุ่มหรือมี delay เฉพาะตอนเปิดรับ
const BouncingCard = ({ children, idx, bouncing }: { children: React.ReactNode, idx: number, bouncing: boolean }) => {
  const [isBouncing, setIsBouncing] = useState(false);

  useEffect(() => {
    if (!bouncing) {
      setIsBouncing(false);
      return;
    }
    // Randomize initial delay for smoothness
    const initialDelay = Math.random() * 60000;
    let intervalId: NodeJS.Timeout;
    const timeoutId = setTimeout(() => {
      setIsBouncing(true);
      intervalId = setInterval(() => {
        setIsBouncing(false);
        setTimeout(() => setIsBouncing(true), 100); // restart animation
      }, 60000);
    }, initialDelay);
    return () => {
      clearTimeout(timeoutId);
      if (intervalId) clearInterval(intervalId);
    };
  }, [bouncing]);

  useEffect(() => {
    if (isBouncing) {
      const timer = setTimeout(() => setIsBouncing(false), 1000); // animation duration
      return () => clearTimeout(timer);
    }
  }, [isBouncing]);

  return (
    <div className={isBouncing ? "gentle-bounce" : ""}>
      {children}
    </div>
  );
};

// เพิ่มฟังก์ชันตรวจสอบสถานะเปิดรับ
function isOpenNow(schedule: any) {
  if (!schedule) return false;
  const now = new Date();
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const today = dayNames[now.getDay()];
  const days = schedule.day_of_week?.split(",").map((d: string) => d.trim()) || [];
  if (!days.includes(today)) return false;
  // handle open_time, close_time อาจเป็น null
  if (!schedule.open_time || !schedule.close_time) return false;
  const [openH, openM] = schedule.open_time.split(":");
  const [closeH, closeM] = schedule.close_time.split(":");
  const open = new Date(now);
  open.setHours(+openH, +openM, 0, 0);
  const close = new Date(now);
  close.setHours(+closeH, +closeM, 0, 0);
  return now >= open && now <= close;
}

function getNextOpenClose(schedule: any) {
  if (!schedule) return { nextOpen: null, nextClose: null, isOpen: false };
  const now = new Date();
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const todayIdx = now.getDay();
  const days = schedule.day_of_week?.split(",").map((d: string) => d.trim()) || [];
  // หา index ของวันถัดไปที่เปิดรับ
  let openIdx = days.indexOf(dayNames[todayIdx]);
  let isOpen = false;
  let nextOpen: Date | null = null;
  let nextClose: Date | null = null;
  if (openIdx !== -1) {
    // วันนี้เปิดรับ
    const [openH, openM] = schedule.open_time.split(":");
    const [closeH, closeM] = schedule.close_time.split(":");
    const open = new Date(now);
    open.setHours(+openH, +openM, 0, 0);
    const close = new Date(now);
    close.setHours(+closeH, +closeM, 0, 0);
    if (now < open) {
      nextOpen = open;
      nextClose = close;
      isOpen = false;
    } else if (now >= open && now <= close) {
      nextOpen = open;
      nextClose = close;
      isOpen = true;
    } else {
      // วันนี้เลยเวลาปิดรับแล้ว หา next วันถัดไป
      isOpen = false;
    }
  }
  if (!isOpen && !nextOpen) {
    // หา next วันเปิดรับถัดไป
    let minDiff = Infinity;
    let nextDayIdx = -1;
    for (let d of days) {
      const idx = dayNames.indexOf(d);
      let diff = idx - todayIdx;
      if (diff <= 0) diff += 7;
      if (diff < minDiff) {
        minDiff = diff;
        nextDayIdx = idx;
      }
    }
    if (nextDayIdx !== -1) {
      const next = new Date(now);
      next.setDate(now.getDate() + minDiff);
      const [openH, openM] = schedule.open_time.split(":");
      next.setHours(+openH, +openM, 0, 0);
      nextOpen = next;
      // next close
      const nextClose = new Date(next);
      const [closeH, closeM] = schedule.close_time.split(":");
      nextClose.setHours(+closeH, +closeM, 0, 0);
      return { nextOpen, nextClose, isOpen: false };
    }
  }
  return { nextOpen, nextClose, isOpen };
}

// ฟังก์ชันแปลง day_of_week ภาษาไทยเป็นอังกฤษ รองรับช่วงวันและ fallback วันของเดือน
function dayOfWeekToEn(day: string) {
  const map: Record<string, string> = {
    "จันทร์": "Monday",
    "อังคาร": "Tuesday",
    "พุธ": "Wednesday",
    "พฤหัสบดี": "Thursday",
    "ศุกร์": "Friday",
    "เสาร์": "Saturday",
    "อาทิตย์": "Sunday",
    "ทุกวัน": "Monday,Tuesday,Wednesday,Thursday,Friday,Saturday,Sunday"
  };
  // ตัดคำว่า "วัน" ออก
  day = day.replace(/วัน/g, "").trim();
  // กรณี "ทุกวัน"
  if (day === "ทุกวัน") return map["ทุกวัน"];
  // กรณี "จันทร์-ศุกร์" หรือ "จันทร์–ศุกร์" หรือ "จันทร์—ศุกร์"
  const dashMatch = day.match(/^([ก-๙]+)[–—-]([ก-๙]+)$/);
  if (dashMatch) {
    const daysOrder = ["จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์", "อาทิตย์"];
    const start = daysOrder.indexOf(dashMatch[1]);
    const end = daysOrder.indexOf(dashMatch[2]);
    if (start !== -1 && end !== -1) {
      let arr = [];
      if (start <= end) {
        arr = daysOrder.slice(start, end + 1);
      } else {
        arr = daysOrder.slice(start).concat(daysOrder.slice(0, end + 1));
      }
      return arr.map(d => map[d]).join(",");
    }
  }
  // กรณี "1, 16 ของเดือน" หรืออื่นๆ ที่ไม่ใช่วันในสัปดาห์
  if (day.match(/ของเดือน/)) return "__MONTH_DAY__";
  // กรณี comma separated
  return day.split(",").map(d => map[d.trim()] || d.trim()).join(",");
}

// ปรับ CountdownRow ให้ fallback ถ้า day_of_week เป็น __MONTH_DAY__
function CountdownRow({ schedule }: { schedule: any }) {
  if (!schedule) {
    return <div className="text-xs text-red-500 text-center mt-1">ไม่มีข้อมูลตารางเวลา</div>;
  }
  if (schedule.day_of_week === "__MONTH_DAY__") {
    return <div className="text-xs font-semibold text-center mt-1 text-blue-600">ออกรางวัลตามวันที่ของเดือน</div>;
  }
  const [{ nextOpen, nextClose, isOpen }, setState] = useState(() => getNextOpenClose(schedule));
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    setState(getNextOpenClose(schedule));
    return () => clearInterval(timer);
  }, [schedule]);
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  let target = isOpen ? nextClose : nextOpen;
  let diff = target ? (target.getTime() - now.getTime()) : 0;
  let isNegative = diff < 0;
  if (isNegative) diff = 0;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const seconds = Math.floor((diff / 1000) % 60);
  if (!target) return null;
  return (
    <div className={
      "text-xs font-semibold text-center mt-1 " +
      (isOpen ? "text-green-600" : "text-red-500")
    }>
      {isOpen
        ? `ปิดรับใน ${days ? days + " วัน " : ""}${hours} ชั่วโมง ${minutes} นาที ${seconds} วินาที`
        : `รอเปิดรับ ${days ? days + " วัน " : ""}${hours} ชั่วโมง ${minutes} นาที ${seconds} วินาที`}
    </div>
  );
}

export default function Page() {
  const [types, setTypes] = useState<any[]>([]);
  const [subTypes, setSubTypes] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      const { data: typesData } = await supabase.from("lottery_types").select();
      setTypes(typesData || []);
      const { data: subTypesData } = await supabase.from("lottery_sub_types").select();
      setSubTypes(subTypesData || []);
      const { data: schedulesData } = await supabase.from("drawing_schedules").select();
      setSchedules(schedulesData || []);
      setIsLoading(false);
    })();
  }, []);

  // Group subTypes by type_id
  const grouped = types.map(type => ({
    ...type,
    subTypes: subTypes.filter(st => st.lottery_type_id === type.lottery_type_id)
  }));

  // Skeleton loading card
  const SkeletonCard = () => (
    <div className="animate-pulse flex flex-col items-center shadow-md border border-gray-200 max-w-xs w-full mx-auto bg-white dark:bg-zinc-900">
      <div className="bg-gray-200 h-6 w-full rounded-t-md mb-2" />
      <div className="bg-gray-200 h-16 w-full rounded mb-1" />
      <div className="bg-gray-200 h-5 w-3/4 rounded mb-1" />
      <div className="bg-gray-200 h-4 w-1/2 rounded mb-1" />
      <div className="bg-gray-200 h-4 w-2/3 rounded mb-2" />
    </div>
  );

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="#">
                    แดชบอร์ด
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>ประเภทหวย</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <div className="w-full p-4">
        <Card className="w-full  mx-auto shadow-xl shooting-star-bg bg-gradient-to-br from-slate-900 to-slate-800 dark:from-slate-800 dark:to-slate-900 border-slate-700">
        <CardContent className="relative p-8 z-10">  
          <div className="text-center">
            <h1 className="text-2xl font-normal text-sky-300 modern-text-glow">
              ยินดีต้อนรับสู่
            </h1>
            <p className="mt-2 text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-sky-300 to-cyan-400 modern-text-glow animate-pulse">
              มาเฟีย พารวย
            </p>
            <p className="mt-4 text-sm text-slate-400 dark:text-slate-500">
              เริ่มต้นการเดินทางสู่ความมั่งคั่งได้แล้ววันนี้!
            </p>
          </div>
        </CardContent>
      </Card>
        </div>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          {isLoading ? (
            // Show skeletons for loading
            Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="mb-8">
                <div className="h-7 w-40 bg-gray-200 rounded mb-4 animate-pulse" />
                <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                  {Array.from({ length: 4 }).map((_, j) => (
                    <SkeletonCard key={j} />
                  ))}
                </div>
              </div>
            ))
          ) : (
            grouped.map(group => (
              <div key={group.lottery_type_id} className="mb-8">
                <h2 className="text-xl font-bold mb-4 flex items-center">
                  <Icon icon="mdi:flag" className="w-6 h-6 mr-2" />
                  {group.type_name}
                </h2>
                <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                  {group.subTypes.map((sub: any, idx: number) => {
                    const schedule = schedules.find(s => s.lottery_sub_type_id === sub.lottery_sub_type_id);
                    const scheduleEn = schedule
                      ? { ...schedule, day_of_week: dayOfWeekToEn(schedule.day_of_week) }
                      : undefined;

                    return (
                      <BouncingCard key={sub.lottery_sub_type_id} idx={idx} bouncing={isOpenNow(scheduleEn)}>
                        <Card
                          className="min-h-[220px] flex flex-col items-center shadow-md border border-gray-200 max-w-xs w-full mx-auto bg-white dark:bg-zinc-900 transition-all duration-500 ease-out opacity-0 translate-y-4 animate-fadein"
                          style={{
                            animationDelay: `${idx * 80}ms`,
                            animationFillMode: 'forwards',
                          }}
                        >
                          <div
                            className={
                              `w-full text-center rounded-t-md ` +
                              (isOpenNow(scheduleEn)
                                ? "bg-green-600 text-white"
                                : "bg-transparent text-gray-500 border-b border-gray-200")
                            }
                          >
                            <h2 className="text-base font-semibold">
                              {isOpenNow(scheduleEn) ? "เปิดรับ" : "ปิดรับแทง"}
                            </h2>
                          
                          </div>
                          <img
                            src={`/flags/${countryFlagImg(sub.country_origin)}`}
                            alt={sub.country_origin}
                            className="w-full h-20 object-cover mb-1  "
                            loading="lazy"
                          />
                          <div className="font-bold text-lg mb-0.5 text-center line-clamp-2 min-h-[2.5em]">{sub.sub_type_name}</div>
                          <div className="text-xs text-gray-500 mb-0.5 text-center">{dayOfWeekTH(schedule?.day_of_week)}</div>
                          <div className="text-xs mt-0.5 text-center mb-2">
  <div className="flex justify-center space-x-2">  
    <span>เปิดรับ {schedule?.open_time?.slice(0,5) || "-"} น.</span>
    <span>ปิดรับ {schedule?.close_time?.slice(0,5) || "-"} น.</span>
  </div>
  <CountdownRow schedule={scheduleEn} />
</div>
                        </Card>
                      </BouncingCard>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}