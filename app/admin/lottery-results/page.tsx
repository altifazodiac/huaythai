"use client";
import React, { useEffect, useState } from "react";
import { createClient, SupabaseClient  } from "@supabase/supabase-js";
import { format } from "date-fns";
import { motion } from 'framer-motion';
import { MdContentPaste } from "react-icons/md";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerFooter,
  DrawerTitle,
  DrawerDescription,
  DrawerClose,
} from "@/components/ui/drawer";
import { CheckCircle2, Edit3 } from "lucide-react";
// Shadcn/UI Components - Ensure these paths are correct for your project
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

// --- TypeScript Interfaces ---
interface LotteryTypeDetail {
  lottery_type_id: number;
  type_name: string;
  description: string | null;
}

interface ScheduleSubType {
  lottery_sub_type_id: number;
  sub_type_name: string;
  lottery_type_id: number; // Crucial for grouping
}

interface Schedule {
  schedule_id: number;
  drawing_time: string;
  frequency_unit: 'day' | 'week';
  day_of_week?: string[]; // Assuming it's an array of strings like ["Monday", "Tuesday"]
  lottery_sub_types: ScheduleSubType[]; // Changed to an array of ScheduleSubType
  // Add other schedule properties if needed
}

interface SubNumber {
  id: number;
  digit_number: number;
  type_number: "บน" | "ล่าง" | "โต๊ด" | "วิ่งบน" | "วิ่งล่าง"; // Adjust as per your types
  price_paid: number;
  lottery_sub_type_id: number;
  // Add other sub_number properties if needed
}

interface GroupedScheduleInfo {
  details: LotteryTypeDetail;
  schedules: Schedule[];
}

// --- LotteryScheduleCard Component ---
interface LotteryScheduleCardProps {
  sch: Schedule;
  subNumbers: SubNumber[];
  resultInput: any; // Consider defining a more specific type
  handleInputChange: (scheduleId: number, key: string, value: string) => void;
  handleSave: (schedule: Schedule) => Promise<boolean>;
   isSaving: boolean;
  isSuccessfullySaved: boolean;
   onEdit: (scheduleId: number) => void;
  onPasteResultForThisCard?: (values: { top3: string, bottom2: string }) => void;
}

