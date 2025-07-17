"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Filter, X, TrendingUp, TrendingDown, DollarSign, Receipt, BarChart3, Hash, AlertCircle } from 'lucide-react';
import { Separator } from "@/components/ui/separator";
 
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
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableCaption,
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { useAuth } from '@/lib/contexts/AuthContext';
import { useUserRole } from "@/hooks/use-user-role";
import { countryFlagImg } from "@/lib/utils/flags";
import { Badge } from "@/components/ui/badge";

// 🔧 **ปรับปรุง**: เพิ่ม Interface สำหรับผลรางวัล
interface LotteryResult {
  draw_date: string;
  lottery_sub_type_id: number;
  prize_code: string;
  winning_number: string;
}

// Comprehensive interfaces for detailed lottery analysis
interface DailySummary {
  draw_date: string;
  user_id: string;
  user_name: string;
  total_bills: number;
  total_numbers: number;
  total_purchase_amount: number;
  total_payout: number;
  net_profit_loss: number;
}

interface LotteryTypeSummary {
  lottery_sub_type_id: number;
  sub_type_name: string;
  country_origin: string;
  total_bills: number;
  total_numbers: number;
  total_purchase_amount: number;
  total_payout: number;
  net_profit_loss: number;
}

interface BillSummary {
  bill_number: string;
  draw_date: string;
  user_name: string;
  sub_type_name: string;
  country_origin: string;
  total_amount: number;
  total_payout: number;
  net_profit_loss: number;
  numbers_count: number;
  status: string;
}

interface NumberDetail {
  id: string;
  bill_number: string;
  lottery_type_name: string;
  digit_number: number;
  type_number: string;
  numbers: string[];
  amount: number;
  price_paid: number;
  effective_prize_rate?: number;
  number_cap_action?: string;
  number_cap_status?: any;
  is_winning: boolean;
  payout_amount: number;
  winning_numbers?: string;
  matched_number?: string;
}

// 🔧 **ใหม่**: ฟังก์ชันกลางสำหรับคำนวณรางวัล
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
    const winningDigits = new Set(matchingResult.winning_number.split(',').join(''));
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


// 🔧 **ปรับปรุง**: แก้ไขฟังก์ชันดึงข้อมูลสรุปทั้งหมด
const fetchDailySummary = async (supabase: any, resultsMap: Record<string, LotteryResult>): Promise<DailySummary[]> => {
  try {
    const { data: tickets, error: ticketError } = await supabase
      .from('lottery_tickets')
      .select('id, draw_date, total_amount, user_id, lottery_ticket_items(*, lottery_sub_number(*))')
      .eq('status', 'confirmed');
    if (ticketError) throw ticketError;
    if (!tickets || tickets.length === 0) return [];

    const userIds = [...new Set(tickets.map((t: any) => t.user_id).filter(Boolean))];
    const { data: profiles, error: profileError } = await supabase.from('profiles').select('id, name').in('id', userIds);
    if (profileError) throw profileError;
    const profilesMap = new Map(profiles.map((p: {id: string, name: string}) => [p.id, p.name]));

    const groupedData = (tickets || []).reduce((acc: any, ticket: any) => {
      if (!ticket.user_id) return acc;
      const key = `${ticket.draw_date}__${ticket.user_id}`;
      if (!acc[key]) {
        acc[key] = {
          draw_date: ticket.draw_date,
          user_id: ticket.user_id,
          user_name: profilesMap.get(ticket.user_id) || 'ไม่ระบุ',
          total_bills: 0,
          total_numbers: 0,
          total_purchase_amount: 0,
          total_payout: 0,
        };
      }

      let ticketPayout = 0;
      (ticket.lottery_ticket_items || []).forEach((item: any) => {
        const { prize } = calculateWinningsForItem(item, ticket.draw_date, resultsMap);
        ticketPayout += prize;
        acc[key].total_numbers += (item.numbers || []).length;
      });
      
      acc[key].total_bills += 1;
      acc[key].total_purchase_amount += Number(ticket.total_amount || 0);
      acc[key].total_payout += ticketPayout;
      return acc;
    }, {});

    return Object.values(groupedData).map((summary: any) => ({
      ...summary,
      net_profit_loss: summary.total_purchase_amount - summary.total_payout
    })).sort((a: any, b: any) => new Date(b.draw_date).getTime() - new Date(a.draw_date).getTime());
  } catch (err) {
    console.error('Error in fetchDailySummary:', err);
    throw err;
  }
};

