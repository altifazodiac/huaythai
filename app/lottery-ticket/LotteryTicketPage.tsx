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
import { Loader2, Trash2, TicketIcon, Hash, Tag, FileText, ListChecks, DollarSign, Calendar } from "lucide-react";
import { Calendar as UiCalendar } from "@/components/ui/calendar";
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
import SpectacularLoader from "@/components/ui/SpectacularLoader";
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
interface Grouped {
  digit_number: number;
  numbers: string[];
  typeLabels: string[]; // Should be derived from items in group, or canonical
  amounts: Record<string, number>; // Aggregated amounts for typeLabels
  typeOrder: string[]; // Canonical order for display
  uniqueKey: string; // Unique key of the first item forming the group, or a new group-specific key
  _inferredPivotForSort?: string | null; // For swipe19 sorting
  _processedItemUniqueKeysForNumbers: Set<string>; // ฮ New: To track unique keys that contributed numbers
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
  
    const isSwipeModeForSingleDigitInput = selectedDigit === 2 &&
      (twoDigitOperation === 'swipeFront' || twoDigitOperation === 'swipeBack' || twoDigitOperation === 'swipe19');
    const expectedInputLength = isSwipeModeForSingleDigitInput ? 1 : selectedDigit;
  
    let rawNumbersFromInput = numberInput
      .replace(/\n|,/g, " ")
      .split(" ")
      .map((n) => n.trim())
      .filter(n => n.length > 0);
  
