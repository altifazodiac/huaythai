"use client";
import { useState, useMemo, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { Icon } from "@iconify/react";
import CountdownRow from "@/components/lottery/CountdownRow";
import FilterBar from "@/components/lottery/FilterBar";
import { countryFlagImg } from "@/lib/utils/flags";
import BouncingCard from "@/components/lottery/BouncingCard";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles, Clock, Globe, Calendar, Ticket } from "lucide-react";
import { toast } from "sonner";
import { parseThaiDayOfWeek } from "@/lib/utils/date-utils";
import { supabase } from "@/lib/supabase/supabaseClient";
import { motion } from "framer-motion";

function isOpenNow(schedule: any): boolean {
  if (!schedule || !schedule.open_time || !schedule.close_time) {
    return false;
  }

  const now = new Date(); // เวลาปัจจุบัน
  const [openH, openM] = schedule.open_time.split(":").map(Number);
  const [closeH, closeM] = schedule.close_time.split(":").map(Number);

  // สร้าง object Date สำหรับวันนี้เมื่อวานนี้และพรุ่งนี้เพื่อใช้อ้างอิง
  const todayFullDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterdayFullDate = new Date(todayFullDate);
  yesterdayFullDate.setDate(todayFullDate.getDate() - 1);
  const tomorrowFullDate = new Date(todayFullDate);
  tomorrowFullDate.setDate(todayFullDate.getDate() + 1);

  // เวลาเปิดและปิดอ้างอิงตามวันที่ของ "วันนี้"
  const openTimeOnToday = new Date(todayFullDate.getFullYear(), todayFullDate.getMonth(), todayFullDate.getDate(), openH, openM, 0);
  const closeTimeOnToday = new Date(todayFullDate.getFullYear(), todayFullDate.getMonth(), todayFullDate.getDate(), closeH, closeM, 0);
  
  // เวลาเปิดของ "เมื่อวาน" และเวลาปิดของ "พรุ่งนี้"
  const openTimeOnYesterday = new Date(yesterdayFullDate.getFullYear(), yesterdayFullDate.getMonth(), yesterdayFullDate.getDate(), openH, openM, 0);
  const closeTimeOnTomorrow = new Date(tomorrowFullDate.getFullYear(), tomorrowFullDate.getMonth(), tomorrowFullDate.getDate(), closeH, closeM, 0);

  // ตรวจสอบว่าเป็นรอบที่เปิดและปิดในวันเดียวกัน (เช่น เปิด 09:00, ปิด 17:00)
  // โดยเปรียบเทียบเวลาเปิดของวันนี้กับเวลาปิดของวันนี้
  if (openTimeOnToday < closeTimeOnToday) { 
    // ถ้าเวลาเปิดน้อยกว่าเวลาปิด แสดงว่าเป็นรอบในวันเดียวกัน
    return now >= openTimeOnToday && now < closeTimeOnToday; // ใช้ < closeTimeOnToday เพื่อให้เวลาปิดเป็นแบบ exclusive (ไม่รวมวินาทีที่ปิดพอดี)
  } else { 
    // กรณีเป็นรอบข้ามคืน (เช่น เปิด 22:00 ปิด 02:00 หรือ เปิด 07:00 ปิด 03:00)
    // openTimeOnToday >= closeTimeOnToday

    // หน้าต่างที่ 1: รอบที่อาจจะเริ่มเมื่อวาน และสิ้นสุดวันนี้
    // ตัวอย่าง: เวลาปัจจุบันคือ วันพุธ 01:50 น. รอบหวยคือ เปิด 07:00 น. ปิด 03:00 น.
    // หน้าต่างนี้จะตรวจสอบรอบที่เปิด วันอังคาร 07:00 น. และปิด วันพุธ 03:00 น.
    // openTimeOnYesterday คือ อังคาร 07:00 น.
    // closeTimeOnToday คือ พุธ 03:00 น.
    if (now >= openTimeOnYesterday && now < closeTimeOnToday) {
      return true;
    }

    // หน้าต่างที่ 2: รอบที่อาจจะเริ่มวันนี้ และสิ้นสุดพรุ่งนี้
    // ตัวอย่าง: เวลาปัจจุบันคือ วันพุธ 23:00 น. รอบหวยคือ เปิด 22:00 น. ปิด 02:00 น.
    // หน้าต่างนี้จะตรวจสอบรอบที่เปิด วันพุธ 22:00 น. และปิด วันพฤหัสบดี 02:00 น.
    // openTimeOnToday คือ พุธ 22:00 น.
    // closeTimeOnTomorrow คือ พฤหัสบดี 02:00 น.
    if (now >= openTimeOnToday && now < closeTimeOnTomorrow) {
      return true;
    }
    
    // หากไม่เข้าเงื่อนไขใดๆ ข้างต้น แสดงว่าไม่ได้อยู่ในช่วงเปิดรับของรอบข้ามคืน
    return false;
  }
}
function dayOfWeekTH(days: string) {
  if (!days) return "";
  const arr = days.split(",").map(d => d.trim());
  if (arr.length === 5 && arr[0] === "Monday" && arr[4] === "Friday") return "จันทร์-ศุกร์";
  if (arr.length === 7) return "ทุกวัน";
  const map: Record<string, string> = {
    Monday: "จันทร์", Tuesday: "อังคาร", Wednesday: "พุธ",
    Thursday: "พฤหัส", Friday: "ศุกร์", Saturday: "เสาร์", Sunday: "อาทิตย์"
  };
  return arr.map(d => map[d] || d).join(", ");
}

