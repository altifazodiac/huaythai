"use client";
import React, { useEffect, useState, useMemo } from "react";
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
  typeLabels: string[];
  amounts: Record<string, number>;
  typeOrder: string[];
}

function normalizeDraw(draw: any): AvailableDraw {
  return {
    ...draw,
    date: draw?.date ? new Date(draw.date) : undefined,
  };
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
  const [reverseNumber, setReverseNumber] = useState(false);
  const [numberInput, setNumberInput] = useState("");
  const [amount, setAmount] = useState("");
  const [amounts, setAmounts] = useState<Record<number, string>>({});
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

  // โหลดชนิดหวย
  useEffect(() => {
    supabase.from("lottery_sub_types").select("lottery_sub_type_id, sub_type_name").then(({ data }) => {
      if (data) setSubTypes(data);
    });
  }, [supabase]);

  // โหลด payout เมื่อเลือกชนิดหวย
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
      .then(({ data }) => {
        if (data) setPayouts(data);
      });
  }, [selectedSubType, supabase]);

  // ดึง object ของชนิดหวยและ payout
  const subTypeObj = subTypes.find((s) => s.lottery_sub_type_id === selectedSubType) || null;
  const payoutObj = payouts.find((p) => p.id === selectedPayout) || null;

  // ดึง digit_number ที่มีใน payout
  const digitOptions = useMemo(() => {
    const digits = new Set<number>();
    payouts.forEach((p) => digits.add(p.digit_number));
    return Array.from(digits).sort();
  }, [payouts]);

  // filter เฉพาะประเภทที่ตรงกับ digit ที่เลือก
  const filteredTypes = useMemo(() => {
    if (!selectedDigit) return [];
    return payouts.filter((p) => p.digit_number === selectedDigit);
  }, [payouts, selectedDigit]);

  // handle multi-select type
  function handleTypeToggle(id: number) {
    setSelectedTypes((prev) => prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]);
  }

  // กลับหมายเลข (permutation)
  function getPermutations(str: string) {
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

  // เพิ่มรายการ
  function handleAddTicket() {
    if (!subTypeObj || !selectedDigit || selectedTypes.length === 0) {
      toast.error("กรุณาเลือกชนิดหวย, จำนวนหลัก และประเภทก่อน");
      return;
    }
    const numbersRaw = numberInput
      .replace(/\n|,/g, " ")
      .split(" ")
      .map((n) => n.trim())
      .filter((n) => n.length === selectedDigit && /^\d+$/.test(n));
    if (!numbersRaw.length) {
      toast.error(`กรุณากรอกหมายเลข ${selectedDigit} หลัก อย่างน้อย 1 หมายเลข`);
      return;
    }
    // กลับหมายเลขถ้าเลือก (เฉพาะเลข 2 ตัว)
    let numbers: string[] = [];
    numbersRaw.forEach((num) => {
      if (reverseNumber && selectedDigit === 2) {
        numbers.push(...getPermutations(num));
      } else {
        numbers.push(num);
      }
    });
    numbers = Array.from(new Set(numbers));
    // ป้องกันเลขซ้ำในแต่ละ type
    const duplicate = numbers.some(num =>
      selectedTypes.some(typeId =>
        ticketList.some(item =>
          item.payout.digit_number === selectedDigit &&
          item.payout.id === typeId &&
          item.numbers.includes(num)
        )
      )
    );
    if (duplicate) {
      toast.error("มีหมายเลขที่เลือกซ้ำในประเภทที่เลือกแล้ว");
      return;
    }
    let newTickets: TicketItem[] = [];
    if (selectedTypes.length > 1) {
      let valid = true;
      selectedTypes.forEach((typeId) => {
        const amt = amounts[typeId];
        if (!amt || isNaN(Number(amt)) || Number(amt) <= 0) valid = false;
      });
      if (!valid) {
        toast.error("กรุณากรอกจำนวนเงินให้ถูกต้องสำหรับทุกประเภท");
        return;
      }
      newTickets = selectedTypes.map((typeId) => {
        const payout = payouts.find((p) => p.id === typeId)!;
        return {
          subType: subTypeObj,
          payout,
          numbers,
          amount: Number(amounts[typeId]),
        };
      });
    } else {
      if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
        toast.error("กรุณากรอกจำนวนเงินให้ถูกต้อง");
        return;
      }
      newTickets = selectedTypes.map((typeId) => {
        const payout = payouts.find((p) => p.id === typeId)!;
        return {
          subType: subTypeObj,
          payout,
          numbers,
          amount: Number(amount),
        };
      });
    }
    setTicketList([...ticketList, ...newTickets]);
    setNumberInput("");
    setAmount("");
    setAmounts({});
    setSelectedTypes([]);
    setReverseNumber(false);
    toast.success("เพิ่มรายการสำเร็จ!");
  }

  function handleApplyNumbersFromDrawer(newNumbers: string[]) {
    const currentNumbersArray = numberInput
      .replace(/\n|,/g, " ")
      .split(" ")
      .map((n) => n.trim())
      .filter((n) => n.length > 0);
    
    const combinedNumbers = Array.from(new Set([...currentNumbersArray, ...newNumbers]));
    setNumberInput(combinedNumbers.join(" "));
  }

  // ลบรายการ
  function handleRemoveTicket(idx: number) {
    setTicketList(ticketList.filter((_, i) => i !== idx));
  }

  // Add new function to calculate next draw dates
  function calculateNextDrawDates(schedule: DrawingSchedule): Date[] {
    const dates: Date[] = [];
    const now = new Date();
    const currentDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(currentDate);
      date.setDate(date.getDate() + i);
      
      // Only allow today or future
      if (date < currentDate) continue;

      if (schedule.frequency_unit === 'day') {
        dates.push(date);
      } else if (schedule.frequency_unit === 'week') {
        const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' });
        if (schedule.day_of_week.includes(dayOfWeek)) {
          dates.push(date);
        }
      }
    }
    
    return dates;
  }

  // Add new function to fetch available draws
  async function fetchAvailableDraws() {
    try {
      if (!selectedSubType) return;

      const { data: schedules, error } = await supabase
        .from('drawing_schedules')
        .select('*')
        .eq('lottery_sub_type_id', selectedSubType)
        .eq('is_active', true);

      if (error) throw error;

      const availableDraws: AvailableDraw[] = [];
      schedules.forEach(schedule => {
        const dates = calculateNextDrawDates(schedule);
        dates.forEach(date => {
          availableDraws.push({
            date,
            schedule
          });
        });
      });

      // Sort by date
      availableDraws.sort((a, b) => a.date.getTime() - b.date.getTime());
      setAvailableDraws(availableDraws);

      // Set first available draw as selected
      if (availableDraws.length > 0) {
        setSelectedDraw(availableDraws[0]);
        setSelectedDrawDate(availableDraws[0].date);
      }
    } catch (error) {
      console.error('Error fetching available draws:', error);
      toast.error("ไม่สามารถโหลดวันที่ออกรางวัลได้");
    }
  }

  // Only fetch available draws if not provided by props
  useEffect(() => {
    if (initialState.draw) {
      const drawDate = new Date(initialState.draw.date);
      const today = new Date();
      today.setHours(0,0,0,0);
      drawDate.setHours(0,0,0,0);
      if (drawDate < today) {
        toast.error("วันที่ออกรางวัลที่เลือกหมดอายุแล้ว กรุณาเลือกใหม่");
        setAvailableDraws([]);
        setSelectedDraw(null);
        setSelectedDrawDate(undefined);
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
      setAvailableDraws([]);
      setSelectedDraw(null);
      setSelectedDrawDate(undefined);
    }
  }, [selectedSubType, initialState.draw]);

  // Update handleSubmit function
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

    // Check if current time is within open_time and close_time
    const now = new Date();
    const currentTime = now.toLocaleTimeString('en-US', { hour12: false });
    if (currentTime < selectedDraw.schedule.open_time || currentTime > selectedDraw.schedule.close_time) {
      toast.error(`เวลารับซื้อ: ${selectedDraw.schedule.open_time} - ${selectedDraw.schedule.close_time}`);
      return;
    }

    // Show confirmation dialog
    setConfirmDialogOpen(true);
  }

  // Update handleConfirmSubmit function
  async function handleConfirmSubmit() {
    if (!selectedDraw) return;
    if (!user) {
      toast.error("กรุณาเข้าสู่ระบบก่อนทำรายการ");
      return;
    }
    try {
      setIsSubmitting(true);

      const drawDate = selectedDraw.date;
      const today = new Date();
      today.setHours(0,0,0,0);
      drawDate.setHours(0,0,0,0);

      console.log("Submitting draw date:", drawDate, "Today:", today);

      if (drawDate < today) {
        toast.error("ไม่สามารถซื้อหวยย้อนหลังได้ กรุณาเลือกวันที่ออกรางวัลที่ถูกต้อง");
        setConfirmDialogOpen(false);
        setIsSubmitting(false);
        return;
      }

      // 1. Create lottery ticket
      const localDrawDate = selectedDraw.date.getFullYear() + '-' +
        String(selectedDraw.date.getMonth() + 1).padStart(2, '0') + '-' +
        String(selectedDraw.date.getDate()).padStart(2, '0');
      const { data: ticket, error: ticketError } = await supabase
        .from('lottery_tickets')
        .insert({
          user_id: user.id,
          draw_date: localDrawDate,
          draw_time: selectedDraw.schedule.drawing_time,
          bill_number: billNumber,
          bill_name: billName,
          total_amount: ticketList.reduce((sum, item) => sum + item.amount, 0),
          status: 'pending'
        })
        .select()
        .single();

      if (ticketError) throw ticketError;

      // 2. Create ticket items
      const ticketItems = ticketList.map(item => ({
        ticket_id: ticket.id,
        lottery_sub_type_id: item.subType.lottery_sub_type_id,
        lottery_sub_number_id: item.payout.id,
        numbers: item.numbers,
        amount: item.amount
      }));

      const { error: itemsError } = await supabase
        .from('lottery_ticket_items')
        .insert(ticketItems);

      if (itemsError) {
        // If items insert fails, delete the ticket
        await supabase
          .from('lottery_tickets')
          .delete()
          .eq('id', ticket.id);
        throw itemsError;
      }

      // 3. Update ticket status to confirmed
      const { error: updateError } = await supabase
        .from('lottery_tickets')
        .update({ status: 'confirmed' })
        .eq('id', ticket.id);

      if (updateError) {
        // If update fails, delete the ticket and items
        await supabase
          .from('lottery_ticket_items')
          .delete()
          .eq('ticket_id', ticket.id);
        await supabase
          .from('lottery_tickets')
          .delete()
          .eq('id', ticket.id);
        throw updateError;
      }

      // Success
      setTicketList([]);
      setSelectedDrawDate(new Date());
      setConfirmDialogOpen(false);
      toast.success("บันทึกการซื้อสำเร็จ!");
      router.push(`/print-ticket?bill_number=${encodeURIComponent(ticket.bill_number)}`);
      
    } catch (error) {
      console.error('Error saving ticket:', error);
      if (error && typeof error === 'object' && 'message' in error) {
        toast.error((error as any).message);
      } else if (error && typeof error === 'object') {
        toast.error(JSON.stringify(error));
      } else {
        toast.error("เกิดข้อผิดพลาดในการบันทึกข้อมูล");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  const canAdd = useMemo(() => {
    return (
      !!selectedDigit &&
      selectedTypes.length > 0 &&
      !!numberInput &&
      (
        (selectedTypes.length === 1 && !!amount && Number(amount) > 0) ||
        (selectedTypes.length > 1 && selectedTypes.every(typeId => !!amounts[typeId] && Number(amounts[typeId]) > 0))
      )
    );
  }, [selectedDigit, selectedTypes, numberInput, amount, amounts]);



  // ฟังก์ชันลบ group
  function handleRemoveGroup(group: Grouped) {
    setTicketList(ticketList.filter(item => {
      // เงื่อนไข: ถ้าเลข, digit, type, amount ตรงกับ group ให้ลบ
      const isInGroup = group.numbers.some(num =>
        item.numbers.includes(num) &&
        item.payout.digit_number === group.digit_number &&
        group.typeLabels.includes(item.payout.type_number || "-") &&
        (group.amounts[item.payout.type_number || "-"] === item.amount || (group.amounts[item.payout.type_number || "-"] === undefined && item.amount === 0) ) // Handle undefined amount if it means 0
      );
      return !isInGroup;
    }));
  }

  // ===== Memoized Grouping logic for ticketList =====
  const { allTypeLabels, groups } = useMemo(() => {
    type GroupKey = string; // `${digit_number}|${typeLabels.join(',')}|${amounts.join(',')}`
    const calculatedAllTypeLabels: Record<number, string[]> = {};
    ticketList.forEach(item => {
      const label = item.payout.type_number || "-";
      if (!calculatedAllTypeLabels[item.payout.digit_number]) calculatedAllTypeLabels[item.payout.digit_number] = [];
      if (!calculatedAllTypeLabels[item.payout.digit_number].includes(label)) calculatedAllTypeLabels[item.payout.digit_number].push(label);
    });

    Object.keys(calculatedAllTypeLabels).forEach(digitStr => {
      const digit = Number(digitStr);
      if (digit === 3 || digit === 4) {
        const labels = calculatedAllTypeLabels[digit];
        let ordered = [];
        if (labels.includes("เต็ง") && labels.includes("โต๊ด")) ordered = ["เต็ง", "โต๊ด"];
        else if (labels.includes("บน") && labels.includes("โต๊ด")) ordered = ["บน", "โต๊ด"];
        else if (labels.includes("เต็ง")) ordered = ["เต็ง", "โต๊ด"]; // Assuming default pairing
        else if (labels.includes("บน")) ordered = ["บน", "โต๊ด"];   // Assuming default pairing
        else if (labels.includes("โต๊ด")) ordered = ["เต็ง", "โต๊ด"]; // Assuming default pairing if only โต๊ด exists
        else ordered = labels;
        calculatedAllTypeLabels[digit] = ordered;
      }
      if (digit === 2) {
        const labels = calculatedAllTypeLabels[digit];
        let ordered = [];
        if (labels.includes("บน") && labels.includes("ล่าง")) ordered = ["บน", "ล่าง"];
        else if (labels.includes("บน")) ordered = ["บน", "ล่าง"]; // Assuming default pairing
        else if (labels.includes("ล่าง")) ordered = ["บน", "ล่าง"]; // Assuming default pairing
        else ordered = labels;
        calculatedAllTypeLabels[digit] = ordered;
      }
    });

    const calculatedGroups: Map<GroupKey, Grouped> = new Map();
    ticketList.forEach(item => {
      const digit = item.payout.digit_number;
      const labelOrder = calculatedAllTypeLabels[digit] || [item.payout.type_number || "-"];
      const amountsArr = labelOrder.map(lab => {
        const found = ticketList.find(t => t.payout.digit_number === digit && t.payout.type_number === lab && t.numbers.join(',') === item.numbers.join(','));
        return found ? found.amount : 0;
      });
      const key = `${digit}|${labelOrder.join(",")}|${amountsArr.join(",")}`;
      if (!calculatedGroups.has(key)) {
        calculatedGroups.set(key, {
          digit_number: digit,
          numbers: [],
          typeLabels: labelOrder,
          amounts: Object.fromEntries(labelOrder.map((lab, idx) => [lab, amountsArr[idx]])),
          typeOrder: labelOrder,
        });
      }
      const group = calculatedGroups.get(key)!;
      item.numbers.forEach(num => {
        if (!group.numbers.includes(num)) group.numbers.push(num);
      });
    });
    return { allTypeLabels: calculatedAllTypeLabels, groups: calculatedGroups };
  }, [ticketList]);

  // Add confirmation dialog JSX before the return statement
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
                    <tr key={index} className="border-b">
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
          <Button
            variant="outline"
            onClick={() => setConfirmDialogOpen(false)}
            disabled={isSubmitting}
          >
            ยกเลิก
          </Button>
          <Button
            onClick={handleConfirmSubmit}
            disabled={isSubmitting}
            className="min-w-[120px]" // Give it a min-width to prevent layout shift
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                กำลังบันทึก...
              </>
            ) : (
              "ยืนยัน"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  useEffect(() => {
    const fetchUserData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
      } else {
        router.push("/signup");
      }
    };
    fetchUserData();
  }, [router, supabase]);

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
          {/* Loading overlay */}
          {loading && (
            <SpectacularLoader message="กำลังโหลดข้อมูล..." baseColor="sky" />
          )}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
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
                <form className="space-y-4" onSubmit={handleSubmit}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">ชนิดหวย</label>
                      {initialState.subType ? (
                        <div className="py-2 px-3 rounded bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-200">
                          {subTypes.find(s => s.lottery_sub_type_id === initialState.subType)?.sub_type_name || "-"}
                        </div>
                      ) : (
                        <Select value={selectedSubType?.toString() || ""} onValueChange={v => { setSelectedSubType(Number(v)); setSelectedPayout(null); setSelectedDigit(null); setSelectedTypes([]); }}>
                          <SelectTrigger>
                            <SelectValue placeholder="เลือกชนิดหวย" />
                          </SelectTrigger>
                          <SelectContent>
                            {subTypes.map((s) => (
                              <SelectItem key={s.lottery_sub_type_id} value={s.lottery_sub_type_id.toString()}>{s.sub_type_name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                    <div>
                      <label className="text-sm font-medium">จำนวนหลัก</label>
                      <div className="flex gap-2 mt-1">
                        {digitOptions.map((d) => (
                          <Button key={d} type="button" variant={selectedDigit === d ? "default" : "outline"} onClick={() => { setSelectedDigit(d); setSelectedTypes([]); }}>
                            {d} ตัว
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>
                  {selectedDigit && (
                    <div>
                      <label className="text-sm font-medium">เลือกประเภท/รูปแบบ <span className="text-xs text-muted-foreground">(เลือกได้หลายแบบ)</span></label>
                      <div className={`flex gap-2 flex-wrap mt-1 transition-all duration-300 ${selectedTypes.length === 0 ? 'animate-shake border-2 border-red-400 bg-red-50' : ''}`}>
                        {filteredTypes.map((type) => (
                          <label key={type.id} className="flex items-center gap-1 border rounded px-2 py-1 cursor-pointer bg-white dark:bg-zinc-900 shadow-sm">
                            <input
                              type="checkbox"
                              checked={selectedTypes.includes(type.id)}
                              onChange={() => handleTypeToggle(type.id)}
                              className="accent-blue-600"
                            />
                            {type.type_number || "-"} <span className="text-xs text-muted-foreground">(จ่าย {type.price_paid})</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <input type="checkbox" checked={reverseNumber} onChange={e => setReverseNumber(e.target.checked)} id="reverseNumber" className="accent-blue-600" disabled={selectedDigit !== 2} />
                    <label htmlFor="reverseNumber" className="text-sm">กลับหมายเลข (เช่น 23 → 32)</label>
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-sm font-medium">หมายเลขหวย <span className="text-xs text-muted-foreground">(คั่นด้วยเว้นวรรค, คอมม่า หรือขึ้นบรรทัดใหม่)</span></label>
                      {selectedDigit && (selectedDigit === 1 || selectedDigit === 2 || selectedDigit === 3) && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setIsNumberDrawerOpen(true)}
                        >
                          เลือกจากชุดตัวเลข
                        </Button>
                      )}
                    </div>
                    <Textarea
                      rows={3}
                      placeholder={selectedDigit ? `กรอกหมายเลข ${selectedDigit} หลัก เช่น ${"1".repeat(selectedDigit)} ...` : "เลือกจำนวนหลักก่อน"}
                      value={numberInput}
                      onChange={e => setNumberInput(e.target.value)}
                      disabled={!selectedDigit }
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">จำนวนเงิน (บาท)</label>
                    {selectedTypes.length > 1 ? (
                      <>
                        <div className="flex gap-2 mb-2">
                          <Input
                            type="number"
                            min={1}
                            placeholder="ใส่จำนวนเงินเดียวกันทุกประเภท"
                            value={fillAllAmount}
                            onChange={e => setFillAllAmount(e.target.value)}
                            className="w-40"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              if (!fillAllAmount || isNaN(Number(fillAllAmount)) || Number(fillAllAmount) <= 0) {
                                toast.error("กรุณากรอกจำนวนเงินที่ถูกต้อง");
                                return;
                              }
                              const newAmounts: Record<number, string> = {};
                              selectedTypes.forEach(typeId => {
                                newAmounts[typeId] = fillAllAmount;
                              });
                              setAmounts(newAmounts);
                            }}
                          >
                            ใส่จำนวนเงินเท่ากันทุกประเภท
                          </Button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {selectedTypes.map(typeId => {
                            const type = filteredTypes.find(t => t.id === typeId);
                            return (
                              <div key={typeId}>
                                <label className="text-xs font-medium text-muted-foreground">{type?.type_number || "-"}</label>
                                <Input
                                  type="number"
                                  min={1}
                                  value={amounts[typeId] || ""}
                                  onChange={e => setAmounts({ ...amounts, [typeId]: e.target.value })}
                                  placeholder="จำนวนเงิน"
                                  disabled={!selectedDigit}
                                />
                                <div className="flex gap-1 mt-2 flex-wrap">
                                  {[5, 10, 20, 50, 100].map((quickAmount) => (
                                    <Button
                                      key={quickAmount}
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      className="h-7 w-12 px-2"
                                      onClick={() => setAmounts({ ...amounts, [typeId]: quickAmount.toString() })}
                                    >
                                      {quickAmount}
                                    </Button>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </>
                    ) : (
                      <div>
                        <Input
                          type="number"
                          min={1}
                          placeholder="เช่น 20"
                          value={amount}
                          onChange={e => setAmount(e.target.value)}
                          disabled={!selectedDigit}
                        />
                        <div className="flex gap-1 mt-1 flex-wrap ">
                          {[5, 10, 20, 50, 100].map((quickAmount) => (
                            <Button
                              key={quickAmount}
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-7 w-12 px-2"
                              onClick={() => setAmount(quickAmount.toString())}
                            >
                              {quickAmount}
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="mb-4">
                    <label className="text-sm font-medium">วันที่ออกรางวัล</label>
                    <div className="mt-1">
                      {initialState.draw ? (
                        <div className="py-2 px-3 rounded bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-200">
                          {format(initialState.draw.date, 'd MMM yyyy', { locale: th })}
                          <span className="ml-2 text-xs">
                            เวลาออก: {initialState.draw.schedule.drawing_time}
                          </span>
                        </div>
                      ) : (
                        <div className="text-sm text-red-500">
                          ไม่พบข้อมูลวันที่ออกรางวัล กรุณากลับไปเลือกจากหน้าแรก
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button
                      type="button"
                      onClick={handleAddTicket}
                      disabled={!canAdd}
                      className="px-6"
                    >
                      เพิ่มรายการ
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1, ease: "easeOut" }}
            >
              <Card className="mb-8 shadow-xl border-0 w-full">
                <CardHeader>
                  <CardTitle className="text-md text-gray-400">รายการที่เลือก</CardTitle>
                </CardHeader>
                <CardContent >
                  {ticketList.length === 0 ? (
                    <div className="text-center text-muted-foreground py-6">ยังไม่มีรายการ</div>
                  ) : (
                    <>
                      <div className="mb-4 p-3 rounded-lg bg-[#f8fafc] border border-[#e0e7ef] shadow-sm">
                        <div className="flex flex-wrap justify-between items-center border-b border-dashed pb-1 mb-1 gap-2">
                          <span className="font-bold text-[15px] text-[#d32f2f] flex items-center gap-1">
                            <svg className="inline-block w-4 h-4 text-[#d32f2f]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M4 7V4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v3"/><rect width="20" height="14" x="2" y="7" rx="2"/><path d="M16 3v4"/><path d="M8 3v4"/></svg>
                            หวย {subTypeObj?.sub_type_name || '-'}
                          </span>
                          <span className="text-[13px] text-gray-700 flex items-center gap-1">
                            <svg className="inline-block w-4 h-4 text-gray-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect width="20" height="14" x="2" y="7" rx="2"/><path d="M16 3v4"/><path d="M8 3v4"/></svg>
                            บิล: {billNumber}
                          </span>
                        </div>
                        <div className="flex flex-wrap justify-between items-center gap-2">
                          <span className="text-gray-600 flex items-center gap-1">
                            <svg className="inline-block w-4 h-4 text-blue-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                            งวด: {selectedDrawDate ? format(selectedDrawDate, 'd MMMM yyyy', { locale: th }) : '-'} (เวลา {selectedDraw?.schedule.drawing_time || '-'})
                          </span>
                          <span className="text-gray-600 flex items-center gap-1">
                            <svg className="inline-block w-4 h-4 text-green-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 8-4 8-4s8 0 8 4"/></svg>
                            ผู้ซื้อ: {user?.user_metadata?.name || 'ไม่มีชื่อ'}
                          </span>
                        </div>
                        <div className="flex flex-wrap justify-between items-center mt-1 gap-2">
                          <span className="text-[12px] text-[#5d4037] bg-[#fff8e1] px-2 py-1 rounded flex items-center gap-1">
                          <svg className="inline-block w-4 h-4 text-green-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 8-4 8-4s8 0 8 4"/></svg>
                            ชื่อบิล: {billName || '-'}
                          </span>
                          <span className="text-right text-[12px] bg-[#fff8e1] px-2 py-1 rounded text-[#5d4037] flex items-center gap-1">
                            <svg className="inline-block w-4 h-4 text-orange-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/></svg>
                            วันที่ซื้อ: {format(new Date(), 'd MMM yy HH:mm น.', { locale: th })}
                          </span>
                        </div>
                      </div>
                      <div className="space-y-6">
                        {/* Group tickets by digit_number and numbers */}
                        {(() => {
                          // 1. สร้าง group: digit_number + typeLabels + amounts (เรียงตามลำดับ label)
                          // 2. นำ ticket มารวมกันตามหมายเลขที่ตรงกัน
                          // 3. แสดงผลแต่ละ group
                          return (
                            <AnimatePresence>
                              {Array.from(groups.values()).map((group, idx) => {
                                const allLabels = group.typeLabels;
                                const groupTotal = allLabels.reduce((sum, label) => sum + (group.amounts[label] ?? 0) * group.numbers.length, 0);
                                return (
                                  <div
                                    key={idx}
                                    className="flex flex-row items-center bg-[#f8fafc] border border-[#e0e7ef] rounded-lg px-2 py-1 mb-2 gap-2 shadow-sm hover:bg-[#f1f5f9] transition-colors"
                                    style={{ minHeight: 38 }}
                                  >
                                    {/* Left: group info */}
                                    <div className="flex flex-col items-center justify-center min-w-[60px] max-w-[80px] text-center flex-shrink-0">
                                      <div className="text-[11px] font-bold text-[#d32f2f] leading-tight">{group.digit_number} ตัว</div>
                                      <div className="text-[11px] text-[#e53935] leading-tight">{allLabels.join(' x ')}</div>
                                      <div className="text-[11px] text-gray-700 leading-tight">{allLabels.map(label => group.amounts[label] ?? 0).join(' x ')}</div>
                                      <div className="text-[10px] text-gray-400 leading-tight">รวม {groupTotal.toLocaleString()} ฿</div>
                                    </div>
                                    {/* Right: numbers */}
                                    <div className="flex-1 flex items-center min-h-8 max-h-16 overflow-y-auto">
                                      <textarea
                                        value={group.numbers.join('  ')}
                                        readOnly
                                        rows={1}
                                        className="rounded-md p-1 w-full h-auto min-h-7 max-h-12 text-[11px] leading-tight resize-none bg-white border border-[#e0e7ef] focus-visible:ring-1 focus-visible:ring-blue-400"
                                        style={{ textAlign: 'left', wordBreak: 'break-all', whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}
                                      />
                                      <button
                                        className="ml-2 text-red-500 hover:text-red-700 transition-colors flex-shrink-0"
                                        title="ลบกลุ่มนี้"
                                        onClick={() => handleRemoveGroup(group)}
                                        style={{ padding: 2 }}
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </AnimatePresence>
                          );
                        })()}
                      </div>
                      <div className="flex justify-end mt-4 text-lg font-semibold text-green-600">
                        ยอดรวมทั้งหมด: {(() => {
                          // รวมยอดทุก group แบบเดียวกับ LotteryPurchasePage
                          let total = 0;
                          Array.from(groups.values()).forEach((group: Grouped) => {
                            const allLabels = group.typeLabels;
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
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={loading || ticketList.length === 0 || isSubmitting}
                className="px-8 py-2 text-lg min-w-[170px]"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    <span>กำลังดำเนินการ...</span>
                  </>
                ) : loading ? (
                  "กำลังโหลดข้อมูล..."
                ) : (
                  "ยืนยันซื้อ"
                )}
              </Button>
            </div>
          </motion.div>
        </SidebarInset>
      </SidebarProvider>
      <ConfirmationDialog />
      {selectedDigit && (selectedDigit === 1 || selectedDigit === 2 || selectedDigit === 3) && (
        <NumberSelectionDrawer
          isOpen={isNumberDrawerOpen}
          onOpenChange={setIsNumberDrawerOpen}
          onApplyNumbers={handleApplyNumbersFromDrawer}
          maxDigits={selectedDigit as 1 | 2 | 3}
          initialUseReverseNumbers={reverseNumber && selectedDigit === 2}
        />
      )}
      {isLoadingPrint && ( 
        <SpectacularLoader message="กำลังเตรียมข้อมูลสำหรับพิมพ์..." baseColor="green" />
      )}
      <style jsx global>{`
@keyframes shake {
  0% { transform: translateX(0); }
  20% { transform: translateX(-6px); }
  40% { transform: translateX(6px); }
  60% { transform: translateX(-4px); }
  80% { transform: translateX(4px); }
  100% { transform: translateX(0); }
}
.animate-shake {
  animation: shake 0.5s;
}
`}</style>
    </DirectionProvider>
  );
} 