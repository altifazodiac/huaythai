import { createClient } from "@supabase/supabase-js";
import { Card, CardContent } from "@/components/ui/card";
import { AppSidebar } from "@/components/app-sidebar";
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
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const today = dayNames[now.getDay()];
  const days = schedule.day_of_week?.split(",").map((d: string) => d.trim()) || [];
  if (!days.includes(today)) return false;
  if (!schedule.open_time || !schedule.close_time) return false;
  const [openH, openM] = schedule.open_time.split(":");
  const [closeH, closeM] = schedule.close_time.split(":");
  const open = new Date(now);
  open.setHours(+openH, +openM, 0, 0);
  const close = new Date(now);
  close.setHours(+closeH, +closeM, 0, 0);
  return now >= open && now <= close;
}

export default async function Page() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

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
        <LotteryTypeGrid
          grouped={grouped}
          schedules={schedules}
          countries={countries}
        />
      </SidebarInset>
    </SidebarProvider>
  );
}