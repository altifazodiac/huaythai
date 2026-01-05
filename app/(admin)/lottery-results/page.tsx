"use client";
import React, { useEffect, useState, useRef } from "react";
import { format } from "date-fns";
import { motion, easeInOut } from 'framer-motion';
import { MdContentPaste } from "react-icons/md";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { CheckCircle2, Edit3, Save, ClipboardPaste, Loader2, Search, Filter, X } from "lucide-react";
// Shadcn/UI Components - Ensure these paths are correct for your project
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
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
import { useAuth } from "@/lib/contexts/AuthContext"; // 🔧 **ใหม่**: นำเข้า useAuth

// --- TypeScript Interfaces ---
interface LotteryTypeDetail {
  lottery_type_id: number;
  type_name: string;
  description: string | null;
}

interface LotterySubType {
  lottery_sub_type_id: number;
  sub_type_name: string;
  lottery_type_id: number;
  description?: string | null;
  country_origin?: string;
  is_active?: boolean;
}

interface SubNumber {
  id: number;
  digit_number: number;
  type_number: "บน" | "ล่าง" | "โต๊ด" | "วิ่งบน" | "วิ่งล่าง"; // Adjust as per your types
  price_paid: number;
  lottery_sub_type_id: number;
  // Add other sub_number properties if needed
}

interface GroupedSubTypeInfo {
  details: LotteryTypeDetail;
  subTypes: LotterySubType[];
}

// --- LotterySubTypeCard Component ---
interface LotterySubTypeCardProps {
  subType: LotterySubType;
  subNumbers: SubNumber[];
  resultInput: any; // Consider defining a more specific type
  handleInputChange: (subTypeId: number, key: string, value: string) => void;
  handleSave: (subType: LotterySubType) => Promise<boolean>;
  isSaving: boolean;
  isSuccessfullySaved: boolean;
  onEdit: (subTypeId: number) => void;
  onPasteResultForThisCard?: (values: { top3: string, bottom2: string }) => void;
}