const fetchLotteryTypeSummary = async (supabase: any, resultsMap: Record<string, LotteryResult>, drawDate?: string): Promise<LotteryTypeSummary[]> => {
  try {
    let ticketQuery = supabase
      .from('lottery_tickets')
      .select('id, draw_date, lottery_ticket_items!inner(*, lottery_sub_number(*), lottery_sub_types!inner(*))')
      .eq('status', 'confirmed');
    if (drawDate) {
      ticketQuery = ticketQuery.eq('draw_date', drawDate);
    }
    const { data: tickets, error: ticketError } = await ticketQuery;
    if (ticketError) throw ticketError;
    
    const groupedData = (tickets || []).reduce((acc: any, ticket: any) => {
      (ticket.lottery_ticket_items || []).forEach((item: any) => {
      const subTypeId = item.lottery_sub_type_id;
      const subType = item.lottery_sub_types;
        if (!subType) return;
      
      if (!acc[subTypeId]) {
        acc[subTypeId] = {
          lottery_sub_type_id: subTypeId,
          sub_type_name: subType.sub_type_name,
          country_origin: subType.country_origin,
          total_bills: new Set(),
          total_numbers: 0,
          total_purchase_amount: 0,
          total_payout: 0,
          };
        }
        
        const { prize } = calculateWinningsForItem(item, ticket.draw_date, resultsMap);
      
        acc[subTypeId].total_bills.add(ticket.id);
        acc[subTypeId].total_numbers += (item.numbers || []).length;
        acc[subTypeId].total_purchase_amount += Number(item.amount || 0);
        acc[subTypeId].total_payout += prize;
      });
      return acc;
    }, {});
    
    return Object.values(groupedData).map((item: any) => ({
      ...item,
      total_bills: item.total_bills.size,
      net_profit_loss: item.total_purchase_amount - item.total_payout,
    })).sort((a: any, b: any) => b.total_purchase_amount - a.total_purchase_amount);
  } catch (err) {
    console.error('Error in fetchLotteryTypeSummary:', err);
    throw err;
  }
};

const fetchBillSummary = async (supabase: any, resultsMap: Record<string, LotteryResult>, drawDate?: string, lotteryTypeId?: number, userId?: string): Promise<BillSummary[]> => {
  try {
    let ticketQuery = supabase
      .from('lottery_tickets')
      .select('id, bill_number, draw_date, total_amount, status, user_id, lottery_ticket_items!inner(*, lottery_sub_number(*), lottery_sub_types!inner(*))')
      .eq('status', 'confirmed');
    
    if (drawDate) ticketQuery = ticketQuery.eq('draw_date', drawDate);
    if (userId && userId !== 'all') ticketQuery = ticketQuery.eq('user_id', userId);
    if (lotteryTypeId) ticketQuery = ticketQuery.eq('lottery_ticket_items.lottery_sub_type_id', lotteryTypeId);
    
    const { data: tickets, error: ticketError } = await ticketQuery;
    if (ticketError) throw ticketError;
    if (!tickets || tickets.length === 0) return [];
    
    const userIds = [...new Set(tickets.map((t: any) => t.user_id))];
    const { data: profiles, error: profileError } = await supabase.from('profiles').select('id, name').in('id', userIds);
    if (profileError) throw profileError;
    const profilesMap = new Map(profiles.map((p: {id: string, name: string}) => [p.id, p.name]));
    
    const transformedData = tickets.map((ticket: any) => {
      const subTypeNames = [...new Set(ticket.lottery_ticket_items.map((item: any) => item.lottery_sub_types?.sub_type_name).filter(Boolean))];
      const countries = [...new Set(ticket.lottery_ticket_items.map((item: any) => item.lottery_sub_types?.country_origin).filter(Boolean))];
      
      let totalPayout = 0;
      let totalNumbers = 0;
      (ticket.lottery_ticket_items || []).forEach((item: any) => {
        const { prize } = calculateWinningsForItem(item, ticket.draw_date, resultsMap);
        totalPayout += prize;
        totalNumbers += (item.numbers || []).length;
      });
        
        return {
          bill_number: ticket.bill_number,
          draw_date: ticket.draw_date,
        user_name: profilesMap.get(ticket.user_id) || 'ไม่ระบุ',
        sub_type_name: subTypeNames.join(', '),
        country_origin: countries.join(', '),
          total_amount: Number(ticket.total_amount || 0),
        total_payout: totalPayout,
        net_profit_loss: Number(ticket.total_amount || 0) - totalPayout,
        numbers_count: totalNumbers,
          status: ticket.status
        };
    }).filter(Boolean);
    
    return transformedData as BillSummary[];
  } catch (err) {
    console.error('Error in fetchBillSummary:', err);
    throw err;
  }
};

