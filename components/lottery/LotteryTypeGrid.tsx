"use client";
import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { Icon } from "@iconify/react";
import CountdownRow from "@/components/lottery/CountdownRow";
import FilterBar from "@/components/lottery/FilterBar";
import { countryFlagImg } from "@/lib/utils/flags";
import BouncingCard from "@/components/lottery/BouncingCard";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

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
      return arr.map(d => map[d]).join(",");
    }
  }
  if (day.match(/ของเดือน/)) return "__MONTH_DAY__";
  return day.split(",").map(d => map[d.trim()] || d.trim()).join(",");
}

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
        {filteredGrouped.map(group => (
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
                const isLoading = loadingCardId === sub.lottery_sub_type_id;
                return (
                  <BouncingCard key={sub.lottery_sub_type_id} idx={idx} bouncing={isOpenNow(scheduleEn)}>
                    <div className="relative">
                      <div
                        className="block"
                        style={{ pointerEvents: isLoading ? "none" : "auto" }}
                        onClick={async (e) => {
                          e.preventDefault();
                          setLoadingCardId(sub.lottery_sub_type_id);
                          const today = new Date();
                          const drawDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
                          const availableDraw = {
                            date: drawDate.toISOString(),
                            schedule: scheduleEn
                          };
                          router.push(`/lottery-ticket?subType=${sub.lottery_sub_type_id}&draw=${encodeURIComponent(JSON.stringify(availableDraw))}`);
                        }}
                      >
                        <Card
                          className="min-h-[220px] flex flex-col items-center shadow-md border border-gray-200 max-w-xs w-full mx-auto bg-white dark:bg-zinc-900 transition-all duration-500 ease-out opacity-0 translate-y-4 animate-fadein cursor-pointer hover:shadow-lg"
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
                            src={countryFlagImg(sub.country_origin)}
                            alt={sub.country_origin}
                            className="w-full h-20 object-cover mb-1"
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
                        {isLoading && (
                          <div className="absolute inset-0 flex items-center justify-center bg-white/70 dark:bg-zinc-900/70 z-10 rounded-md">
                            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                          </div>
                        )}
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