"use client";
import React, { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Separator } from "@/components/ui/separator";
import { AppSidebar } from "@/components/app-sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { DirectionProvider } from "@radix-ui/react-direction";
import { Loader2, Trash2 } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { useSearchParams, useRouter } from "next/navigation";
import NumberSelectionDrawer from "@/components/shared/NumberSelectionDrawer";
import SpectacularLoader from "@/components/ui/SpectacularLoader"; // Import the new loader
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import debounce from "lodash.debounce";

interface LotterySubType {
  lottery_sub_type_id: number;
  sub_type_name: string;
}
interface LotterySubNumber {
  id: number;
  lottery_sub_type_id: number;
  digit_number: number;
  type_number: string;
  price_paid: number;
}
interface TicketItem {
  subType: LotterySubType;
  payout: LotterySubNumber;
  numbers: string[];
  amount: number;
  uniqueKey: string;
}
interface DisplayCardItemGroup {
  subTypeName: string;
  digitNumber: number;
  typeLabelsString: string; // เช่น "บน x ล่าง"
  typeAmountsString: string; // เช่น "100x0"
  
  // รายการ Grouped objects เดิมที่จะแสดงในการ์ดนี้
  groupedItems: Grouped[]; 
  // อาจมีข้อมูลอื่นๆ ที่ต้องการแสดงร่วมกันในการ์ด เช่น uniqueKey แรก, ยอดรวมของการ์ด
  cardUniqueKey: string; // Key สำหรับ React list
  cardTotalAmount: number;
}
interface DrawingSchedule {
  schedule_id: number;
  lottery_sub_type_id: number;
  frequency_unit: string;
  frequency_value: number;
  drawing_time: string;
  day_of_week: string;
  is_active: boolean;
  open_time: string;
  close_time: string;
}

interface AvailableDraw {
  date: Date;
  schedule: DrawingSchedule;
}

interface Grouped {
  digit_number: number;
  numbers: string[];
  typeLabels: string[]; // Should be derived from items in group, or canonical
  amounts: Record<string, number>; // Aggregated amounts for typeLabels
  typeOrder: string[]; // Canonical order for display
  uniqueKey: string; // Unique key of the first item forming the group, or a new group-specific key
  _inferredPivotForSort?: string | null; // For swipe19 sorting
}

function normalizeDraw(draw: any): AvailableDraw {
  return {
    ...draw,
    date: draw?.date ? new Date(draw.date) : undefined,
  };
}

// Helper function to infer swipe19 pivot digit
function inferSwipe19Pivot(arr: string[]): string | null {
    if (arr.length !== 19) return null;

    for (let dVal = 0; dVal <= 9; dVal++) {
        const D = dVal.toString();
        const expectedSet = new Set<string>();
        for (let i = 0; i <= 9; i++) expectedSet.add(i.toString() + D);
        for (let i = 0; i <= 9; i++) expectedSet.add(D + i.toString());

        if (expectedSet.size !== 19) continue; // Should yield 19 unique numbers for a valid pivot

        const currentSet = new Set(arr);
        if (expectedSet.size === currentSet.size &&
            [...expectedSet].every(val => currentSet.has(val))) {
            return D;
        }
    }
    return null;
}