// ในไฟล์ LotteryTypeGrid.tsx

function dayOfWeekToEn(day: string): string {
  // ตรวจสอบว่าเป็นประเภท "ของเดือน" ก่อนการแปลงอื่นๆ
  if (day && day.includes("ของเดือน")) {
    return day; // คืนค่าเดิมเพื่อให้ CountdownRow.tsx สามารถประมวลผลได้
  }

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
  day = day.replace(/วัน/g, "").trim();
  if (day === "ทุกวัน") return map["ทุกวัน"];
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
      return arr.map(d_1 => map[d_1]).join(",");
    }
  }
  // ไม่ต้องมีเงื่อนไข if (day.match(/ของเดือน/)) return "__MONTH_DAY__"; อีกต่อไป
  return day.split(",").map(d_2 => map[d_2.trim()] || d_2.trim()).join(",");
}

type LotteryType = {
  lottery_type_id: number;
  type_name: string;
  // ...field อื่นๆ
};

export default function LotteryTypeGrid({
  grouped,
  schedules,
  countries,
}: {
  grouped: any[];
  schedules: any[];
  countries: string[];
}) {
  const [filterOpen, setFilterOpen] = useState<null | boolean>(null);
  const [filterCountry, setFilterCountry] = useState<string>("all");
  const [loadingCardId, setLoadingCardId] = useState<string | null>(null);
  const router = useRouter();
  const [types, setTypes] = useState<LotteryType[]>([]);

  useEffect(() => {
    const fetchTypes = async () => {
      const { data } = await supabase.from("lottery_types").select("*");
      setTypes(data || []);
    };
    fetchTypes();
  }, []);

  // filter logic
  const filteredGrouped = useMemo(() => {
    return grouped.map(group => ({
      ...group,
      subTypes: group.subTypes.filter((sub: any) => {
        if (filterCountry !== "all" && sub.country_origin !== filterCountry) return false;
        const schedule = schedules.find(s => s.lottery_sub_type_id === sub.lottery_sub_type_id);
        const scheduleEn = schedule
          ? { ...schedule, day_of_week: dayOfWeekToEn(schedule.day_of_week) }
          : undefined;
        if (filterOpen === true && !isOpenNow(scheduleEn)) return false;
        if (filterOpen === false && isOpenNow(scheduleEn)) return false;
        return true;
      }),
    }));
  }, [grouped, schedules, filterOpen, filterCountry, dayOfWeekToEn]);

  return (
    <>
      <FilterBar
        countries={countries}
        onFilterChange={({ filterOpen, filterCountry }) => {
          setFilterOpen(filterOpen);
          setFilterCountry(filterCountry);
        }}
      />
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <h2 className="text-2xl font-semibold flex items-center gap-2 text-blue-800 dark:text-white ">
          <Sparkles className="text-yellow-200" /> ประเภทหวยทั้งหมด!
        </h2>
        <p className="text-sm text-gray-500 dark:text-white mb-2 ml-4 mt-[-14px]">คลิกที่ประเภทหวยเพื่อดูรายละเอียดการออกรางวัล</p>
        {filteredGrouped.map((group, idx) => (
          <div key={group.lottery_type_id} className="mb-8">
            <motion.div
              initial={{ opacity: 0, y: -30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: idx * 0.1, type: "spring", bounce: 0.3 }}
              viewport={{ once: true, amount: 0.5 }}
              className="
                bg-white dark:bg-zinc-900
                rounded-2xl
                shadow
                border border-gray-200 dark:border-zinc-700
                flex items-center gap-3
                px-5 py-3 mb-4
              "
            >
              <Icon icon="mdi:flag" className="w-7 h-7 text-blue-500" />
              <span className="font-bold text-lg text-blue-700 dark:text-white">{group.type_name}</span>
            </motion.div>
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {group.subTypes.map((sub: any, idx: number) => {
                const schedule = schedules.find(s => s.lottery_sub_type_id === sub.lottery_sub_type_id);
                const scheduleEn = schedule
                  ? { ...schedule, day_of_week: dayOfWeekToEn(schedule.day_of_week) }
                  : undefined;
                const scheduleWithDays = scheduleEn
                  ? { ...scheduleEn, days: parseThaiDayOfWeek(schedule.day_of_week) }
                  : undefined;
                const isCurrentlyOpen = isOpenNow(scheduleEn);
                const isLoading = loadingCardId === sub.lottery_sub_type_id;
                return (
                  <BouncingCard key={sub.lottery_sub_type_id} idx={idx} bouncing={isCurrentlyOpen}>
                    <div className="relative">
                      <div
                        className="block"
                        style={{ pointerEvents: isLoading ? "none" : "auto" }}
                        onClick={async (e) => {
                          e.preventDefault();

                          if (!isCurrentlyOpen) {
                            toast.error("ขออภัย ยังไม่เปิดรับแทงรายการนี้");
                            return;
                          }

                          if (isLoading) return; // Prevent multiple clicks if already loading

                          setLoadingCardId(sub.lottery_sub_type_id);
                          const today = new Date();
                          // Ensure the date is in YYYY-MM-DD format for consistency if needed by backend/query params
                          const drawDateString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
                          const availableDraw = {
                            date: new Date(drawDateString).toISOString(), // Keep as ISO string for consistency with LotteryTicketPage
                            schedule: scheduleWithDays,
                          };
                          router.push(`/lottery-ticket?subType=${sub.lottery_sub_type_id}&draw=${encodeURIComponent(JSON.stringify(availableDraw))}`);
                        }}
                      >
                        <motion.div
                          initial={{ opacity: 0, y: 40 * ((idx % 2) ? 1 : -1), x: 40 * ((idx % 3) - 1) }}
                          whileInView={{ opacity: 1, y: 0, x: 0 }}
                          transition={{ duration: 0.7, delay: idx * 0.08, type: "spring", bounce: 0.3 }}
                          viewport={{ once: true, amount: 0.2 }}
                        >
                          <Card
  className={`
    min-h-[180px] flex flex-col items-center
    ${isCurrentlyOpen
      ? 'animated-gradient-blue-bg text-white'
      : 'bg-[#f4f8fd] text-gray-800'}
    border border-gray-200
    rounded-2xl shadow
    transition-all duration-300
    hover:scale-105 hover:shadow-lg
    ${isCurrentlyOpen ? 'cursor-pointer' : 'opacity-100 cursor-default'}
  `}
  style={{
    animationDelay: `${idx * 80}ms`,
    animationFillMode: 'forwards',
  }}
>
  <div className={`w-full text-center rounded-t-2xl ${isCurrentlyOpen ? 'bg-blue-900 text-white' : 'bg-[#f4f8fd] text-gray-800'} py-2 shadow-sm`}>
    <h2 className="text-base font-semibold tracking-wide flex items-center justify-center gap-2">
      <Ticket className="w-4 h-4" />
      {isCurrentlyOpen ? "เปิดรับ" : "ปิดรับแทง"}
    </h2>
  </div>
  <div className="w-full h-20 mb-1 animated-flag-light">
    <img
      src={countryFlagImg(sub.country_origin)}
      alt={sub.country_origin}
      className="w-full h-20 object-cover "
      loading="lazy"
      style={{ zIndex: 1, position: "relative" }}
    />
  </div>
  <div className="font-bold text-base mb-0.5 text-center flex items-center justify-center gap-1">
    <Globe className="w-4 h-4" />
    {sub.sub_type_name}
  </div>
  <div className="text-xs mb-0.5 text-center flex items-center justify-center gap-1">
    <Calendar className="w-4 h-4" />
    {dayOfWeekTH(schedule?.day_of_week)}
  </div>
  <div className="text-xs mt-0.5 text-center mb-2">
    <div className="flex justify-center space-x-2 items-center">
      <span className="flex items-center gap-1">
        <Clock className="w-3 h-3" />
        เปิดรับ {schedule?.open_time?.slice(0,5) || "-"} น.
      </span>
      <span className="flex items-center gap-1">
        <Clock className="w-3 h-3" />
        ปิดรับ {schedule?.close_time?.slice(0,5) || "-"} น.
      </span>
    </div>
    <CountdownRow schedule={scheduleWithDays} isCurrentlyOpen={isCurrentlyOpen} />
  </div>
</Card>
                          {isLoading && (
                            <div className="absolute inset-0 flex items-center justify-center bg-white/70 dark:bg-zinc-900/70 z-10 rounded-md">
                              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                            </div>
                          )}
                        </motion.div>
                      </div>
                    </div>
                  </BouncingCard>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </>
  );
} 