"use client";
import React, { useEffect, useState, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FaSearch, 
  FaFilter, 
  FaTrophy, 
  FaTicketAlt, 
  FaCalendarAlt, 
  FaMoneyBillWave, 
  FaEye,
  FaChevronDown,
  FaChevronUp,
  FaStar,
  FaGift,
  FaCrown,
  FaCheckCircle,
  FaMedal,
  FaRandom,
  FaRunning,
  FaClock,
  FaCalendarDay
} from 'react-icons/fa';
import { Button } from "@/components/ui/button";
import { toZonedTime } from "date-fns-tz";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/lib/contexts/AuthContext";
import { useUserRole } from "@/hooks/use-user-role";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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

interface LotteryTicketItem {
  id: string;
  ticket_id: string;
  lottery_sub_type_id: number;
  lottery_sub_number_id: number;
  numbers: string[];
  amount: number;
  original_amount?: number;
  effective_prize_rate?: number;
  number_cap_action?: string;
  number_cap_status?: any;
  lottery_sub_types: LotterySubType;
  lottery_sub_number: LotterySubNumber;
}

interface LotteryTicket {
  id: string;
  user_id: string;
  draw_date: string;
  bill_number: string;
  bill_name: string;
  total_amount: number;
  status: string;
  created_at: string;
  lottery_ticket_items: LotteryTicketItem[];
  user_name?: string; // เพิ่มชื่อผู้ใช้
}

interface LotteryResult {
  id: number;
  lottery_type_id: number;
  lottery_sub_type_id: number;
  schedule_id: number;
  draw_date: string;
  draw_time: string;
  prize_code: string;
  winning_number: string;
  created_at: string;
  updated_at: string;
  lottery_sub_types: LotterySubType;
}

// 🔧 **ใหม่**: ฟังก์ชันกลางสำหรับคำนวณรางวัล (เหมือนหน้า summary)
const calculateWinningsForItem = (
  item: any,
  ticketDrawDate: string,
  resultsMap: Record<string, LotteryResult>
): { prize: number; isWinning: boolean; winningNumberDisplay?: string, matchedNumber?: string } => {
  if (!item.lottery_sub_number || !item.numbers) {
    return { prize: 0, isWinning: false };
  }

  const { digit_number, type_number, price_paid } = item.lottery_sub_number;

  let prizeCodePattern = '';
  if (type_number === 'โต๊ด') prizeCodePattern = `${digit_number} ตัวโต๊ด`;
  else if (type_number === 'บน') prizeCodePattern = `${digit_number} ตัวบน`;
  else if (type_number === 'ล่าง') prizeCodePattern = `${digit_number} ตัวล่าง`;
  else if (type_number === 'วิ่งบน') prizeCodePattern = 'วิ่งบน';
  else if (type_number === 'วิ่งล่าง') prizeCodePattern = 'วิ่งล่าง';

  const resultMapKey = `${ticketDrawDate}|${item.lottery_sub_type_id}|${prizeCodePattern}`;
  const matchingResult = resultsMap[resultMapKey];

  if (!matchingResult || !matchingResult.winning_number) {
    return { prize: 0, isWinning: false };
  }

  let matchedNumbers: string[] = [];
  
  if (type_number === 'โต๊ด') {
    const winningSet = new Set(matchingResult.winning_number.split(",").map(s => s.trim()));
    matchedNumbers = item.numbers.filter((num: string) => winningSet.has(num));
  } else if (type_number === 'วิ่งบน' || type_number === 'วิ่งล่าง') {
    const winningDigits = new Set(matchingResult.winning_number.split(",").map(s => s.trim()));
    item.numbers.forEach((num: string) => {
      for (const digit of num) {
        if (winningDigits.has(digit)) {
          matchedNumbers.push(num);
          break;
        }
      }
    });
  } else {
    matchedNumbers = item.numbers.filter((num: string) => num === matchingResult.winning_number);
  }

  if (matchedNumbers.length > 0) {
    const effectiveRate = item.effective_prize_rate ?? price_paid ?? 0;
    const prize = parseFloat(item.amount.toString()) * parseFloat(String(effectiveRate)) * matchedNumbers.length;
    return { 
      prize, 
      isWinning: true, 
      winningNumberDisplay: matchingResult.winning_number, 
      matchedNumber: matchedNumbers.join(', ')
    };
  }

  return { prize: 0, isWinning: false };
};