const fetchNumberDetails = async (supabase: any, resultsMap: Record<string, LotteryResult>, billNumber?: string): Promise<NumberDetail[]> => {
  try {
    if (!billNumber) return [];
    
    let ticketQuery = supabase
      .from('lottery_tickets')
      .select('id, bill_number, draw_date, lottery_ticket_items!inner(*, lottery_sub_number(*))')
      .eq('status', 'confirmed')
      .eq('bill_number', billNumber);
    
    const { data: tickets, error: ticketError } = await ticketQuery;
    if (ticketError) throw ticketError;
    if (!tickets || tickets.length === 0) return [];
    
    const transformedData: NumberDetail[] = [];
    (tickets || []).forEach((ticket: any) => {
      (ticket.lottery_ticket_items || []).forEach((item: any) => {
        const { prize, isWinning, winningNumberDisplay, matchedNumber } = calculateWinningsForItem(item, ticket.draw_date, resultsMap);

        transformedData.push({
          id: item.id,
          bill_number: ticket.bill_number,
          lottery_type_name: `${item.lottery_sub_number.digit_number} ตัว${item.lottery_sub_number.type_number}`,
          digit_number: item.lottery_sub_number.digit_number,
          type_number: item.lottery_sub_number.type_number,
          numbers: item.numbers,
          amount: Number(item.amount || 0),
          price_paid: Number(item.lottery_sub_number.price_paid || 0),
          effective_prize_rate: item.effective_prize_rate,
          number_cap_action: item.number_cap_action,
          is_winning: isWinning,
          payout_amount: prize,
          winning_numbers: winningNumberDisplay,
          matched_number: matchedNumber,
        });
      });
    });
    
    return transformedData;
  } catch (err) {
    console.error('Error in fetchNumberDetails:', err);
    throw err;
  }
};

// Function to fetch users for admin dropdown
const fetchUsers = async (supabase: any): Promise<{ id: string; name: string; phone: string }[]> => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, name, phone')
      .order('name');
    
    if (error) throw error;
    
    return data || [];
  } catch (err) {
    console.error('Error fetching users:', err);
    return [];
  }
};