const LotteryScheduleCard: React.FC<LotteryScheduleCardProps> = ({
  sch,
  subNumbers,
  resultInput,
  handleInputChange,
  handleSave,
  isSaving,
 onEdit,
    isSuccessfullySaved,
  onPasteResultForThisCard,
}) => {
  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" } },
  };

  const processedSubNumbers = subNumbers
    .filter(sn => sn.price_paid !== 0)
    .map(sn => {
      const key = `${sn.digit_number}_${sn.type_number}`;
      const isEnabledInput = (sn.digit_number === 3 && sn.type_number === "บน") || (sn.digit_number === 2 && sn.type_number === "ล่าง");
      return { ...sn, isEnabledInput, key };
    })
    .sort((a, b) => {
      if (a.isEnabledInput && !b.isEnabledInput) return -1;
      if (!a.isEnabledInput && b.isEnabledInput) return 1;
      if (a.isEnabledInput && b.isEnabledInput) {
        if (a.key === "3_บน" && b.key === "2_ล่าง") return -1;
        if (a.key === "2_ล่าง" && b.key === "3_บน") return 1;
      }
      return b.digit_number - a.digit_number || a.type_number.localeCompare(b.type_number);
    });

  const subTypeName = sch.lottery_sub_types && sch.lottery_sub_types.length > 0 
                      ? sch.lottery_sub_types[0].sub_type_name 
                      : "ไม่ระบุประเภทย่อย";

  const groupedByDigits: Record<string, typeof processedSubNumbers> = {};
  processedSubNumbers.forEach(sn => {
    const groupTitle = `${sn.digit_number} ตัว`;
    if (!groupedByDigits[groupTitle]) {
      groupedByDigits[groupTitle] = [];
    }
    groupedByDigits[groupTitle].push(sn);
  });

  const digitGroupOrder = ["3 ตัว", "2 ตัว", "1 ตัว"];

  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [bulkText, setBulkText] = React.useState("");
  const [bulkPreview, setBulkPreview] = React.useState<{ subTypeName: string, top3: string, bottom2: string }[]>([]);

  React.useEffect(() => {
    if (!drawerOpen) return;
    const lines = bulkText.split("\n").map(l => l.trim()).filter(Boolean);
    const preview: { subTypeName: string, top3: string, bottom2: string }[] = [];
    for (const line of lines) {
const match = line.match(/(\d{3})-(\d{2})\s+(?:\b[a-zA-Z]{2,3}\w*\b\s*)?(.+)/i);
      if (match) {
        preview.push({ top3: match[1], bottom2: match[2], subTypeName: match[3].trim() });
      }
    }
    setBulkPreview(preview);
  }, [bulkText, drawerOpen]);

  return (
    <motion.div variants={cardVariants}>
     <Card className={`flex flex-col overflow-hidden shadow-md hover:shadow-lg transition-shadow duration-200 border ${isSuccessfullySaved ? 'bg-green-50 dark:bg-green-900/30 border-green-300 dark:border-green-700' : 'border-slate-200'}`}>
        <CardHeader className="p-2 bg-slate-50 border-b border-slate-200 flex flex-row justify-between items-center">
          <div className="flex-grow">
            <CardTitle className="text-xs font-semibold text-slate-800 truncate flex items-center">
              {isSuccessfullySaved && <CheckCircle2 className="w-3 h-3 text-green-600 mr-1.5 flex-shrink-0" />}
              {subTypeName}
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              รอบ: {sch.drawing_time}
            </CardDescription>
          </div>
          {(!isSuccessfullySaved || isSaving) && !isSaving && (
            <Button variant="ghost" size="icon" className="w-6 h-6 flex-shrink-0" onClick={() => setDrawerOpen(true)} title="วางผลด่วนสำหรับรายการนี้">
              {!isSuccessfullySaved && <MdContentPaste className="w-3.5 h-3.5" />}
            </Button>
          )}
        </CardHeader>
        <CardContent className="p-2 space-y-1.5 flex-grow">
          {digitGroupOrder.map(groupTitle => {
            const itemsInGroup = groupedByDigits[groupTitle];
            if (!itemsInGroup || itemsInGroup.length === 0) return null;
            
            return (
              <div key={groupTitle} className="space-y-1">
                <div className="flex items-center mb-1">
                  <h4 className="text-xs font-semibold text-slate-700 col-span-2 flex-1">{groupTitle}</h4>
                </div>
                <div className="grid grid-cols-2 gap-x-2 gap-y-1.5">
                  {itemsInGroup.map(sn => {
                    // ====================== ส่วนที่แก้ไขหลักอยู่ตรงนี้ ======================
                    const isMultiValuePrize = sn.key === '3_โต๊ด' || sn.key === '1_วิ่งบน' || sn.key === '1_วิ่งล่าง';
                    return (
                      <div key={sn.id} className="space-y-0.5">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-medium text-gray-600">{sn.type_number}</span>
                          <span className="text-xs text-gray-400">จ่าย {sn.price_paid}</span>
                      </div>
                        <Input
                          className="flex-1 text-xs h-7 w-full rounded-md"
                          placeholder="ผล"
                          value={(() => {
                            const rawValue = resultInput?.[sn.key] || '';
                            if (isMultiValuePrize) {
                              return rawValue; // แสดงค่า comma-separated ตรงๆ
                            }
                            // สำหรับรางวัลค่าเดี่ยว, ใช้ Logic เดิมเพื่อ format
                            const sanitized = typeof rawValue === 'string' ? rawValue.replace(/\D/g, '') : '';
                            return sanitized.slice(-sn.digit_number);
                          })()}
                          onChange={e => handleInputChange(sch.schedule_id, sn.key, e.target.value)}
                        disabled={
                            isSuccessfullySaved ||
                            isSaving ||
                            !(sn.key === "3_บน" || sn.key === "2_ล่าง")
                        }
                          // ถ้าเป็น multi-value ไม่ต้องจำกัดความยาว, ถ้าเป็น single-value ให้จำกัดตาม digit_number
                          maxLength={isMultiValuePrize ? undefined : sn.digit_number}
                        type="text"
                          // สำหรับ multi-value อนุญาตให้กรอก comma ได้ด้วย
                          pattern={isMultiValuePrize ? undefined : "\\d*"}
                      />
                    </div>
                    );
                    // ====================== สิ้นสุดส่วนแก้ไข ======================
                  })}
                </div>
              </div>
            );
          })}
        </CardContent>
        <CardFooter className="p-2 border-t border-slate-100 bg-slate-50">
          <motion.div whileTap={{ scale: 0.97 }} className="w-full">
            <Button
              onClick={() => isSuccessfullySaved ? onEdit(sch.schedule_id) : handleSave(sch)}
              disabled={isSaving}
              className={`w-full text-xs py-1 h-7 rounded-md transition-colors duration-150 ${isSuccessfullySaved ? 'bg-amber-500 hover:bg-amber-600 text-white' : 'bg-sky-600 hover:bg-sky-700 text-white'}`}
            >
              {isSaving ? "กำลังบันทึก..." : isSuccessfullySaved ? <><Edit3 className="w-3 h-3 mr-1.5" />แก้ไข</> : "บันทึกผล"}
            </Button>
          </motion.div>
        </CardFooter>
      </Card>
    </motion.div>
  );
};


