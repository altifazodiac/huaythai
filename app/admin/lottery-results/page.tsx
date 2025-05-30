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
      // Fallback sort if not primary inputs or both are primary/secondary
      return b.digit_number - a.digit_number || a.type_number.localeCompare(b.type_number);
    });

  const subTypeName = sch.lottery_sub_types && sch.lottery_sub_types.length > 0 
                      ? sch.lottery_sub_types[0].sub_type_name 
                      : "ไม่ระบุประเภทย่อย";

  // Group processedSubNumbers by digit_number for 2-column layout
  const groupedByDigits: Record<string, typeof processedSubNumbers> = {};
  processedSubNumbers.forEach(sn => {
    const groupTitle = `${sn.digit_number} ตัว`; // e.g., "3 ตัว", "2 ตัว", "1 ตัว"
    if (!groupedByDigits[groupTitle]) {
      groupedByDigits[groupTitle] = [];
    }
    groupedByDigits[groupTitle].push(sn);
  });

  // Define the order for displaying digit groups
  const digitGroupOrder = ["3 ตัว", "2 ตัว", "1 ตัว"];

  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [bulkText, setBulkText] = React.useState("");
  const [bulkPreview, setBulkPreview] = React.useState<{ subTypeName: string, top3: string, bottom2: string }[]>([]);

  // Parse bulkText to preview
  React.useEffect(() => {
    if (!drawerOpen) return;
    const lines = bulkText.split("\n").map(l => l.trim()).filter(Boolean);
    const preview: { subTypeName: string, top3: string, bottom2: string }[] = [];
    for (const line of lines) {
      // ตัวอย่าง: 513-86   dw ดาวโจนส์
      // ตัวอย่าง Regex ใหม่ (รูปแบบทั่วไปสำหรับ prefix):
const match = line.match(/(\d{3})-(\d{2})\s+(?:\b[a-zA-Z]{2,3}\w*\b\s*)?(.+)/i);

      if (match) {
        preview.push({
          top3: match[1],
          bottom2: match[2],
          subTypeName: match[3].trim(),
        });
      }
    }
    setBulkPreview(preview);
  }, [bulkText, drawerOpen]);

  return (
    <motion.div variants={cardVariants}>
      {/* Removed h-full to allow card to shrink if content is less */}
     <Card className={`flex flex-col overflow-hidden shadow-md hover:shadow-lg transition-shadow duration-200 border ${isSuccessfullySaved ? 'bg-green-50 dark:bg-green-900/30 border-green-300 dark:border-green-700' : 'border-slate-200'}`}>
        <CardHeader className="p-2 bg-slate-50 border-b border-slate-200 flex flex-row justify-between items-center"> {/* Smaller padding */}
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
            <Button
              variant="ghost"
              size="icon"
              className="w-6 h-6 flex-shrink-0"
              onClick={() => setDrawerOpen(true)}
              title="วางผลด่วนสำหรับรายการนี้"
            >
              {!isSuccessfullySaved && <MdContentPaste className="w-3.5 h-3.5" />}
            </Button>
          )}
        </CardHeader>
        <CardContent className="p-2 space-y-1.5 flex-grow"> {/* Smaller padding and space */}
          {digitGroupOrder.map(groupTitle => {
            const itemsInGroup = groupedByDigits[groupTitle];
            if (!itemsInGroup || itemsInGroup.length === 0) {
              return null; // Don't render group if no items
            }
            return (
              <div key={groupTitle} className="space-y-1"> {/* Space for the group itself */}
                <div className="flex items-center mb-1">
                  <h4 className="text-xs font-semibold text-slate-700 col-span-2 flex-1">{groupTitle}</h4>
                   
                </div>
                <Drawer open={drawerOpen} onOpenChange={setDrawerOpen} direction="right">
                  <DrawerContent className="max-w-md w-full">
                    <DrawerHeader>
                      <DrawerTitle>วางผลหวยด่วน</DrawerTitle>
                      <DrawerDescription>วางผลหวยดิบ เช่น 513-86   dw ดาวโจนส์\n513-86   dws ดาวโจนส์ STAR</DrawerDescription>
                    </DrawerHeader>
                    <div className="p-4 pt-0">
                      <textarea
                        className="w-full min-h-[100px] border rounded p-2 text-xs"
                        placeholder={`513-86   dw ดาวโจนส์\n513-86   dws ดาวโจนส์ STAR`}
                        value={bulkText}
                        onChange={e => setBulkText(e.target.value)}
                        autoFocus
                      />
                      <div className="mt-3">
                        <div className="font-semibold text-xs mb-1">Preview</div>
                        {bulkPreview.length === 0 && <div className="text-xs text-gray-400">ไม่มีข้อมูลที่ parse ได้</div>}
                        <ul className="space-y-1">
                          {bulkPreview.map((item, idx) => (
                            <li key={idx} className="text-xs text-gray-700">
                              <span className="font-bold">{item.subTypeName}:</span> 3_บน = <span className="text-blue-600">{item.top3}</span>, 2_ล่าง = <span className="text-pink-600">{item.bottom2}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                    <DrawerFooter>
                      <Button
                        type="button"
                        disabled={bulkPreview.length === 0}
                        onClick={() => {
                          if (onPasteResultForThisCard) {
                            // หา subTypeName ของ card นี้
                            const thisSubType = subTypeName;
                            const found = bulkPreview.find(item => item.subTypeName === thisSubType);
                            if (found) {
                             onPasteResultForThisCard({ top3: found.top3, bottom2: found.bottom2 });
                              setDrawerOpen(false);
                              setBulkText("");
                              toast.success(`วางผลสำหรับ ${thisSubType} แล้ว`);
                            } else {
                              toast.error(`ไม่พบข้อมูลสำหรับ "${thisSubType}" ในรายการที่วาง`);
                            }
                          } else {
                            console.warn("onPasteResultForThisCard is not defined for this card's drawer.");
                            }
                          
                        }}
                      >
                        เพิ่มข้อมูล
                      </Button>
                      <DrawerClose asChild>
                        <Button type="button" variant="outline">ยกเลิก</Button>
                      </DrawerClose>
                    </DrawerFooter>
                  </DrawerContent>
                </Drawer>
                <div className="grid grid-cols-2 gap-x-2 gap-y-1.5"> {/* 2-column grid with gaps */}
                  {itemsInGroup.map(sn => (
                    <div key={sn.id} className="space-y-0.5"> {/* Smaller space within item */}
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-medium text-gray-600">
                          {sn.type_number} {/* Show only type_number as digit is in group title */}
                        </span>
                        <span className="text-xs text-gray-400">
                          จ่าย {sn.price_paid}
                        </span>
                      </div>
                      <Input
                        className="flex-1 text-xs h-7 w-full rounded-md" // Smaller input height
                        placeholder="ผล"
                        value={resultInput?.[sn.key] || ""}
                        onChange={e => handleInputChange(sch.schedule_id, sn.key, e.target.value.trim())}
                        disabled={
                         isSuccessfullySaved || // Disable if successfully saved
                          !(sn.key === "3_บน" || sn.key === "2_ล่าง") || isSaving // Original logic
                        }
                        maxLength={sn.digit_number}
                        type="text"
                        pattern="\d*"
                      />
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </CardContent>
        <CardFooter className="p-2 border-t border-slate-100 bg-slate-50"> {/* Smaller padding */}
          <motion.div whileTap={{ scale: 0.97 }} className="w-full">
            <Button
              onClick={() => {
                if (isSuccessfullySaved) {
                  onEdit(sch.schedule_id);
                } else {
                  handleSave(sch);
                }
              }}
              disabled={isSaving}
              className={`w-full text-xs py-1 h-7 rounded-md transition-colors duration-150 ${
                isSuccessfullySaved
                   ? 'bg-amber-500 hover:bg-amber-600 text-white' // Edit button style
                  : 'bg-sky-600 hover:bg-sky-700 text-white'
              }`}>
              {isSaving ? "กำลังบันทึก..." : 
                isSuccessfullySaved ? (
                  <><Edit3 className="w-3 h-3 mr-1.5" />แก้ไข</>
                ) : (
                  "บันทึกผล"
                )}
            </Button>
          </motion.div>
        </CardFooter>
      </Card>
    </motion.div>
  );
};


// --- Main Page Component ---
export default function LotteryResultsPage() {
  // Supabase client instance
  const [supabase] = useState(() =>
    createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  );

  // State for data
  const [lotteryTypeDetails, setLotteryTypeDetails] = useState<Record<number, LotteryTypeDetail>>({});
  const [groupedSchedules, setGroupedSchedules] = useState<Record<string, GroupedScheduleInfo>>({});
  const [resultInputs, setResultInputs] = useState<{ [scheduleId: number]: any }>({});
  const [subNumbersMap, setSubNumbersMap] = useState<Record<number, SubNumber[]>>({});
  const [successfullySavedSchedules, setSuccessfullySavedSchedules] = useState<Set<number>>(new Set());
  // State for loading indicators
  const [pageIsLoading, setPageIsLoading] = useState(true);
  const [saveInProgressForScheduleId, setSaveInProgressForScheduleId] = useState<number | null>(null);
 const [isSavingAll, setIsSavingAll] = useState(false);
  // Drawer state สำหรับวางผลหวยด่วน
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [bulkPreview, setBulkPreview] = useState<{ subTypeName: string, top3: string, bottom2: string }[]>([]);

  // Parse bulkText to preview
  useEffect(() => {
    if (!drawerOpen) return;
    const lines = bulkText.split("\n").map(l => l.trim()).filter(Boolean);
    const preview: { subTypeName: string, top3: string, bottom2: string }[] = [];
    for (const line of lines) {
     
     const match = line.match(/(\d{3})-(\d{2})\s+(?:\b[a-zA-Z]{2,3}\w*\b\s*)?(.+)/i);
      if (match) {
        preview.push({
          top3: match[1],
          bottom2: match[2],
          subTypeName: match[3].trim(),
        });
      }
    }
    setBulkPreview(preview);
  }, [bulkText, drawerOpen]);

  // Effect to fetch initial data (lottery types, then schedules, then sub-numbers)
  useEffect(() => {
    // 1. Fetch Lottery Types
    const fetchLotteryTypes = async (): Promise<Record<number, LotteryTypeDetail>> => {
      const { data, error } = await supabase.from('lottery_types').select('lottery_type_id, type_name, description');
      if (error) {
        console.error("Error fetching lottery types:", error.message);
        return {};
      }
      const detailsMap: Record<number, LotteryTypeDetail> = {};
      (data || []).forEach(lt => {
        detailsMap[lt.lottery_type_id] = { 
          lottery_type_id: lt.lottery_type_id, 
          type_name: lt.type_name, 
          description: lt.description 
        };
      });
      setLotteryTypeDetails(detailsMap);
      return detailsMap;
    };

    // 2. Fetch Schedules and Group them by Lottery Type
      const fetchSchedulesAndGroup = async (fetchedLotteryTypes: Record<number, LotteryTypeDetail>): Promise<Record<string, GroupedScheduleInfo> | null> => {
      const today = new Date();
      const todayStr = today.toLocaleDateString('en-US', { weekday: 'long' }); // e.g., "Monday"
      const nowTime = today.toTimeString().slice(0, 5); // HH:MM format

      // Fetch schedules with their sub-type (which contains lottery_type_id)
      const { data: fetchedSchedulesData, error: schedulesError } = await supabase
        .from('drawing_schedules')
        .select('schedule_id, drawing_time, frequency_unit, day_of_week, lottery_sub_types(lottery_sub_type_id, sub_type_name, lottery_type_id)')
        .eq('is_active', true);

      if (schedulesError) {
        console.error("Error fetching schedules:", schedulesError.message);
        setGroupedSchedules({});
        return null;
      }
      if (!fetchedSchedulesData || fetchedSchedulesData.length === 0) {
        console.log("No active schedules found initially.");
        setGroupedSchedules({});
        return null;
      }

      // Cast fetchedSchedulesData to the correct type after fetching
      const fetchedSchedules = fetchedSchedulesData as any[];


      // Filter schedules based on current time and day
      const filteredSchedules: Schedule[] = fetchedSchedules.filter((sch: any) => {
        // Ensure lottery_sub_types is an array and has at least one element
        if (!sch.drawing_time || !sch.lottery_sub_types || sch.lottery_sub_types.length === 0) return false;
        if (sch.frequency_unit === 'day') return nowTime >= sch.drawing_time;
        if (sch.frequency_unit === 'week' && Array.isArray(sch.day_of_week) && sch.day_of_week.includes(todayStr)) return nowTime >= sch.drawing_time;
        return false;
      }).map(sch => ({ // Ensure the mapping matches the Schedule interface
        ...sch,
        lottery_sub_types: Array.isArray(sch.lottery_sub_types) ? sch.lottery_sub_types : [sch.lottery_sub_types].filter(Boolean) as ScheduleSubType[]
      }));


      // Group filtered schedules
      if (filteredSchedules.length > 0 && Object.keys(fetchedLotteryTypes).length > 0) {
        const groups: Record<string, GroupedScheduleInfo> = {};
        filteredSchedules.forEach(sch => {
          // Access the first element of lottery_sub_types array
          const subType = sch.lottery_sub_types[0];
          if (subType) {
            const typeId = subType.lottery_type_id;
            if (typeId && fetchedLotteryTypes[typeId]) {
              if (!groups[typeId.toString()]) {
                groups[typeId.toString()] = {
                  details: fetchedLotteryTypes[typeId],
                  schedules: []
                };
              }
              groups[typeId.toString()].schedules.push(sch);
            }
          }
        });
        setGroupedSchedules(groups);

        // Prepare to fetch sub-numbers for these relevant schedules
        const subTypeIds = filteredSchedules
          .map(sch => sch.lottery_sub_types[0]?.lottery_sub_type_id) // Access first element
          .filter((id): id is number => id !== null && id !== undefined);
        
        if (subTypeIds.length > 0) {
          await fetchSubNumbers(subTypeIds);
        } else {
          setSubNumbersMap({});
        }
        return groups; 
      } else {
        console.log("No schedules match current time/day or lottery types are missing.");
        setGroupedSchedules({});
        setSubNumbersMap({});
        return null;
      }
    };
    
    // 3. Fetch Sub-Numbers for the relevant sub-types
    const fetchSubNumbers = async (subTypeIds: number[]) => {
      const { data, error } = await supabase
        .from('lottery_sub_number')
            .select('id, digit_number, type_number, price_paid, lottery_sub_type_id')
        .in('lottery_sub_type_id', subTypeIds);

      if (error) {
            console.error('Error fetching sub numbers:', error.message);
            setSubNumbersMap({});
        return;
      }
        const map: Record<number, SubNumber[]> = {};
      (data || []).forEach((row: any) => {
        if (!map[row.lottery_sub_type_id]) map[row.lottery_sub_type_id] = [];
        map[row.lottery_sub_type_id].push(row);
      });
      setSubNumbersMap(map);
    };
const fetchExistingResultsAndSetStates = async (currentGroupedSchedules: Record<string, GroupedScheduleInfo>) => {
      const allScheduleIds = Object.values(currentGroupedSchedules)
        .flatMap(group => group.schedules.map(sch => sch.schedule_id));

      if (allScheduleIds.length === 0) return;

      const todayDateStr = format(new Date(), "yyyy-MM-dd");

      const { data: existingResults, error } = await supabase
        .from("lottery_results")
        .select("schedule_id, draw_time, prize_code, winning_number")
        .eq("draw_date", todayDateStr)
        .in("schedule_id", allScheduleIds);

      if (error) {
        toast.error("ไม่สามารถโหลดผลรางวัลที่บันทึกไว้ได้");
        return;
      }

      if (existingResults && existingResults.length > 0) {
        const newSavedSet = new Set<number>();
        const newResultInputs: { [scheduleId: number]: any } = {};
        existingResults.forEach(dbResult => {
          if (!newResultInputs[dbResult.schedule_id]) newResultInputs[dbResult.schedule_id] = {};
          newResultInputs[dbResult.schedule_id][dbResult.prize_code] = dbResult.winning_number;
          newSavedSet.add(dbResult.schedule_id);
        });
        setSuccessfullySavedSchedules(newSavedSet);
        setResultInputs(newResultInputs);
      }
    };
    // Orchestrate the data fetching process
    const loadInitialData = async () => {
        setPageIsLoading(true);
        const types = await fetchLotteryTypes();
        const currentGroupedSchedulesData = await fetchSchedulesAndGroup(types);

        if (currentGroupedSchedulesData && Object.keys(currentGroupedSchedulesData).length > 0) {
          const subTypeIds = Object.values(currentGroupedSchedulesData)
            .flatMap(group => group.schedules)
            .map(sch => sch.lottery_sub_types[0]?.lottery_sub_type_id)
            .filter((id): id is number => id !== null && id !== undefined);
          
          if (subTypeIds.length > 0) {
            await fetchSubNumbers(subTypeIds);
          }
          await fetchExistingResultsAndSetStates(currentGroupedSchedulesData);
        }
        setPageIsLoading(false);
    };

    loadInitialData();

  }, [supabase]);


  // Handler for input changes in result fields
  const handleInputChange = (scheduleId: number, key: string, value: string) => {
    setResultInputs(prev => {
      // Get the inputs for the specific scheduleId, or initialize if it doesn't exist
      const scheduleSpecificInputs = prev[scheduleId] ? { ...prev[scheduleId] } : {};

      // Update the field that was directly changed by the user with its raw (trimmed) value
      scheduleSpecificInputs[key] = value; 

      // Perform cascading updates based on the 'key' and sanitized 'value'
      // 'value' here is the already trimmed value from e.target.value.trim()
      const sanitizedMainValue = value.replace(/\D/g, ""); // Keep only digits for logic

      if (key === "3_บน") {
        // Ensure the primary field "3_บน" itself stores the sanitized, digits-only value
        scheduleSpecificInputs["3_บน"] = sanitizedMainValue;

        if (sanitizedMainValue.length === 3) {
          scheduleSpecificInputs["3_โต๊ด"] = getPermutations(sanitizedMainValue).join(",");
          scheduleSpecificInputs["2_บน"] = sanitizedMainValue.slice(1, 3); // Last two digits
          // Unique digits for "1_วิ่งบน"
          scheduleSpecificInputs["1_วิ่งบน"] = sanitizedMainValue.split("").filter((digit, index, self) => self.indexOf(digit) === index).join(",");
        } else {
          // Clear auto-filled fields if "3_บน" is not complete or is cleared
          scheduleSpecificInputs["3_โต๊ด"] = "";
          scheduleSpecificInputs["2_บน"] = "";
          scheduleSpecificInputs["1_วิ่งบน"] = "";
        }
      } else if (key === "2_ล่าง") {
        // Ensure the primary field "2_ล่าง" itself stores the sanitized, digits-only value
        scheduleSpecificInputs["2_ล่าง"] = sanitizedMainValue;

        if (sanitizedMainValue.length === 2) {
          // Unique digits for "1_วิ่งล่าง"
          scheduleSpecificInputs["1_วิ่งล่าง"] = sanitizedMainValue.split("").filter((digit, index, self) => self.indexOf(digit) === index).join(",");
        } else {
          // Clear auto-filled field if "2_ล่าง" is not complete or is cleared
          scheduleSpecificInputs["1_วิ่งล่าง"] = "";
        }
      }

      // Return the updated state for all schedules
      return {
      ...prev,
        [scheduleId]: scheduleSpecificInputs,
      };
    });
  };

  // Handler for saving lottery results
   const handleSave = async (sch: Schedule): Promise<boolean> => {
    if (!sch.lottery_sub_types || sch.lottery_sub_types.length === 0) {
        toast.error("ข้อมูลประเภทย่อยของหวยไม่สมบูรณ์ ไม่สามารถบันทึกได้");
       if (saveInProgressForScheduleId === sch.schedule_id) setSaveInProgressForScheduleId(null);
        return false;
    }
    const subTypeData = sch.lottery_sub_types[0];
    const subTypeId = subTypeData.lottery_sub_type_id;
    const typeId = subTypeData.lottery_type_id;
    const scheduleId = sch.schedule_id;
    const drawDate = format(new Date(), "yyyy-MM-dd");
    const drawTime = sch.drawing_time;
    const resultData = resultInputs[scheduleId] || {};

    const filteredResultData = Object.entries(resultData)
      .filter(([_, val]) => val !== "" && val !== null && val !== undefined);

    if (filteredResultData.length === 0) {
      toast.error("กรุณากรอกผลรางวัลอย่างน้อย 1 รายการ");
      return false;
    }

    setSaveInProgressForScheduleId(scheduleId);

    let hasError = false;
    for (const [prize_code, winning_number] of filteredResultData) {
      const { error } = await supabase.from("lottery_results").upsert({
        lottery_type_id: typeId,
        lottery_sub_type_id: subTypeId,
        schedule_id: scheduleId,
        draw_date: drawDate,
        draw_time: drawTime,
        prize_code,
        winning_number,
      }, { onConflict: 'schedule_id, draw_date, draw_time, prize_code' });
      if (error) {
        hasError = true;
        toast.error(`บันทึก ${prize_code} ผิดพลาด: ${error.message}`);
      }
    }

    setSaveInProgressForScheduleId(null);
    if (!hasError) {
      toast.success(`บันทึกผลสำหรับ ${subTypeData.sub_type_name} (${sch.drawing_time}) สำเร็จ!`);
      setSuccessfullySavedSchedules(prev => new Set(prev).add(scheduleId));
      return true;
    }
    return false;
  };
  // Helper to get schedules that have been modified and not yet saved
  const getSchedulesToSave = (): Schedule[] => {
    const schedulesToSave: Schedule[] = [];
    Object.values(groupedSchedules).forEach(group => {
      group.schedules.forEach(sch => {
        const inputsForThisSchedule = resultInputs[sch.schedule_id];
        // Check if there's any actual input value, not just an empty string or null
        const hasActualInput = inputsForThisSchedule && 
                               Object.values(inputsForThisSchedule)
                                     .some(val => val !== "" && val !== null && val !== undefined);

        if (hasActualInput && !successfullySavedSchedules.has(sch.schedule_id)) {
          schedulesToSave.push(sch);
        }
      });
    });
    return schedulesToSave;
  };

  const handleSaveAllModified = async () => {
    const schedulesToSave = getSchedulesToSave();
    if (schedulesToSave.length === 0) {
      toast.info("ไม่มีรายการที่แก้ไขและยังไม่ได้บันทึก");
      return;
    }

    setIsSavingAll(true);
    let successCount = 0;
    let errorCount = 0;

    toast.info(`กำลังเริ่มบันทึก ${schedulesToSave.length} รายการ...`);

    for (const sch of schedulesToSave) {
      const wasSuccessful = await handleSave(sch); // handleSave now returns boolean
      if (wasSuccessful) {
        successCount++;
      } else {
        errorCount++;
      }
    }

    setIsSavingAll(false);

    if (errorCount > 0 && successCount > 0) {
      toast.warning(`${successCount} รายการบันทึกสำเร็จ, ${errorCount} รายการมีข้อผิดพลาด`);
    } else if (errorCount > 0) {
      toast.error(`การบันทึก ${errorCount} รายการมีข้อผิดพลาด กรุณาตรวจสอบ`);
    } else if (successCount > 0) {
      toast.success(`บันทึกทั้งหมด ${successCount} รายการสำเร็จ!`);
    }
  };
  const handleEditSchedule = (scheduleId: number) => {
    setSuccessfullySavedSchedules(prev => {
      const newSet = new Set(prev);
      newSet.delete(scheduleId);
      return newSet;
    });
  };
 // Handler for pasting result from a specific card's drawer
  const handleCardSpecificPaste = (scheduleId: number, values: { top3: string, bottom2: string }) => {
    // Use existing handleInputChange to leverage its cascading logic
    handleInputChange(scheduleId, "3_บน", values.top3);
    handleInputChange(scheduleId, "2_ล่าง", values.bottom2);
  };
  // handlePasteBulkResult: เติมผลหวยในทุก Card ที่ match sub_type_name
  const handlePasteBulkResult = () => {
    if (bulkPreview.length === 0) {
      toast.info("ไม่มีข้อมูลที่ตรงตามรูปแบบในรายการที่วาง หรือรายการว่างเปล่า");
      setDrawerOpen(false); // Still close drawer
      setBulkText("");    // Still clear text
      return;
    }
    setResultInputs(prev => {
      let newInputs = { ...prev };
      bulkPreview.forEach(item => {
        // หา schedule ที่ตรงกับ subTypeName
        const foundSchedule = Object.values(groupedSchedules)
          .flatMap(group => group.schedules)
          .find(sch => sch.lottery_sub_types && sch.lottery_sub_types[0]?.sub_type_name === item.subTypeName);
        if (foundSchedule) {
          const prevInputs = newInputs[foundSchedule.schedule_id] ? { ...newInputs[foundSchedule.schedule_id] } : {};
          prevInputs["3_บน"] = item.top3;
          prevInputs["2_ล่าง"] = item.bottom2;
          // auto-fill logic
          if (item.top3 && item.top3.length === 3) {
            prevInputs["3_โต๊ด"] = getPermutations(item.top3).join(",");
            prevInputs["2_บน"] = item.top3.slice(1, 3);
            prevInputs["1_วิ่งบน"] = item.top3.split("").filter((digit, idx, self) => self.indexOf(digit) === idx).join(",");
          }
          if (item.bottom2 && item.bottom2.length === 2) {
            prevInputs["1_วิ่งล่าง"] = item.bottom2.split("").filter((digit, idx, self) => self.indexOf(digit) === idx).join(",");
          }
          newInputs[foundSchedule.schedule_id] = prevInputs;
        }
      });
      return newInputs;
    });
    setDrawerOpen(false);
    setBulkText("");
     toast.success("วางผลจากรายการด่วนเรียบร้อยแล้ว");
  };

  function getPermutations(str: string): string[] {
    if (str.length <= 1) return [str];
    let perms: string[] = [];
    for (let i = 0; i < str.length; i++) {
      const char = str[i];
      const rest = str.slice(0, i) + str.slice(i + 1);
      for (const perm of getPermutations(rest)) perms.push(char + perm);
    }
    // Ensure unique permutations and sort them
    return Array.from(new Set(perms)).sort();
  }
// Memoized count of schedules to save for the button label/disabled state
  const schedulesToSaveCount = React.useMemo(() => {
    let count = 0;
    Object.values(groupedSchedules).forEach(group => {
      group.schedules.forEach(sch => {
        const inputsForThisSchedule = resultInputs[sch.schedule_id];
        const hasActualInput = inputsForThisSchedule && 
                               Object.values(inputsForThisSchedule)
                                     .some(val => val !== "" && val !== null && val !== undefined);
        if (hasActualInput && !successfullySavedSchedules.has(sch.schedule_id)) {
          count++;
        }
      });
    });
    return count;
  }, [groupedSchedules, resultInputs, successfullySavedSchedules]);
  // --- Render Logic ---

  const renderSkeletons = () => (
    <div className="space-y-10">
      {[1, 2].map(i => ( 
        <div key={`skel-cat-${i}`}>
          <Skeleton className="h-7 w-1/3 mb-2 rounded-md" />
          <Skeleton className="h-4 w-2/3 mb-5 rounded-md" />
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(j => (
              // Adjusted skeleton card to roughly match new smaller card structure
              <div key={`skel-card-${i}-${j}`} className="rounded-lg border bg-card text-card-foreground shadow-sm">
                <Skeleton className="h-10 p-2 rounded-t-lg" /> {/* Smaller header */}
                <div className="p-2 space-y-1.5">  {/* Smaller content padding */}
                  {/* Skeleton for a group title */}
                  <Skeleton className="h-4 w-1/3 mb-1 rounded-md" />
                  {/* Skeleton for 2 items in a 2-column grid */}
                  <div className="grid grid-cols-2 gap-2">
                    <Skeleton className="h-10 w-full rounded-md" /> {/* Input + label roughly */}
                    <Skeleton className="h-10 w-full rounded-md" />
            </div>
                   {/* Skeleton for another group title (optional, or another set of items) */}
                  <Skeleton className="h-4 w-1/3 mb-1 mt-1 rounded-md" />
                  <div className="grid grid-cols-2 gap-2">
                    <Skeleton className="h-10 w-full rounded-md" />
                    <Skeleton className="h-10 w-full rounded-md" />
                  </div>
                </div>
                <Skeleton className="h-10 p-2 rounded-b-lg" /> {/* Smaller footer */}
            </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  if (pageIsLoading) {
    return (
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}
        className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8 bg-slate-50 min-h-screen"
      >
        <Skeleton className="h-8 w-1/4 mb-8 rounded-md" />
        {renderSkeletons()}
      </motion.div>
    );
  }

  if (Object.keys(groupedSchedules).length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}
        className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8 bg-slate-50 min-h-screen flex flex-col items-center justify-center text-center"
      >
        <h1 className="text-2xl font-bold mb-4 text-slate-700">กรอกผลรางวัล (หลังผลออก)</h1>
        <p className="text-slate-500 text-lg">ยังไม่มีรอบหวยที่สามารถกรอกผลได้ในขณะนี้</p>
        <p className="text-sm text-slate-400 mt-2">กรุณาตรวจสอบอีกครั้งในภายหลัง</p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}
      className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8 bg-slate-50 min-h-screen"
    >
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-slate-700">กรอกผลรางวัล (หลังผลออก)</h1>
        <div className="flex items-center space-x-2">
          <Button
            type="button"
            size="sm"
            variant="default"
            className="px-3 py-2 h-9 bg-green-600 hover:bg-green-700 text-white"
            onClick={handleSaveAllModified}
            disabled={isSavingAll || schedulesToSaveCount === 0}
          >
            {isSavingAll ? "กำลังบันทึกทั้งหมด..." : 
              (schedulesToSaveCount > 0 ? `บันทึกทั้งหมด (${schedulesToSaveCount})` : "บันทึกทั้งหมด")
            }
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="px-3 py-2 h-9"
            title="วางผลหวยด่วน"
            onClick={() => setDrawerOpen(true)}
          >
            <MdContentPaste className="text-lg mr-1.5" /> {/* Adjusted icon size and margin */}
            วางผลด่วน
          </Button>
        </div>
      </div>
      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen} direction="right">
        <DrawerContent className="max-w-md w-full">
          <DrawerHeader>
            <DrawerTitle>วางผลหวยด่วน</DrawerTitle>
            <DrawerDescription>วางผลหวยดิบ เช่น 513-86   dw ดาวโจนส์\n513-86   dws ดาวโจนส์ STAR</DrawerDescription>
          </DrawerHeader>
          <div className="p-4 pt-0">
            <textarea
              className="w-full min-h-[100px] border rounded p-2 text-xs"
              placeholder={`513-86   dw ดาวโจนส์\n513-86   dws ดาวโจนส์ STAR`}
              value={bulkText}
              onChange={e => setBulkText(e.target.value)}
              autoFocus
            />
            <div className="mt-3">
              <div className="font-semibold text-xs mb-1">Preview</div>
              {bulkPreview.length === 0 && <div className="text-xs text-gray-400">ไม่มีข้อมูลที่ parse ได้</div>}
              <ul className="space-y-1">
                {bulkPreview.map((item, idx) => (
                  <li key={idx} className="text-xs text-gray-700">
                    <span className="font-bold">{item.subTypeName}:</span> 3_บน = <span className="text-blue-600">{item.top3}</span>, 2_ล่าง = <span className="text-pink-600">{item.bottom2}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <DrawerFooter>
            <Button
              type="button"
              disabled={bulkPreview.length === 0}
              onClick={handlePasteBulkResult}
            >
              เพิ่มข้อมูล
            </Button>
            <DrawerClose asChild>
              <Button type="button" variant="outline">ยกเลิก</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
      <div className="space-y-10">
        {Object.entries(groupedSchedules).map(([typeId, group], categoryIndex) => (
          <motion.section
            key={typeId}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: categoryIndex * 0.1, ease: "easeOut" }}
          >
            <h2 className="text-xl font-semibold text-slate-700 mb-1.5">{group.details.type_name}</h2>
            {group.details.description && (
              <p className="text-sm text-slate-500 mb-5">{group.details.description}</p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {group.schedules.map(sch => {
                const subTypeData = sch.lottery_sub_types && sch.lottery_sub_types.length > 0 ? sch.lottery_sub_types[0] : null;
                const subTypeId = subTypeData?.lottery_sub_type_id;
                const currentSubNumbers = subTypeId ? subNumbersMap[subTypeId] || [] : [];
                const currentResultInput = resultInputs[sch.schedule_id];
                return (
                  <LotteryScheduleCard
                    key={sch.schedule_id}
                    sch={sch}
                    subNumbers={currentSubNumbers}
                    resultInput={currentResultInput}
                    handleInputChange={handleInputChange}
                    handleSave={handleSave}
                     isSaving={saveInProgressForScheduleId === sch.schedule_id}
                    isSuccessfullySaved={successfullySavedSchedules.has(sch.schedule_id)}
                     onEdit={handleEditSchedule}
                    onPasteResultForThisCard={(values) => 
                      handleCardSpecificPaste(sch.schedule_id, values)
                    }
                  />
        );
      })}
    </div>
          </motion.section>
        ))}
      </div>
    </motion.div>
  );
}