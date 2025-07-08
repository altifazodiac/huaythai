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
  FaRunning
} from 'react-icons/fa';
import { Button } from "@/components/ui/button";
import { toZonedTime } from "date-fns-tz";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/lib/contexts/AuthContext";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

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

export default function LotteryTicketResultsPage() {
  useRequireAuth();
  const isMobile = useIsMobile();
  const { supabase, user } = useAuth();
  const [tickets, setTickets] = useState<LotteryTicket[]>([]);
  const [results, setResults] = useState<LotteryResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterBill, setFilterBill] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [winningBills, setWinningBills] = useState<any[]>([]);
  const [statusLoading, setStatusLoading] = useState<string | null>(null);
  const [expandedTickets, setExpandedTickets] = useState<Set<string>>(new Set());
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'pending' | 'paid'>('all');

  useEffect(() => {
    async function fetchData() {
      if (!supabase || !user) return;
      
      setLoading(true);
      try {
        const { data: ticketsData, error: ticketsError } = await supabase
          .from("lottery_tickets")
          .select(`*,
            lottery_ticket_items:lottery_ticket_items(*,
              lottery_sub_types:lottery_sub_types(lottery_sub_type_id,sub_type_name),
              lottery_sub_number:lottery_sub_number(id,lottery_sub_type_id,digit_number,type_number,price_paid)
            )
          `)
          .order("created_at", { ascending: false });
          
        if (ticketsError) {
          console.error('Error fetching tickets:', ticketsError);
          return;
        }
        
        const { data: resultsData, error: resultsError } = await supabase
          .from("lottery_results")
          .select(`*,
            lottery_sub_types:lottery_sub_type_id(lottery_sub_type_id,sub_type_name)
          `);
          
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
  }, [supabase, user]);

  // Build a map for quick result lookup: {date|sub_type_id|prize_code: result}
  const resultMap = React.useMemo(() => {
    const map: Record<string, LotteryResult> = {};
    for (const res of results) {
      const date = res.draw_date;
      const subTypeId = res.lottery_sub_type_id;
      const prizeCode = res.prize_code;
      if (date && subTypeId && prizeCode) {
        // Create key using actual prize_code from database
        map[`${date}|${subTypeId}|${prizeCode}`] = res;
      }
    }
    return map;
  }, [results]);

  // Find all winning tickets and calculate prize per row
  const { winningTickets, totalPrize } = React.useMemo(() => {
    let totalPrize = 0;
    const wins: {
      bill_number: string;
      bill_name: string;
      draw_date: string;
      draw_time: string;
      ticket_id: string;
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
      const winItems: (LotteryTicketItem & { winning_number: string; prize_code: string; result: LotteryResult; prize: number; draw_time: string })[] = [];
      for (const item of ticket.lottery_ticket_items) {
        if (!item.lottery_sub_number || !item.numbers) continue;
        
        // Create prize code that matches database format
        const digitNumber = item.lottery_sub_number.digit_number;
        const typeNumber = item.lottery_sub_number.type_number;
        
        // Map type_number to actual prize_code format in database
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
        
        // Find matching result
        const matchingResult = results.find(res => 
          res.draw_date === ticket.draw_date &&
          res.lottery_sub_type_id === item.lottery_sub_type_id &&
          res.prize_code === prizeCodePattern
        );
        
        if (matchingResult && matchingResult.winning_number && item.numbers) {
          let matchedNumbers: string[] = [];
          
          // โต๊ด - check if any purchased number matches any winning combination
          if (typeNumber === 'โต๊ด') {
            const winningSet = new Set(matchingResult.winning_number.split(",").map(s => s.trim()));
            matchedNumbers = item.numbers.filter(num => winningSet.has(num));
          }
          // วิ่ง - check if any purchased digit matches any winning digit
          else if (typeNumber === 'วิ่งบน' || typeNumber === 'วิ่งล่าง') {
            const winningDigits = new Set(matchingResult.winning_number.split(",").map(s => s.trim()));
            // For วิ่ง, check each digit of purchased numbers
            for (const num of item.numbers) {
              for (const digit of num.split('')) {
                if (winningDigits.has(digit)) {
                  matchedNumbers.push(num);
                  break; // Only count each number once
                }
              }
            }
          }
          // ตรง - exact match
          else {
            matchedNumbers = item.numbers.filter(num => num === matchingResult.winning_number);
          }
          
          if (matchedNumbers.length > 0) {
            // Calculate prize: amount_bet * price_paid_per_baht * matched_count
            const prize = parseFloat(item.amount.toString()) * parseFloat(item.lottery_sub_number.price_paid.toString()) * matchedNumbers.length;
            totalPrize += prize;
            winItems.push({
              ...item,
              winning_number: matchedNumbers.join(", "),
              prize_code: prizeCodePattern,
              result: matchingResult,
              prize,
              draw_time: matchingResult.draw_time || '',
            });
          }
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
          items: winItems,
          sum,
        });
      }
    }
    return { winningTickets: wins, totalPrize };
  }, [tickets, resultMap]);

  useEffect(() => {
    supabase.from('lottery_winning_bills').select('*').then(({ data }: { data: any[] | null }) => setWinningBills(data || []));
  }, [winningTickets.length]);

  useEffect(() => {
    if (!winningTickets.length) return;
    winningTickets.forEach(async (win) => {
      const ticket = tickets.find(t => t.id === win.ticket_id);
      await supabase.from('lottery_winning_bills').upsert({
        bill_number: win.bill_number,
        bill_name: win.bill_name,
        user_id: ticket?.user_id || '',
        draw_date: win.draw_date,
        total_prize: win.sum,
      }, { onConflict: 'bill_number' });
    });
  }, [winningTickets.length, tickets]);

  const filteredWinningTickets = winningTickets.filter(win => {
    if (filterBill && !win.bill_number.includes(filterBill)) return false;
    if (filterDate && win.draw_date !== filterDate) return false;
    return true;
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

          {/* Statistics Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <Card className="bg-white dark:bg-slate-900 shadow border-0 hover:shadow-md transition-shadow">
                <CardContent className="p-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-medium text-gray-600 dark:text-gray-300">รางวัลทั้งหมด</p>
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
                      <p className="text-[10px] font-medium text-gray-600 dark:text-gray-300">ยอดรวมรางวัล</p>
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
                      <p className="text-[10px] font-medium text-gray-600 dark:text-gray-300">รอจ่าย</p>
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
                      <p className="text-[10px] font-medium text-gray-600 dark:text-gray-300">จ่ายแล้ว</p>
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
                <div className="flex flex-col md:flex-row gap-1 items-center justify-between">
                  <div className="flex items-center gap-1">
                    <FaFilter className="text-gray-500 dark:text-gray-300 text-xs" />
                    <span className="font-medium text-gray-700 dark:text-gray-200 text-xs">ตัวกรอง</span>
                  </div>
                  <div className="flex flex-col md:flex-row gap-1 w-full md:w-auto">
                    <div className="relative">
                      <FaSearch className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 text-xs" />
                      <Input 
                        placeholder="ค้นหาเลขบิล..." 
                        value={filterBill} 
                        onChange={e => setFilterBill(e.target.value)}
                        className="pl-7 w-full md:w-32 border-gray-200 dark:border-slate-700 focus:border-blue-500 focus:ring-blue-500 h-7 text-xs bg-white dark:bg-slate-800 dark:text-gray-100"
                      />
                    </div>
                    <div className="relative">
                      <FaCalendarAlt className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 text-xs" />
                      <Input 
                        type="date" 
                        value={filterDate} 
                        onChange={e => setFilterDate(e.target.value)}
                        className="pl-7 w-full md:w-28 border-gray-200 dark:border-slate-700 focus:border-blue-500 focus:ring-blue-500 h-7 text-xs bg-white dark:bg-slate-800 dark:text-gray-100"
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
            ) : filteredTickets.length === 0 ? (
              <Card className="bg-white dark:bg-slate-900 shadow border-0">
                <CardContent className="p-8 text-center">
                  <FaTicketAlt className="mx-auto text-4xl text-gray-300 dark:text-gray-600 mb-2" />
                  <h3 className="text-base font-semibold text-gray-600 dark:text-gray-200 mb-1">ไม่พบบิลที่ถูกรางวัล</h3>
                  <p className="text-gray-500 dark:text-gray-400 text-xs">ลองเปลี่ยนเงื่อนไขการค้นหาหรือตรวจสอบในงวดอื่น</p>
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
                                      <p className="text-blue-100 text-[10px]">
                                        บิล: {win.bill_number} | {win.bill_name || '-'}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <div className="flex items-center gap-1 mb-0.5">
                                      <FaMoneyBillWave className="text-yellow-300 text-xs" />
                                      <span className="text-base font-bold text-yellow-300">
                                        +{win.sum.toLocaleString()} ฿
                                      </span>
                                    </div>
                                    <p className="text-blue-100 text-[10px]">
                                      งวด: {format(new Date(win.draw_date), 'd MMM yy', { locale: th })}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center justify-between mt-1">
                                  <div className="flex items-center gap-1 text-[10px]">
                                    <FaCalendarAlt className="text-blue-200 text-xs" />
                                    <span className="text-blue-100">
                                      ซื้อ: {format(new Date(win.items[0]?.result?.created_at || win.draw_date), 'd MMM yy', { locale: th })}
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
                                            await supabase.from('lottery_winning_bills')
                                              .update({ status: 'paid', paid_at: thaiNow })
                                              .eq('bill_number', win.bill_number);
                                            const ticket = tickets.find(t => t.id === win.ticket_id);
                                            if (ticket?.user_id) {
                                              const { data: profile } = await supabase
                                                .from('profiles')
                                                .select('credit_balance')
                                                .eq('id', ticket.user_id)
                                                .single();
                                              const currentCredit = profile?.credit_balance ?? 0;
                                              const newCredit = currentCredit + win.sum;
                                              await supabase.from('profiles')
                                                .update({ credit_balance: newCredit })
                                                .eq('id', ticket.user_id);
                                              await supabase.from('credit_transactions').insert([
                                                {
                                                  user_id: ticket.user_id,
                                                  amount: win.sum,
                                                  transaction_type: 'lottery_win',
                                                  description: `ถูกรางวัลบิล ${win.bill_number}`,
                                                  related_bill_number: win.bill_number,
                                                  created_at: thaiNow,
                                                }
                                              ]);
                                              window.dispatchEvent(new Event('credit-updated'));
                                            }
                                            const { data } = await supabase.from('lottery_winning_bills').select('*');
                                            setWinningBills(data || []);
                                          } catch (error) {
                                            console.error('Error updating payout status:', error);
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
                                          <span className="text-green-100 text-[10px] ml-1">
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
                                      <TableHead className="h-7 px-1 text-[10px] font-semibold text-gray-700 dark:text-gray-200">รางวัล</TableHead>
                                      <TableHead className="h-7 px-1 text-[10px] font-semibold text-gray-700 dark:text-gray-200">เลขที่ออก</TableHead>
                                      <TableHead className="h-7 px-1 text-[10px] font-semibold text-gray-700 dark:text-gray-200">เลขที่ซื้อถูก</TableHead>
                                      <TableHead className="h-7 px-1 text-[10px] font-semibold text-gray-700 dark:text-gray-200">ประเภท</TableHead>
                                      <TableHead className="h-7 px-1 text-[10px] font-semibold text-gray-700 dark:text-gray-200">ราคาจ่าย</TableHead>
                                      <TableHead className="h-7 px-1 text-[10px] font-semibold text-gray-700 dark:text-gray-200">จำนวนเงินที่ซื้อ</TableHead>
                                      <TableHead className="h-7 px-1 text-[10px] font-semibold text-gray-700 dark:text-gray-200">รางวัลที่ได้</TableHead>
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
                                          <TableCell className="p-1 text-[10px]">
                                            <div className="flex items-center">
                                              {icon}
                                              <Badge variant="outline" className="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 font-semibold px-1 py-0.5 text-[10px]">
                                                {item.prize_code}
                                              </Badge>
                                            </div>
                                          </TableCell>
                                          <TableCell className="p-1 text-[10px]">
                                            {isTod || isWing ? (
                                              <Badge className="bg-purple-500 dark:bg-purple-800 text-white px-1 py-0.5 text-[10px]">
                                                {matchedNumbers.join(', ')}
                                              </Badge>
                                            ) : (
                                              <Badge className="bg-purple-500 dark:bg-purple-800 text-white px-1 py-0.5 text-[10px]">
                                                {item.result.winning_number}
                                              </Badge>
                                            )}
                                          </TableCell>
                                          <TableCell className="p-1 text-[10px]">
                                            <span className="text-purple-600 dark:text-purple-300 font-bold">
                                              {item.winning_number}
                                            </span>
                                          </TableCell>
                                          <TableCell className="p-1 text-[10px]">
                                            <Badge variant="secondary" className="px-1 py-0.5 text-[10px] bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-200">
                                              {item.lottery_sub_number?.type_number || '-'}
                                            </Badge>
                                          </TableCell>
                                          <TableCell className="font-medium p-1 text-[10px]">
                                            {item.lottery_sub_number?.price_paid || '-'}
                                          </TableCell>
                                          <TableCell className="font-medium p-1 text-[10px]">
                                            {item.amount?.toLocaleString()} ฿
                                          </TableCell>
                                          <TableCell className="p-1 text-[10px]">
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