const LotterySummaryPage: React.FC = () => {
  const { supabase, user } = useAuth();
  const { role } = useUserRole();
  const [activeTab, setActiveTab] = useState('daily');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Data states
  const [dailySummary, setDailySummary] = useState<DailySummary[]>([]);
  const [lotteryTypeSummary, setLotteryTypeSummary] = useState<LotteryTypeSummary[]>([]);
  const [billSummary, setBillSummary] = useState<BillSummary[]>([]);
  const [numberDetails, setNumberDetails] = useState<NumberDetail[]>([]);
  const [users, setUsers] = useState<{ id: string; name: string; phone: string }[]>([]);
  const [resultsMap, setResultsMap] = useState<Record<string, LotteryResult>>({}); // 🔧 ใหม่

  // Filter states
  const todayStr = new Date().toISOString().slice(0, 10);
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [selectedLotteryType, setSelectedLotteryType] = useState<number | null>(null);
  const [selectedBillNumber, setSelectedBillNumber] = useState<string>('');
  const [selectedUserId, setSelectedUserId] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
 
  useRequireAuth();

  // Load initial data
  useEffect(() => {
    if (!supabase) return;
    loadData();
  }, [supabase]);

  // 🔧 **ปรับปรุง**: แยกฟังก์ชัน loadData ออกมา
  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { data: resultsData, error: resultsError } = await supabase.from('lottery_results').select('*');
      if (resultsError) throw resultsError;
      
      const newResultsMap: Record<string, LotteryResult> = (resultsData || []).reduce((acc, res) => {
        const key = `${res.draw_date}|${res.lottery_sub_type_id}|${res.prize_code}`;
        acc[key] = res;
        return acc;
      }, {});
      setResultsMap(newResultsMap);

      const [dailyData, typeData, billData, numberData] = await Promise.all([
        fetchDailySummary(supabase, newResultsMap),
        fetchLotteryTypeSummary(supabase, newResultsMap, selectedDate || undefined),
        fetchBillSummary(supabase, newResultsMap, selectedDate || undefined, selectedLotteryType || undefined, selectedUserId === 'all' ? undefined : selectedUserId || undefined),
        fetchNumberDetails(supabase, newResultsMap, selectedBillNumber || undefined)
      ] as const);
      
      setDailySummary(dailyData as DailySummary[]);
      setLotteryTypeSummary(typeData as LotteryTypeSummary[]);
      setBillSummary(billData as BillSummary[]);
      setNumberDetails(numberData as NumberDetail[]);
      
      if (role === 'admin') {
        const usersData = await fetchUsers(supabase);
        setUsers(usersData);
      }
    } catch (err) {
      console.error('Data loading error:', err);
      setError('ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsLoading(false);
    }
  };

  // Refresh data when filters change
  useEffect(() => {
    if (!supabase) return;
    const timeoutId = setTimeout(() => {
      loadData();
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [selectedDate, selectedLotteryType, selectedBillNumber, selectedUserId]);

  // Format currency in Thai Baht
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(amount);
  };

  // Format date in Thai locale
  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const clearFilters = () => {
    setSelectedDate('');
    setSelectedLotteryType(null);
    setSelectedBillNumber('');
    setSelectedUserId('all');
    setSearchTerm('');
  };

  const renderDailySummaryTab = () => (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            สรุปรายวัน
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {role === 'admin' && <TableHead>ผู้ใช้</TableHead>}
                  <TableHead>วันที่</TableHead>
                  <TableHead className="text-right">จำนวนบิล</TableHead>
                  <TableHead className="text-right">จำนวนเลข</TableHead>
                  <TableHead className="text-right">ยอดซื้อ</TableHead>
                  <TableHead className="text-right">ยอดจ่าย</TableHead>
                  <TableHead className="text-right">กำไร/ขาดทุน</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <AnimatePresence>
                  {dailySummary.map((item, index) => (
                    <motion.tr 
                      key={item.draw_date + '__' + (item.user_id || '')}
                      layout
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                      className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted cursor-pointer"
                      onClick={() => {
                        setSelectedDate(item.draw_date);
                        setActiveTab('types');
                      }}
                    >
                      {role === 'admin' && (
                        <TableCell className="max-w-[150px]">
                          <div className="truncate" title={item.user_name}>
                            {item.user_name || 'ไม่ระบุ'}
                          </div>
                        </TableCell>
                      )}
                      <TableCell className="font-medium">
                        {formatDate(item.draw_date)}
                      </TableCell>
                      <TableCell className="text-right">{item.total_bills.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{item.total_numbers.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{formatCurrency(Number(item.total_purchase_amount))}</TableCell>
                      <TableCell className="text-right">{formatCurrency(Number(item.total_payout))}</TableCell>
                      <TableCell className={`text-right font-semibold ${
                        Number(item.net_profit_loss) >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {formatCurrency(Number(item.net_profit_loss))}
                      </TableCell>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderLotteryTypesTab = () => (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            สรุปตามประเภทหวย
            {selectedDate && (
              <span className="text-sm font-normal text-muted-foreground">
                - {formatDate(selectedDate)}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ประเภทหวย</TableHead>
                  <TableHead>ประเทศ</TableHead>
                  <TableHead className="text-right">จำนวนบิล</TableHead>
                  <TableHead className="text-right">จำนวนเลข</TableHead>
                  <TableHead className="text-right">ยอดซื้อ</TableHead>
                  <TableHead className="text-right">ยอดจ่าย</TableHead>
                  <TableHead className="text-right">กำไร/ขาดทุน</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <AnimatePresence>
                  {lotteryTypeSummary.map((item, index) => (
                    <motion.tr 
                      key={item.lottery_sub_type_id}
                      layout
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                      className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted cursor-pointer"
                      onClick={() => {
                        setSelectedLotteryType(item.lottery_sub_type_id);
                        setActiveTab('bills');
                      }}
                    >
                      <TableCell className="font-medium">{item.sub_type_name}</TableCell>
                      <TableCell>{item.country_origin}</TableCell>
                      <TableCell className="text-right">{item.total_bills.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{item.total_numbers.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{formatCurrency(Number(item.total_purchase_amount))}</TableCell>
                      <TableCell className="text-right">{formatCurrency(Number(item.total_payout))}</TableCell>
                      <TableCell className={`text-right font-semibold ${
                        Number(item.net_profit_loss) >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {formatCurrency(Number(item.net_profit_loss))}
                      </TableCell>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderBillsTab = () => (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            สรุปตามบิล
            {(selectedDate || selectedLotteryType || (selectedUserId && selectedUserId !== 'all')) && (
              <span className="text-sm font-normal text-muted-foreground">
                - {selectedDate && formatDate(selectedDate)}
                {selectedLotteryType && ` (ประเภทหวย ID: ${selectedLotteryType})`}
                {selectedUserId && selectedUserId !== 'all' && ` (ผู้ใช้: ${users.find(u => u.id === selectedUserId)?.name || selectedUserId})`}
              </span>
            )}
          </CardTitle>
          <CardDescription>
            ทั้งหมด {billSummary.length} รายการ
            {billSummary.length > 0 && (
              <span className="ml-2 text-xs text-muted-foreground">
                (รวมเลขทั้งหมด: {billSummary.reduce((sum, item) => sum + item.numbers_count, 0)} เลข)
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>เลขที่บิล</TableHead>
                  <TableHead>วันที่</TableHead>
                  <TableHead>ประเภทหวย</TableHead>
                  <TableHead>ประเทศ</TableHead>
                  <TableHead className="text-right">จำนวนเลข</TableHead>
                  <TableHead className="text-right">ยอดซื้อ</TableHead>
                  <TableHead className="text-right">ยอดจ่าย</TableHead>
                  <TableHead className="text-right">กำไร/ขาดทุน</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {billSummary.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      ไม่พบข้อมูลบิล
                      {selectedDate && <div className="text-xs mt-1">สำหรับวันที่: {formatDate(selectedDate)}</div>}
                      {selectedLotteryType && <div className="text-xs mt-1">ประเภทหวย ID: {selectedLotteryType}</div>}
                      {selectedUserId && selectedUserId !== 'all' && <div className="text-xs mt-1">ผู้ใช้: {users.find(u => u.id === selectedUserId)?.name || selectedUserId}</div>}
                    </TableCell>
                  </TableRow>
                ) : (
                  <AnimatePresence>
                    {billSummary.map((item, index) => (
                      <motion.tr 
                        key={item.bill_number}
                        layout
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                        className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted cursor-pointer"
                        onClick={() => {
                          setSelectedBillNumber(item.bill_number);
                          setActiveTab('numbers');
                        }}
                      >
                        <TableCell className="font-medium">{item.bill_number}</TableCell>
                        <TableCell>{formatDate(item.draw_date)}</TableCell>
                        <TableCell className="max-w-[200px]">
                          <div className="truncate" title={item.sub_type_name}>
                            {item.sub_type_name}
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[150px]">
                          <div className="truncate" title={item.country_origin}>
                            {item.country_origin}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="font-mono font-semibold text-blue-600">
                            {item.numbers_count.toLocaleString()}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(Number(item.total_amount))}</TableCell>
                        <TableCell className="text-right">{formatCurrency(Number(item.total_payout))}</TableCell>
                        <TableCell className={`text-right font-semibold ${
                          Number(item.net_profit_loss) >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {formatCurrency(Number(item.net_profit_loss))}
                        </TableCell>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderNumbersTab = () => (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Hash className="h-5 w-5" />
            รายละเอียดเลข
            {selectedBillNumber && (
              <span className="text-sm font-normal text-muted-foreground">
                - บิล {selectedBillNumber}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ประเภทหวย</TableHead>
                  <TableHead>เลขที่ซื้อ</TableHead>
                  <TableHead className="text-right">ยอดซื้อ</TableHead>
                  <TableHead className="text-right">อัตราจ่าย</TableHead>
                  <TableHead className="text-center">ผล</TableHead>
                  <TableHead className="text-right">รางวัล</TableHead>
                  <TableHead>เลขที่ออก</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <AnimatePresence>
                  {numberDetails.map((item, index) => (
                    <motion.tr 
                      key={item.id} 
                      layout
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                      className={`border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted ${item.is_winning ? 'bg-green-100 dark:bg-green-900/50' : ''}`}
                    >
                      <TableCell>{item.lottery_type_name}</TableCell>
                      <TableCell className="font-mono">{item.numbers.join(', ')}</TableCell>
                      <TableCell className="text-right">{formatCurrency(Number(item.amount))}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-col items-end">
                          <span className={item.number_cap_action ? "line-through text-gray-400" : ""}>
                            {item.price_paid}x
                          </span>
                          {item.number_cap_action && (
                            <span className="text-red-600 font-bold">{item.effective_prize_rate}x</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {item.is_winning ? (
                          <Badge variant="default" className="bg-green-600">ถูก</Badge>
                        ) : (
                          <Badge variant="outline">ไม่ถูก</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-green-600">
                        {item.is_winning ? formatCurrency(Number(item.payout_amount)) : '-'}
                      </TableCell>
                      <TableCell className="font-mono">
                         {item.is_winning ? (
                           <div className="flex flex-col">
                             <span>{item.winning_numbers}</span>
                             <span className="text-xs text-green-700">({item.matched_number}*)</span>
                           </div>
                         ) : '-'}
                      </TableCell>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <DirectionProvider dir="ltr">
      <SidebarProvider>
     
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
                    <BreadcrumbPage>สรุปยอดขาย</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>
          </header>
          <div className="min-h-screen bg-gradient-to-br from-background to-muted text-foreground p-2 md:p-4 transition-colors duration-500">
            <div className="container mx-auto">
              <header className="mb-6 text-center">
                <motion.h1 
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  className="text-2xl md:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-400 via-red-500 to-red-500 dark:from-red-600 dark:via-red-400 dark:to-red-400"
                >
                  วิเคราะห์ยอดขายหวย
                </motion.h1>
                <motion.p 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  className="text-sm text-muted-foreground mt-2"
                >
                  สรุปและวิเคราะห์ข้อมูลการขายหวยแบบละเอียด
                </motion.p>
              </header>

              {/* Filter Controls */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
              >
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Filter className="h-5 w-5" />
                      ตัวกรองข้อมูล
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className={`grid grid-cols-1 ${role === 'admin' ? 'md:grid-cols-5' : 'md:grid-cols-4'} gap-4`}>
                      <div>
                        <label className="block text-sm font-medium mb-2">วันที่</label>
                        <Input
                          type="date"
                          value={selectedDate}
                          onChange={(e) => setSelectedDate(e.target.value)}
                          className="w-full"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">ประเภทหวย ID</label>
                        <Input
                          type="number"
                          value={selectedLotteryType || ''}
                          onChange={(e) => setSelectedLotteryType(e.target.value ? Number(e.target.value) : null)}
                          placeholder="เลือกประเภทหวย"
                          className="w-full"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">เลขที่บิล</label>
                        <Input
                          type="text"
                          value={selectedBillNumber}
                          onChange={(e) => setSelectedBillNumber(e.target.value)}
                          placeholder="ใส่เลขที่บิล"
                          className="w-full"
                        />
                      </div>
                      {role === 'admin' && (
                        <div>
                          <label className="block text-sm font-medium mb-2">ผู้ใช้</label>
                          <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="เลือกผู้ใช้" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">ทั้งหมด</SelectItem>
                              {users.map((user) => (
                                <SelectItem key={user.id} value={user.id}>
                                  {user.name} ({user.phone})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                      <div className="flex items-end">
                        <Button onClick={clearFilters} variant="outline" className="w-full">
                          <X className="h-4 w-4 mr-2" />
                          ล้างตัวกรอง
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Loading State */}
              {isLoading && (
                <div className="flex justify-center items-center h-64">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-16 h-16 border-4 border-t-primary border-r-primary border-b-muted border-l-muted rounded-full"
                  ></motion.div>
                </div>
              )}

              {/* Error State */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                >
                  <Card>
                    <CardContent className="text-center py-8">
                      <p className="text-destructive text-lg">{error}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* Main Content - Tabbed Interface */}
              {!isLoading && !error && (
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="daily" className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      รายวัน
                    </TabsTrigger>
                    <TabsTrigger value="types" className="flex items-center gap-2">
                      <BarChart3 className="h-4 w-4" />
                      ประเภทหวย
                    </TabsTrigger>
                    <TabsTrigger value="bills" className="flex items-center gap-2">
                      <Receipt className="h-4 w-4" />
                      บิล
                    </TabsTrigger>
                    <TabsTrigger value="numbers" className="flex items-center gap-2">
                      <Hash className="h-4 w-4" />
                      เลข
                    </TabsTrigger>
                  </TabsList>

                  <div className="mt-6">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                      >
                        {activeTab === "daily" && renderDailySummaryTab()}
                        {activeTab === "types" && renderLotteryTypesTab()}
                        {activeTab === "bills" && renderBillsTab()}
                        {activeTab === "numbers" && renderNumbersTab()}
                      </motion.div>
                    </AnimatePresence>
                  </div>
                </Tabs>
              )}

              <footer className="text-center mt-12 text-sm text-muted-foreground">
                <p>&copy; {new Date().getFullYear()} Lottery Insights. All rights reserved.</p>
              </footer>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </DirectionProvider>
  );
};

export default LotterySummaryPage;

 