const LotterySubTypeCard: React.FC<LotterySubTypeCardProps> = ({
  subType,
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
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: easeInOut }
    }
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
     <Card className={`flex flex-col overflow-hidden shadow-md hover:shadow-lg transition-shadow duration-200 border ${isSuccessfullySaved ? 'bg-red-50 dark:bg-red-900/30 border-red-300 dark:border-red-700' : 'border-border'}`}>
        <CardHeader className="p-2 bg-muted border-b border-border flex flex-row justify-between items-center">
          <div className="flex-grow">
            <CardTitle className="text-xs font-semibold text-foreground truncate flex items-center">
              {isSuccessfullySaved && <CheckCircle2 className="w-3 h-3 text-red-600 mr-1.5 flex-shrink-0" />}
              {subType.sub_type_name}
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              {subType.country_origin || 'ไม่ระบุประเทศ'}
              {subType.description && ` • ${subType.description}`}
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
                  <h4 className="text-xs font-semibold text-foreground col-span-2 flex-1">{groupTitle}</h4>
                </div>
                <div className="grid grid-cols-2 gap-x-2 gap-y-1.5">
                  {itemsInGroup.map(sn => {
                    // ====================== ส่วนที่แก้ไขหลักอยู่ตรงนี้ ======================
                    const isMultiValuePrize = sn.key === '3_โต๊ด' || sn.key === '1_วิ่งบน' || sn.key === '1_วิ่งล่าง';
                    return (
                      <div key={sn.id} className="space-y-0.5">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-medium text-muted-foreground">{sn.type_number}</span>
                          <span className="text-xs text-muted-foreground/70">จ่าย {sn.price_paid}</span>
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
                          onChange={e => handleInputChange(subType.lottery_sub_type_id, sn.key, e.target.value)}
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
        <CardFooter className="p-2 border-t border-border bg-muted">
          <motion.div whileTap={{ scale: 0.97 }} className="w-full">
            <Button
              onClick={() => isSuccessfullySaved ? onEdit(subType.lottery_sub_type_id) : handleSave(subType)}
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
  const { supabase } = useAuth(); // 🔧 **แก้ไข**: ใช้ supabase จาก AuthContext
  const [lotteryTypeDetails, setLotteryTypeDetails] = useState<Record<number, LotteryTypeDetail>>({});
  const [groupedSubTypes, setGroupedSubTypes] = useState<Record<string, GroupedSubTypeInfo>>({});
  const [resultInputs, setResultInputs] = useState<{ [subTypeId: number]: any }>({});
  const [subNumbersMap, setSubNumbersMap] = useState<Record<number, SubNumber[]>>({});
  const [successfullySavedSubTypes, setSuccessfullySavedSubTypes] = useState<Set<number>>(new Set());
  const [pageIsLoading, setPageIsLoading] = useState(true);
  const [saveInProgressForSubTypeId, setSaveInProgressForSubTypeId] = useState<number | null>(null);
  const [isSavingAll, setIsSavingAll] = useState(false);
  const [isBulkPasteOpen, setIsBulkPasteOpen] = useState(false);
  const [bulkPasteText, setBulkPasteText] = useState("");
  const [selectedDate, setSelectedDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // 🔧 **ใหม่**: State สำหรับการค้นหาและกรอง
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCountry, setFilterCountry] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all"); // all, saved, unsaved
  const [filterLotteryType, setFilterLotteryType] = useState<string>("all");

  useEffect(() => {
    if (!supabase) return; // 🔧 **ใหม่**: รอให้ supabase พร้อมใช้งาน

    const fetchLotteryTypes = async (): Promise<Record<number, LotteryTypeDetail>> => {
      const { data, error } = await supabase.from('lottery_types').select('lottery_type_id, type_name, description');
      if (error) { console.error("Error fetching lottery types:", error.message); return {}; }
      const detailsMap: Record<number, LotteryTypeDetail> = {};
      (data || []).forEach(lt => { detailsMap[lt.lottery_type_id] = { lottery_type_id: lt.lottery_type_id, type_name: lt.type_name, description: lt.description }; });
      setLotteryTypeDetails(detailsMap);
      return detailsMap;
    };

    const fetchAllSubTypesAndGroup = async (fetchedLotteryTypes: Record<number, LotteryTypeDetail>): Promise<Record<string, GroupedSubTypeInfo> | null> => {
      // ดึงข้อมูล lottery_sub_types ทั้งหมด (ไม่กรอง is_active เพื่อให้ได้ 77 รายการ)
      const { data: fetchedSubTypesData, error: subTypesError } = await supabase
        .from('lottery_sub_types')
        .select('lottery_sub_type_id, sub_type_name, lottery_type_id, description, country_origin, is_active')
        .order('sub_type_name');

      if (subTypesError) { 
        console.error("Error fetching sub types:", subTypesError.message); 
        setGroupedSubTypes({}); 
        return null; 
      }
      
      if (!fetchedSubTypesData || fetchedSubTypesData.length === 0) { 
        setGroupedSubTypes({}); 
        return null; 
      }

      const fetchedSubTypes = fetchedSubTypesData as LotterySubType[];

      if (fetchedSubTypes.length > 0 && Object.keys(fetchedLotteryTypes).length > 0) {
        const groups: Record<string, GroupedSubTypeInfo> = {};
        fetchedSubTypes.forEach(subType => {
          const typeId = subType.lottery_type_id;
          if (typeId && fetchedLotteryTypes[typeId]) {
            if (!groups[typeId.toString()]) { 
              groups[typeId.toString()] = { details: fetchedLotteryTypes[typeId], subTypes: [] }; 
            }
            groups[typeId.toString()].subTypes.push(subType);
          }
        });
        setGroupedSubTypes(groups);
        const subTypeIds = fetchedSubTypes.map(st => st.lottery_sub_type_id);
        if (subTypeIds.length > 0) { 
          await fetchSubNumbers(subTypeIds); 
        } else { 
          setSubNumbersMap({}); 
        }
        return groups;
      } else {
        setGroupedSubTypes({});
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

const fetchExistingResultsAndSetStates = async (currentGroupedSubTypes: Record<string, GroupedSubTypeInfo>) => {
      const allSubTypeIds = Object.values(currentGroupedSubTypes).flatMap(group => group.subTypes.map(st => st.lottery_sub_type_id));
      if (allSubTypeIds.length === 0) return;

      const { data: existingResults, error } = await supabase
        .from("lottery_results")
        .select("lottery_sub_type_id, prize_code, winning_number")
        .eq("draw_date", selectedDate)
        .in("lottery_sub_type_id", allSubTypeIds);
      
      if (error) { toast.error("ไม่สามารถโหลดผลรางวัลที่บันทึกไว้ได้"); return; }

      if (existingResults && existingResults.length > 0) {
        const newSavedSet = new Set<number>();
        const newResultInputs: { [subTypeId: number]: any } = {};
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
              if (!newResultInputs[dbResult.lottery_sub_type_id]) { newResultInputs[dbResult.lottery_sub_type_id] = {}; }
              const componentKey = mapDbPrizeCodeToComponentKey(dbResult.prize_code);
              if (componentKey) {
                  newResultInputs[dbResult.lottery_sub_type_id][componentKey] = dbResult.winning_number;
              }
          newSavedSet.add(dbResult.lottery_sub_type_id);
        });
        setSuccessfullySavedSubTypes(newSavedSet);
        setResultInputs(newResultInputs);
      } else {
          setSuccessfullySavedSubTypes(new Set());
          setResultInputs({});
      }
    };
    
    const loadInitialData = async () => {
        setPageIsLoading(true);
        setGroupedSubTypes({});
        setResultInputs({});
        setSuccessfullySavedSubTypes(new Set());
        const types = await fetchLotteryTypes();
        const currentGroupedSubTypesData = await fetchAllSubTypesAndGroup(types);
        if (currentGroupedSubTypesData && Object.keys(currentGroupedSubTypesData).length > 0) {
          await fetchExistingResultsAndSetStates(currentGroupedSubTypesData);
        }
        setPageIsLoading(false);
    };

    loadInitialData();

  }, [supabase, selectedDate]);


  // 🔧 **ปรับปรุง**: Debounce การคำนวณผลอัตโนมัติ
  const handleInputChange = (subTypeId: number, key: string, value: string) => {
    // อัปเดต UI ทันทีเพื่อความลื่นไหล
    setResultInputs(prev => ({
      ...prev,
      [subTypeId]: {
        ...prev[subTypeId],
        [key]: isMultiValuePrize(key) ? value.replace(/[^0-9,]/g, '') : value.replace(/\D/g, "")
      }
    }));
    
    // Debounce ส่วนการคำนวณผลอัตโนมัติ
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = setTimeout(() => {
      setResultInputs(prev => {
        const subTypeSpecificInputs = { ...prev[subTypeId] };
      const sanitizedMainValue = subTypeSpecificInputs[key];
        
        if (!sanitizedMainValue) return prev;

      if (key === "3_บน") {
        if (sanitizedMainValue.length === 3) {
          subTypeSpecificInputs["3_โต๊ด"] = getPermutations(sanitizedMainValue).join(",");
          subTypeSpecificInputs["2_บน"] = sanitizedMainValue.slice(-2);
          subTypeSpecificInputs["1_วิ่งบน"] = [...new Set(sanitizedMainValue.split(""))].join(",");
        } else {
          subTypeSpecificInputs["3_โต๊ด"] = "";
          subTypeSpecificInputs["2_บน"] = "";
          subTypeSpecificInputs["1_วิ่งบน"] = "";
        }
      } else if (key === "2_ล่าง") {
        if (sanitizedMainValue.length === 2) {
          subTypeSpecificInputs["1_วิ่งล่าง"] = [...new Set(sanitizedMainValue.split(""))].join(",");
        } else {
          subTypeSpecificInputs["1_วิ่งล่าง"] = "";
        }
      }
      return { ...prev, [subTypeId]: subTypeSpecificInputs };
    });
    }, 300); // delay 300ms
  };

  const isMultiValuePrize = (key: string) => key === '3_โต๊ด' || key === '1_วิ่งบน' || key === '1_วิ่งล่าง';

   const handleSave = async (subType: LotterySubType): Promise<boolean> => {
    const resultData = resultInputs[subType.lottery_sub_type_id] || {};
    const prizeKeyMapping = { '3_บน': '3 ตัวบน', '2_ล่าง': '2 ตัวล่าง', '3_โต๊ด': '3 ตัวโต๊ด', '2_บน': '2 ตัวบน', '1_วิ่งบน': 'วิ่งบน', '1_วิ่งล่าง': 'วิ่งล่าง' };
    
    // ดึง schedule_id สำหรับ sub_type นี้
    const { data: schedules, error: scheduleError } = await supabase
      .from('drawing_schedules')
      .select('schedule_id')
      .eq('lottery_sub_type_id', subType.lottery_sub_type_id)
      .limit(1);
    
    if (scheduleError) {
      toast.error(`ไม่สามารถดึงข้อมูล schedule ได้: ${scheduleError.message}`);
      return false;
    }
    
    const scheduleId = schedules?.[0]?.schedule_id;
    if (!scheduleId) {
      toast.error(`ไม่พบ schedule สำหรับ ${subType.sub_type_name}`);
      return false;
    }
    
    const upsertPayload = Object.entries(resultData)
      .filter(([_, val]) => val !== "" && val !== null && val !== undefined)
      .map(([key, winning_number]) => {
          const prize_code = prizeKeyMapping[key as keyof typeof prizeKeyMapping];
          if (!prize_code) return null;
          return {
              lottery_type_id: subType.lottery_type_id,
              lottery_sub_type_id: subType.lottery_sub_type_id,
              schedule_id: scheduleId,
              draw_date: selectedDate,
              draw_time: null, // ใช้ null สำหรับ draw_time
              prize_code: prize_code,
              winning_number: String(winning_number),
          };
      }).filter(Boolean);

    if (upsertPayload.length === 0) { toast.error("กรุณากรอกผลรางวัล"); return false; }

    setSaveInProgressForSubTypeId(subType.lottery_sub_type_id);

    // ใช้ unique constraint ที่มีอยู่จริงในฐานข้อมูล
    const { error } = await supabase.from("lottery_results").upsert(upsertPayload, { 
      onConflict: 'lottery_sub_type_id, schedule_id, draw_date, draw_time, prize_code' 
    });

    setSaveInProgressForSubTypeId(null);
    if (error) { toast.error(`บันทึกผิดพลาด: ${error.message}`); return false; }

    toast.success(`บันทึกผลสำหรับ ${subType.sub_type_name} สำเร็จ!`);
    setSuccessfullySavedSubTypes(prev => new Set(prev).add(subType.lottery_sub_type_id));
      return true;
  };
  
  // 🔧 **ใหม่**: ฟังก์ชันบันทึกทั้งหมด
  const handleSaveAll = async () => {
    setIsSavingAll(true);
    toast.info("กำลังเริ่มบันทึกผลรางวัลทั้งหมด...");

    const subTypesToSave = Object.values(groupedSubTypes)
      .flatMap(group => group.subTypes)
      .filter(subType => 
        resultInputs[subType.lottery_sub_type_id] && 
        Object.values(resultInputs[subType.lottery_sub_type_id]).some(val => val) && // มีการกรอกข้อมูล
        !successfullySavedSubTypes.has(subType.lottery_sub_type_id) // ยังไม่ได้บันทึก
      );

    if (subTypesToSave.length === 0) {
      toast.info("ไม่พบรายการที่กรอกผลไว้และยังไม่ได้บันทึก");
      setIsSavingAll(false);
      return;
    }

    const savePromises = subTypesToSave.map(subType => handleSave(subType));
    const results = await Promise.all(savePromises);

    const successfulSaves = results.filter(res => res).length;
    const failedSaves = results.length - successfulSaves;

    if (successfulSaves > 0) {
      toast.success(`บันทึกผลสำเร็จ ${successfulSaves} รายการ`);
    }
    if (failedSaves > 0) {
      toast.error(`บันทึกผลล้มเหลว ${failedSaves} รายการ`);
    }

    setIsSavingAll(false);
  };

  // 🔧 **ใหม่**: ฟังก์ชันจัดการการวางผลแบบชุด
  const handleApplyBulkPaste = () => {
    const lines = bulkPasteText.trim().split('\n');
    const allSubTypesByName: Record<string, LotterySubType> = {};
    Object.values(groupedSubTypes).flatMap(g => g.subTypes).forEach(subType => {
      allSubTypesByName[subType.sub_type_name.toLowerCase().trim()] = subType;
    });

    let appliedCount = 0;
    let notFoundCount = 0;
    const notFoundNames: string[] = [];

    lines.forEach(line => {
      const parts = line.trim().split(/\s+/);
      if (parts.length < 3) return;

      const subTypeName = parts[0].toLowerCase().trim();
      const top3 = parts[1];
      const bottom2 = parts[2];

      const targetSubType = allSubTypesByName[subTypeName];
      
      if (targetSubType) {
        handleInputChange(targetSubType.lottery_sub_type_id, '3_บน', top3);
        handleInputChange(targetSubType.lottery_sub_type_id, '2_ล่าง', bottom2);
        appliedCount++;
      } else {
        notFoundCount++;
        notFoundNames.push(parts[0]);
      }
    });

    toast.info(`นำเข้าผลสำเร็จ ${appliedCount} รายการ`, {
      description: notFoundCount > 0 ? `ไม่พบชื่อหวย ${notFoundCount} รายการ: ${notFoundNames.join(', ')}` : "ทุกรายการถูกนำเข้าเรียบร้อย",
    });

    setIsBulkPasteOpen(false);
    setBulkPasteText("");
  };

  
  const handleEditSubType = (subTypeId: number) => {
    setSuccessfullySavedSubTypes(prev => {
      const newSet = new Set(prev);
      newSet.delete(subTypeId);
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

  // 🔧 **ใหม่**: ดึงรายการประเทศทั้งหมด
  const allCountries = React.useMemo(() => {
    const countries = new Set<string>();
    Object.values(groupedSubTypes).forEach(group => {
      group.subTypes.forEach(subType => {
        if (subType.country_origin) {
          countries.add(subType.country_origin);
        }
      });
    });
    return Array.from(countries).sort();
  }, [groupedSubTypes]);

  // 🔧 **ใหม่**: ดึงรายการประเภทหวยทั้งหมด
  const allLotteryTypes = React.useMemo(() => {
    return Object.values(groupedSubTypes).map(group => ({
      id: group.details.lottery_type_id.toString(),
      name: group.details.type_name
    }));
  }, [groupedSubTypes]);

  // 🔧 **ใหม่**: กรองข้อมูลตามเงื่อนไข
  const filteredGroupedSubTypes = React.useMemo(() => {
    const filtered: Record<string, GroupedSubTypeInfo> = {};
    
    Object.entries(groupedSubTypes).forEach(([typeId, group]) => {
      // กรองตามประเภทหวย
      if (filterLotteryType !== "all" && typeId !== filterLotteryType) {
        return;
      }
      
      const filteredSubTypes = group.subTypes.filter(subType => {
        // กรองตามคำค้นหา
        if (searchTerm) {
          const search = searchTerm.toLowerCase();
          const matchName = subType.sub_type_name.toLowerCase().includes(search);
          const matchCountry = subType.country_origin?.toLowerCase().includes(search);
          if (!matchName && !matchCountry) return false;
        }
        
        // กรองตามประเทศ
        if (filterCountry !== "all" && subType.country_origin !== filterCountry) {
          return false;
        }
        
        // กรองตามสถานะการบันทึก
        if (filterStatus === "saved" && !successfullySavedSubTypes.has(subType.lottery_sub_type_id)) {
          return false;
        }
        if (filterStatus === "unsaved" && successfullySavedSubTypes.has(subType.lottery_sub_type_id)) {
          return false;
        }
        
        return true;
      });
      
      if (filteredSubTypes.length > 0) {
        filtered[typeId] = {
          ...group,
          subTypes: filteredSubTypes
        };
      }
    });
    
    return filtered;
  }, [groupedSubTypes, searchTerm, filterCountry, filterStatus, filterLotteryType, successfullySavedSubTypes]);

  // 🔧 **ใหม่**: นับจำนวนรายการ
  const totalSubTypes = Object.values(groupedSubTypes).reduce((sum, group) => sum + group.subTypes.length, 0);
  const filteredSubTypesCount = Object.values(filteredGroupedSubTypes).reduce((sum, group) => sum + group.subTypes.length, 0);
  const savedCount = successfullySavedSubTypes.size;

  // 🔧 **ใหม่**: ล้างตัวกรองทั้งหมด
  const clearFilters = () => {
    setSearchTerm("");
    setFilterCountry("all");
    setFilterStatus("all");
    setFilterLotteryType("all");
  };

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
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8 bg-background min-h-screen">
        <div className="flex items-center gap-3 mb-8">
            <h1 className="text-2xl font-bold text-foreground">กรอกผลรางวัล</h1>
            <Input type="date" value={selectedDate} disabled className="ml-2 w-[140px] h-9 text-xs" />
        </div>
        {renderSkeletons()}
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8 bg-background min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-foreground">กรอกผลรางวัล</h1>
          <Input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="ml-2 w-[140px] h-9 text-xs" max={format(new Date(), "dd-MM-yyyy")} />
        </div>
        {/* ปุ่มควบคุม */}
        <div className="flex items-center gap-2">
          <Dialog open={isBulkPasteOpen} onOpenChange={setIsBulkPasteOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="flex items-center gap-2">
                <ClipboardPaste className="w-4 h-4" />
                <span className="hidden sm:inline">วางผลแบบชุด</span>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>วางผลรางวัลแบบชุด</DialogTitle>
                <DialogDescription>
                  วางผลรางวัลโดยใช้รูปแบบ: <b>ชื่อหวย 3ตัวบน 2ตัวล่าง</b> (แต่ละรายการขึ้นบรรทัดใหม่)
                  <br/>
                  ตัวอย่าง: <b>ลาวสตาร์ 123 45</b>
                </DialogDescription>
              </DialogHeader>
              <Textarea
                placeholder="วางข้อมูลที่นี่..."
                value={bulkPasteText}
                onChange={(e) => setBulkPasteText(e.target.value)}
                rows={10}
              />
              <DialogFooter>
                <Button onClick={handleApplyBulkPaste}>นำเข้าผลรางวัล</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Button onClick={handleSaveAll} disabled={isSavingAll} size="sm" className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white">
            {isSavingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span className="hidden sm:inline">บันทึกทั้งหมด</span>
          </Button>
        </div>
      </div>

      {/* 🔧 **ใหม่**: ส่วนค้นหาและกรอง */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col gap-4">
            {/* แถวแรก: ช่องค้นหาและสถิติ */}
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="ค้นหาชื่อหวยหรือประเทศ..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="text-xs">
                  ทั้งหมด: {totalSubTypes}
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  แสดง: {filteredSubTypesCount}
                </Badge>
                <Badge variant="default" className="text-xs bg-green-600">
                  บันทึกแล้ว: {savedCount}
                </Badge>
              </div>
            </div>
            
            {/* แถวสอง: ตัวกรอง */}
            <div className="flex flex-wrap gap-3 items-center">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">กรอง:</span>
              </div>
              
              <Select value={filterLotteryType} onValueChange={setFilterLotteryType}>
                <SelectTrigger className="w-[160px] h-9 text-xs">
                  <SelectValue placeholder="ประเภทหวย" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ทุกประเภท</SelectItem>
                  {allLotteryTypes.map(type => (
                    <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={filterCountry} onValueChange={setFilterCountry}>
                <SelectTrigger className="w-[140px] h-9 text-xs">
                  <SelectValue placeholder="ประเทศ" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ทุกประเทศ</SelectItem>
                  {allCountries.map(country => (
                    <SelectItem key={country} value={country}>{country}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[140px] h-9 text-xs">
                  <SelectValue placeholder="สถานะ" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ทุกสถานะ</SelectItem>
                  <SelectItem value="saved">บันทึกแล้ว</SelectItem>
                  <SelectItem value="unsaved">ยังไม่บันทึก</SelectItem>
                </SelectContent>
              </Select>
              
              {(searchTerm || filterCountry !== "all" || filterStatus !== "all" || filterLotteryType !== "all") && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9 text-xs">
                  <X className="h-4 w-4 mr-1" />
                  ล้างตัวกรอง
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
      
      {Object.keys(groupedSubTypes).length === 0 ? (
        <div className="text-center py-20">
          <p className="text-muted-foreground text-lg">ไม่พบข้อมูลประเภทย่อยของหวย</p>
          <p className="text-sm text-muted-foreground mt-2">กรุณาตรวจสอบการเชื่อมต่อฐานข้อมูล</p>
        </div>
      ) : Object.keys(filteredGroupedSubTypes).length === 0 ? (
        <div className="text-center py-20">
          <p className="text-muted-foreground text-lg">ไม่พบรายการที่ตรงกับเงื่อนไข</p>
          <Button variant="outline" onClick={clearFilters} className="mt-4">
            ล้างตัวกรองทั้งหมด
          </Button>
        </div>
      ) : (
      <div className="space-y-10">
        {Object.entries(filteredGroupedSubTypes).map(([typeId, group], categoryIndex) => (
          <motion.section
            key={typeId}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: categoryIndex * 0.1 }}
          >
            <div className="flex items-center gap-3 mb-1.5">
              <h2 className="text-xl font-semibold text-foreground">{group.details.type_name}</h2>
              <Badge variant="outline" className="text-xs">{group.subTypes.length} รายการ</Badge>
            </div>
            {group.details.description && <p className="text-sm text-muted-foreground mb-5">{group.details.description}</p>}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {group.subTypes
                .slice() // copy to avoid mutating state
                .sort((a, b) => a.sub_type_name.localeCompare(b.sub_type_name))
                .map(subType => {
                return (
                  <LotterySubTypeCard
                    key={subType.lottery_sub_type_id}
                    subType={subType}
                    subNumbers={subNumbersMap[subType.lottery_sub_type_id] || []}
                    resultInput={resultInputs[subType.lottery_sub_type_id]}
                    handleInputChange={handleInputChange}
                    handleSave={handleSave}
                    isSaving={saveInProgressForSubTypeId === subType.lottery_sub_type_id}
                    isSuccessfullySaved={successfullySavedSubTypes.has(subType.lottery_sub_type_id)}
                    onEdit={handleEditSubType}
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