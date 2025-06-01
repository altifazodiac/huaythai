export const dynamic = "force-dynamic";
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
        <div className="w-full px-4 py-6 relative">
          {/* ลูกบอล 7 */}
          <svg
            className="absolute left-8 top-4 w-14 h-14 drop-shadow-lg animate-bounce-slow"
            viewBox="0 0 64 64"
            fill="none"
            style={{ zIndex: 2 }}
          >
            <circle cx="32" cy="32" r="28" fill="white" stroke="#e5e7eb" strokeWidth="4" />
            <text x="32" y="40" textAnchor="middle" fontSize="1.8rem" fontWeight="bold" fill="#22223b" fontFamily="Kanit, sans-serif">7</text>
          </svg>
          {/* ลูกบอล 8 */}
          <svg
            className="absolute left-1/2 -top-8 w-20 h-20 drop-shadow-xl animate-bounce-slow"
            viewBox="0 0 64 64"
            fill="none"
            style={{ zIndex: 2, transform: "translateX(-50%)", animationDelay: "0.5s" }}
          >
            <circle cx="32" cy="32" r="30" fill="white" stroke="#e5e7eb" strokeWidth="4" />
            <text x="32" y="40" textAnchor="middle" fontSize="2rem" fontWeight="bold" fill="#22223b" fontFamily="Kanit, sans-serif">8</text>
          </svg>
          {/* ลูกบอล 9 */}
          <svg
            className="absolute right-10 top-8 w-12 h-12 drop-shadow-md animate-bounce-slow"
            viewBox="0 0 64 64"
            fill="none"
            style={{ zIndex: 2, animationDelay: "1s" }}
          >
            <circle cx="32" cy="32" r="24" fill="white" stroke="#e5e7eb" strokeWidth="4" />
            <text x="32" y="40" textAnchor="middle" fontSize="1.3rem" fontWeight="bold" fill="#22223b" fontFamily="Kanit, sans-serif">9</text>
          </svg>
          {/* ลูกบอล 7 (เล็ก) */}
          <svg
            className="absolute left-24 bottom-0 w-10 h-10 drop-shadow animate-bounce-slow"
            viewBox="0 0 64 64"
            fill="none"
            style={{ zIndex: 2, animationDelay: "1.3s" }}
          >
            <circle cx="32" cy="32" r="18" fill="white" stroke="#e5e7eb" strokeWidth="3" />
            <text x="32" y="40" textAnchor="middle" fontSize="1rem" fontWeight="bold" fill="#22223b" fontFamily="Kanit, sans-serif">7</text>
          </svg>
          {/* ลูกบอล 9 (เล็ก) */}
          <svg
            className="absolute right-32 bottom-2 w-8 h-8 drop-shadow animate-bounce-slow"
            viewBox="0 0 64 64"
            fill="none"
            style={{ zIndex: 2, animationDelay: "1.7s" }}
          >
            <circle cx="32" cy="32" r="14" fill="white" stroke="#e5e7eb" strokeWidth="2" />
            <text x="32" y="40" textAnchor="middle" fontSize="0.9rem" fontWeight="bold" fill="#22223b" fontFamily="Kanit, sans-serif">9</text>
          </svg>

          <div
            className="
              w-full mx-auto rounded-2xl shadow-2xl
              bg-gradient-to-r from-blue-800 via-blue-900 to-blue-800
              flex flex-col items-center justify-center
              py-10
              animate-fadein
              relative
            "
            style={{ minHeight: 180, zIndex: 1 }}
          >
            <h1 className="text-2xl md:text-3xl font-bold text-white drop-shadow-lg modern-text-glow mb-2 tracking-wide">
              ยินดีต้อนรับสู่
            </h1>
            <p className="mt-2 text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-pink-200 to-blue-200 modern-text-glow animate-pulse">
              หวยเศรษฐี 789
            </p>
            <p className="mt-4 text-base md:text-lg text-white/80">
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