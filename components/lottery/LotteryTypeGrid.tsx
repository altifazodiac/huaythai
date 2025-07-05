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
import { motion, AnimatePresence } from "framer-motion";

// [Existing isOpenNow and dayOfWeekTH functions remain unchanged]
function isOpenNow(schedule: any): boolean {
  if (!schedule || !schedule.open_time || !schedule.close_time) {
    return false;
  }

  const now = new Date();
  const [openH, openM] = schedule.open_time.split(":").map(Number);
  const [closeH, closeM] = schedule.close_time.split(":").map(Number);

  const todayFullDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterdayFullDate = new Date(todayFullDate);
  yesterdayFullDate.setDate(todayFullDate.getDate() - 1);
  const tomorrowFullDate = new Date(todayFullDate);
  tomorrowFullDate.setDate(todayFullDate.getDate() + 1);

  const openTimeOnToday = new Date(todayFullDate.getFullYear(), todayFullDate.getMonth(), todayFullDate.getDate(), openH, openM, 0);
  const closeTimeOnToday = new Date(todayFullDate.getFullYear(), todayFullDate.getMonth(), todayFullDate.getDate(), closeH, closeM, 0);
  
  const openTimeOnYesterday = new Date(yesterdayFullDate.getFullYear(), yesterdayFullDate.getMonth(), yesterdayFullDate.getDate(), openH, openM, 0);
  const closeTimeOnTomorrow = new Date(tomorrowFullDate.getFullYear(), tomorrowFullDate.getMonth(), tomorrowFullDate.getDate(), closeH, closeM, 0);

  if (openTimeOnToday < closeTimeOnToday) {
    return now >= openTimeOnToday && now < closeTimeOnToday;
  } else {
    if (now >= openTimeOnYesterday && now < closeTimeOnToday) {
      return true;
    }
    if (now >= openTimeOnToday && now < closeTimeOnTomorrow) {
      return true;
    }
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

function dayOfWeekToEn(day: string): string {
  if (day && day.includes("ของเดือน")) {
    return day;
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
  return day.split(",").map(d_2 => map[d_2.trim()] || d_2.trim()).join(",");
}

type LotteryType = {
  lottery_type_id: number;
  type_name: string;
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
  const [showOpen, setShowOpen] = useState(true);

  const [currentInfoIdx, setCurrentInfoIdx] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 640);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (!isMobile) return;
    const interval = setInterval(() => {
      setCurrentInfoIdx((prev) => (prev + 1) % 3);
    }, 2000);
    return () => clearInterval(interval);
  }, [isMobile]);

  useEffect(() => {
    const fetchTypes = async () => {
      const { data } = await supabase.from("lottery_types").select("*");
      setTypes(data || []);
    };
    fetchTypes();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setShowOpen((prev) => !prev);
    }, 2500); // เปลี่ยนทุก 2.5 วินาที
    return () => clearInterval(interval);
  }, []);

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
  }, [grouped, schedules, filterOpen, filterCountry]);

  function isMonthlyDraw(schedule: any) {
    return schedule?.day_of_week?.includes("ของเดือน");
  }

  if (!mounted) return null;

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
        {filteredGrouped.every(group => group.subTypes.length === 0) ? (
          <div className="w-full flex flex-col items-center justify-center py-12">
            <span className="text-gray-400 text-lg font-medium">ไม่พบรายการที่ค้นหา</span>
          </div>
        ) : (
          filteredGrouped.map((group, idx) => (
            group.subTypes.length === 0 ? null : (
              <div key={group.lottery_type_id} className="mb-8">
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: idx * 0.05, type: "spring", bounce: 0.2 }}
                  viewport={{ once: true, amount: 0.3 }}
                  className="animated-gradient-bg border rounded-md flex items-center gap-3 px-2 py-1 mb-4"
                >
                  <Icon icon="mdi:flag" className="w-7 h-7 text-white dark:text-white" />
                  <span className="font-bold text-lg text-white dark:text-white">{group.type_name}</span>
                </motion.div>
                <div className="grid gap-3 grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
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

                    const infoItems = [
                      {
                        icon: <Calendar className="w-4 h-4 mr-1" />,
                        text: dayOfWeekTH(schedule?.day_of_week),
                      },
                      {
                        icon: <Clock className="w-3 h-3 mr-1" />,
                        text: `เปิดรับ ${schedule?.open_time?.slice(0,5) || "-"} น.`,
                      },
                      {
                        icon: <Clock className="w-3 h-3 mr-1" />,
                        text: `ปิดรับ ${schedule?.close_time?.slice(0,5) || "-"} น.`,
                      },
                    ];

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
                              if (isLoading) return;
                              setLoadingCardId(sub.lottery_sub_type_id);
                              const today = new Date();
                              const drawDateString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
                              const availableDraw = {
                                date: new Date(drawDateString).toISOString(),
                                schedule: scheduleWithDays,
                              };
                              router.push(`/lottery-orders?subType=${sub.lottery_sub_type_id}&draw=${encodeURIComponent(JSON.stringify(availableDraw))}`);
                            }}
                          >
                            <motion.div
                              initial={{ opacity: 0, y: 20 * ((idx % 2) ? 1 : -1), x: 20 * ((idx % 3) - 1) }}
                              whileInView={{ opacity: 1, y: 0, x: 0 }}
                              transition={{ duration: 0.3, delay: idx * 0.03, type: "spring", bounce: 0.2 }}
                              viewport={{ once: true, amount: 0.1 }}
                            >
                              <Card
                                className={`
                                  min-h-[140px] flex flex-col items-center
                                  ${isCurrentlyOpen
                                    ? 'animated-gradient-bg text-white'
                                    : 'bg-gray-100/50 text-gray-800 dark:text-gray-500 dark:bg-white/10 backdrop-blur-md'}
                                  border 
                                  shadow-lg transition-all duration-300
                                  hover:scale-105 hover:shadow-lg
                                  ${isCurrentlyOpen ? 'cursor-pointer' : 'opacity-100 cursor-default'}
                                `}
                                style={{
                                  animationDelay: `${idx * 80}ms`,
                                  animationFillMode: 'forwards',
                                }}
                              >
                                <div className={`w-full text-center rounded-t-sm  ${isCurrentlyOpen ? 'text-white dark:text-yellow-500' : 'text-gray-500 dark:text-gray-500'} py-1 shadow-sm`}>
                                  <h2 className="text-sm font-semibold tracking-wide flex items-center justify-center gap-1.5">
                                    <Ticket className="w-3.5 h-3.5" />
                                    {isCurrentlyOpen ? "เปิดรับ" : "ปิดรับแทง"}
                                  </h2>
                                </div>
                                <div className="w-full h-16 mb-1 animated-flag-light">
                                  <img
                                    src={countryFlagImg(sub.country_origin)}
                                    alt={sub.country_origin}
                                    className="w-full h-16 object-cover"
                                    loading="lazy"
                                    style={{ zIndex: 1, position: "relative" }}
                                  />
                                </div>
                                <div
                                  className={`
                                    font-bold text-sm  text-center flex items-center justify-center gap-0
                                    px-0 mb-2
                                    sm:px-0
                                    xs:px-2 
                                  `}
                                >
                                 
                                  {sub.sub_type_name}
                                </div>
                                <div className="text-[0.7rem] mt-1 text-center mb-1 px-0 xs:px-2">
                                  <div className="flex flex-col items-center justify-center text-xs mb-0.5 text-center gap-0 px-0 xs:px-0">
                                    {isMobile ? (
                                      <AnimatePresence mode="wait">
                                        <motion.div
                                          key={currentInfoIdx}
                                          initial={{ opacity: 0, y: 10 }}
                                          animate={{ opacity: 1, y: 0 }}
                                          exit={{ opacity: 0, y: -10 }}
                                          transition={{ duration: 0.2, ease: "easeInOut" }}
                                          className="min-h-[1.5em] flex items-center justify-center"
                                        >
                                          {infoItems[currentInfoIdx].icon}
                                          {infoItems[currentInfoIdx].text}
                                        </motion.div>
                                      </AnimatePresence>
                                    ) : (
                                      <>
                                        <div className="flex items-center justify-center gap-1 mb-0.5">
                                          {infoItems[0].icon}
                                          {infoItems[0].text}
                                        </div>
                                        <div className="flex items-center justify-center gap-3">
                                          <span className="flex items-center gap-1">
                                            {infoItems[1].icon}
                                            {infoItems[1].text}
                                          </span>
                                          <span className="flex items-center gap-1">
                                            {infoItems[2].icon}
                                            {infoItems[2].text}
                                          </span>
                                        </div>
                                      </>
                                    )}
                                  </div>
                                  {!isMonthlyDraw(schedule)
                                    ? <CountdownRow schedule={scheduleWithDays} isCurrentlyOpen={isCurrentlyOpen} />
                                    : (
                                      (() => {
                                        const today = new Date().getDate();
                                        if (today === 1 || today === 16) {
                                          return <CountdownRow schedule={scheduleWithDays} isCurrentlyOpen={isCurrentlyOpen} />;
                                        }
                                        return null;
                                      })()
                                    )
                                  }
                                </div>
                              </Card>
                              {isLoading && (
                                <div className="absolute inset-0 flex items-center justify-center bg-white/70 dark:bg-zinc-900/70 z-10 rounded-md">
                                  <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
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
            )
          ))
        )}
      </div>
    </>
  );
}