export default function LotteryTicketPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [initialState] = useState(() => {
    const subType = searchParams.get('subType') ? Number(searchParams.get('subType')) : undefined;
    const drawParam = searchParams.get('draw');
    const drawRaw = drawParam ? JSON.parse(decodeURIComponent(drawParam)) : undefined;
    const draw = drawRaw ? normalizeDraw(drawRaw) : undefined;
    return { subType, draw };
  });

  const [supabase] = useState(() =>
    createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  );
  const [subTypes, setSubTypes] = useState<LotterySubType[]>([]);
  const [payouts, setPayouts] = useState<LotterySubNumber[]>([]);
  const [selectedSubType, setSelectedSubType] = useState<number | null>(initialState.subType ?? null);
  const [selectedPayout, setSelectedPayout] = useState<number | null>(null);
  const [selectedDigit, setSelectedDigit] = useState<number | null>(null);
  const [selectedTypes, setSelectedTypes] = useState<number[]>([]);
   
  const [twoDigitOperation, setTwoDigitOperation] = useState<'none' | 'reverse' | 'swipeFront' | 'swipeBack' | 'swipe19'>('none');
  const [permuteThreeDigits, setPermuteThreeDigits] = useState(false);
  const [swipeNineSingleDigit, setSwipeNineSingleDigit] = useState(false);
  const [numberInput, setNumberInput] = useState("");
  const [amount, setAmount] = useState(""); // For single type selection
  const [amounts, setAmounts] = useState<Record<number, string>>({}); // For multi-type selection
  const [fillAllAmount, setFillAllAmount] = useState("");
  const [ticketList, setTicketList] = useState<TicketItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDrawDate, setSelectedDrawDate] = useState<Date | undefined>(initialState.draw?.date ?? undefined);
  const [availableDraws, setAvailableDraws] = useState<AvailableDraw[]>([]);
  const [selectedDraw, setSelectedDraw] = useState<AvailableDraw | null>(initialState.draw ?? null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [billNumber] = useState(() => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  });
  const [isNumberDrawerOpen, setIsNumberDrawerOpen] = useState(false);
  const [billName, setBillName] = useState("");
  const [isLoadingPrint, setIsLoadingPrint] = useState(false);
  const [countdownText, setCountdownText] = useState("");

  const debouncedSetNumberInput = useRef(debounce((val: string) => setNumberInput(val), 200)).current;

  useEffect(() => {
    supabase.from("lottery_sub_types").select("lottery_sub_type_id, sub_type_name").then(({ data }) => {
      if (data) setSubTypes(data);
    });
  }, [supabase]);

 
  useEffect(() => {
    if (!selectedSubType) {
      setPayouts([]);
      setSelectedPayout(null);
      return;
    }
    supabase
      .from("lottery_sub_number")
      .select("*")
      .eq("lottery_sub_type_id", selectedSubType)
      .order('digit_number') 
      .order('type_number')  
      .then(({ data }) => {
        if (data) setPayouts(data);
      });
  }, [selectedSubType, supabase]);

 
  const subTypeObj = subTypes.find((s) => s.lottery_sub_type_id === selectedSubType) || null;

  const digitOptions = useMemo(() => {
    const digits = new Set<number>();
    payouts.forEach((p) => digits.add(p.digit_number));
    return Array.from(digits).sort();
  }, [payouts]);

  const filteredTypes = useMemo(() => {
    if (!selectedDigit) return [];
    return payouts.filter((p) => p.digit_number === selectedDigit);
  }, [payouts, selectedDigit]);

  function handleTypeToggle(id: number) {
    setSelectedTypes((prev) => prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]);
  }

  function getPermutations(str: string): string[] {
    if (str.length <= 1) return [str];
    let results: string[] = [];
    for (let i = 0; i < str.length; i++) {
      const first = str[i];
      const rest = str.slice(0, i) + str.slice(i + 1);
      for (const perm of getPermutations(rest)) {
        results.push(first + perm);
      }
    }
    return Array.from(new Set(results));
  }

  function handleAddTicket() {
    if (!subTypeObj || selectedDigit === null || selectedTypes.length === 0) {
      toast.error("กรุณาเลือกชนิดหวย, จำนวนหลัก และประเภทก่อน");
      return;
    }

    // Determine expected input length for numbers based on operation
    const isSwipeModeForSingleDigitInput = selectedDigit === 2 &&
        (twoDigitOperation === 'swipeFront' || twoDigitOperation === 'swipeBack' || twoDigitOperation === 'swipe19');
    const expectedInputLength = isSwipeModeForSingleDigitInput ? 1 : selectedDigit;

    let rawNumbersFromInput = numberInput
      .replace(/\n|,/g, " ")
      .split(" ")
      .map((n) => n.trim())
      .filter(n => n.length > 0); // Filter empty strings first

    if (selectedDigit === 1 && swipeNineSingleDigit) {
        // If swipeNineSingleDigit is active, rawNumbersFromInput is ignored and replaced.
        rawNumbersFromInput = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];
    } else {
        // Validate each raw number based on expected length and digits only
        rawNumbersFromInput = rawNumbersFromInput.filter((n) => {
            const isValid = n.length === expectedInputLength && /^\d+$/.test(n);
            if (!isValid && !swipeNineSingleDigit) { // Don't toast if swipeNine will override
                 toast.error(`หมายเลข '${n}' ไม่ถูกต้องสำหรับ ${expectedInputLength} หลัก`);
            }
            return isValid;
        });
    }
    
    if (!rawNumbersFromInput.length && !(selectedDigit === 1 && swipeNineSingleDigit)) {
         toast.error(`กรุณากรอกหมายเลข ${expectedInputLength} หลัก อย่างน้อย 1 หมายเลขที่ถูกต้อง`);
         return;
    }


    let allNewTickets: TicketItem[] = [];
    const processingTimestampKey = Date.now().toString();

    rawNumbersFromInput.forEach((rawNum, rawNumIndex) => {
        let singleRawNumProcessedNumbers: string[] = [];

        if (selectedDigit === 1 && swipeNineSingleDigit) {
            // rawNum here is one of "1" through "9"
            singleRawNumProcessedNumbers.push(rawNum);
        } else if (selectedDigit === 2) {
            switch (twoDigitOperation) {
                case 'reverse':
                    if (rawNum.length === 2) singleRawNumProcessedNumbers.push(...getPermutations(rawNum));
                    break;
                case 'swipeFront': // rawNum is 1 digit
                    if (rawNum.length === 1) for (let i = 0; i <= 9; i++) singleRawNumProcessedNumbers.push(rawNum + i.toString());
                    break;
                case 'swipeBack': // rawNum is 1 digit
                    if (rawNum.length === 1) for (let i = 0; i <= 9; i++) singleRawNumProcessedNumbers.push(i.toString() + rawNum);
                    break;
                case 'swipe19': // rawNum is 1 digit
                    if (rawNum.length === 1) {
                        const D = rawNum;
                        const part1_endingWithD: string[] = [];
                        for (let i = 0; i <= 9; i++) part1_endingWithD.push(i.toString() + D);

                        const part2_startingWithD: string[] = [];
                        for (let i = 0; i <= 9; i++) {
                            const currentNumStarting = D + i.toString();
                            if (!part1_endingWithD.includes(currentNumStarting)) {
                                part2_startingWithD.push(currentNumStarting);
                            }
                        }
                        const allNums = [...part1_endingWithD, ...part2_startingWithD];
                        const uniqueNums = Array.from(new Set(allNums));

                        // --- กรองเลข double ที่เคยถูกใช้ใน ticketList ออกเท่านั้น ---
                        const usedDoubles = new Set<string>();
                        ticketList.forEach(item => {
                          if (item.payout.digit_number === 2) {
                            item.numbers.forEach(num => {
                              if (num.length === 2 && num[0] === num[1]) {
                                usedDoubles.add(num);
                              }
                            });
                          }
                        });
                        const filteredNums = uniqueNums.filter(num => {
                          if (num.length === 2 && num[0] === num[1]) {
                            return !usedDoubles.has(num);
                          }
                          return true;
                        });
                        singleRawNumProcessedNumbers.push(...filteredNums);
                    }
                    break;
                case 'none':
                default:
                    if (rawNum.length === 2) singleRawNumProcessedNumbers.push(rawNum);
                    break;
            }
        } else if (selectedDigit === 3 && permuteThreeDigits) {
            if (rawNum.length === 3) singleRawNumProcessedNumbers.push(...getPermutations(rawNum));
        } else { // Includes 1-digit 'none', and other non-handled selectedDigit cases
            if (rawNum.length === selectedDigit) singleRawNumProcessedNumbers.push(rawNum);
        }
        
        singleRawNumProcessedNumbers = Array.from(new Set(singleRawNumProcessedNumbers)); // Ensure unique numbers per rawNum processing


        if (singleRawNumProcessedNumbers.length === 0) {
            return; // Skip if this rawNum yielded no valid numbers
        }
        
        const uniqueKeyForThisSet = `${processingTimestampKey}_${rawNumIndex}_${Math.random().toString(36).slice(2, 8)}`;

        if (selectedTypes.length > 1) {
            let typeAmountsAreValid = true;
            selectedTypes.forEach((typeId) => {
                const amt = amounts[typeId];
                if (!amt || isNaN(Number(amt)) || Number(amt) <= 0) typeAmountsAreValid = false;
            });
            if (!typeAmountsAreValid) {
                toast.error("กรุณากรอกจำนวนเงินให้ถูกต้องสำหรับทุกประเภทที่เลือก (เมื่อประมวลผลเลขชุด)");
                // Decide if to `return` from forEach or break outer processing
                // For now, assume it might skip adding for this rawNum if amounts are bad for multi-type
                return; 
            }
            selectedTypes.forEach((typeId) => {
                const payout = payouts.find((p) => p.id === typeId)!;
                allNewTickets.push({
                    subType: subTypeObj,
                    payout,
                    numbers: [...singleRawNumProcessedNumbers],
                    amount: Number(amounts[typeId]),
                    uniqueKey: uniqueKeyForThisSet,
                });
            });
        } else if (selectedTypes.length === 1) {
            if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
                toast.error("กรุณากรอกจำนวนเงินให้ถูกต้อง (เมื่อประมวลผลเลขชุด)");
                // Skip for this rawNum if amount is bad for single-type
                return;
            }
            const typeId = selectedTypes[0];
            const payout = payouts.find((p) => p.id === typeId)!;
            allNewTickets.push({
                subType: subTypeObj,
                payout,
                numbers: [...singleRawNumProcessedNumbers],
                amount: Number(amount),
                uniqueKey: uniqueKeyForThisSet,
            });
        }
    }); // End of rawNumbersFromInput.forEach

    if (allNewTickets.length > 0) {
        setTicketList(prevList => [...prevList, ...allNewTickets]);
        setNumberInput("");
        // Consider resetting amount/amounts and selectedTypes carefully based on desired UX
        // setAmount(""); 
        // setAmounts({});
        // setSelectedTypes([]); 
        // setTwoDigitOperation('none');
        // setPermuteThreeDigits(false);
        // setSwipeNineSingleDigit(false);
        toast.success("เพิ่มรายการใหม่สำเร็จ!");
    } else if (rawNumbersFromInput.length > 0) {
        toast.warning("ไม่มีรายการถูกเพิ่ม อาจเกิดจากข้อมูลไม่ถูกต้องหรือซ้ำซ้อน");
    }
  }

  const handlePermuteThreeDigitsChange = (isChecked: boolean) => {
    setPermuteThreeDigits(isChecked);
    if (isChecked && selectedDigit === 3) {
      const todType = filteredTypes.find(t => t.digit_number === 3 && t.type_number === "โต๊ด");
      if (todType) {
        setSelectedTypes(prevSelectedTypes => prevSelectedTypes.filter(id => id !== todType.id));
      }
    }
  };

  function handleApplyNumbersFromDrawer(newNumbers: string[]) {
    const currentNumbersArray = numberInput
      .replace(/\n|,/g, " ")
      .split(" ")
      .map((n) => n.trim())
      .filter((n) => n.length > 0);
    
    const combinedNumbers = Array.from(new Set([...currentNumbersArray, ...newNumbers]));
    setNumberInput(combinedNumbers.join(" "));
  }

  function handleRemoveTicket(idx: number) { // This removes by index, might need update if group removal is main way
    setTicketList(ticketList.filter((_, i) => i !== idx));
  }

  function calculateNextDrawDates(schedule: DrawingSchedule): Date[] {
    const dates: Date[] = [];
    const now = new Date();
    const currentDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(currentDate);
      date.setDate(date.getDate() + i);
      if (date < currentDate) continue;

      if (schedule.frequency_unit === 'day') {
        dates.push(date);
      } else if (schedule.frequency_unit === 'week') {
        const dayOfWeek = date.toLocaleString('en-US', { weekday: 'long' });
        if (schedule.day_of_week.includes(dayOfWeek)) {
          dates.push(date);
        }
      }
    }
    return dates;
  }

  async function fetchAvailableDraws() {
      if (!selectedSubType) return;
      const { data: schedules, error } = await supabase
        .from('drawing_schedules')
        .select('*')
        .eq('lottery_sub_type_id', selectedSubType)
        .eq('is_active', true);

      if (error) { console.error(error); throw error; }
      if (!schedules) { setAvailableDraws([]); return; }

      const newAvailableDraws: AvailableDraw[] = [];
      schedules.forEach(schedule => {
        const dates = calculateNextDrawDates(schedule);
        dates.forEach(date => {
          newAvailableDraws.push({ date, schedule });
        });
      });
      newAvailableDraws.sort((a, b) => a.date.getTime() - b.date.getTime());
      setAvailableDraws(newAvailableDraws);

      if (newAvailableDraws.length > 0) {
        setSelectedDraw(newAvailableDraws[0]);
        setSelectedDrawDate(newAvailableDraws[0].date);
      } else {
        setSelectedDraw(null);
        setSelectedDrawDate(undefined);
      }
  }

  useEffect(() => {
    if (initialState.draw) {
      const drawDate = new Date(initialState.draw.date);
      const today = new Date();
      today.setHours(0,0,0,0);
      drawDate.setHours(0,0,0,0);
      if (drawDate < today) {
        toast.error("วันที่ออกรางวัลที่เลือกหมดอายุแล้ว กรุณาเลือกใหม่");
        setAvailableDraws([]); setSelectedDraw(null); setSelectedDrawDate(undefined);
        // Potentially clear initialState.draw or redirect
        router.replace('/lottery-ticket'); // Clear query params
        fetchAvailableDraws(); // Try to fetch new ones if subType selected
        return;
      }
      setAvailableDraws([normalizeDraw(initialState.draw)]);
      setSelectedDraw(normalizeDraw(initialState.draw));
      setSelectedDrawDate(normalizeDraw(initialState.draw).date);
      return;
    }
    if (selectedSubType) {
      fetchAvailableDraws();
    } else {
      setAvailableDraws([]); setSelectedDraw(null); setSelectedDrawDate(undefined);
    }
  }, [selectedSubType, initialState.draw]); // supabase, router in deps if used inside fetch

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!ticketList.length) {
      toast.error("กรุณาเพิ่มรายการอย่างน้อย 1 รายการ");
      return;
    }
    if (!selectedDraw) {
      toast.error("กรุณาเลือกวันที่ออกรางวัล");
      return;
    }
    const now = new Date();
    const currentTime = now.toLocaleTimeString('en-US', { hour12: false });
    if (currentTime < selectedDraw.schedule.open_time || currentTime > selectedDraw.schedule.close_time) {
      toast.error(`เวลารับซื้อ: ${selectedDraw.schedule.open_time} - ${selectedDraw.schedule.close_time}`);
      return;
    }
    setConfirmDialogOpen(true);
  }

  async function handleConfirmSubmit() {
    if (!selectedDraw || !user) {
      toast.error(!user ? "กรุณาเข้าสู่ระบบก่อนทำรายการ" : "ไม่พบข้อมูลรอบรางวัล");
      return;
    }
    try {
      setIsSubmitting(true);
      const drawDateForCheck = new Date(selectedDraw.date); drawDateForCheck.setHours(0, 0, 0, 0);
      const todayForCheck = new Date(); todayForCheck.setHours(0, 0, 0, 0);

      if (drawDateForCheck < todayForCheck) {
        toast.error("ไม่สามารถซื้อหวยย้อนหลังได้ กรุณาเลือกวันที่ออกรางวัลที่ถูกต้อง");
        setConfirmDialogOpen(false); setIsSubmitting(false);
        return;
      }

      const localDrawDate = format(selectedDraw.date, 'yyyy-MM-dd');
      let formattedCloseTime = selectedDraw.schedule.close_time;
      const timeParts = selectedDraw.schedule.close_time.split(':');
      if (timeParts.length >= 2) formattedCloseTime = `${timeParts[0]}:${timeParts[1]}`;

      const { data: ticket, error: ticketError } = await supabase
        .from('lottery_tickets')
        .insert({
          user_id: user.id, draw_date: localDrawDate, draw_time: selectedDraw.schedule.drawing_time,
          close_time: formattedCloseTime, bill_number: billNumber, bill_name: billName,
          total_amount: ticketList.reduce((sum, item) => sum + (item.amount * item.numbers.length), 0), // Sum based on items, not groups for accuracy
          status: 'pending'
        }).select().single();

      if (ticketError) throw ticketError;

      const ticketItems = ticketList.map(item => ({
        ticket_id: ticket.id, lottery_sub_type_id: item.subType.lottery_sub_type_id,
        lottery_sub_number_id: item.payout.id, numbers: item.numbers, amount: item.amount
      }));

      const { error: itemsError } = await supabase.from('lottery_ticket_items').insert(ticketItems);
      if (itemsError) {
        await supabase.from('lottery_tickets').delete().eq('id', ticket.id);
        throw itemsError;
      }

      const { error: updateError } = await supabase.from('lottery_tickets').update({ status: 'confirmed' }).eq('id', ticket.id);
      if (updateError) {
        await supabase.from('lottery_ticket_items').delete().eq('ticket_id', ticket.id);
        await supabase.from('lottery_tickets').delete().eq('id', ticket.id);
        throw updateError;
      }

      setTicketList([]); // setSelectedDrawDate(new Date()); // Don't reset draw date, user might continue for same draw
      setBillName(""); // Reset bill name for next bill
      // billNumber will auto-generate a new one if page reloads or component re-mounts.
      // For SPA, might need to explicitly generate new billNumber: setBillNumber(Math.floor...);
      setConfirmDialogOpen(false);
      toast.success("บันทึกการซื้อสำเร็จ!");
      router.push(`/print-ticket?bill_number=${encodeURIComponent(ticket.bill_number)}`);
      
    } catch (error: any) {
      console.error('Error saving ticket:', error);
      toast.error(error.message || "เกิดข้อผิดพลาดในการบันทึกข้อมูล");
    } finally {
      setIsSubmitting(false);
    }
  }
  
  const canAdd = useMemo(() => {
    const validRawNumbers = numberInput
      .replace(/\n|,/g, " ")
      .split(" ")
      .map((n) => n.trim())
      .filter(n => n.length > 0);

    const hasValidRawNumbers = (selectedDigit === 1 && swipeNineSingleDigit) || validRawNumbers.length > 0;

    return (
      !!selectedSubType && // subTypeObj is derived, use selectedSubType
      !!selectedDigit &&
      selectedTypes.length > 0 &&
      hasValidRawNumbers &&
      (
        (selectedTypes.length === 1 && !!amount && Number(amount) > 0) ||
        (selectedTypes.length > 1 && selectedTypes.every(typeId => !!amounts[typeId] && Number(amounts[typeId]) > 0))
      )
    );
  }, [selectedSubType, selectedDigit, selectedTypes, numberInput, amount, amounts, swipeNineSingleDigit]);


  async function handleRemoveGroup(groupToRemove: Grouped) {
    // สร้าง groupKey แบบเดียวกับ useMemo
    const digit = groupToRemove.digit_number;
    const typeLabels = groupToRemove.typeLabels;
    const amountsPattern = typeLabels.map(label => groupToRemove.amounts[label] ?? 0).join(',');
    const subTypeId = ticketList.find(item => item.payout.digit_number === digit && typeLabels.includes(item.payout.type_number || "-") && item.numbers.some(n => groupToRemove.numbers.includes(n)))?.subType.lottery_sub_type_id;
    const groupKey = `${subTypeId}|${digit}|${typeLabels.join(',')}|${amountsPattern}`;

    setTicketList(prevList => prevList.filter(item => {
      const itemTypeLabel = item.payout.type_number || "-";
      const itemLabelOrder = typeLabels;
      const itemAmountsPattern = itemLabelOrder.map(label => label === itemTypeLabel ? item.amount : 0).join(',');
      const itemGroupKey = `${item.subType.lottery_sub_type_id}|${item.payout.digit_number}|${itemLabelOrder.join(',')}|${itemAmountsPattern}`;
      return itemGroupKey !== groupKey;
    }));

    if (user && selectedDraw) { // Log removal
      try {
        await supabase.from('lottery_ticket_remove_logs').insert({
          user_id: user.id,
          bill_number: billNumber,
          group_info: {
            digit_number: groupToRemove.digit_number,
            numbers: groupToRemove.numbers,
            typeLabels: groupToRemove.typeLabels,
            amounts: groupToRemove.amounts,
            pivot: groupToRemove._inferredPivotForSort
          },
          removed_at: new Date().toISOString(),
          reason: 'user removed group',
          draw_date: selectedDraw.date.toISOString(),
          close_time: selectedDraw.schedule.close_time,
          schedule_id: selectedDraw.schedule.schedule_id,
        });
      } catch (e: unknown) {
        console.error('Error logging remove group:', e);
      }
    }
  }

  const { allTypeLabels, groups } = useMemo(() => {
    const calculatedAllTypeLabels: Record<number, string[]> = {};
    payouts.forEach(p => {
      if (!p.type_number) return;
      if (!calculatedAllTypeLabels[p.digit_number]) calculatedAllTypeLabels[p.digit_number] = [];
      if (!calculatedAllTypeLabels[p.digit_number].includes(p.type_number)) {
        calculatedAllTypeLabels[p.digit_number].push(p.type_number);
      }
    });

    // จัดเรียง typeLabels ตามที่ต้องการ
    Object.keys(calculatedAllTypeLabels).forEach(digitStr => {
      const digit = Number(digitStr);
      const labels = calculatedAllTypeLabels[digit];
      if (!labels) return;
      let ordered = [...labels];
      if (digit === 2 && labels.includes("บน") && labels.includes("ล่าง")) {
        ordered = ["บน", "ล่าง", ...labels.filter(l => l !== "บน" && l !== "ล่าง")];
      }
      calculatedAllTypeLabels[digit] = Array.from(new Set(ordered));
    });

    const calculatedGroups: Map<string, Grouped> = new Map();

    ticketList.forEach(item => {
      const digit = item.payout.digit_number;
      const subTypeId = item.subType.lottery_sub_type_id;
      const numbersKey = item.numbers.join(",");
      const canonicalTypeLabels = calculatedAllTypeLabels[digit] || [item.payout.type_number || "-"];
      const groupKey = `${subTypeId}|${digit}|${numbersKey}`;

      if (!calculatedGroups.has(groupKey)) {
        // สร้าง amounts เริ่มต้นเป็น 0 ทุก typeLabel
        const groupAmounts: Record<string, number> = {};
        canonicalTypeLabels.forEach(label => { groupAmounts[label] = 0; });
        calculatedGroups.set(groupKey, {
          digit_number: digit,
          numbers: [...item.numbers],
          typeLabels: canonicalTypeLabels,
          amounts: groupAmounts,
          typeOrder: canonicalTypeLabels,
          uniqueKey: item.uniqueKey,
          _inferredPivotForSort: null,
        });
      }
      // เพิ่ม amount ให้ typeLabel ที่ตรง
      const group = calculatedGroups.get(groupKey)!;
      const label = item.payout.type_number || "-";
      group.amounts[label] = (group.amounts[label] || 0) + item.amount;
    });

    return { allTypeLabels: calculatedAllTypeLabels, groups: calculatedGroups };
  }, [ticketList, payouts]);


  const ConfirmationDialog = () => (
    <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>ยืนยันการซื้อหวย</DialogTitle>
          <DialogDescription>
            {selectedDraw ? (
              <>
                <span>วันที่: {format(selectedDraw.date, 'PPP', { locale: th })}</span><br />
                <span>เวลาออก: {selectedDraw.schedule.drawing_time}</span>
              </>
            ) : (
              <span className="text-red-500">ไม่พบข้อมูลรอบออกรางวัล</span>
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="text-sm">
            <p className="font-medium mb-2">รายการที่เลือก:</p>
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs border border-gray-200 rounded">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-2 py-1 border-b text-left">ประเภท</th>
                    <th className="px-2 py-1 border-b text-left">หมายเลข</th>
                    <th className="px-2 py-1 border-b text-right">จำนวนเงิน/เลข</th>
                    <th className="px-2 py-1 border-b text-right">จำนวนเลข</th>
                    <th className="px-2 py-1 border-b text-right">รวม</th>
                  </tr>
                </thead>
                <tbody>
                  {ticketList.map((item, index) => (
                    <tr key={item.uniqueKey + "_" + index} className="border-b">
                      <td className="px-2 py-1">{item.subType.sub_type_name} - {item.payout.type_number}</td>
                      <td className="px-2 py-1">{item.numbers.join(', ')}</td>
                      <td className="px-2 py-1 text-right">{item.amount.toLocaleString()}</td>
                      <td className="px-2 py-1 text-right">{item.numbers.length}</td>
                      <td className="px-2 py-1 text-right">{(item.amount * item.numbers.length).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="text-right font-medium mt-2">
            ยอดรวม: {ticketList.reduce((sum, item) => sum + item.amount * item.numbers.length, 0).toLocaleString()} บาท
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setConfirmDialogOpen(false)} disabled={isSubmitting}>ยกเลิก</Button>
          <Button onClick={handleConfirmSubmit} disabled={isSubmitting} className="min-w-[120px]">
            {isSubmitting ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />กำลังบันทึก...</>) : ("ยืนยัน")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  useEffect(() => {
    const fetchUserData = async () => {
      const { data: { user: supabaseUser } } = await supabase.auth.getUser(); // Renamed to avoid conflict
      if (supabaseUser) {
        setUser(supabaseUser);
      } else {
        router.push("/signup");
      }
    };
    fetchUserData();
  }, [router, supabase]);

  useEffect(() => {
    function getCountdownText(currentSelectedDraw: AvailableDraw | null) { // Renamed param
      if (!currentSelectedDraw) return "-";
      const now = new Date();
      const [h, m, s] = currentSelectedDraw.schedule.close_time.split(":");
      const closeDate = new Date(currentSelectedDraw.date);
      closeDate.setHours(Number(h), Number(m), Number(s || 0), 0);
      const diff = closeDate.getTime() - now.getTime();
      if (diff <= 0) return "หมดเวลา";
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      // const seconds = Math.floor((diff % (1000 * 60)) / 1000); // Seconds not shown in example
      return `${hours > 0 ? hours + ' ชม. ' : ''}${minutes} นาที`;
    }
    if (!selectedDraw) {
      setCountdownText(""); return;
    }
    setCountdownText(getCountdownText(selectedDraw));
    const timer = setInterval(() => {
      const text = getCountdownText(selectedDraw);
      setCountdownText(text);
      if (text === "หมดเวลา") {
        // toast.info("หมดเวลารับซื้อสำหรับรอบนี้แล้ว"); // Inform user
        // fetchAvailableDraws(); // Optionally fetch next available draws
        router.push("/"); // Or redirect to a page indicating closure
      }
    }, 1000 * 30); // Update every 30s is enough for minutes display
    return () => clearInterval(timer);
  }, [selectedDraw, router]); // Added router to deps

  const TicketListGroupComponent = React.memo(({ groupsMap, handleRemoveGroupFn }: { groupsMap: Map<any, Grouped>, handleRemoveGroupFn: (group: Grouped) => void }) => {
    return (
      <AnimatePresence>
        {Array.from(groupsMap.values()).map((group, idx) => {
          const allLabelsInGroup: string[] = group.typeLabels || [];
          // Calculate group total based on its numbers and amounts for its typeLabels
          const groupTotal = allLabelsInGroup.reduce((sum: number, label: string) => {
                const amountForLabel = group.amounts[label] ?? 0;
                return sum + (amountForLabel * group.numbers.length);
            }, 0);

          return (
            <motion.div
              key={group.uniqueKey + "_" + idx} // Use a more stable key if group.uniqueKey is reliable
              initial={{ opacity: 0, y: -10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.98 }}
              transition={{ duration: 0.3 }}
              className="flex flex-row items-start bg-[#f8fafc] border border-[#e0e7ef] rounded-lg px-2 py-2 mb-2 gap-2 shadow-sm hover:bg-[#f1f5f9] transition-colors"
            >
              <div className="flex flex-col items-center justify-start min-w-[70px] max-w-[90px] text-center flex-shrink-0 pt-1">
                <div className="text-[11px] font-bold text-[#d32f2f] leading-tight">{group.digit_number} ตัว</div>
                <div className="text-[10px] text-[#e53935] leading-tight break-words">
                    {group.typeLabels.join(' x ')}
                    {group._inferredPivotForSort ? ` (รูด19:${group._inferredPivotForSort})` : ''}
                </div>
                <div className="text-[10px] text-gray-700 leading-tight break-words">
                    {group.typeLabels.map(label => group.amounts[label] ?? 0).join(' x ')}
                </div>
                <div className="text-[10px] text-gray-400 leading-tight mt-0.5">รวม {groupTotal.toLocaleString()} ฿</div>
              </div>
              <div className="flex-1 flex items-start min-h-8">
                <Textarea
                  value={group.numbers.join('  ')}
                  readOnly
                  rows={Math.min(3, Math.ceil(group.numbers.join('  ').length / 35))} // Auto rows based on content
                  className="rounded-md p-1 w-full text-[11px] leading-tight resize-none bg-white border border-[#e0e7ef] focus-visible:ring-1 focus-visible:ring-blue-400"
                  style={{ textAlign: 'left', wordBreak: 'break-all', whiteSpace: 'pre-wrap', fontFamily: 'inherit', minHeight: '28px' }}
                />
                 <button
                  className="ml-2 text-red-500 hover:text-red-700 transition-colors flex-shrink-0 p-1 mt-0.5"
                  title="ลบกลุ่มนี้"
                  onClick={() => handleRemoveGroupFn(group)} // Changed prop name
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    );
  });
  TicketListGroupComponent.displayName = 'TicketListGroupComponent';


  return (
    <DirectionProvider dir="ltr">
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
            <div className="flex items-center gap-2 px-4">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem className="hidden md:block">
                    <BreadcrumbLink href="/">หน้าหลัก</BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator className="hidden md:block" />
                  <BreadcrumbItem>
                    <BreadcrumbPage>ซื้อหวย</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>
          </header>
          {loading && (<SpectacularLoader message="กำลังโหลดข้อมูล..." baseColor="sky" />)}
          <motion.div
            initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="mx-auto w-full max-w-2xl md:max-w-3xl lg:max-w-4xl px-2 md:px-6 lg:px-8 py-6"
          >
            <Card className="mb-8 shadow-xl border-0">
              <CardHeader className="h-32 mb-2 bg-gradient-to-r from-yellow-400 via-orange-400 to-pink-400 rounded-t-xl shadow-lg flex flex-col items-center justify-center py-8">
                <div className="flex flex-col items-center ">
                  <span className="text-4xl md:text-5xl lg:text-6xl drop-shadow font-extrabold">🎫</span>
                  <h1 className="text-2xl md:text-3xl lg:text-4xl font-extrabold text-white drop-shadow">ซื้อหวย</h1>
                  <span className="text-base md:text-lg text-white/90 font-medium">เพิ่มรายการซื้อหวยของคุณได้ที่นี่</span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="text-sm font-medium">เลขบิล (Bill Number)</label>
                    <Input value={billNumber} readOnly className="bg-gray-100 cursor-not-allowed" />
                  </div>
                  <div>
                    <label className="text-sm font-medium">ชื่อบิล (Bill Name)</label>
                    <Input value={billName} onChange={e => setBillName(e.target.value)} placeholder="ระบุชื่อบิล (ถ้ามี)" />
                  </div>
                </div>
                <form className="space-y-4" onSubmit={(e) => e.preventDefault()}> {/* Changed to preventDefault, submit via button explicitly */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">ชนิดหวย</label>
                      {initialState.subType ? (
                        <div className="py-2 px-3 rounded bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-200">
                          {subTypes.find(s => s.lottery_sub_type_id === initialState.subType)?.sub_type_name || "-"}
                        </div>
                      ) : (
                        <Select value={selectedSubType?.toString() || ""} onValueChange={v => { setSelectedSubType(Number(v)); setSelectedPayout(null); setSelectedDigit(null); setSelectedTypes([]); setTwoDigitOperation('none'); setPermuteThreeDigits(false); setSwipeNineSingleDigit(false); }}>
                          <SelectTrigger><SelectValue placeholder="เลือกชนิดหวย" /></SelectTrigger>
                          <SelectContent>
                            {subTypes.map((s) => (<SelectItem key={s.lottery_sub_type_id} value={s.lottery_sub_type_id.toString()}>{s.sub_type_name}</SelectItem>))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                    <div>
                      <label className="text-sm font-medium">จำนวนหลัก</label>
                      <div className="flex gap-2 mt-1 flex-wrap">
                        {digitOptions.map((d) => (
                          <Button key={d} type="button" variant={selectedDigit === d ? "default" : "outline"} onClick={() => { setSelectedDigit(d); setSelectedTypes([]); setTwoDigitOperation('none'); setPermuteThreeDigits(false); setSwipeNineSingleDigit(false); }}>
                            {d} ตัว
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {selectedDigit && (
                    <div>
                      <label className="text-sm font-medium">เลือกประเภท/รูปแบบ <span className="text-xs text-muted-foreground">(เลือกได้หลายแบบ)</span></label>
                      <div className={`flex gap-2 flex-wrap mt-1 transition-all duration-300 ${selectedTypes.length === 0 && selectedDigit ? 'animate-shake border-2 border-red-400 bg-red-50 p-2 rounded' : 'p-2'}`}>
                        {filteredTypes.map((type) => (
                          <label key={type.id} className="flex items-center gap-1 border rounded px-2 py-1 cursor-pointer bg-white dark:bg-zinc-900 shadow-sm hover:bg-gray-50 dark:hover:bg-zinc-800 has-[:checked]:bg-blue-50 has-[:checked]:border-blue-500 dark:has-[:checked]:bg-blue-900/30">
                            <input
                              type="checkbox"
                              checked={selectedTypes.includes(type.id)}
                              onChange={() => handleTypeToggle(type.id)}
                              disabled={
                                (permuteThreeDigits && selectedDigit === 3 && (type.type_number === "เต็ง" || type.type_number === "โต๊ด"))
                              }
                              className="accent-blue-600"
                            />
                            {type.type_number || "-"} <span className="text-xs text-muted-foreground">(จ่าย {type.price_paid})</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedDigit === 2 && (
                    <div className="mt-3">
                      <label className="text-sm font-medium">รูปแบบเลข 2 ตัว</label>
                      <RadioGroup value={twoDigitOperation} onValueChange={(value) => setTwoDigitOperation(value as any)} className="flex flex-wrap gap-x-4 gap-y-2 mt-1 items-center">
                        {/* Radio items here */}
                        <div className="flex items-center space-x-2"><RadioGroupItem value="none" id="op-none" /><label htmlFor="op-none" className="text-sm cursor-pointer">ไม่มี</label></div>
                        <div className="flex items-center space-x-2"><RadioGroupItem value="reverse" id="op-reverse" /><label htmlFor="op-reverse" className="text-sm cursor-pointer">กลับเลข</label></div>
                        <div className="flex items-center space-x-2"><RadioGroupItem value="swipeFront" id="op-swipeFront" /><label htmlFor="op-swipeFront" className="text-sm cursor-pointer">รูดหน้า</label></div>
                        <div className="flex items-center space-x-2"><RadioGroupItem value="swipeBack" id="op-swipeBack" /><label htmlFor="op-swipeBack" className="text-sm cursor-pointer">รูดหลัง</label></div>
                        <div className="flex items-center space-x-2"><RadioGroupItem value="swipe19" id="op-swipe19" /><label htmlFor="op-swipe19" className="text-sm cursor-pointer">รูด19</label></div>
                      </RadioGroup>
                    </div>
                  )}
                  {selectedDigit === 3 && (
                    <div className="flex items-center gap-2 mt-3">
                      <input type="checkbox" checked={permuteThreeDigits} onChange={e => handlePermuteThreeDigitsChange(e.target.checked)} id="permuteThreeDigits" className="accent-blue-600 h-4 w-4"/>
                      <label htmlFor="permuteThreeDigits" className="text-sm cursor-pointer">รูด 6 (โต๊ด)</label>
                    </div>
                  )}
                  {selectedDigit === 1 && (
                     <div className="flex items-center gap-2 mt-3">
                      <input type="checkbox" checked={swipeNineSingleDigit} onChange={e => setSwipeNineSingleDigit(e.target.checked)} id="swipeNineSingleDigit" className="accent-blue-600 h-4 w-4"/>
                      <label htmlFor="swipeNineSingleDigit" className="text-sm cursor-pointer">รูด 9 (เพิ่ม 1-9 อัตโนมัติ)</label>
                    </div>
                  )}

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-sm font-medium">หมายเลขหวย <span className="text-xs text-muted-foreground">(คั่นด้วยเว้นวรรค, คอมม่า หรือขึ้นบรรทัดใหม่)</span></label>
                      {selectedDigit && (selectedDigit === 1 || selectedDigit === 2 || selectedDigit === 3) && 
                       !(selectedDigit === 2 && (twoDigitOperation === 'swipeFront' || twoDigitOperation === 'swipeBack' || twoDigitOperation === 'swipe19')) && 
                       !swipeNineSingleDigit && (
                          <Button type="button" variant="outline" size="sm" onClick={() => setIsNumberDrawerOpen(true)}>เลือกจากชุดตัวเลข</Button>
                        )}
                    </div>
                    <Textarea
                      rows={3}
                      placeholder={
                        swipeNineSingleDigit && selectedDigit === 1 ? "เลข 1-9 จะถูกเพิ่มอัตโนมัติ" :
                        !selectedDigit ? "เลือกจำนวนหลักก่อน" :
                        (selectedDigit === 2 && (twoDigitOperation === 'swipeFront' || twoDigitOperation === 'swipeBack' || twoDigitOperation === 'swipe19')) ? `กรอกหมายเลข 1 หลัก สำหรับรูด (เช่น 1 2 3)` :
                        `กรอกหมายเลข ${selectedDigit} หลัก (เช่น ${"1".repeat(selectedDigit)} ${"2".repeat(selectedDigit)})`
                      }
                      value={numberInput}
                      onChange={e => debouncedSetNumberInput(e.target.value)}
                      disabled={!selectedDigit || (swipeNineSingleDigit && selectedDigit === 1)}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium">จำนวนเงิน (บาท)</label>
                    {selectedTypes.length > 1 ? (
                      <>
                        <div className="flex gap-2 mb-2 items-center">
                          <Input type="number" min={1} placeholder="ใส่ทั้งหมด" value={fillAllAmount} onChange={e => setFillAllAmount(e.target.value)} className="w-32"/>
                          <Button type="button" variant="outline" size="sm"
                            onClick={() => {
                              if (!fillAllAmount || isNaN(Number(fillAllAmount)) || Number(fillAllAmount) <= 0) { toast.error("กรุณากรอกจำนวนเงินที่ถูกต้อง"); return; }
                              const newAmts: Record<number, string> = {};
                              selectedTypes.forEach(typeId => { newAmts[typeId] = fillAllAmount; });
                              setAmounts(newAmts);
                            }}
                          >ใช้ยอดนี้</Button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-3">
                          {selectedTypes.map(typeId => {
                            const type = filteredTypes.find(t => t.id === typeId);
                            return (
                              <div key={typeId}>
                                <label className="text-xs font-medium text-muted-foreground">{type?.type_number || "-"}</label>
                                <Input type="number" min={1} value={amounts[typeId] || ""} onChange={e => setAmounts({ ...amounts, [typeId]: e.target.value })} placeholder="จำนวนเงิน" disabled={!selectedDigit}/>
                                <div className="flex gap-1 mt-1 flex-wrap">
                                  {[5, 10, 20, 50, 100].map(qAmt => (<Button key={qAmt} type="button" variant="outline" size="sm" className="h-6 px-2 text-xs" onClick={() => setAmounts(prev => ({ ...prev, [typeId]: qAmt.toString() }))}>{qAmt}</Button>))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </>
                    ) : (
                      <div>
                        <Input type="number" min={1} placeholder="เช่น 20" value={amount} onChange={e => setAmount(e.target.value)} disabled={!selectedDigit || selectedTypes.length === 0}/>
                        <div className="flex gap-1 mt-1 flex-wrap ">
                          {[5, 10, 20, 50, 100].map(qAmt => (<Button key={qAmt} type="button" variant="outline" size="sm" className="h-6 px-2 text-xs" onClick={() => setAmount(qAmt.toString())}>{qAmt}</Button>))}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="mb-4">
                    <label className="text-sm font-medium">วันที่ออกรางวัล</label>
                    <div className="mt-1">
                      {selectedDraw ? (
                        <div className="py-2 px-3 rounded bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-200">
                          {format(selectedDraw.date, 'd MMM yy', { locale: th })}
                          <span className="ml-2 text-xs">({selectedDraw.schedule.drawing_time})</span>
                          <span className="ml-2 text-xs text-red-600">ปิดรับใน: {countdownText}</span>
                        </div>
                      ) : (
                         initialState.subType && availableDraws.length === 0 && !loading ? 
                         <div className="text-sm text-orange-600 py-2">ไม่มีรอบรางวัลสำหรับหวยประเภทนี้ในขณะนี้ หรือหมดเวลาแล้ว</div> :
                         <div className="text-sm text-gray-500 py-2">{initialState.subType ? "กำลังโหลดรอบรางวัล..." : "กรุณาเลือกชนิดหวยเพื่อดูรอบรางวัล"}</div>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2 justify-end">
                    <Button type="button" onClick={handleAddTicket} disabled={!canAdd || loading} className="px-6">เพิ่มรายการ</Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1, ease: "easeOut" }}>
              <Card className="mb-8 shadow-xl border-0 w-full">
                <CardHeader><CardTitle className="text-md text-gray-500 dark:text-gray-400">รายการที่เลือก</CardTitle></CardHeader>
                <CardContent>
                  {ticketList.length === 0 ? (
                    <div className="text-center text-muted-foreground py-6">ยังไม่มีรายการ</div>
                  ) : (
                    <>
                      <div className="mb-4 p-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
                        {/* Header info for the bill */}
                        <div className="flex flex-wrap justify-between items-center border-b border-dashed pb-1 mb-1 gap-2">
                          <span className="font-bold text-[15px] text-red-600 dark:text-red-400 flex items-center gap-1">หวย {subTypeObj?.sub_type_name || '-'}</span>
                          <span className="text-[13px] text-gray-700 dark:text-gray-300">บิล: {billNumber}</span>
                        </div>
                        <div className="flex flex-wrap justify-between items-center gap-2 mt-1">
                           <span className="text-gray-600 dark:text-gray-400 text-sm">งวด: {selectedDrawDate ? format(selectedDrawDate, 'd MMM yy', { locale: th }) : '-'} (เวลา {selectedDraw?.schedule.drawing_time || '-'})</span>
                           <span className="text-gray-600 dark:text-gray-400 text-sm">ผู้ซื้อ: {user?.user_metadata?.name || user?.email || 'ไม่ระบุ'}</span>
                        </div>
                         <div className="flex flex-wrap justify-between items-center mt-1 gap-2">
                           <span className="text-[12px] text-slate-700 dark:text-slate-300 bg-slate-200 dark:bg-slate-700/50 px-2 py-0.5 rounded">ชื่อบิล: {billName || '-'}</span>
                           <span className="text-right text-[12px] text-slate-700 dark:text-slate-300 bg-slate-200 dark:bg-slate-700/50 px-2 py-0.5 rounded">ซื้อเมื่อ: {format(new Date(), 'dMMM yy HH:mm', { locale: th })}</span>
                        </div>
                      </div>
                      <div className="space-y-2"> {/* Reduced space for tighter packing */}
                        <TicketListGroupComponent groupsMap={groups} handleRemoveGroupFn={handleRemoveGroup} />
                      </div>
                      <div className="flex justify-end mt-4 text-lg font-semibold text-green-600 dark:text-green-400">
                        ยอดรวมทั้งหมด: {(() => {
                          let total = 0;
                          Array.from(groups.values()).forEach((group: Grouped) => {
                            const allLabels = group.typeLabels || [];
                            total += allLabels.reduce((sum: number, label: string) => sum + (group.amounts[label] ?? 0) * group.numbers.length, 0);
                          });
                          return total.toLocaleString();
                        })()} ฿
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </motion.div>
            <div className="flex justify-end">
              <Button type="button" onClick={handleSubmit} disabled={loading || ticketList.length === 0 || isSubmitting} className="px-8 py-2 text-lg min-w-[170px]">
                {isSubmitting ? (<><Loader2 className="mr-2 h-5 w-5 animate-spin" /><span>กำลังดำเนินการ...</span></>) : 
                 loading ? ("กำลังโหลด...") : ("ยืนยันซื้อ")}
              </Button>
            </div>
          </motion.div>
        </SidebarInset>
      </SidebarProvider>
      <ConfirmationDialog />
      {(() => {
        const isSwipeInputMode = selectedDigit === 2 && (twoDigitOperation === 'swipeFront' || twoDigitOperation === 'swipeBack' || twoDigitOperation === 'swipe19');
        const shouldRenderDrawer = selectedDigit && (selectedDigit === 1 || selectedDigit === 2 || selectedDigit === 3) && !isSwipeInputMode && !swipeNineSingleDigit;
        if (!shouldRenderDrawer) return null;
        let useReverseForDrawer = (selectedDigit === 2 && twoDigitOperation === 'reverse') || (selectedDigit === 3 && permuteThreeDigits);
        return (<NumberSelectionDrawer isOpen={isNumberDrawerOpen} onOpenChange={setIsNumberDrawerOpen} onApplyNumbers={handleApplyNumbersFromDrawer} maxDigits={selectedDigit as 1 | 2 | 3} initialUseReverseNumbers={useReverseForDrawer} />);
      })()}
      {isLoadingPrint && (<SpectacularLoader message="กำลังเตรียมข้อมูลสำหรับพิมพ์..." baseColor="green" />)}
      <style jsx global>{`
        @keyframes shake { 0% { transform: translateX(0); } 20% { transform: translateX(-6px); } 40% { transform: translateX(6px); } 60% { transform: translateX(-4px); } 80% { transform: translateX(4px); } 100% { transform: translateX(0); } }
        .animate-shake { animation: shake 0.5s; }
      `}</style>
    </DirectionProvider>
  );
}