// --- Main Page Component ---
export default function LotteryResultsPage() {
  const [supabase] = useState(() => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!));
  const [lotteryTypeDetails, setLotteryTypeDetails] = useState<Record<number, LotteryTypeDetail>>({});
  const [groupedSchedules, setGroupedSchedules] = useState<Record<string, GroupedScheduleInfo>>({});
  const [resultInputs, setResultInputs] = useState<{ [scheduleId: number]: any }>({});
  const [subNumbersMap, setSubNumbersMap] = useState<Record<number, SubNumber[]>>({});
  const [successfullySavedSchedules, setSuccessfullySavedSchedules] = useState<Set<number>>(new Set());
  const [pageIsLoading, setPageIsLoading] = useState(true);
  const [saveInProgressForScheduleId, setSaveInProgressForScheduleId] = useState<number | null>(null);
 const [isSavingAll, setIsSavingAll] = useState(false);
  const [selectedDate, setSelectedDate] = useState(() => format(new Date(), "yyyy-MM-dd"));

  useEffect(() => {
    const fetchLotteryTypes = async (): Promise<Record<number, LotteryTypeDetail>> => {
      const { data, error } = await supabase.from('lottery_types').select('lottery_type_id, type_name, description');
      if (error) { console.error("Error fetching lottery types:", error.message); return {}; }
      const detailsMap: Record<number, LotteryTypeDetail> = {};
      (data || []).forEach(lt => { detailsMap[lt.lottery_type_id] = { lottery_type_id: lt.lottery_type_id, type_name: lt.type_name, description: lt.description }; });
      setLotteryTypeDetails(detailsMap);
      return detailsMap;
    };

      const fetchSchedulesAndGroup = async (fetchedLotteryTypes: Record<number, LotteryTypeDetail>): Promise<Record<string, GroupedScheduleInfo> | null> => {
        const todayForComparison = new Date();
        todayForComparison.setHours(0, 0, 0, 0);
        const selectedDateObj = new Date(selectedDate);
        selectedDateObj.setHours(0, 0, 0, 0);
        const isViewingToday = selectedDateObj.getTime() === todayForComparison.getTime();
        const nowTime = format(new Date(), "HH:mm");
        const selectedDayOfWeek = format(new Date(selectedDate), 'EEEE');

        const { data: fetchedSchedulesData, error: schedulesError } = await supabase.from('drawing_schedules').select('schedule_id, drawing_time, frequency_unit, day_of_week, lottery_sub_types(lottery_sub_type_id, sub_type_name, lottery_type_id)').eq('is_active', true);
        if (schedulesError) { console.error("Error fetching schedules:", schedulesError.message); setGroupedSchedules({}); return null; }
        if (!fetchedSchedulesData || fetchedSchedulesData.length === 0) { setGroupedSchedules({}); return null; }

      const fetchedSchedules = fetchedSchedulesData as any[];
      const filteredSchedules: Schedule[] = fetchedSchedules.filter((sch: any) => {
        if (!sch.drawing_time || !sch.lottery_sub_types || sch.lottery_sub_types.length === 0) return false;
            const timeCondition = isViewingToday ? nowTime >= sch.drawing_time : true;
            if (sch.frequency_unit === 'day') return timeCondition;
            if (sch.frequency_unit === 'week' && Array.isArray(sch.day_of_week) && sch.day_of_week.includes(selectedDayOfWeek)) return timeCondition;
        return false;
        }).map(sch => ({ ...sch, lottery_sub_types: Array.isArray(sch.lottery_sub_types) ? sch.lottery_sub_types : [sch.lottery_sub_types].filter(Boolean) as ScheduleSubType[] }));

      if (filteredSchedules.length > 0 && Object.keys(fetchedLotteryTypes).length > 0) {
        const groups: Record<string, GroupedScheduleInfo> = {};
        filteredSchedules.forEach(sch => {
          const subType = sch.lottery_sub_types[0];
          if (subType) {
            const typeId = subType.lottery_type_id;
            if (typeId && fetchedLotteryTypes[typeId]) {
                        if (!groups[typeId.toString()]) { groups[typeId.toString()] = { details: fetchedLotteryTypes[typeId], schedules: [] }; }
              groups[typeId.toString()].schedules.push(sch);
            }
          }
        });
        setGroupedSchedules(groups);
            const subTypeIds = filteredSchedules.map(sch => sch.lottery_sub_types[0]?.lottery_sub_type_id).filter((id): id is number => id !== null && id !== undefined);
            if (subTypeIds.length > 0) { await fetchSubNumbers(subTypeIds); } else { setSubNumbersMap({}); }
            return groups;
        } else {
        setGroupedSchedules({});
        setSubNumbersMap({});
        return null;
      }
    };
    
    const fetchSubNumbers = async (subTypeIds: number[]) => {
      const { data, error } = await supabase.from('lottery_sub_number').select('id, digit_number, type_number, price_paid, lottery_sub_type_id').in('lottery_sub_type_id', subTypeIds);
      if (error) { console.error('Error fetching sub numbers:', error.message); setSubNumbersMap({}); return; }
        const map: Record<number, SubNumber[]> = {};
      (data || []).forEach((row: any) => {
        if (!map[row.lottery_sub_type_id]) map[row.lottery_sub_type_id] = [];
        map[row.lottery_sub_type_id].push(row);
      });
      setSubNumbersMap(map);
    };

const fetchExistingResultsAndSetStates = async (currentGroupedSchedules: Record<string, GroupedScheduleInfo>) => {
      const allScheduleIds = Object.values(currentGroupedSchedules).flatMap(group => group.schedules.map(sch => sch.schedule_id));
      if (allScheduleIds.length === 0) return;

      const { data: existingResults, error } = await supabase.from("lottery_results").select("schedule_id, prize_code, winning_number").eq("draw_date", selectedDate).in("schedule_id", allScheduleIds);
      if (error) { toast.error("ไม่สามารถโหลดผลรางวัลที่บันทึกไว้ได้"); return; }

      if (existingResults && existingResults.length > 0) {
        const newSavedSet = new Set<number>();
        const newResultInputs: { [scheduleId: number]: any } = {};
          const mapDbPrizeCodeToComponentKey = (prizeCode: string): string | null => {
              switch (prizeCode) {
                  case '3 ตัวบน': return '3_บน';
                  case '2 ตัวล่าง': return '2_ล่าง';
                  case '3 ตัวโต๊ด': return '3_โต๊ด';   
                  case '2 ตัวบน': return '2_บน';
                  case 'วิ่งบน': return '1_วิ่งบน';
                  case 'วิ่งล่าง': return '1_วิ่งล่าง';
                  default: return null;
              }
          };
        existingResults.forEach(dbResult => {
              if (!newResultInputs[dbResult.schedule_id]) { newResultInputs[dbResult.schedule_id] = {}; }
              const componentKey = mapDbPrizeCodeToComponentKey(dbResult.prize_code);
              if (componentKey) {
                  newResultInputs[dbResult.schedule_id][componentKey] = dbResult.winning_number;
              }
          newSavedSet.add(dbResult.schedule_id);
        });
        setSuccessfullySavedSchedules(newSavedSet);
        setResultInputs(newResultInputs);
      } else {
          setSuccessfullySavedSchedules(new Set());
          setResultInputs({});
      }
    };
    
    const loadInitialData = async () => {
        setPageIsLoading(true);
        setGroupedSchedules({});
        setResultInputs({});
        setSuccessfullySavedSchedules(new Set());
        const types = await fetchLotteryTypes();
        const currentGroupedSchedulesData = await fetchSchedulesAndGroup(types);
        if (currentGroupedSchedulesData && Object.keys(currentGroupedSchedulesData).length > 0) {
          await fetchExistingResultsAndSetStates(currentGroupedSchedulesData);
        }
        setPageIsLoading(false);
    };

    loadInitialData();

  }, [supabase, selectedDate]);


  const handleInputChange = (scheduleId: number, key: string, value: string) => {
    setResultInputs(prev => {
      const scheduleSpecificInputs = prev[scheduleId] ? { ...prev[scheduleId] } : {};
      const isMultiValuePrize = key === '3_โต๊ด' || key === '1_วิ่งบน' || key === '1_วิ่งล่าง';

      // สำหรับ multi-value, รับค่าที่อาจมี comma, สำหรับ single-value, เอาเฉพาะตัวเลข
      scheduleSpecificInputs[key] = isMultiValuePrize ? value.replace(/[^0-9,]/g, '') : value.replace(/\D/g, "");

      const sanitizedMainValue = scheduleSpecificInputs[key];

      if (key === "3_บน") {
        if (sanitizedMainValue.length === 3) {
          scheduleSpecificInputs["3_โต๊ด"] = getPermutations(sanitizedMainValue).join(",");
          scheduleSpecificInputs["2_บน"] = sanitizedMainValue.slice(-2);
          scheduleSpecificInputs["1_วิ่งบน"] = [...new Set(sanitizedMainValue.split(""))].join(",");
        } else {
          scheduleSpecificInputs["3_โต๊ด"] = "";
          scheduleSpecificInputs["2_บน"] = "";
          scheduleSpecificInputs["1_วิ่งบน"] = "";
        }
      } else if (key === "2_ล่าง") {
        if (sanitizedMainValue.length === 2) {
          scheduleSpecificInputs["1_วิ่งล่าง"] = [...new Set(sanitizedMainValue.split(""))].join(",");
        } else {
          scheduleSpecificInputs["1_วิ่งล่าง"] = "";
        }
      }
      return { ...prev, [scheduleId]: scheduleSpecificInputs };
    });
  };

   const handleSave = async (sch: Schedule): Promise<boolean> => {
    if (!sch.lottery_sub_types || sch.lottery_sub_types.length === 0) {
        toast.error("ข้อมูลประเภทย่อยของหวยไม่สมบูรณ์"); return false;
    }
    const subTypeData = sch.lottery_sub_types[0];
    const resultData = resultInputs[sch.schedule_id] || {};
    const prizeKeyMapping = { '3_บน': '3 ตัวบน', '2_ล่าง': '2 ตัวล่าง', '3_โต๊ด': '3 ตัวโต๊ด', '2_บน': '2 ตัวบน', '1_วิ่งบน': 'วิ่งบน', '1_วิ่งล่าง': 'วิ่งล่าง' };
    
    const upsertPayload = Object.entries(resultData)
      .filter(([_, val]) => val !== "" && val !== null && val !== undefined)
      .map(([key, winning_number]) => {
          const prize_code = prizeKeyMapping[key as keyof typeof prizeKeyMapping];
          if (!prize_code) return null;
          return {
              lottery_type_id: subTypeData.lottery_type_id,
              lottery_sub_type_id: subTypeData.lottery_sub_type_id,
              schedule_id: sch.schedule_id,
              draw_date: selectedDate,
              draw_time: sch.drawing_time,
              prize_code: prize_code,
              winning_number: String(winning_number),
          };
      }).filter(Boolean);

    if (upsertPayload.length === 0) { toast.error("กรุณากรอกผลรางวัล"); return false; }

    setSaveInProgressForScheduleId(sch.schedule_id);

    const { error } = await supabase.from("lottery_results").upsert(upsertPayload, { onConflict: 'schedule_id, draw_date, draw_time, prize_code' });

    setSaveInProgressForScheduleId(null);
    if (error) { toast.error(`บันทึกผิดพลาด: ${error.message}`); return false; }

    toast.success(`บันทึกผลสำหรับ ${subTypeData.sub_type_name} สำเร็จ!`);
    setSuccessfullySavedSchedules(prev => new Set(prev).add(sch.schedule_id));
      return true;
  };
  
  const handleEditSchedule = (scheduleId: number) => {
    setSuccessfullySavedSchedules(prev => {
      const newSet = new Set(prev);
      newSet.delete(scheduleId);
      return newSet;
    });
  };

  function getPermutations(str: string): string[] {
    if (str.length <= 1) return [str];
    let perms: string[] = [];
    for (let i = 0; i < str.length; i++) {
      const char = str[i];
      const rest = str.slice(0, i) + str.slice(i + 1);
      for (const perm of getPermutations(rest)) perms.push(char + perm);
    }
    return Array.from(new Set(perms)).sort();
  }

  const renderSkeletons = () => (
    <div className="space-y-10">
      {[1, 2].map(i => ( 
        <div key={`skel-cat-${i}`}>
          <Skeleton className="h-7 w-1/3 mb-2 rounded-md" />
          <Skeleton className="h-4 w-2/3 mb-5 rounded-md" />
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(j => (
              <div key={`skel-card-${i}-${j}`} className="rounded-lg border bg-card text-card-foreground shadow-sm">
                <Skeleton className="h-10 p-2 rounded-t-lg" />
                <div className="p-2 space-y-1.5">
                  <Skeleton className="h-4 w-1/3 mb-1 rounded-md" />
                  <div className="grid grid-cols-2 gap-2">
                    <Skeleton className="h-10 w-full rounded-md" />
                    <Skeleton className="h-10 w-full rounded-md" />
            </div>
                  <Skeleton className="h-4 w-1/3 mb-1 mt-1 rounded-md" />
                  <div className="grid grid-cols-2 gap-2">
                    <Skeleton className="h-10 w-full rounded-md" />
                    <Skeleton className="h-10 w-full rounded-md" />
                  </div>
                </div>
                <Skeleton className="h-10 p-2 rounded-b-lg" />
            </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  if (pageIsLoading) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8 bg-slate-50 min-h-screen">
        <div className="flex items-center gap-3 mb-8">
            <h1 className="text-2xl font-bold text-slate-700">กรอกผลรางวัล</h1>
            <Input type="date" value={selectedDate} disabled className="ml-2 w-[140px] h-9 text-xs" />
        </div>
        {renderSkeletons()}
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8 bg-slate-50 min-h-screen">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-2">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-slate-700">กรอกผลรางวัล</h1>
          <Input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="ml-2 w-[140px] h-9 text-xs border-slate-300" max={format(new Date(), "yyyy-MM-dd")} />
        </div>
      </div>
      
      {Object.keys(groupedSchedules).length === 0 ? (
        <div className="text-center py-20">
          <p className="text-slate-500 text-lg">ยังไม่มีรอบหวยสำหรับวันที่เลือก</p>
          <p className="text-sm text-slate-400 mt-2">กรุณาเลือกวันอื่น หรือตรวจสอบอีกครั้งในภายหลัง</p>
            </div>
      ) : (
      <div className="space-y-10">
        {Object.entries(groupedSchedules).map(([typeId, group], categoryIndex) => (
          <motion.section
            key={typeId}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: categoryIndex * 0.1 }}
          >
            <h2 className="text-xl font-semibold text-slate-700 mb-1.5">{group.details.type_name}</h2>
              {group.details.description && <p className="text-sm text-slate-500 mb-5">{group.details.description}</p>}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {group.schedules.map(sch => {
                  const subTypeId = sch.lottery_sub_types[0]?.lottery_sub_type_id;
                return (
                  <LotteryScheduleCard
                    key={sch.schedule_id}
                    sch={sch}
                      subNumbers={subTypeId ? subNumbersMap[subTypeId] || [] : []}
                      resultInput={resultInputs[sch.schedule_id]}
                    handleInputChange={handleInputChange}
                    handleSave={handleSave}
                     isSaving={saveInProgressForScheduleId === sch.schedule_id}
                    isSuccessfullySaved={successfullySavedSchedules.has(sch.schedule_id)}
                     onEdit={handleEditSchedule}
                  />
        );
      })}
    </div>
          </motion.section>
        ))}
      </div>
      )}
    </motion.div>
  );
}