export default function LotteryTicketResultsPage() {
  useRequireAuth();
  const isMobile = useIsMobile();
  const { supabase, user } = useAuth();
  const { role } = useUserRole();
  const [tickets, setTickets] = useState<LotteryTicket[]>([]);
  const [results, setResults] = useState<LotteryResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterBill, setFilterBill] = useState("");
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [winningBills, setWinningBills] = useState<any[]>([]);
  const [statusLoading, setStatusLoading] = useState<string | null>(null);
  const [expandedTickets, setExpandedTickets] = useState<Set<string>>(new Set());
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'pending' | 'paid'>('all');
  const [isInitialized, setIsInitialized] = useState(false); // 🔧 เพิ่ม state สำหรับติดตามการเริ่มต้น

  // 🔧 **ใหม่**: ฟังก์ชันสำหรับดึงวันที่ปัจจุบันในรูปแบบ YYYY-MM-DD
  const getCurrentDate = () => {
    const now = new Date();
    const bangkokTime = toZonedTime(now, 'Asia/Bangkok');
    return format(bangkokTime, 'yyyy-MM-dd');
  };

  // 🔧 **ใหม่**: ฟังก์ชันสำหรับจัดการการเปลี่ยนแปลงวันที่
  const handleDateChange = (newDate: string) => {
    console.log('🔧 Date changed from', selectedDate, 'to', newDate);
    setSelectedDate(newDate);
  };

  // 🔧 **ใหม่**: ฟังก์ชันสำหรับดึงวันที่ที่มีข้อมูล
  const fetchAvailableDates = async () => {
    if (!supabase) return;
    
    try {
      const { data: ticketsData, error: ticketsError } = await supabase
        .from("lottery_tickets")
        .select('draw_date')
        .eq('status', 'confirmed')
        .order('draw_date', { ascending: false });
      
      if (ticketsError) {
        console.error('Error fetching available dates:', ticketsError);
        return;
      }
      
      // ดึงวันที่ที่ไม่ซ้ำกันและเรียงลำดับจากใหม่ไปเก่า
      const uniqueDates = [...new Set(ticketsData?.map(t => t.draw_date) || [])]
        .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
      
      setAvailableDates(uniqueDates);
      
      // 🔧 ตั้งค่าวันที่เริ่มต้นเฉพาะเมื่อยังไม่เคยเริ่มต้น
      if (!isInitialized && uniqueDates.length > 0) {
        const currentDate = getCurrentDate();
        let initialDate = uniqueDates[0]; // ใช้วันที่ล่าสุดเป็นค่าเริ่มต้น
        
        if (uniqueDates.includes(currentDate)) {
          initialDate = currentDate;
        }
        
        console.log('🔧 Initializing selectedDate to:', initialDate);
        setSelectedDate(initialDate);
        setIsInitialized(true);
      }
    } catch (error) {
      console.error('Error in fetchAvailableDates:', error);
    }
  };

  // 🔧 **ใหม่**: useEffect แยกสำหรับดึงวันที่ที่มีข้อมูล (เรียกครั้งเดียวตอนเริ่มต้น)
  useEffect(() => {
    fetchAvailableDates();
  }, [supabase, isInitialized]); // 🔧 เพิ่ม isInitialized ใน dependencies

  // 🔧 **ใหม่**: useEffect แยกสำหรับดึงข้อมูลหลัก
  useEffect(() => {
    async function fetchData() {
      if (!supabase || !user || !selectedDate) {
        return;
      }
      
      setLoading(true);
      try {
        // 🔧 สำหรับ admin ให้แสดงข้อมูลของทุก user (เหมือนหน้า summary)
        let ticketQuery = supabase
          .from("lottery_tickets")
          .select(`*,
            lottery_ticket_items:lottery_ticket_items(
              *,
              lottery_sub_types:lottery_sub_types(lottery_sub_type_id,sub_type_name),
              lottery_sub_number:lottery_sub_number(id,lottery_sub_type_id,digit_number,type_number,price_paid)
            )
          `)
          .eq('status', 'confirmed')
          .eq('draw_date', selectedDate) // 🔧 เพิ่มเงื่อนไขดึงเฉพาะวันที่ที่เลือก
          .order("created_at", { ascending: false });
        
        // ถ้าไม่ใช่ admin ให้แสดงเฉพาะข้อมูลของ user นั้น
        if (role !== 'admin') {
          ticketQuery = ticketQuery.eq("user_id", user.id);
        }
        
        const { data: ticketsData, error: ticketsError } = await ticketQuery;
          
        if (ticketsError) {
          console.error('Error fetching tickets:', ticketsError);
          return;
        }
        
        // 🔧 ดึงข้อมูลชื่อผู้ใช้สำหรับ admin
        if (role === 'admin' && ticketsData && ticketsData.length > 0) {
          const userIds = [...new Set(ticketsData.map(t => t.user_id).filter(Boolean))];
          const { data: profiles, error: profileError } = await supabase
            .from('profiles')
            .select('id, name')
            .in('id', userIds);
          
          if (!profileError && profiles) {
            const profilesMap = new Map(profiles.map(p => [p.id, p.name]));
            ticketsData.forEach(ticket => {
              ticket.user_name = profilesMap.get(ticket.user_id) || 'ไม่ระบุ';
            });
          }
        }
        
        // 🔧 ดึงผลหวยเฉพาะวันที่ที่เลือก
        const { data: resultsData, error: resultsError } = await supabase
          .from("lottery_results")
          .select(`*,
            lottery_sub_types:lottery_sub_type_id(lottery_sub_type_id,sub_type_name)
          `)
          .eq('draw_date', selectedDate) // 🔧 ดึงเฉพาะวันที่ที่เลือก
          .order('draw_time', { ascending: true });
          
        if (resultsError) {
          console.error('Error fetching results:', resultsError);
          return;
        }
        
        setTickets(ticketsData || []);
        setResults(resultsData || []);
      } catch (error) {
        console.error('Error in fetchData:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [supabase, user, selectedDate, role]); // 🔧 เพิ่ม role ใน dependencies

  // 🔧 **ใหม่**: สร้าง resultsMap (เหมือนหน้า summary)
  const resultsMap = React.useMemo(() => {
    const map: Record<string, LotteryResult> = {};
    for (const res of results) {
      const key = `${res.draw_date}|${res.lottery_sub_type_id}|${res.prize_code}`;
      map[key] = res;
    }
    return map;
  }, [results]);

  // 🔧 **ใหม่**: คำนวณบิลที่ถูกรางวัลโดยใช้ฟังก์ชัน calculateWinningsForItem (เหมือนหน้า summary)
  const { winningTickets, totalPrize } = React.useMemo(() => {
    let totalPrize = 0;
    const wins: {
      bill_number: string;
      bill_name: string;
      draw_date: string;
      draw_time: string;
      ticket_id: string;
      user_name?: string;
      items: (LotteryTicketItem & {
        winning_number: string;
        prize_code: string;
        result: LotteryResult;
        prize: number;
        draw_time: string;
      })[];
      sum: number;
    }[] = [];

    for (const ticket of tickets) {
      if (!ticket.lottery_ticket_items) continue;
      
      const winItems: (LotteryTicketItem & { 
        winning_number: string; 
        prize_code: string; 
        result: LotteryResult; 
        prize: number; 
        draw_time: string 
      })[] = [];

      for (const item of ticket.lottery_ticket_items) {
        // 🔧 ใช้ฟังก์ชัน calculateWinningsForItem (เหมือนหน้า summary)
        const { prize, isWinning, winningNumberDisplay, matchedNumber } = calculateWinningsForItem(
          item, 
          ticket.draw_date, 
          resultsMap
        );

        if (isWinning && winningNumberDisplay && matchedNumber) {
          // สร้าง prize_code pattern
          const digitNumber = item.lottery_sub_number.digit_number;
          const typeNumber = item.lottery_sub_number.type_number;
          let prizeCodePattern = '';
          if (typeNumber === 'โต๊ด') {
            prizeCodePattern = `${digitNumber} ตัวโต๊ด`;
          } else if (typeNumber === 'บน') {
            prizeCodePattern = `${digitNumber} ตัวบน`;
          } else if (typeNumber === 'ล่าง') {
            prizeCodePattern = `${digitNumber} ตัวล่าง`;
          } else if (typeNumber === 'วิ่งบน') {
            prizeCodePattern = 'วิ่งบน';
          } else if (typeNumber === 'วิ่งล่าง') {
            prizeCodePattern = 'วิ่งล่าง';
          }

          // หา matching result
          const resultMapKey = `${ticket.draw_date}|${item.lottery_sub_type_id}|${prizeCodePattern}`;
          const matchingResult = resultsMap[resultMapKey];

          totalPrize += prize;
          winItems.push({
            ...item,
            winning_number: matchedNumber,
            prize_code: prizeCodePattern,
            result: matchingResult,
            prize,
            draw_time: matchingResult?.draw_time || '',
          });
        }
      }

      if (winItems.length > 0) {
        const sum = winItems.reduce((acc, i) => acc + i.prize, 0);
        wins.push({
          bill_number: ticket.bill_number,
          bill_name: ticket.bill_name,
          draw_date: ticket.draw_date,
          draw_time: winItems[0]?.draw_time || '',
          ticket_id: ticket.id,
          user_name: ticket.user_name,
          items: winItems,
          sum,
        });
      }
    }
    return { winningTickets: wins, totalPrize };
  }, [tickets, resultsMap]);

  useEffect(() => {
    // 🔧 เพิ่ม error handling สำหรับการดึงข้อมูล lottery_winning_bills
    const fetchWinningBills = async () => {
      try {
        // 🔧 ใช้ service_role key สำหรับการเข้าถึง admin
        const { data, error } = await supabase
          .from('lottery_winning_bills')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (error) {
          console.warn('Warning: Could not fetch lottery_winning_bills:', error.message);
          setWinningBills([]); // ตั้งค่าเป็น array ว่างถ้าเกิดข้อผิดพลาด
        } else {
          setWinningBills(data || []);
        }
      } catch (error) {
        console.warn('Warning: Error fetching lottery_winning_bills:', error);
        setWinningBills([]); // ตั้งค่าเป็น array ว่างถ้าเกิดข้อผิดพลาด
      }
    };
    
    fetchWinningBills();
  }, [winningTickets.length, supabase]);

  useEffect(() => {
    if (!winningTickets.length) return;
    
    // 🔧 เพิ่ม error handling สำหรับการ upsert ข้อมูล
    const updateWinningBills = async () => {
      try {
        // 🔧 ใช้ batch operation แทนการ loop
        const winningBillsData = winningTickets.map(win => {
          const ticket = tickets.find(t => t.id === win.ticket_id);
          return {
            bill_number: win.bill_number,
            bill_name: win.bill_name,
            user_id: ticket?.user_id || '',
            draw_date: win.draw_date,
            total_prize: win.sum,
            status: 'pending',
          };
        });

        // 🔧 ใช้ upsert แบบ batch
        const { error } = await supabase
          .from('lottery_winning_bills')
          .upsert(winningBillsData, { 
            onConflict: 'bill_number',
            ignoreDuplicates: false 
          });
        
        if (error) {
          console.warn('Warning: Could not upsert winning bills:', error.message);
          // 🔧 ถ้าเกิดข้อผิดพลาด ให้ลองใช้วิธีอื่น
          console.log('Trying alternative approach...');
          return;
        }
        
        // ดึงข้อมูลใหม่หลังจาก upsert
        const { data, error: refreshError } = await supabase
          .from('lottery_winning_bills')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (refreshError) {
          console.warn('Warning: Could not refresh lottery_winning_bills:', refreshError.message);
        } else {
          setWinningBills(data || []);
        }
      } catch (error) {
        console.warn('Warning: Error updating lottery_winning_bills:', error);
      }
    };
    
    updateWinningBills();
  }, [winningTickets.length, tickets, supabase]);

  const filteredWinningTickets = winningTickets.filter(win => {
    if (filterBill && !win.bill_number.includes(filterBill)) return false;
    return true; // 🔧 ลบการกรองตามวันที่ออก เพราะดึงเฉพาะวันที่ที่เลือกแล้ว
  });

  const thaiNow = toZonedTime(new Date(), 'Asia/Bangkok').toISOString();

  const toggleTicketExpansion = (ticketId: string) => {
    const newExpanded = new Set(expandedTickets);
    if (newExpanded.has(ticketId)) {
      newExpanded.delete(ticketId);
    } else {
      newExpanded.add(ticketId);
    }
    setExpandedTickets(newExpanded);
  };

  const filteredTickets = useMemo(() => {
    let filtered = filteredWinningTickets;
    if (selectedFilter === 'pending') {
      filtered = filtered.filter(win => {
        const billInfo = winningBills.find(b => b.bill_number === win.bill_number);
        return billInfo?.status === 'pending' || !billInfo;
      });
    } else if (selectedFilter === 'paid') {
      filtered = filtered.filter(win => {
        const billInfo = winningBills.find(b => b.bill_number === win.bill_number);
        return billInfo?.status === 'paid';
      });
    }
    return filtered;
  }, [filteredWinningTickets, winningBills, selectedFilter]);

  // 🔧 **ใหม่**: ฟังก์ชันสำหรับแสดงวันที่ในรูปแบบไทย
  const formatDateThai = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return format(date, 'EEEE d MMMM yyyy', { locale: th });
  };

  // 🔧 **ใหม่**: ฟังก์ชันสำหรับแสดงวันที่ในรูปแบบสั้น
  const formatDateShort = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return format(date, 'd MMM yyyy', { locale: th });
  };

  // 🔧 **ใหม่**: ฟังก์ชันสำหรับตรวจสอบว่าเป็นวันที่ปัจจุบันหรือไม่
  const isCurrentDate = (dateString: string) => {
    return dateString === getCurrentDate();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-2 py-2">
        {/* Header Section */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }} 
          animate={{ opacity: 1, y: 0 }} 
          className="mb-3"
        >
          <div className="flex items-center gap-1 mb-2">
            <div className="p-1 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg shadow dark:from-blue-900 dark:to-purple-900">
              <FaTrophy className="text-white text-base" />
            </div>
            <div>
              <h1 className="text-base font-bold text-gray-800 dark:text-gray-100">ผลรางวัล</h1>
              <p className="text-xs text-gray-600 dark:text-gray-300">ตรวจสอบบิลที่ถูกรางวัลของคุณ</p>
            </div>
          </div>

          {/* 🔧 **ใหม่**: แสดงวันที่ที่เลือก */}
          {selectedDate && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`mb-3 p-2 rounded-lg border ${
                isCurrentDate(selectedDate)
                  ? 'bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800'
                  : 'bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800'
              }`}
            >
              <div className="flex items-center justify-center gap-2 text-sm">
                <FaCalendarDay className={`h-4 w-4 ${
                  isCurrentDate(selectedDate) ? 'text-green-600' : 'text-blue-600'
                }`} />
                <span className="font-medium">วันที่เลือก:</span>
                <span className={`font-semibold ${
                  isCurrentDate(selectedDate) ? 'text-green-700 dark:text-green-300' : 'text-blue-700 dark:text-blue-300'
                }`}>
                  {formatDateThai(selectedDate)}
                </span>
                {isCurrentDate(selectedDate) && (
                  <Badge variant="default" className="bg-green-600 text-white text-xs">
                    วันนี้
                  </Badge>
                )}
              </div>
            </motion.div>
          )}

          {/* Statistics Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <Card className="bg-white dark:bg-slate-900 shadow border-0 hover:shadow-md transition-shadow">
                <CardContent className="p-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-300">รางวัลทั้งหมด</p>
                      <p className="text-base font-bold text-gray-900 dark:text-gray-100">{filteredTickets.length}</p>
                    </div>
                    <div className="p-1 bg-blue-100 dark:bg-blue-900 rounded-full">
                      <FaTicketAlt className="text-blue-600 dark:text-blue-300 text-sm" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <Card className="bg-white dark:bg-slate-900 shadow border-0 hover:shadow-md transition-shadow">
                <CardContent className="p-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-300">ยอดรวมรางวัล</p>
                      <p className="text-base font-bold text-green-600 dark:text-green-400">{totalPrize.toLocaleString()} ฿</p>
                    </div>
                    <div className="p-1 bg-green-100 dark:bg-green-900 rounded-full">
                      <FaMoneyBillWave className="text-green-600 dark:text-green-400 text-sm" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <Card className="bg-white dark:bg-slate-900 shadow border-0 hover:shadow-md transition-shadow">
                <CardContent className="p-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-300">รอจ่าย</p>
                      <p className="text-base font-bold text-orange-600 dark:text-orange-400">
                        {filteredTickets.filter(win => {
                          const billInfo = winningBills.find(b => b.bill_number === win.bill_number);
                          return billInfo?.status === 'pending' || !billInfo;
                        }).length}
                      </p>
                    </div>
                    <div className="p-1 bg-orange-100 dark:bg-orange-900 rounded-full">
                      <FaGift className="text-orange-600 dark:text-orange-400 text-sm" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
              <Card className="bg-white dark:bg-slate-900 shadow border-0 hover:shadow-md transition-shadow">
                <CardContent className="p-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-300">จ่ายแล้ว</p>
                      <p className="text-base font-bold text-blue-600 dark:text-blue-400">
                        {filteredTickets.filter(win => {
                          const billInfo = winningBills.find(b => b.bill_number === win.bill_number);
                          return billInfo?.status === 'paid';
                        }).length}
                      </p>
                    </div>
                    <div className="p-1 bg-blue-100 dark:bg-blue-900 rounded-full">
                      <FaStar className="text-blue-600 dark:text-blue-300 text-sm" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </motion.div>

        {/* Filters and Search */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ delay: 0.5 }}
          className="mb-2"
        >
            <Card className="bg-white dark:bg-slate-900 shadow border-0">
              <CardContent className="p-2">
                <div className="flex flex-col md:flex-row gap-2 items-center justify-between">
                  <div className="flex items-center gap-1">
                    <FaFilter className="text-gray-500 dark:text-gray-300 text-xs" />
                    <span className="font-medium text-gray-700 dark:text-gray-200 text-xs">ตัวกรอง</span>
                  </div>
                  <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
                    {/* 🔧 **ใหม่**: เปลี่ยนจาก Input เป็น Select สำหรับเลือกวันที่ */}
                    <div className="flex items-center gap-1">
                      <FaCalendarAlt className="text-gray-400 dark:text-gray-500 text-xs" />
                      <Select value={selectedDate} onValueChange={handleDateChange} disabled={availableDates.length === 0}>
                        <SelectTrigger className="w-full md:w-48 h-7 text-xs bg-white dark:bg-slate-800 dark:text-gray-100 border-gray-200 dark:border-slate-700">
                          <SelectValue placeholder={availableDates.length === 0 ? "ไม่มีข้อมูล" : "เลือกวันที่"} />
                        </SelectTrigger>
                        <SelectContent>
                          {availableDates.length === 0 ? (
                            <SelectItem value="no-data" disabled>
                              ไม่มีข้อมูลวันที่
                            </SelectItem>
                          ) : (
                            availableDates.map((date, index) => (
                              <SelectItem key={date} value={date}>
                                <div className="flex items-center justify-between w-full">
                                  <span>{formatDateShort(date)}</span>
                                  {index === 0 && (
                                    <Badge variant="secondary" className="ml-2 text-xs">
                                      ล่าสุด
                                    </Badge>
                                  )}
                                  {isCurrentDate(date) && (
                                    <Badge variant="default" className="ml-2 text-xs bg-green-600">
                                      วันนี้
                                    </Badge>
                                  )}
                                </div>
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="relative">
                      <FaSearch className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 text-xs" />
                      <Input 
                        placeholder="ค้นหาเลขบิล..." 
                        value={filterBill} 
                        onChange={e => setFilterBill(e.target.value)}
                        className="pl-7 w-full md:w-32 border-gray-200 dark:border-slate-700 focus:border-blue-500 focus:ring-blue-500 h-7 text-xs bg-white dark:bg-slate-800 dark:text-gray-100"
                      />
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant={selectedFilter === 'all' ? 'default' : 'outline'}
                        onClick={() => setSelectedFilter('all')}
                        size="sm"
                        className="px-2 py-1 text-xs"
                      >
                        ทั้งหมด
                      </Button>
                      <Button
                        variant={selectedFilter === 'pending' ? 'default' : 'outline'}
                        onClick={() => setSelectedFilter('pending')}
                        size="sm"
                        className="px-2 py-1 text-xs"
                      >
                        รอจ่าย
                      </Button>
                      <Button
                        variant={selectedFilter === 'paid' ? 'default' : 'outline'}
                        onClick={() => setSelectedFilter('paid')}
                        size="sm"
                        className="px-2 py-1 text-xs"
                      >
                        จ่ายแล้ว
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Winning Tickets Display */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: 0.6 }}
          >
            {loading ? (
              <div className="flex justify-center items-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400"></div>
                <span className="ml-2 text-gray-600 dark:text-gray-300 text-xs">กำลังโหลดข้อมูล...</span>
              </div>
            ) : !selectedDate ? (
              <Card className="bg-white dark:bg-slate-900 shadow border-0">
                <CardContent className="p-8 text-center">
                  <FaCalendarDay className="mx-auto text-4xl text-gray-300 dark:text-gray-600 mb-2" />
                  <h3 className="text-base font-semibold text-gray-600 dark:text-gray-200 mb-1">กรุณาเลือกวันที่</h3>
                  <p className="text-gray-500 dark:text-gray-400 text-xs">เลือกวันที่เพื่อดูผลรางวัล</p>
                </CardContent>
              </Card>
            ) : filteredTickets.length === 0 ? (
              <Card className="bg-white dark:bg-slate-900 shadow border-0">
                <CardContent className="p-8 text-center">
                  <FaTicketAlt className="mx-auto text-4xl text-gray-300 dark:text-gray-600 mb-2" />
                  <h3 className="text-base font-semibold text-gray-600 dark:text-gray-200 mb-1">ไม่พบบิลที่ถูกรางวัล</h3>
                  <p className="text-gray-500 dark:text-gray-400 text-xs">
                    สำหรับวันที่ {formatDateShort(selectedDate)}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {filteredTickets.map((win, idx) => {
                  const billInfo = winningBills.find(b => b.bill_number === win.bill_number);
                  let paidAtThai = "";
                  if (billInfo?.paid_at) {
                    const zoned = toZonedTime(new Date(billInfo.paid_at), "Asia/Bangkok");
                    paidAtThai = format(zoned, "d MMM yy HH:mm", { locale: th });
                  }
                  return (
                    <motion.div
                      key={win.bill_number}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                    >
                      <Collapsible className="w-full">
                        <Card className="bg-white dark:bg-red-900 shadow border-0 hover:shadow-md transition-shadow overflow-hidden">
                          <CollapsibleTrigger asChild>
                            <div className="cursor-pointer">
                              <div className="bg-gradient-to-r from-red-600 to-gray-900 dark:from-red-900 dark:to-gray-900 p-2 text-white">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-1">
                                    <div className="p-1 bg-white/20 rounded-full">
                                      <FaCrown className="text-yellow-300 text-base" />
                                    </div>
                                    <div>
                                      <h3 className="font-bold text-xs">
                                        {win.items[0]?.lottery_sub_types?.sub_type_name || 'หวย'}
                                      </h3>
                                      <p className="text-blue-100 text-sm">
                                        บิล: {win.bill_number} | {win.bill_name || '-'}
                                      </p>
                                      {role === 'admin' && win.user_name && (
                                        <p className="text-blue-200 text-xs">
                                          ผู้ใช้: {win.user_name}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <div className="flex items-center gap-1 mb-0.5">
                                      <FaMoneyBillWave className="text-yellow-300 text-xs" />
                                      <span className="text-base font-bold text-yellow-300">
                                        +{win.sum.toLocaleString()} ฿
                                      </span>
                                    </div>
                                    <p className="text-blue-100 text-sm">
                                      งวด: {formatDateShort(win.draw_date)}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center justify-between mt-1">
                                  <div className="flex items-center gap-1 text-sm">
                                    <FaCalendarAlt className="text-blue-200 text-xs" />
                                    <span className="text-blue-100">
                                      ซื้อ: {formatDateShort(tickets.find(t => t.id === win.ticket_id)?.created_at || win.draw_date)}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    {billInfo?.status === 'pending' || !billInfo ? (
                                      <Button
                                        className="bg-orange-500 hover:bg-orange-600 text-white px-2 py-1 text-xs rounded-full font-semibold shadow"
                                        disabled={statusLoading === win.bill_number}
                                        onClick={async (e) => {
                                          e.stopPropagation();
                                          setStatusLoading(win.bill_number);
                                          try {
                                            // 🔧 อัปเดตสถานะการจ่ายรางวัล
                                            const { error: updateError } = await supabase.from('lottery_winning_bills')
                                              .update({ status: 'paid', paid_at: thaiNow })
                                              .eq('bill_number', win.bill_number);
                                            
                                            if (updateError) {
                                              console.error('Error updating winning bill status:', updateError);
                                              alert('ไม่สามารถอัปเดตสถานะการจ่ายรางวัลได้');
                                              return;
                                            }
                                            
                                            const ticket = tickets.find(t => t.id === win.ticket_id);
                                            if (ticket?.user_id) {
                                              // 🔧 อัปเดตเครดิตของผู้ใช้
                                              const { data: profile, error: profileError } = await supabase
                                                .from('profiles')
                                                .select('credit_balance')
                                                .eq('id', ticket.user_id)
                                                .single();
                                              
                                              if (profileError) {
                                                console.error('Error fetching user profile:', profileError);
                                                alert('ไม่สามารถดึงข้อมูลผู้ใช้ได้');
                                                return;
                                              }
                                              
                                              const currentCredit = profile?.credit_balance ?? 0;
                                              const newCredit = currentCredit + win.sum;
                                              
                                              const { error: creditError } = await supabase.from('profiles')
                                                .update({ credit_balance: newCredit })
                                                .eq('id', ticket.user_id);
                                              
                                              if (creditError) {
                                                console.error('Error updating user credit:', creditError);
                                                alert('ไม่สามารถอัปเดตเครดิตผู้ใช้ได้');
                                                return;
                                              }
                                              
                                              // 🔧 บันทึกธุรกรรมเครดิต
                                              const { error: transactionError } = await supabase.from('credit_transactions').insert([
                                                {
                                                  user_id: ticket.user_id,
                                                  amount: win.sum,
                                                  transaction_type: 'lottery_win',
                                                  description: `ถูกรางวัลบิล ${win.bill_number}`,
                                                  related_bill_number: win.bill_number,
                                                  created_at: thaiNow,
                                                }
                                              ]);
                                              
                                              if (transactionError) {
                                                console.error('Error creating credit transaction:', transactionError);
                                                alert('ไม่สามารถบันทึกธุรกรรมเครดิตได้');
                                                return;
                                              }
                                              
                                              window.dispatchEvent(new Event('credit-updated'));
                                            }
                                            
                                            // 🔧 ดึงข้อมูลใหม่
                                            const { data, error: refreshError } = await supabase.from('lottery_winning_bills').select('*');
                                            if (refreshError) {
                                              console.warn('Warning: Could not refresh lottery_winning_bills:', refreshError.message);
                                            } else {
                                              setWinningBills(data || []);
                                            }
                                            
                                            alert('อัปเดตสถานะการจ่ายรางวัลเรียบร้อยแล้ว');
                                          } catch (error) {
                                            console.error('Error updating payout status:', error);
                                            alert('เกิดข้อผิดพลาดในการอัปเดตสถานะการจ่ายรางวัล');
                                          } finally {
                                            setStatusLoading(null);
                                          }
                                        }}
                                        size="sm"
                                      >
                                        {statusLoading === win.bill_number ? (
                                          <>
                                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div>
                                            กำลังอัปเดต...
                                          </>
                                        ) : (
                                          <>
                                            <FaGift className="mr-1 text-xs" />
                                            รอจ่าย
                                          </>
                                        )}
                                      </Button>
                                    ) : (
                                      <div className="flex items-center gap-1 bg-green-500 text-white px-2 py-1 text-xs rounded-full font-semibold">
                                        <FaCheckCircle className="text-xs" />
                                        <span>จ่ายแล้ว</span>
                                        {paidAtThai && (
                                          <span className="text-green-100 text-sm ml-1">
                                            {paidAtThai}
                                          </span>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <CardContent className="p-0">
                              <div className="overflow-x-auto">
                                <Table>
                                  <TableHeader>
                                    <TableRow className="bg-gray-50 dark:bg-slate-800 h-7">
                                      <TableHead className="h-7 px-1 text-sm font-semibold text-gray-700 dark:text-gray-200">รางวัล</TableHead>
                                      <TableHead className="h-7 px-1 text-sm font-semibold text-gray-700 dark:text-gray-200">เลขที่ออก</TableHead>
                                      <TableHead className="h-7 px-1 text-sm font-semibold text-gray-700 dark:text-gray-200">เลขที่ซื้อถูก</TableHead>
                                      <TableHead className="h-7 px-1 text-sm font-semibold text-gray-700 dark:text-gray-200">ประเภท</TableHead>
                                      <TableHead className="h-7 px-1 text-sm font-semibold text-gray-700 dark:text-gray-200">ราคาจ่าย</TableHead>
                                      <TableHead className="h-7 px-1 text-sm font-semibold text-gray-700 dark:text-gray-200">จำนวนเงินที่ซื้อ</TableHead>
                                      <TableHead className="h-7 px-1 text-sm font-semibold text-gray-700 dark:text-gray-200">รางวัลที่ได้</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {win.items.map((item, idx2) => {
                                      const isTod = item.prize_code.includes('โต๊ด');
                                      const isWing = item.prize_code.includes('วิ่ง');
                                      const isStraight = !isTod && !isWing;
                                      const matchedNumbers = item.winning_number.split(',').map(s => s.trim()).filter(Boolean);
                                      let icon = isStraight ? 
                                        <FaMedal className="text-red-500 dark:text-red-400 mr-1 text-xs" /> : 
                                        isTod ? 
                                        <FaRandom className="text-yellow-500 dark:text-yellow-300 mr-1 text-xs" /> : 
                                        <FaRunning className="text-blue-500 dark:text-blue-300 mr-1 text-xs" />;
                                      return (
                                        <motion.tr
                                          key={item.id + '-' + idx2}
                                          initial={{ opacity: 0, x: 20 }}
                                          animate={{ opacity: 1, x: 0 }}
                                          transition={{ duration: 0.3, delay: idx2 * 0.03 }}
                                          className="hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors h-7"
                                        >
                                          <TableCell className="p-1 text-sm">
                                            <div className="flex items-center">
                                              {icon}
                                              <Badge variant="outline" className="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 font-semibold px-1 py-0.5 text-sm">
                                                {item.prize_code}
                                              </Badge>
                                            </div>
                                          </TableCell>
                                          <TableCell className="p-1 text-sm">
                                            {isTod || isWing ? (
                                              <Badge className="bg-purple-500 dark:bg-purple-800 text-white px-1 py-0.5 text-sm">
                                                {matchedNumbers.join(', ')}
                                              </Badge>
                                            ) : (
                                              <Badge className="bg-purple-500 dark:bg-purple-800 text-white px-1 py-0.5 text-sm">
                                                {item.result.winning_number}
                                              </Badge>
                                            )}
                                          </TableCell>
                                          <TableCell className="p-1 text-sm">
                                            <span className="text-purple-600 dark:text-purple-300 font-bold">
                                              {item.winning_number}
                                            </span>
                                          </TableCell>
                                          <TableCell className="p-1 text-sm">
                                            <Badge variant="secondary" className="px-1 py-0.5 text-sm bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-200">
                                              {item.lottery_sub_number?.type_number || '-'}
                                            </Badge>
                                          </TableCell>
                                          <TableCell className="font-medium p-1 text-sm">
                                            {/* 🔧 แสดง effective_prize_rate พร้อมข้อมูลเลขอั้น */}
                                            <div className="flex items-center gap-1">
                                              <span className={item.number_cap_action ? "line-through text-gray-400" : ""}>
                                                {item.lottery_sub_number?.price_paid || '-'}
                                              </span>
                                              {item.effective_prize_rate && item.effective_prize_rate !== item.lottery_sub_number?.price_paid && (
                                                <>
                                                  <span className="text-red-500">→</span>
                                                  <span className="text-red-600 font-bold">{item.effective_prize_rate}</span>
                                                  {item.number_cap_action === 'half' && (
                                                    <span className="text-xs bg-orange-100 text-orange-700 px-1 rounded" title="หารครึ่งรางวัล">
                                                      ✂️
                                                    </span>
                                                  )}
                                                </>
                                              )}
                                            </div>
                                          </TableCell>
                                          <TableCell className="font-medium p-1 text-sm">
                                            {item.amount?.toLocaleString()} ฿
                                          </TableCell>
                                          <TableCell className="p-1 text-sm">
                                            <div className="flex items-center text-green-600 dark:text-green-400 font-bold">
                                              <FaMoneyBillWave className="mr-1 text-xs" />
                                              +{item.prize.toLocaleString()} ฿
                                            </div>
                                          </TableCell>
                                        </motion.tr>
                                      );
                                    })}
                                  </TableBody>
                                </Table>
                              </div>
                            </CardContent>
                          </CollapsibleContent>
                        </Card>
                      </Collapsible>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        </div>
      </div>
    
  );
}