    if (selectedDigit === 1 && swipeNineSingleDigit) {
      rawNumbersFromInput = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];
    } else {
      rawNumbersFromInput = rawNumbersFromInput.filter((n) => {
        const isValid = n.length === expectedInputLength && /^\d+$/.test(n);
        if (!isValid && !swipeNineSingleDigit) {
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
    //ฮ Removed: const globalUsedDoubles = new Set<string>(); 
  
    rawNumbersFromInput.forEach((rawNum, rawNumIndex) => {
      let singleRawNumProcessedNumbers: string[] = [];
  
      if (selectedDigit === 1 && swipeNineSingleDigit) {
        singleRawNumProcessedNumbers.push(rawNum);
      } else if (selectedDigit === 2) {
        switch (twoDigitOperation) {
          case 'reverse':
            if (rawNum.length === 2) singleRawNumProcessedNumbers.push(...getPermutations(rawNum));
            break;
  
          case 'swipeFront':
            if (rawNum.length === 1) {
              for (let i = 0; i <= 9; i++) {
                singleRawNumProcessedNumbers.push(rawNum + i.toString());
              }
            }
            break;
  
          case 'swipeBack':
            if (rawNum.length === 1) {
              for (let i = 0; i <= 9; i++) {
                singleRawNumProcessedNumbers.push(i.toString() + rawNum);
              }
            }
            break;
  
          case 'swipe19':
            if (rawNum.length === 1) {
              const D = rawNum;
  
              const part1: string[] = [];
              for (let i = 0; i <= 9; i++) part1.push(i.toString() + D);
  
              const part2: string[] = [];
              for (let i = 0; i <= 9; i++) {
                const num = D + i.toString();
                //ฮ Original check to prevent duplicates in part2 if already in part1 is fine for generating the 19 numbers.
                if (!part1.includes(num)) part2.push(num);
              }
  
              const uniqueNums = Array.from(new Set([...part1, ...part2])); // This Set is for swipe19 definition.
  
              //ฮ Removed filtering logic based on globalUsedDoubles
              // const filtered = uniqueNums.filter(num => {
              //   const isDouble = num.length === 2 && num[0] === num[1];
              //   return !isDouble || !globalUsedDoubles.has(num);
              // });
  
              // filtered.forEach(num => {
              //   if (num.length === 2 && num[0] === num[1]) {
              //     globalUsedDoubles.add(num);
              //   }
              // });
  
              singleRawNumProcessedNumbers.push(...uniqueNums); //ฮ Changed from filtered to uniqueNums
            }
            break;
  
          case 'none':
          default:
            if (rawNum.length === 2) singleRawNumProcessedNumbers.push(rawNum);
            break;
        }
  
      } else if (selectedDigit === 3 && permuteThreeDigits) {
        if (rawNum.length === 3) singleRawNumProcessedNumbers.push(...getPermutations(rawNum));
      } else {
        if (rawNum.length === selectedDigit) singleRawNumProcessedNumbers.push(rawNum);
      }
  
      //ฮ Removed: singleRawNumProcessedNumbers = Array.from(new Set(singleRawNumProcessedNumbers));
      if (singleRawNumProcessedNumbers.length === 0) return;
  
      const uniqueKeyForThisSet = `<span class="math-inline">\{processingTimestampKey\}\_</span>{rawNumIndex}_${Math.random().toString(36).slice(2, 8)}`;
  
      if (selectedTypes.length > 1) {
        let typeAmountsAreValid = true;
        selectedTypes.forEach((typeId) => {
          const amt = amounts[typeId];
          if (!amt || isNaN(Number(amt)) || Number(amt) <= 0) typeAmountsAreValid = false;
        });
        if (!typeAmountsAreValid) {
          toast.error("กรุณากรอกจำนวนเงินให้ถูกต้องสำหรับทุกประเภทที่เลือก (เมื่อประมวลผลเลขชุด)");
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
    });
  
    if (allNewTickets.length > 0) {
      setTicketList(prevList => [...prevList, ...allNewTickets]);
      setNumberInput("");
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
  
    //ฮ Original: const combinedNumbers = Array.from(new Set([...currentNumbersArray, ...newNumbers]));
    const combinedNumbers = [...currentNumbersArray, ...newNumbers]; //ฮ Changed to allow duplicates
    setNumberInput(combinedNumbers.join(" "));
  }

  function handleRemoveTicket(idx: number) { 
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
        router.replace('/lottery-ticket'); 
        fetchAvailableDraws(); 
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
  }, [selectedSubType, initialState.draw]); 

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

      const totalAmount = ticketList.reduce((sum, item) => sum + (item.amount * item.numbers.length), 0);

      // 1. Fetch current credit
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("credit_balance")
        .eq("id", user.id)
        .single();

      if (profileError) throw profileError;
      const currentCredit = profile?.credit_balance ?? 0;

      if (currentCredit < totalAmount) {
        toast.error("เครดิตของคุณไม่เพียงพอสำหรับการซื้อครั้งนี้");
        setIsSubmitting(false);
        setConfirmDialogOpen(false);
        return;
      }

      // 2. Deduct credit and log transaction
      const { error: txError } = await supabase.from("credit_transactions").insert([
        {
          user_id: user.id,
          amount: -totalAmount,
          transaction_type: "purchase",
          description: `ซื้อหวย บิล ${billNumber}`,
          related_bill_number: billNumber,
          created_at: new Date().toISOString(),
        },
      ]);
      if (txError) throw txError;

      const { error: updateCreditError } = await supabase
        .from("profiles")
        .update({ credit_balance: currentCredit - totalAmount })
        .eq("id", user.id);
      if (updateCreditError) throw updateCreditError;

      // 3. Try to insert ticket and items
      let ticket: { id: string } | null = null;
      try {
        const { data: ticketData, error: ticketError } = await supabase
          .from('lottery_tickets')
          .insert({
            user_id: user.id, draw_date: localDrawDate, draw_time: selectedDraw.schedule.drawing_time,
            close_time: formattedCloseTime, bill_number: billNumber, bill_name: billName,
            total_amount: totalAmount, 
            status: 'pending'
          }).select().single();
        if (ticketError) throw ticketError;
        ticket = ticketData;
        if (!ticket) throw new Error("Ticket creation failed");

        const ticketItems = ticketList.map(item => ({
          ticket_id: ticket!.id,
          lottery_sub_type_id: item.subType.lottery_sub_type_id,
          lottery_sub_number_id: item.payout.id,
          numbers: item.numbers,
          amount: item.amount
        }));

        const { error: itemsError } = await supabase.from('lottery_ticket_items').insert(ticketItems);
        if (itemsError) throw itemsError;

        const { error: updateError } = await supabase.from('lottery_tickets').update({ status: 'confirmed' }).eq('id', ticket!.id);
        if (updateError) throw updateError;

      } catch (err) {
        // 4. Refund credit and log reversal transaction
        await supabase.from("credit_transactions").insert([
          {
            user_id: user.id,
            amount: totalAmount,
            transaction_type: "refund",
            description: `คืนเงิน (บิลล้มเหลว) ${billNumber}`,
            related_bill_number: billNumber,
            created_at: new Date().toISOString(),
          },
        ]);
        await supabase
          .from("profiles")
          .update({ credit_balance: currentCredit })
          .eq("id", user.id);

        // Refresh credit in UI
        if (typeof fetchUserData === "function") await fetchUserData();

        throw err; // rethrow to show error toast
      }

      // 5. Success: clear state, close dialog, refresh credit
      setTicketList([]); 
      setBillName(""); 
      setConfirmDialogOpen(false);
      toast.success("บันทึกการซื้อสำเร็จ!");
      if (typeof fetchUserData === "function") await fetchUserData();
      router.push(`/print-ticket?bill_number=${encodeURIComponent(billNumber)}`);
      window.dispatchEvent(new Event("credit-updated"));

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
      !!selectedSubType && 
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
    const { digit_number, typeLabels, amounts, numbers } = groupToRemove;
  
    // Find the subTypeId from ticketList based on matching group attributes
    const subTypeId = ticketList.find(item => 
      item.payout.digit_number === digit_number && 
      typeLabels.includes(item.payout.type_number || "-") && 
      item.numbers.some(n => numbers.includes(n))
    )?.subType.lottery_sub_type_id;
  
    if (!subTypeId) {
      console.warn("Could not find subTypeId for group", groupToRemove);
      toast.error("ไม่สามารถลบกลุ่มนี้ได้: ไม่พบข้อมูลประเภทหวย");
      return;
    }
  
    // Create a key based on core attributes
    const groupKey = `${subTypeId}|${digit_number}|${typeLabels.sort().join(',')}`;
  
    // Filter out all items that match the group
    setTicketList(prevList => prevList.filter(item => {
      const itemTypeLabel = item.payout.type_number || "-";
      const itemGroupKey = `${item.subType.lottery_sub_type_id}|${item.payout.digit_number}|${typeLabels.sort().join(',')}`;
      const isSameAmount = amounts[itemTypeLabel] === item.amount;
      return !(itemGroupKey === groupKey && isSameAmount && numbers.some(n => item.numbers.includes(n)));
    }));
  
    // Log the removal to Supabase if user and selectedDraw exist
    if (user && selectedDraw) {
      try {
        await supabase.from('lottery_ticket_remove_logs').insert({
          user_id: user.id,
          bill_number: billNumber,
          group_info: {
            digit_number,
            numbers,
            typeLabels,
            amounts,
            pivot: groupToRemove._inferredPivotForSort,
          },
          removed_at: new Date().toISOString(),
          reason: 'user removed group',
          draw_date: selectedDraw.date.toISOString(),
          close_time: selectedDraw.schedule.close_time,
          schedule_id: selectedDraw.schedule.schedule_id,
        });
      } catch (e: unknown) {
        console.error('Error logging remove group:', e);
        toast.error("เกิดข้อผิดพลาดในการบันทึก log การลบกลุ่ม");
      }
    }
  
    toast.success("ลบกลุ่มสำเร็จ!");
  }

 // ... inside export default function LotteryTicketPage()

// ... inside export default function LotteryTicketPage()

const { allTypeLabels, groups } = useMemo(() => {
  const calculatedAllTypeLabels: Record<number, string[]> = {}; //
  payouts.forEach(p => { //
    if (!p.type_number) return; //
    if (!calculatedAllTypeLabels[p.digit_number]) calculatedAllTypeLabels[p.digit_number] = []; //
    if (!calculatedAllTypeLabels[p.digit_number].includes(p.type_number)) { //
      calculatedAllTypeLabels[p.digit_number].push(p.type_number); //
    }
  });

  Object.keys(calculatedAllTypeLabels).forEach(digitStr => { //
    const digit = Number(digitStr); //
    const labels = calculatedAllTypeLabels[digit]; //
    if (!labels) return; //
    let ordered = [...labels]; //
    if (digit === 2 && labels.includes("บน") && labels.includes("ล่าง")) { //
      ordered = ["บน", "ล่าง", ...labels.filter(l => l !== "บน" && l !== "ล่าง")]; //
    }
    calculatedAllTypeLabels[digit] = Array.from(new Set(ordered)); //
  });

  const calculatedGroups: Map<string, Grouped> = new Map(); //

  ticketList.forEach(item => { //
    const digit = item.payout.digit_number; //
    const subTypeId = item.subType.lottery_sub_type_id; //
    const typeLabel = item.payout.type_number || "-"; //
    const canonicalTypeLabels = calculatedAllTypeLabels[digit] || [typeLabel]; //
    const groupKey = `<span class="math-inline">\{subTypeId\}\|</span>{digit}|<span class="math-inline">\{canonicalTypeLabels\.sort\(\)\.join\(','\)\}\|</span>{item.amount}`; //

    if (!calculatedGroups.has(groupKey)) { //
      const groupAmounts: Record<string, number> = {}; //
      canonicalTypeLabels.forEach(label => { groupAmounts[label] = 0; }); //
      calculatedGroups.set(groupKey, { //
        digit_number: digit, //
        numbers: [], // Initialized as empty //
        typeLabels: canonicalTypeLabels, //
        amounts: groupAmounts, //
        typeOrder: canonicalTypeLabels, //
        uniqueKey: item.uniqueKey, //
        _inferredPivotForSort: inferSwipe19Pivot(item.numbers) || null, //
        _processedItemUniqueKeysForNumbers: new Set<string>(), // ฮ New: Initialize the set
      });
    }
    const group = calculatedGroups.get(groupKey)!; //
    group.amounts[typeLabel] = item.amount;  //

    // ฮ Changed logic for adding numbers to the group display:
    // This ensures that for a given item.uniqueKey (representing one set of processed numbers from raw input),
    // its numbers are added only once to this visual group.
    // If another item with a *different* item.uniqueKey maps to the same visual group,
    // its numbers will be added, preserving the behavior from the previous "remove all duplicates" request
    // for distinct inputs.
    if (!group._processedItemUniqueKeysForNumbers.has(item.uniqueKey)) {
      group.numbers.push(...item.numbers); // This was the "ฮ Changed" line from the previous request
      group._processedItemUniqueKeysForNumbers.add(item.uniqueKey);
    }
  });

  return { allTypeLabels: calculatedAllTypeLabels, groups: calculatedGroups }; //
}, [ticketList, payouts]); //

 


  const ConfirmationDialog = () => (
    <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
      <DialogContent className="bg-white dark:bg-slate-800">
        <DialogHeader>
          <DialogTitle className="text-slate-800 dark:text-slate-100">ยืนยันการซื้อหวย</DialogTitle>
          <DialogDescription className="text-slate-600 dark:text-slate-400">
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
            <p className="font-medium mb-2 text-slate-700 dark:text-slate-300">รายการที่เลือก:</p>
            <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-md">
              <table className="min-w-full text-xs">
                <thead >
                  <tr className="bg-slate-50 dark:bg-slate-700">
                    <th className="px-2 py-1.5 border-b border-slate-200 dark:border-slate-600 text-left text-slate-600 dark:text-slate-300">ประเภท</th>
                    <th className="px-2 py-1.5 border-b border-slate-200 dark:border-slate-600 text-left text-slate-600 dark:text-slate-300">หมายเลข</th>
                    <th className="px-2 py-1.5 border-b border-slate-200 dark:border-slate-600 text-right text-slate-600 dark:text-slate-300">จำนวนเงิน/เลข</th>
                    <th className="px-2 py-1.5 border-b border-slate-200 dark:border-slate-600 text-right text-slate-600 dark:text-slate-300">จำนวนเลข</th>
                    <th className="px-2 py-1.5 border-b border-slate-200 dark:border-slate-600 text-right text-slate-600 dark:text-slate-300">รวม</th>
                  </tr>
                </thead>
                <tbody className="text-slate-700 dark:text-slate-300">
                  {ticketList.map((item, index) => (
                    <tr key={item.uniqueKey + "_" + index} className="border-b border-slate-200 dark:border-slate-700 last:border-b-0">
                      <td className="px-2 py-1.5">{item.subType.sub_type_name} - {item.payout.type_number}</td>
                      <td className="px-2 py-1.5">{item.numbers.join(', ')}</td>
                      <td className="px-2 py-1.5 text-right">{item.amount.toLocaleString()}</td>
                      <td className="px-2 py-1.5 text-right">{item.numbers.length}</td>
                      <td className="px-2 py-1.5 text-right">{(item.amount * item.numbers.length).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="text-right font-medium mt-2 text-slate-800 dark:text-slate-200">
            ยอดรวม: {ticketList.reduce((sum, item) => sum + item.amount * item.numbers.length, 0).toLocaleString()} บาท
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setConfirmDialogOpen(false)} disabled={isSubmitting} className="border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700">ยกเลิก</Button>
          <Button onClick={handleConfirmSubmit} disabled={isSubmitting} className="min-w-[120px] bg-blue-600 hover:bg-blue-700 text-white">
            {isSubmitting ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />กำลังบันทึก...</>) : ("ยืนยัน")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  const fetchUserData = useCallback(async () => {
    const { data: { user: supabaseUser } } = await supabase.auth.getUser(); 
    if (supabaseUser) {
      setUser(supabaseUser);
    } else {
      router.push("/login");
    }
  }, [router, supabase]);

  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  useEffect(() => {
    function getCountdownText(currentSelectedDraw: AvailableDraw | null) { 
      if (!currentSelectedDraw) return "-";
      const now = new Date();
      const [h, m, s] = currentSelectedDraw.schedule.close_time.split(":");
      const closeDate = new Date(currentSelectedDraw.date);
      closeDate.setHours(Number(h), Number(m), Number(s || 0), 0);
      const diff = closeDate.getTime() - now.getTime();
      if (diff <= 0) return "หมดเวลา";
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
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
        router.push("/"); 
      }
    }, 1000 * 30); 
    return () => clearInterval(timer);
  }, [selectedDraw, router]); 

  const TicketListGroupComponent = React.memo(({ groupsMap, handleRemoveGroupFn }: { groupsMap: Map<any, Grouped>, handleRemoveGroupFn: (group: Grouped) => void }) => {
    return (
      <AnimatePresence>
        {Array.from(groupsMap.values()).map((group, idx) => {
          const allLabelsInGroup: string[] = group.typeLabels || [];
          const groupTotal = allLabelsInGroup.reduce((sum: number, label: string) => {
            const amountForLabel = group.amounts[label] ?? 0;
            return sum + (amountForLabel * group.numbers.length);
          }, 0);
  
          return (
            <motion.div
              key={group.uniqueKey + "_" + idx}
              initial={{ opacity: 0, y: -10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.98 }}
              transition={{ duration: 0.3 }}
              className="flex flex-row items-start bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2.5 mb-2 gap-3 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
            >
              <div className="flex flex-col items-center justify-start min-w-[80px] max-w-[100px] text-center flex-shrink-0 pt-1">
                <div className="text-sm font-bold text-blue-600 dark:text-blue-400 leading-tight">{group.digit_number} ตัว</div>
                <div className="text-xs text-slate-600 dark:text-slate-300 leading-tight break-words">
                  {group.typeLabels.join(' x ')}
                  {group._inferredPivotForSort ? ` (รูด19:${group._inferredPivotForSort})` : ''}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 leading-tight break-words">
                  {group.typeLabels.map(label => group.amounts[label] ?? 0).join(' x ')}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 leading-tight mt-0.5">รวม {groupTotal.toLocaleString()} ฿</div>
              </div>
              <div className="flex-1 flex items-start min-h-8">
                <Textarea
                  value={group.numbers.join('  ')}
                  readOnly
                  rows={Math.min(3, Math.ceil(group.numbers.join('  ').length / 35))}
                  className="rounded-md p-1.5 w-full text-xs leading-snug resize-none bg-slate-50 dark:bg-slate-700/60 border border-slate-300 dark:border-slate-600 focus-visible:ring-1 focus-visible:ring-blue-500 placeholder-slate-400 dark:placeholder-slate-500"
                  style={{ textAlign: 'left', wordBreak: 'break-all', whiteSpace: 'pre-wrap', fontFamily: 'inherit', minHeight: '28px' }}
                />
                <button
                  className="ml-2 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors flex-shrink-0 p-1.5 mt-0.5 rounded-md hover:bg-red-100 dark:hover:bg-red-800/50"
                  title="ลบกลุ่มนี้"
                  onClick={() => handleRemoveGroupFn(group)}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    );
  });


  return (
    <DirectionProvider dir="ltr">
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 bg-white dark:bg-slate-900 border-b dark:border-slate-700">
            <div className="flex items-center gap-2 px-4">
              <SidebarTrigger className="-ml-1 text-slate-600 dark:text-slate-300" />
              <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4 bg-slate-300 dark:bg-slate-600" />
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem className="hidden md:block">
                    <BreadcrumbLink href="/" className="text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-slate-100">หน้าหลัก</BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator className="hidden md:block text-slate-400 dark:text-slate-500" />
                  <BreadcrumbItem>
                    <BreadcrumbPage className="text-slate-700 dark:text-slate-200 font-medium">ซื้อหวย</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>
          </header>
          <div className="bg-slate-50 dark:bg-slate-900 min-h-[calc(100vh-4rem)] py-6"> {/* Page Background */}
            {loading && (<SpectacularLoader message="กำลังโหลดข้อมูล..." baseColor="sky" />)}
            <motion.div
              initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="mx-auto w-full max-w-2xl md:max-w-3xl lg:max-w-4xl px-2 md:px-6 lg:px-8"
            >
              <Card className="mb-8 shadow-lg border-0 rounded-xl bg-white dark:bg-slate-800">
                <CardHeader className="h-20 bg-blue-800 dark:bg-blue-700 rounded-t-xl shadow-lg flex flex-col items-start justify-center">
                <div className="flex items-center space-x-3">
                  <TicketIcon className="w-12 h-12 text-blue-100" /> 
                  <span className="text-xl md:text-2xl font-bold text-white">สร้างรายการหวย</span></div>
                  <span className="text-sm text-blue-100 dark:text-blue-200 font-medium">กรอกรายละเอียดเพื่อเพิ่มรายการซื้อหวยของคุณ</span>
                </CardHeader>
                <CardContent className="p-4 md:p-6">  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6"> 
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                        <Hash className="w-4 h-4 text-blue-800" />
                        เลขบิล (Bill Number)
                      </label>
                      <Input value={billNumber} readOnly className="bg-slate-100 dark:bg-slate-700 cursor-not-allowed border-slate-300 dark:border-slate-600 rounded-md focus:ring-blue-500 focus:border-blue-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                        <Tag className="w-4 h-4 text-blue-800" />
                        ชื่อบิล (Bill Name)
                      </label>
                      <Input value={billName} onChange={e => setBillName(e.target.value)} placeholder="ระบุชื่อบิล (ถ้ามี)" className="border-slate-300 dark:border-slate-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-800 placeholder-slate-400 dark:placeholder-slate-500" />
                    </div>
                  </div>
                  <form className="space-y-6" onSubmit={(e) => e.preventDefault()}> 
                   <AnimatePresence mode="wait">
                    <motion.div
                      key="digit-section"
                      initial={{ opacity: 0, y: 24 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 24 }}
                      transition={{ duration: 0.35, ease: "easeOut" }}
                    >
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                        <FileText className="w-4 h-4 text-blue-800" />
                        จำนวนหลัก
                      </label>
                        <div className="flex gap-2 mt-1 flex-wrap">
                          {digitOptions.map((d) => (
                            <Button 
                              key={d} 
                              type="button" 
                            onClick={() => {
                              setSelectedDigit(d);
                              setSelectedTypes([]);
                              setTwoDigitOperation('none');
                              setPermuteThreeDigits(false);
                              setSwipeNineSingleDigit(false);
                            }}
                              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors
                                ${selectedDigit === d 
                                  ? 'bg-blue-600 text-white hover:bg-blue-700 border-blue-600' 
                                : 'bg-blue-50 border border-blue-100 text-blue-800 hover:bg-blue-250'
                                }`}
                            >
                              {d} ตัว
                            </Button>
                          ))}
                        </div>
                    </motion.div>
                  </AnimatePresence>

                  <AnimatePresence mode="wait">
                    {selectedDigit && (
                      <motion.div
                        key={`type-checkboxes-${selectedDigit}`}
                        initial={{ opacity: 0, y: 24 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 24 }}
                        transition={{ duration: 0.35, ease: "easeOut" }}
                      >
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                          <ListChecks className="w-4 h-4 text-blue-800" />
                          เลือกประเภท/รูปแบบ <span className="text-xs text-slate-500 dark:text-slate-400">(เลือกได้หลายแบบ)</span>
                        </label>
                        <div className={`flex gap-2 flex-wrap mt-1 transition-all duration-300 ${selectedTypes.length === 0 && selectedDigit ? 'animate-shake border-2 border-red-400 bg-red-50 dark:bg-red-900/20 p-2 rounded-md' : 'p-2'}`}>
                          {filteredTypes.map((type) => (
                            <label 
                              key={type.id} 
                              className={`flex items-center gap-1.5 border rounded-md px-3 py-1.5 cursor-pointer shadow-sm transition-all
                                ${selectedTypes.includes(type.id) 
                                  ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-500 dark:border-blue-600 ring-1 ring-blue-500' 
                                  : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700'
                                }`}
                            >
                              <input
                                type="checkbox"
                                checked={selectedTypes.includes(type.id)}
                                onChange={() => handleTypeToggle(type.id)}
                                disabled={(permuteThreeDigits && selectedDigit === 3 && (type.type_number === "เต็ง" || type.type_number === "โต๊ด"))}
                                className="h-4 w-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 dark:accent-blue-500"
                              />
                              <span className="text-slate-800 dark:text-slate-200 text-sm">{type.type_number || "-"}</span>
                              <span className="text-xs text-slate-500 dark:text-slate-400">(จ่าย {type.price_paid})</span>
                            </label>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <AnimatePresence mode="wait">
                    {selectedDigit === 2 && (
                      <motion.div
                        key="two-digit-ops"
                        initial={{ opacity: 0, y: 24 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 24 }}
                        transition={{ duration: 0.35, ease: "easeOut" }}
                        className="mt-3"
                      >
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">รูปแบบเลข 2 ตัว</label>
                        <RadioGroup value={twoDigitOperation} onValueChange={(value) => setTwoDigitOperation(value as any)} className="flex flex-wrap gap-x-4 gap-y-2 mt-1 items-center">
                          <div className="flex items-center space-x-2"><RadioGroupItem value="none" id="op-none" className="text-blue-600 border-slate-400 dark:border-slate-500 focus:ring-blue-500"/><label htmlFor="op-none" className="text-sm cursor-pointer text-slate-700 dark:text-slate-300">ไม่มี</label></div>
                          <div className="flex items-center space-x-2"><RadioGroupItem value="reverse" id="op-reverse" className="text-blue-600 border-slate-400 dark:border-slate-500 focus:ring-blue-500"/><label htmlFor="op-reverse" className="text-sm cursor-pointer text-slate-700 dark:text-slate-300">กลับเลข</label></div>
                          <div className="flex items-center space-x-2"><RadioGroupItem value="swipeFront" id="op-swipeFront" className="text-blue-600 border-slate-400 dark:border-slate-500 focus:ring-blue-500"/><label htmlFor="op-swipeFront" className="text-sm cursor-pointer text-slate-700 dark:text-slate-300">รูดหน้า</label></div>
                          <div className="flex items-center space-x-2"><RadioGroupItem value="swipeBack" id="op-swipeBack" className="text-blue-600 border-slate-400 dark:border-slate-500 focus:ring-blue-500"/><label htmlFor="op-swipeBack" className="text-sm cursor-pointer text-slate-700 dark:text-slate-300">รูดหลัง</label></div>
                          <div className="flex items-center space-x-2"><RadioGroupItem value="swipe19" id="op-swipe19" className="text-blue-600 border-slate-400 dark:border-slate-500 focus:ring-blue-500"/><label htmlFor="op-swipe19" className="text-sm cursor-pointer text-slate-700 dark:text-slate-300">รูด19</label></div>
                        </RadioGroup>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <AnimatePresence mode="wait">
                    {selectedDigit === 3 && (
                      <motion.div
                        key="three-digit-ops"
                        initial={{ opacity: 0, y: 24 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 24 }}
                        transition={{ duration: 0.35, ease: "easeOut" }}
                        className="flex items-center gap-2 mt-3"
                      >
                        <input type="checkbox" checked={permuteThreeDigits} onChange={e => handlePermuteThreeDigitsChange(e.target.checked)} id="permuteThreeDigits" className="h-4 w-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 dark:accent-blue-500"/>
                        <label htmlFor="permuteThreeDigits" className="text-sm cursor-pointer text-slate-700 dark:text-slate-300">กลับเลข (รูด 6)</label>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <AnimatePresence mode="wait">
                    {selectedDigit === 1 && (
                      <motion.div
                        key="one-digit-ops"
                        initial={{ opacity: 0, y: 24 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 24 }}
                        transition={{ duration: 0.35, ease: "easeOut" }}
                        className="flex items-center gap-2 mt-3"
                      >
                        <input type="checkbox" checked={swipeNineSingleDigit} onChange={e => setSwipeNineSingleDigit(e.target.checked)} id="swipeNineSingleDigit" className="h-4 w-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 dark:accent-blue-500"/>
                        <label htmlFor="swipeNineSingleDigit" className="text-sm cursor-pointer text-slate-700 dark:text-slate-300">รูด 9 (เพิ่ม 1-9 อัตโนมัติ)</label>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <AnimatePresence mode="wait">
                    {selectedDigit && (
                      <motion.div
                        key={`number-input-${selectedDigit}`}
                        initial={{ opacity: 0, y: 24 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 24 }}
                        transition={{ duration: 0.35, ease: "easeOut" }}
                      >
                      <div className="flex justify-between items-center mb-1">
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1">
                            <Hash className="w-4 h-4 text-blue-800" />
                            หมายเลขหวย <span className="text-xs text-slate-500 dark:text-slate-400">(คั่นด้วยเว้นวรรค, คอมม่า หรือขึ้นบรรทัดใหม่)</span>
                          </label>
                        {selectedDigit && (selectedDigit === 1 || selectedDigit === 2 || selectedDigit === 3) && 
                         !(selectedDigit === 2 && (twoDigitOperation === 'swipeFront' || twoDigitOperation === 'swipeBack' || twoDigitOperation === 'swipe19')) && 
                         !swipeNineSingleDigit && (
                              <Button type="button" size="sm" onClick={() => setIsNumberDrawerOpen(true)} className="rounded-full text-xs px-3 py-1 border-blue-500 bg-blue-50 text-blue-600 hover:bg-blue-50 dark:border-blue-400 dark:text-blue-400 dark:hover:bg-blue-900/30">เลือกจากชุดตัวเลข</Button>
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
                        className="border-slate-300 dark:border-slate-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-800 placeholder-slate-400 dark:placeholder-slate-500"
                      />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <AnimatePresence mode="wait">
                    {selectedDigit && (
                      <motion.div
                        key={`amount-input-${selectedDigit}`}
                        initial={{ opacity: 0, y: 24 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 24 }}
                        transition={{ duration: 0.35, ease: "easeOut" }}
                      >
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                          <DollarSign className="w-4 h-4 text-blue-800" />
                          จำนวนเงิน (บาท)
                        </label>
                        {selectedTypes.length > 1 ? (
  <>
    <div className="flex gap-2 mb-3 items-center">
      <Input
        type="number"
        min={1}
        placeholder="ใส่ทั้งหมด"
        value={fillAllAmount}
        onChange={e => setFillAllAmount(e.target.value)}
        className="w-32 text-blue-600 text-bold border-slate-300 dark:border-slate-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-800 placeholder-slate-400 dark:placeholder-slate-500"
      />
      <Button
        type="button"
        size="sm"
        onClick={() => {
          if (!fillAllAmount || isNaN(Number(fillAllAmount)) || Number(fillAllAmount) <= 0) {
            toast.error("กรุณากรอกจำนวนเงินที่ถูกต้อง");
            return;
          }
          const newAmts: Record<number, string> = {};
          selectedTypes.forEach(typeId => {
            newAmts[typeId] = fillAllAmount;
          });
          setAmounts(newAmts);
        }}
        className="px-4 py-1.5 text-sm rounded-md border-blue-500 text-blue-600 hover:bg-blue-50 dark:border-blue-400 dark:text-blue-400 dark:hover:bg-blue-900/30"
      >
        ใช้ยอดนี้
      </Button>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-4">
      {selectedTypes.map(typeId => {
        const type = filteredTypes.find(t => t.id === typeId);
        return (
          <div key={typeId}>
            <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {type?.type_number || "-"}
            </label>
            <Input
              type="number"
              min={1}
              value={amounts[typeId] || ""}
              onChange={e => setAmounts({ ...amounts, [typeId]: e.target.value })}
              placeholder="จำนวนเงิน"
              disabled={!selectedDigit}
              className="mt-0.5 border-slate-300 dark:border-slate-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-800 placeholder-slate-400 dark:placeholder-slate-500"
            />
            <div className="flex gap-1 mt-1.5 flex-wrap">
              {[5, 10, 20, 50, 100].map(qAmt => (
                <Button
                  key={qAmt}
                  type="button"
                  size="sm"
                  className="h-7 px-3 text-xs rounded-full bg-white border border-blue-800 text-blue-800 hover:bg-blue-50"
                  onClick={() => setAmounts({ ...amounts, [typeId]: qAmt.toString() })} // Updated to setAmounts
                >
                  {qAmt}
                </Button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  </>
) :  (
  // Single-type input section (unchanged)
  <div>
    <Input
      type="number"
      min={1}
      placeholder="เช่น 20"
      value={amount}
      onChange={e => setAmount(e.target.value)}
      disabled={!selectedDigit || selectedTypes.length === 0}
      className="border-slate-300 dark:border-slate-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-800 placeholder-slate-400 dark:placeholder-slate-500"
    />
    <div className="flex gap-1 mt-1.5 flex-wrap">
      {[5, 10, 20, 50, 100].map(qAmt => (
        <Button
          key={qAmt}
          type="button"
          size="sm"
          className="h-7 w-10 px-3 text-xs rounded-full bg-white border border-gray-300 text-blue-800 hover:bg-blue-50"
          onClick={() => setAmount(qAmt.toString())}
        >
          {qAmt}
        </Button>
      ))}
    </div>
  </div>
)}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <AnimatePresence mode="wait">
                    {selectedDigit && (
                      <motion.div
                        key={`draw-date-${selectedDigit}`}
                        initial={{ opacity: 0, y: 24 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 24 }}
                        transition={{ duration: 0.35, ease: "easeOut" }}
                        className="mb-4"
                      >
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                          <Calendar className="w-4 h-4 text-blue-800" />
                          วันที่ออกรางวัล
                        </label>
                        {selectedDraw ? (
                          <div className="py-2.5 px-3 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
                            {format(selectedDraw.date, 'd MMM yy', { locale: th })}
                            <span className="ml-2 text-xs">({selectedDraw.schedule.drawing_time})</span>
                            <span className="ml-2 text-xs text-red-600 dark:text-red-400">ปิดรับใน: {countdownText}</span>
                          </div>
                        ) : (
                           initialState.subType && availableDraws.length === 0 && !loading ? 
                           <div className="text-sm text-orange-600 py-2">ไม่มีรอบรางวัลสำหรับหวยประเภทนี้ในขณะนี้ หรือหมดเวลาแล้ว</div> :
                           <div className="text-sm text-slate-500 dark:text-slate-400 py-2">{initialState.subType ? "กำลังโหลดรอบรางวัล..." : "กรุณาเลือกชนิดหวยเพื่อดูรอบรางวัล"}</div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>

                    <div className="flex gap-2 justify-end pt-2"> {/* Added pt */}
                      <Button 
                        type="button" 
                        onClick={handleAddTicket} 
                        disabled={!canAdd || loading} 
                        className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-md shadow-sm disabled:opacity-50"
                      >
                        เพิ่มรายการ
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>

              <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1, ease: "easeOut" }}>
                <Card className="mb-8 shadow-lg border-0 rounded-xl w-full bg-white dark:bg-slate-800">
                  <CardHeader className="border-b dark:border-slate-700 p-5">
                    <CardTitle className="text-lg font-semibold text-slate-800 dark:text-slate-200">รายการที่เลือก</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 md:p-6"> 
                    {ticketList.length === 0 ? (
                    <div className="text-center text-slate-500 dark:text-slate-400 py-8">
                      <FileText className="inline w-6 h-6 mr-2 text-blue-400" />
                      ยังไม่มีรายการ
                    </div>  
                    ) : (
                      <>
                        <div className="mb-4 p-4 rounded-lg bg-slate-100/50 dark:bg-slate-700/30 border border-slate-200 dark:border-slate-700">
                          <div className="flex flex-wrap justify-between items-center border-b border-dashed border-slate-300 dark:border-slate-600 pb-2 mb-2 gap-2">
                            <span className="font-semibold text-md text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                            <TicketIcon className="w-5 h-5" />
                              หวย {subTypeObj?.sub_type_name || '-'}
                            </span>
                          <span className="text-sm text-slate-600 dark:text-slate-400 flex items-center gap-1">
                            <Hash className="w-4 h-4" />
                            บิล: {billNumber}
                          </span>
                          </div>
                          <div className="flex flex-wrap justify-between items-center gap-2 mt-1">
                          <span className="text-slate-600 dark:text-slate-400 text-sm flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            งวด: {selectedDrawDate ? format(selectedDrawDate, 'd MMM yy', { locale: th }) : '-'} (เวลา {selectedDraw?.schedule.drawing_time || '-'})
                          </span>
                          <span className="text-slate-600 dark:text-slate-400 text-sm flex items-center gap-1">
                            <Tag className="w-4 h-4" />
                            ผู้ซื้อ: {user?.user_metadata?.name || user?.email || 'ไม่ระบุ'}
                          </span>
                          </div>
                           <div className="flex flex-wrap justify-between items-center mt-1.5 gap-2">
                          <span className="text-xs text-slate-700 dark:text-slate-300 bg-slate-200 dark:bg-slate-600/50 px-2 py-1 rounded-full flex items-center gap-1">
                            <Tag className="w-3 h-3" />
                            ชื่อบิล: {billName || '-'}
                          </span>
                          <span className="text-right text-xs text-slate-700 dark:text-slate-300 bg-slate-200 dark:bg-slate-600/50 px-2 py-1 rounded-full flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            ซื้อเมื่อ: {format(new Date(), 'dMMM yy HH:mm', { locale: th })}
                          </span>
                          </div>
                        </div>
                      <div className="space-y-2.5">
                          <TicketListGroupComponent groupsMap={groups} handleRemoveGroupFn={handleRemoveGroup} />
                        </div>
                      <div className="flex justify-end mt-6 text-xl font-bold text-blue-600 dark:text-blue-400 items-center gap-2">
                        <DollarSign className="w-6 h-6" />
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
              <div className="flex justify-end pb-6"> {/* Added pb for spacing if it's the last element */}
                <Button 
                  type="button" 
                  onClick={handleSubmit} 
                  disabled={loading || ticketList.length === 0 || isSubmitting} 
                  className="px-10 py-3 text-base font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-md min-w-[180px] flex items-center justify-center disabled:opacity-60"
                >
                  {isSubmitting ? (<><Loader2 className="mr-2 h-5 w-5 animate-spin" /><span>กำลังดำเนินการ...</span></>) : 
                   loading ? ("กำลังโหลด...") : ("ยืนยันการสั่งซื้อ")}
                </Button>
              </div>
            </motion.div>
          </div>
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