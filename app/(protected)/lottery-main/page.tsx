export const dynamic = "force-dynamic";
import { createClient } from "@supabase/supabase-js";
import { Card, CardContent } from "@/components/ui/card";
 
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Icon } from "@iconify/react";
import { countryFlagImg } from "@/lib/utils/flags";
import Link from "next/link";
import BouncingCard from "@/components/lottery/BouncingCard";
import CountdownRow from "@/components/lottery/CountdownRow";
import FilterBar from "@/components/lottery/FilterBar";
import LotteryTypeGrid from "@/components/lottery/LotteryTypeGrid";

// Map country_origin to flag image file name

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

// เพิ่มฟังก์ชันตรวจสอบสถานะเปิดรับ
function isOpenNow(schedule: any) {
  if (!schedule) return false;
  const now = new Date();
  const [openH, openM] = schedule.open_time.split(":");
  const [closeH, closeM] = schedule.close_time.split(":");
  const open = new Date(now);
  open.setHours(+openH, +openM, 0, 0);
  const close = new Date(now);
  close.setHours(+closeH, +closeM, 0, 0);

  // ถ้าเวลาปิดรับ < เวลาเปิดรับ แปลว่าข้ามวัน
  if (close <= open) {
    // เปิดรับตั้งแต่ open ของวันนี้ ถึง close ของวันถัดไป
    const closeNext = new Date(open);
    closeNext.setDate(open.getDate() + 1);
    closeNext.setHours(+closeH, +closeM, 0, 0);
    return now >= open || now <= closeNext;
  } else {
    return now >= open && now <= close;
  }
}

export default async function Page() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const imageUrl = 'https://bqgiwmawqnixpgvuqhuc.supabase.co/storage/v1/object/public/images//BG2.png';
  const [{ data: typesData }, { data: subTypesData }, { data: schedulesData }] = await Promise.all([
    supabase.from("lottery_types").select(),
    supabase.from("lottery_sub_types").select(),
    supabase.from("drawing_schedules").select(),
  ]);
  const types = typesData ?? [];
  const subTypes = subTypesData ?? [];
  const schedules = schedulesData ?? [];

  const grouped = types.map(type => ({
    ...type,
    subTypes: subTypes.filter(st => st.lottery_type_id === type.lottery_type_id)
  }));

  const countries = Array.from(new Set(subTypes.map(st => st.country_origin)));

  return (
    <SidebarProvider>
      
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="#">
                    หน้าหลัก
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
      
        <div className="animated-red-border overflow-hidden rounded-2xl p-0.5 sm:p-1">  
            
            <div 
              className="
                w-full mx-auto rounded-xl shadow-2xl
                flex flex-col items-end sm:items-center justify-center
                py-6 sm:py-8 lg:py-10
                min-h-[180px] sm:min-h-[200px] lg:min-h-[220px]
                animate-fadein
                relative 
                bg-left sm:bg-center
                pr-4 md:pr-0 
              "
              style={{
                
                backgroundImage: `url(${imageUrl})`,
                backgroundSize: 'cover',
                backgroundRepeat: 'no-repeat',
              }}
            >
          
            <h1 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-white drop-shadow-lg modern-text-glow mb-1 sm:mb-2 tracking-wide text-right sm:text-center"> {/* MODIFIED: Font size, margin, text-alignment */}
              ยินดีต้อนรับสู่
            </h1>
            <p className="mt-1 sm:mt-2 text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 via-red-200 to-teal-300 modern-text-glow animate-pulse text-right sm:text-center"> {/* MODIFIED: Font size, margin, text-alignment */}
              สิงโตทองคำ 77
            </p>
            <p className="mt-2 sm:mt-4 text-xs sm:text-sm md:text-base lg:text-lg text-white/80 text-right sm:text-center"> {/* MODIFIED: Font size, margin, text-alignment */}
              เริ่มต้นการเดินทางสู่ความมั่งคั่งได้แล้ววันนี้!
            </p>
          </div>
          </div>
          
        

        <LotteryTypeGrid
          grouped={grouped}
          schedules={schedules}
          countries={countries}
        />
      </SidebarInset>
    </SidebarProvider>
  );
}