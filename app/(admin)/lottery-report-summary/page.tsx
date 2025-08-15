"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar, 
  Filter, 
  X, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Receipt, 
  BarChart3, 
  Hash, 
  AlertCircle,
  User,
  Trophy,
  Wallet,
  Percent,
  Calculator,
  FileText,
  ChevronDown,
  ChevronUp,
  Download,
  RefreshCw,
  Award,
  CreditCard,
  PiggyBank,
  Users,
  ShoppingCart,
  Target,
  TrendingUpIcon,
  CalendarDays,
  Activity,
  Clock,
  CheckCircle,
  XCircle,
  PlusCircle,
  MinusCircle,
  Computer
} from 'lucide-react';
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
import { useAuth } from '@/lib/contexts/AuthContext';
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase/supabaseClient";
import { useIsMobile } from '@/hooks/use-mobile';

// Enhanced interfaces for lottery report summary
interface LotteryResult {
  draw_date: string;
  lottery_sub_type_id: number;
  prize_code: string;
  winning_number: string;
}
interface LotteryTransactionData {
  id: string;
  draw_date: string;
  purchase_date: string;
  user_name: string;
  user_id: string;
  total_purchase_amount: number;
  total_payout: number; // เปลี่ยนจาก total_reward_amount เป็น total_payout เหมือนหน้า summary
  commission_percentage: number;
  commission_amount: number;
  remaining_balance: number;
  profit_loss: number;
  net_amount: number; // ยอดสุทธิ = กำไร/ขาดทุน - คอมมิชชั่น
  bill_count: number;
  ticket_count: number;
  status: string;
  deleted_at?: string;
  lottery_types?: any[]; // 🔧 เพิ่มข้อมูลประเภทหวย
}

interface UserSummary {
  user_id: string;
  user_name: string;
  commission_percentage: number;
  total_purchase: number;
  total_reward: number; // payout - ยอดจ่าย
  total_commission: number;
  total_remaining: number;
  total_profit_loss: number;
  total_net_amount: number; // ยอดสุทธิ = กำไร/ขาดทุน - คอมมิชชั่น

  bill_count: number;
  transaction_count: number;
  lottery_type_breakdown?: LotteryTypeBreakdown[]; // 🔧 เพิ่มข้อมูลประเภทหวย
}

interface LotteryTypeBreakdown {
  lottery_sub_type_id: number;
  sub_type_name: string;
  country_origin: string;
  total_purchase: number;
  total_reward: number;
  total_commission: number;
  total_profit_loss: number;

  bill_count: number;
  transaction_count: number;
}

interface DateGroupedReport {
  date: string;
  total_users: number;
  total_purchase: number;
  total_reward: number;
  total_commission: number;
  total_remaining: number;
  total_profit_loss: number;
  total_net_amount: number; // ยอดสุทธิ = กำไร/ขาดทุน - คอมมิชชั่น

  total_bills: number;
  total_transactions: number;
  users: UserSummary[];
  commission_rate_average: number;
  profit_margin_percentage: number;
}

interface OverallSummary {
  total_dates: number;
  total_users: number;
  total_transactions: number;
  total_bills: number;
  total_purchase: number;
  total_reward: number;
  total_commission: number;
  total_remaining: number;
  total_profit_loss: number;
  profit_margin_percentage: number;
  commission_rate_average: number;
  best_profit_date: string;
  worst_profit_date: string;
  highest_sales_date: string;
}

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      duration: 0.5
    }
  }
};

const cardVariants = {
  hidden: { scale: 0.95, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: {
      duration: 0.3
    }
  }
};

// Enhanced data fetching function
const fetchLotteryReportData = async (supabase: any, resultsMap: Record<string, LotteryResult>, startDate?: string, endDate?: string): Promise<LotteryTransactionData[]> => {
  try {
    let query = supabase
      .from('lottery_tickets')
      .select('id, draw_date, created_at, total_amount, status, user_id, bill_number, lottery_ticket_items!inner(*, lottery_sub_number(*), lottery_sub_types!inner(lottery_sub_type_id, sub_type_name, country_origin, percent))')
      .eq('status', 'confirmed')
      .is('deleted_at', null); // ✅ เพิ่มเงื่อนไขเพื่อไม่แสดงรายการที่ถูกลบ

    if (startDate) query = query.gte('draw_date', startDate);
    if (endDate) query = query.lte('draw_date', endDate);

    const { data: tickets, error } = await query;
    if (error) throw error;

    // ✅ ดึงข้อมูลจาก lottery_winning_bills
    let winningQuery = supabase
      .from('lottery_winning_bills')
      .select('bill_number, total_prize, draw_date');

    if (startDate) winningQuery = winningQuery.gte('draw_date', startDate);
    if (endDate) winningQuery = winningQuery.lte('draw_date', endDate);

    const { data: winningBills } = await winningQuery;

    // สร้าง Map สำหรับ winningBills เพื่อค้นหาได้เร็ว
    const winningBillsMap = new Map<string, number>();
    (winningBills || []).forEach((bill: any) => {
      winningBillsMap.set(bill.bill_number, Number(bill.total_prize || 0));
    });

          // ดึงข้อมูล profiles แยก (ไม่ต้องใช้ percent จาก profiles แล้ว)
    const userIds = [...new Set(tickets?.map((t: any) => t.user_id) || [])];
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, name')
      .in('id', userIds);
    
    if (profileError) throw profileError;
    
    const profilesMap = new Map<string, { name: string }>();
    (profiles || []).forEach((p: {id: string, name: string}) => {
      profilesMap.set(p.id, { name: p.name });
    });

    return (tickets || []).map((ticket: any) => {
      // ✅ ใช้ข้อมูลจาก lottery_winning_bills แทนการคำนวณ manual
      const total_payout = winningBillsMap.get(ticket.bill_number) || 0;
      
      const total_purchase_amount = Number(ticket.total_amount || 0);
      const profit_loss = total_purchase_amount - total_payout;
      
      // คำนวณ commission จาก lottery_sub_types.percent
      const userProfile = profilesMap.get(ticket.user_id);
      // คำนวณเปอร์เซนต์เฉลี่ยจาก lottery_sub_types.percent ของ ticket items
      const ticketPercents = (ticket.lottery_ticket_items || [])
        .map((item: any) => item.lottery_sub_types?.percent || 0)
        .filter((p: number) => p > 0);
      const commission_percentage = ticketPercents.length > 0 
        ? ticketPercents.reduce((sum: number, p: number) => sum + p, 0) / ticketPercents.length 
        : 0;
      const commission_amount = total_purchase_amount * (commission_percentage / 100);
      const remaining_balance = profit_loss - commission_amount;
      const net_amount = profit_loss - commission_amount; // ยอดสุทธิ = กำไร/ขาดทุน - คอมมิชชั่น

      // 🔧 ดึงข้อมูลประเภทหวยจาก lottery_ticket_items (รวม percent)
      const lottery_types = [...new Set((ticket.lottery_ticket_items || []).map((item: any) => ({
        lottery_sub_type_id: item.lottery_sub_types?.lottery_sub_type_id,
        sub_type_name: item.lottery_sub_types?.sub_type_name,
        country_origin: item.lottery_sub_types?.country_origin,
        percent: item.lottery_sub_types?.percent || 0
      })).filter((type: any) => type.lottery_sub_type_id))];

      return {
        id: ticket.id,
        draw_date: ticket.draw_date,
        purchase_date: ticket.created_at,
        user_name: userProfile?.name || 'ไม่ระบุ',
        user_id: ticket.user_id,
        total_purchase_amount,
        total_payout,
        commission_percentage,
        commission_amount,
        remaining_balance,
        profit_loss,
        net_amount,
        bill_count: 1,
        ticket_count: (ticket.lottery_ticket_items || []).length,
        status: ticket.status,
        deleted_at: ticket.deleted_at,
        lottery_types // 🔧 เพิ่มข้อมูลประเภทหวย
      };
    });
  } catch (err) {
    console.error('Error fetching lottery report data:', err);
    return [];
  }
};

// 🔧 ฟังก์ชันคำนวณรางวัลที่เหมือนกับ LotterySummaryPage
// ใช้การคำนวณเดียวกันกับหน้า summary เพื่อให้ "ยอดจ่าย" ตรงกัน
const calculateWinningsForItem = (
  item: any,
  ticketDrawDate: string,
  resultsMap: Record<string, LotteryResult>
): { prize: number; isWinning: boolean; winningNumberDisplay?: string, matchedNumber?: string } => {
  if (!item.lottery_sub_number || !item.numbers) {
    return { prize: 0, isWinning: false };
  }

  const { digit_number, type_number, price_paid } = item.lottery_sub_number;

  // 🔧 แก้ไข: ใช้ prize_code ที่ถูกต้องตามฐานข้อมูล (ภาษาไทย)
  let prizeCodePattern = '';
  if (type_number === 'โต๊ด') {
    prizeCodePattern = `${digit_number} ตัวโต๊ด`;
  } else if (type_number === 'บน') {
    prizeCodePattern = `${digit_number} ตัวบน`;
  } else if (type_number === 'ล่าง') {
    prizeCodePattern = `${digit_number} ตัวล่าง`;
  } else if (type_number === 'วิ่งบน') {
    prizeCodePattern = 'วิ่งบน';
  } else if (type_number === 'วิ่งล่าง') {
    prizeCodePattern = 'วิ่งล่าง';
  }

  const resultMapKey = `${ticketDrawDate}|${item.lottery_sub_type_id}|${prizeCodePattern}`;
  const matchingResult = resultsMap[resultMapKey];

  if (!matchingResult || !matchingResult.winning_number) {
    return { prize: 0, isWinning: false };
  }

  // 🔧 แก้ไข: ตรวจสอบรูปแบบของ numbers และเปรียบเทียบให้ถูกต้อง
  const numbers = Array.isArray(item.numbers) ? item.numbers : [item.numbers];
  const winningNumbers = Array.isArray(matchingResult.winning_number) 
    ? matchingResult.winning_number 
    : [matchingResult.winning_number];

  let matchedNumbers: string[] = [];
  let prize = 0;

  // เปรียบเทียบเลขที่ซื้อกับเลขที่ออก
  numbers.forEach((purchasedNumber: string) => {
    winningNumbers.forEach((winningNumber: string) => {
      // 🔧 แก้ไข: เปรียบเทียบเลขตามประเภทการเล่น
      let isMatch = false;
      
      if (type_number === 'โต๊ด') {
        // โต๊ด: เปรียบเทียบหมายเลขโดยตรง
        isMatch = purchasedNumber === winningNumber;
      } else if (type_number === 'บน' && digit_number === 2) {
        // 2 ตัวบน: เปรียบเทียบ 2 หลักสุดท้าย
        isMatch = purchasedNumber.endsWith(winningNumber);
      } else if (type_number === 'ล่าง' && digit_number === 2) {
        // 2 ตัวล่าง: เปรียบเทียบ 2 หลักแรก
        isMatch = purchasedNumber.startsWith(winningNumber);
      } else if (type_number === 'บน' && digit_number === 3) {
        // 3 ตัวบน: เปรียบเทียบหมายเลขโดยตรง
        isMatch = purchasedNumber === winningNumber;
      } else if (type_number === 'วิ่งบน' || type_number === 'วิ่งล่าง') {
        // วิ่ง: เปรียบเทียบตัวเลขแต่ละตัว
        const purchasedDigits = purchasedNumber.split('');
        const winningDigits = winningNumber.split('');
        isMatch = purchasedDigits.some(digit => winningDigits.includes(digit));
      }

      if (isMatch) {
        matchedNumbers.push(purchasedNumber);
        // คำนวณเงินรางวัล
        const effectiveRate = Number(price_paid) || 0;
        prize += Number(item.amount || 0) * effectiveRate;
      }
    });
  });

  return {
    prize,
    isWinning: matchedNumbers.length > 0,
    winningNumberDisplay: winningNumbers.join(', '),
    matchedNumber: matchedNumbers.join(', ')
  };
};

// Function to get the latest draw date
const getLatestDrawDate = async (supabase: any): Promise<string> => {
  try {
    const { data, error } = await supabase
      .from('lottery_tickets')
      .select('draw_date')
      .eq('status', 'confirmed')
      .is('deleted_at', null)
      .order('draw_date', { ascending: false })
      .limit(1);

    if (error) throw error;
    return data?.[0]?.draw_date || new Date().toISOString().split('T')[0];
  } catch (err) {
    console.error('Error fetching latest draw date:', err);
    return new Date().toISOString().split('T')[0];
  }
};

 
const LotteryReportSummaryPage: React.FC = () => {
  const { user } = useAuth();
  const [reportData, setReportData] = useState<LotteryTransactionData[]>([]);
  const [dateGroupedData, setDateGroupedData] = useState<DateGroupedReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedUserId, setSelectedUserId] = useState<string>('all'); // 🔧 เปลี่ยนจาก searchTerm เป็น selectedUserId
  const [availableUsers, setAvailableUsers] = useState<{id: string; name: string}[]>([]); // 🔧 เพิ่มรายชื่อผู้ใช้
  const [selectedLotteryType, setSelectedLotteryType] = useState<string>('all'); // 🔧 เพิ่ม filter ประเภทหวย
  const [availableLotteryTypes, setAvailableLotteryTypes] = useState<{id: number; name: string; country: string}[]>([]); // 🔧 เพิ่มรายการประเภทหวย
  const [sortBy, setSortBy] = useState<'date' | 'purchase' | 'profit' | 'commission'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [statusFilter, setStatusFilter] = useState<string>('confirmed');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set()); // 🔧 เพิ่ม state สำหรับ expanded users
  const isMobile = useIsMobile();

  // 🔧 ฟังก์ชันสำหรับ toggle การขยาย user details
  const toggleUserExpansion = (dateKey: string, userId: string) => {
    const key = `${dateKey}_${userId}`;
    const newExpanded = new Set(expandedUsers);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedUsers(newExpanded);
  };

  // Function to group data by period
  const groupDataByPeriod = (data: LotteryTransactionData[], period: 'daily' | 'weekly' | 'monthly', reportData?: LotteryTransactionData[]): DateGroupedReport[] => {
    // 🔧 ใช้ reportData สำหรับการสร้าง lottery_type_breakdown
    const allReportData = reportData || data;
    const groups: { [key: string]: DateGroupedReport } = {};

    data.forEach(transaction => {
      let groupKey: string;
      const date = new Date(transaction.draw_date);
      
      switch (period) {
        case 'daily':
          groupKey = transaction.draw_date;
          break;
        case 'weekly':
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          groupKey = weekStart.toISOString().split('T')[0];
          break;
        case 'monthly':
          groupKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          break;
        default:
          groupKey = transaction.draw_date;
      }

      if (!groups[groupKey]) {
        groups[groupKey] = {
          date: groupKey,
          total_users: 0,
          total_purchase: 0,
          total_reward: 0,
          total_commission: 0,
          total_remaining: 0,
          total_profit_loss: 0,
          total_net_amount: 0,

          total_bills: 0,
          total_transactions: 0,
          users: [],
          commission_rate_average: 0,
          profit_margin_percentage: 0
        };
      }

      const group = groups[groupKey];
      group.total_purchase += transaction.total_purchase_amount;
      group.total_reward += transaction.total_payout;
      group.total_commission += transaction.commission_amount;
      group.total_remaining += transaction.remaining_balance;
      group.total_profit_loss += transaction.profit_loss;
      group.total_net_amount += transaction.net_amount;
      group.total_bills += transaction.bill_count;
      group.total_transactions += 1;



      // Find or create user summary
      let userSummary = group.users.find((u: UserSummary) => u.user_id === transaction.user_id);
      if (!userSummary) {
        userSummary = {
          user_id: transaction.user_id,
          user_name: transaction.user_name,
          commission_percentage: transaction.commission_percentage,
          total_purchase: 0,
          total_reward: 0,
          total_commission: 0,
          total_remaining: 0,
          total_profit_loss: 0,
          total_net_amount: 0,

          bill_count: 0,
          transaction_count: 0,
          lottery_type_breakdown: [] // 🔧 เพิ่ม breakdown ประเภทหวย
        };
        group.users.push(userSummary);
      }

      userSummary.total_purchase += transaction.total_purchase_amount;
      userSummary.total_reward += transaction.total_payout;
      userSummary.total_commission += transaction.commission_amount;
      userSummary.total_remaining += transaction.remaining_balance;
      userSummary.total_profit_loss += transaction.profit_loss;
      userSummary.total_net_amount += transaction.net_amount;

      userSummary.bill_count += transaction.bill_count;
      userSummary.transaction_count += 1;
    });

    // 🔧 สร้าง lottery_type_breakdown สำหรับแต่ละ user
    Object.values(groups).forEach(group => {
      group.users.forEach(user => {
        // กรองข้อมูลของ user นี้ในช่วงเวลานี้
        const userTransactions = allReportData.filter(t => 
          t.user_id === user.user_id && 
          (() => {
            const date = new Date(t.draw_date);
            switch (period) {
              case 'daily':
                return t.draw_date === group.date;
              case 'weekly':
                const weekStart = new Date(date);
                weekStart.setDate(date.getDate() - date.getDay());
                return weekStart.toISOString().split('T')[0] === group.date;
              case 'monthly':
                return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}` === group.date;
              default:
                return true;
            }
          })()
        );

        // จัดกลุ่มตามประเภทหวย
        const lotteryTypeGroups: { [key: number]: LotteryTypeBreakdown } = {};
        
        userTransactions.forEach(transaction => {
          // ดึงข้อมูลประเภทหวยจาก lottery_ticket_items (ถ้ามี)
          const lotteryTypes = transaction.lottery_types || [];
          
          lotteryTypes.forEach((lotteryType: any) => {
            const typeId = lotteryType.lottery_sub_type_id;
            
            if (!lotteryTypeGroups[typeId]) {
              lotteryTypeGroups[typeId] = {
                lottery_sub_type_id: typeId,
                sub_type_name: lotteryType.sub_type_name,
                country_origin: lotteryType.country_origin,
                total_purchase: 0,
                total_reward: 0,
                total_commission: 0,
                total_profit_loss: 0,

                bill_count: 0,
                transaction_count: 0
              };
            }

            // คำนวณสัดส่วนของประเภทหวยนี้ในการซื้อ
            lotteryTypeGroups[typeId].total_purchase += transaction.total_purchase_amount / lotteryTypes.length;
            lotteryTypeGroups[typeId].total_reward += transaction.total_payout / lotteryTypes.length;
            lotteryTypeGroups[typeId].total_commission += transaction.commission_amount / lotteryTypes.length;
            lotteryTypeGroups[typeId].total_profit_loss += transaction.profit_loss / lotteryTypes.length;
            lotteryTypeGroups[typeId].bill_count += transaction.bill_count / lotteryTypes.length;
            lotteryTypeGroups[typeId].transaction_count += 1 / lotteryTypes.length;
          });
        });

        user.lottery_type_breakdown = Object.values(lotteryTypeGroups)
          .sort((a, b) => b.total_purchase - a.total_purchase);
      });
    });

    // Calculate percentages and set user count
    Object.values(groups).forEach(group => {
      group.total_users = group.users.length;
      group.commission_rate_average = group.total_purchase > 0 ? (group.total_commission / group.total_purchase) * 100 : 0;
      group.profit_margin_percentage = group.total_purchase > 0 ? (group.total_profit_loss / group.total_purchase) * 100 : 0;
      
      // Sort users by purchase amount desc
      group.users.sort((a, b) => b.total_purchase - a.total_purchase);
    });

    return Object.values(groups);
  };

  // Enhanced data fetching function


  // Function to get the latest draw date


  // Calculate overall summary
  const overallSummary = useMemo((): OverallSummary => {
    const totalDates = dateGroupedData.length;
    const totalUsers = new Set(dateGroupedData.flatMap(d => d.users.map(u => u.user_id))).size;
    const totalTransactions = dateGroupedData.reduce((sum, date) => sum + date.total_transactions, 0);
    const totalBills = dateGroupedData.reduce((sum, date) => sum + date.total_bills, 0);
    const totalPurchase = dateGroupedData.reduce((sum, date) => sum + date.total_purchase, 0);
    const totalReward = dateGroupedData.reduce((sum, date) => sum + date.total_reward, 0);
    const totalCommission = dateGroupedData.reduce((sum, date) => sum + date.total_commission, 0);
    const totalRemaining = dateGroupedData.reduce((sum, date) => sum + date.total_remaining, 0);
    const totalProfitLoss = dateGroupedData.reduce((sum, date) => sum + date.total_profit_loss, 0);
    const profitMarginPercentage = totalPurchase > 0 ? (totalProfitLoss / totalPurchase) * 100 : 0;
    const commissionRateAverage = totalPurchase > 0 ? (totalCommission / totalPurchase) * 100 : 0;

    const bestProfitDate = dateGroupedData.reduce((best, current) => 
      current.total_profit_loss > best.total_profit_loss ? current : best, 
      dateGroupedData[0] || { total_profit_loss: 0, date: '' }
    ).date;

    const worstProfitDate = dateGroupedData.reduce((worst, current) => 
      current.total_profit_loss < worst.total_profit_loss ? current : worst, 
      dateGroupedData[0] || { total_profit_loss: 0, date: '' }
    ).date;

    const highestSalesDate = dateGroupedData.reduce((highest, current) => 
      current.total_purchase > highest.total_purchase ? current : highest, 
      dateGroupedData[0] || { total_purchase: 0, date: '' }
    ).date;

    return {
      total_dates: totalDates,
      total_users: totalUsers,
      total_transactions: totalTransactions,
      total_bills: totalBills,
      total_purchase: totalPurchase,
      total_reward: totalReward,
      total_commission: totalCommission,
      total_remaining: totalRemaining,
      total_profit_loss: totalProfitLoss,
      profit_margin_percentage: profitMarginPercentage,
      commission_rate_average: commissionRateAverage,
      best_profit_date: bestProfitDate,
      worst_profit_date: worstProfitDate,
      highest_sales_date: highestSalesDate,
    };
  }, [dateGroupedData]);

  // 🔧 ฟังก์ชันดึงรายชื่อผู้ใช้
  const fetchAvailableUsers = async () => {
    try {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, name')
        .order('name', { ascending: true });

      if (error) throw error;
      
      setAvailableUsers(profiles || []);
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  };

  // 🔧 ฟังก์ชันดึงรายการประเภทหวย
  const fetchAvailableLotteryTypes = async () => {
    try {
      const { data: lotteryTypes, error } = await supabase
        .from('lottery_sub_types')
        .select('lottery_sub_type_id, sub_type_name, country_origin')
        .order('sub_type_name', { ascending: true });

      if (error) throw error;
      
      const formattedTypes = (lotteryTypes || []).map(type => ({
        id: type.lottery_sub_type_id,
        name: type.sub_type_name,
        country: type.country_origin
      }));
      
      setAvailableLotteryTypes(formattedTypes);
    } catch (err) {
      console.error('Error fetching lottery types:', err);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // ถ้าไม่มีการเลือกวันที่ ให้ดึงข้อมูลทั้งหมด
      let startDate: string | undefined = selectedDate || undefined;
      let endDate: string | undefined = selectedDate || undefined;

      // ดึงข้อมูลบิลก่อนเพื่อใช้กรองผลหวย
      const { data: ticketsData, error: ticketsError } = await supabase
        .from('lottery_tickets')
        .select('draw_date')
        .eq('status', 'confirmed')
        .is('deleted_at', null) // ✅ ไม่นำรายการที่ถูกลบมาคำนวณ
        .order('draw_date', { ascending: false });
      
      if (ticketsError) throw ticketsError;
      
      // ดึงวันที่ที่มีข้อมูล
      const uniqueDates = [...new Set(ticketsData?.map(t => t.draw_date) || [])].sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
      
      // กรองผลหวยตามวันที่ที่มีบิล
      const { data: resultsData, error: resultsError } = await supabase
        .from('lottery_results')
        .select('*')
        .in('draw_date', uniqueDates)
        .order('draw_date', { ascending: false });
        
      if (resultsError) throw resultsError;
      
      // สร้าง resultsMap เหมือนหน้า summary
      // ใช้วิธีการเดียวกับหน้า summary เพื่อให้ "ยอดจ่าย" ตรงกัน
      const resultsMap: Record<string, LotteryResult> = (resultsData || []).reduce((acc, res) => {
        const key = `${res.draw_date}|${res.lottery_sub_type_id}|${res.prize_code}`;
        acc[key] = res;
        return acc;
      }, {});
      
      // ดึงข้อมูล lottery tickets
      const reportData = await fetchLotteryReportData(supabase, resultsMap, startDate, endDate);
      
      setReportData(reportData);

            // Group data by period
      const groupedData = groupDataByPeriod(reportData, period, reportData);

            // Sort grouped data
      const sortedGroupedData = groupedData.sort((a, b) => {
        switch (sortBy) {
          case 'date':
            return sortOrder === 'desc' 
              ? new Date(b.date).getTime() - new Date(a.date).getTime()
              : new Date(a.date).getTime() - new Date(b.date).getTime();
          case 'purchase':
            return sortOrder === 'desc' 
              ? b.total_purchase - a.total_purchase
              : a.total_purchase - b.total_purchase;
          case 'profit':
            return sortOrder === 'desc' 
              ? b.total_profit_loss - a.total_profit_loss
              : a.total_profit_loss - b.total_profit_loss;
          case 'commission':
            return sortOrder === 'desc' 
              ? b.total_commission - a.total_commission
              : a.total_commission - b.total_commission;
          default:
            return 0;
        }
      });

      setDateGroupedData(sortedGroupedData);
      
            } catch (err) {
      console.error('Error loading data:', err);
      setError('เกิดข้อผิดพลาดในการโหลดข้อมูล');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchAvailableUsers(); // 🔧 ดึงรายชื่อผู้ใช้
      fetchAvailableLotteryTypes(); // 🔧 ดึงรายการประเภทหวย
      loadData();
    }
  }, [user, selectedDate, sortBy, sortOrder, period, selectedUserId, selectedLotteryType]); // 🔧 เพิ่ม selectedLotteryType

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    });
  };

  const formatShortDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('th-TH', {
      month: 'short',
      day: 'numeric'
    });
  };

  const formatPeriodDate = (dateString: string, period: 'daily' | 'weekly' | 'monthly') => {
    const date = new Date(dateString);
    
    switch (period) {
      case 'daily':
        return formatDate(dateString);
      case 'weekly':
        const weekEnd = new Date(date);
        weekEnd.setDate(date.getDate() + 6);
        return `${formatShortDate(dateString)} - ${formatShortDate(weekEnd.toISOString().split('T')[0])}`;
      case 'monthly':
        return date.toLocaleDateString('th-TH', {
          year: 'numeric',
          month: 'long'
        });
      default:
        return formatDate(dateString);
    }
  };

  const filteredDateData = useMemo(() => {
    let filtered = dateGroupedData;
    
    // 🔧 กรองตาม selectedUserId
    if (selectedUserId && selectedUserId !== 'all') {
      filtered = filtered.filter(dateGroup =>
        dateGroup.users.some(user => user.user_id === selectedUserId)
      ).map(dateGroup => ({
        ...dateGroup,
        // กรองให้แสดงเฉพาะผู้ใช้ที่เลือก
        users: dateGroup.users.filter(user => user.user_id === selectedUserId),
        // คำนวณยอดใหม่สำหรับผู้ใช้ที่เลือก
        total_users: dateGroup.users.filter(user => user.user_id === selectedUserId).length,
        total_purchase: dateGroup.users.filter(user => user.user_id === selectedUserId).reduce((sum, user) => sum + user.total_purchase, 0),
        total_reward: dateGroup.users.filter(user => user.user_id === selectedUserId).reduce((sum, user) => sum + user.total_reward, 0),
        total_commission: dateGroup.users.filter(user => user.user_id === selectedUserId).reduce((sum, user) => sum + user.total_commission, 0),
        total_profit_loss: dateGroup.users.filter(user => user.user_id === selectedUserId).reduce((sum, user) => sum + user.total_profit_loss, 0),

        total_bills: dateGroup.users.filter(user => user.user_id === selectedUserId).reduce((sum, user) => sum + user.bill_count, 0),
        total_transactions: dateGroup.users.filter(user => user.user_id === selectedUserId).reduce((sum, user) => sum + user.transaction_count, 0),
      }));
    }

    // 🔧 กรองตาม selectedLotteryType
    if (selectedLotteryType && selectedLotteryType !== 'all') {
      const lotteryTypeId = parseInt(selectedLotteryType);
      
      filtered = filtered.filter(dateGroup => {
        // ตรวจสอบว่ามีผู้ใช้ที่มีประเภทหวยนี้หรือไม่
        return dateGroup.users.some(user => 
          user.lottery_type_breakdown && 
          user.lottery_type_breakdown.some(breakdown => breakdown.lottery_sub_type_id === lotteryTypeId)
        );
      }).map(dateGroup => ({
        ...dateGroup,
        // กรองและปรับปรุงข้อมูลผู้ใช้ให้แสดงเฉพาะประเภทหวยที่เลือก
        users: dateGroup.users.map(user => {
          const filteredBreakdown = user.lottery_type_breakdown?.filter(
            breakdown => breakdown.lottery_sub_type_id === lotteryTypeId
          ) || [];
          
          if (filteredBreakdown.length === 0) return null;
          
          const filteredUser = {
            ...user,
            lottery_type_breakdown: filteredBreakdown,
            // คำนวณยอดใหม่จากประเภทหวยที่เลือก
            total_purchase: filteredBreakdown.reduce((sum, breakdown) => sum + breakdown.total_purchase, 0),
            total_reward: filteredBreakdown.reduce((sum, breakdown) => sum + breakdown.total_reward, 0),
            total_commission: filteredBreakdown.reduce((sum, breakdown) => sum + breakdown.total_commission, 0),
            total_profit_loss: filteredBreakdown.reduce((sum, breakdown) => sum + breakdown.total_profit_loss, 0),

            bill_count: filteredBreakdown.reduce((sum, breakdown) => sum + breakdown.bill_count, 0),
            transaction_count: filteredBreakdown.reduce((sum, breakdown) => sum + breakdown.transaction_count, 0),
          };
          
          return filteredUser;
        }).filter(Boolean) as UserSummary[],
      })).map(dateGroup => ({
        ...dateGroup,
        // คำนวณยอดรวมใหม่จากผู้ใช้ที่กรองแล้ว
        total_users: dateGroup.users.length,
        total_purchase: dateGroup.users.reduce((sum, user) => sum + user.total_purchase, 0),
        total_reward: dateGroup.users.reduce((sum, user) => sum + user.total_reward, 0),
        total_commission: dateGroup.users.reduce((sum, user) => sum + user.total_commission, 0),
        total_profit_loss: dateGroup.users.reduce((sum, user) => sum + user.total_profit_loss, 0),

        total_bills: dateGroup.users.reduce((sum, user) => sum + user.bill_count, 0),
        total_transactions: dateGroup.users.reduce((sum, user) => sum + user.transaction_count, 0),
      })).filter(dateGroup => dateGroup.users.length > 0);
    }

    return filtered;
  }, [dateGroupedData, selectedUserId, selectedLotteryType]);

  const clearFilters = async () => {
    setSelectedDate('');
    setSelectedUserId('all'); // 🔧 เปลี่ยนจาก searchTerm เป็ selectedUserId
    setSelectedLotteryType('all'); // 🔧 เพิ่มรีเซ็ตประเภทหวย
    setStatusFilter('confirmed');
    setPeriod('daily');
    setExpandedUsers(new Set()); // 🔧 ล้าง expanded users
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">กรุณาเข้าสู่ระบบเพื่อดูรายงาน</p>
        </motion.div>
      </div>
    );
  }

  return (
    <DirectionProvider dir="ltr">
      <SidebarProvider>
        <div className="flex min-h-screen">
          <SidebarInset className="flex-1">
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center space-x-2">
                <SidebarTrigger className="-ml-1" />
                <Breadcrumb>
                  <BreadcrumbList>
                    <BreadcrumbItem>
                      <BreadcrumbLink href="/homepage">หน้าแรก</BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                      <BreadcrumbLink href="/lottery-report">รายงานหวยแบบรายละเอียด</BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                      <BreadcrumbPage>สรุปรายงานหวยตามวันที่</BreadcrumbPage>
                    </BreadcrumbItem>
                  </BreadcrumbList>
                </Breadcrumb>
              </div>
            </div>

            <div className="p-2 md:p-6 space-y-4">
              {/* Header */}
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="space-y-6"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight">สรุปรายงานการขายหวย</h1>
                    <p className="text-muted-foreground">
                      สรุปรายงานการขายหวยตามวันที่ พร้อมการวิเคราะห์กำไร-ขาดทุนรายวัน
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={loadData}
                      disabled={loading}
                    >
                      <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                      รีเฟรช
                    </Button>
                    
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      ส่งออก
                    </Button>
                  </div>
                </div>

                {/* Enhanced Filters */}
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg flex items-center">
                        <Filter className="h-5 w-5 mr-2" />
                        ตัวกรองและการค้นหา
                      </CardTitle>
                      <Button size="sm" variant="ghost" onClick={clearFilters}>
                        <X className="h-4 w-4 mr-1" />
                        ล้างตัวกรอง
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">เลือกผู้ใช้</label>
                        <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                          <SelectTrigger>
                            <SelectValue placeholder="เลือกผู้ใช้" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">ทั้งหมด</SelectItem>
                            {availableUsers.map((user) => (
                              <SelectItem key={user.id} value={user.id}>
                                {user.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {selectedUserId && selectedUserId !== 'all' && (
                          <p className="text-xs text-muted-foreground">
                            เลือก: {availableUsers.find(u => u.id === selectedUserId)?.name}
                          </p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">ประเภทหวย</label>
                        <Select value={selectedLotteryType} onValueChange={setSelectedLotteryType}>
                          <SelectTrigger>
                            <SelectValue placeholder="เลือกประเภทหวย" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">ทั้งหมด</SelectItem>
                            {availableLotteryTypes.map((type) => (
                              <SelectItem key={type.id} value={type.id.toString()}>
                                <div className="flex items-center justify-between w-full">
                                  <span>{type.name}</span>
                                  <span className="text-xs text-muted-foreground ml-2">
                                    {type.country}
                                  </span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {selectedLotteryType && selectedLotteryType !== 'all' && (
                          <p className="text-xs text-muted-foreground">
                            เลือก: {availableLotteryTypes.find(t => t.id.toString() === selectedLotteryType)?.name}
                          </p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">ช่วงเวลา</label>
                        <Select value={period} onValueChange={(value: any) => setPeriod(value)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="daily">รายวัน</SelectItem>
                            <SelectItem value="weekly">รายสัปดาห์</SelectItem>
                            <SelectItem value="monthly">รายเดือน</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">วันที่เริ่มต้น</label>
                        <div className="flex space-x-2">
                          <Input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedDate('')}
                            title="ดูข้อมูลทั้งหมด"
                          >
                            ทั้งหมด
                          </Button>
                        </div>
                        {selectedDate && (
                          <p className="text-xs text-muted-foreground">
                            กำลังดูข้อมูลวันที่: {formatDate(selectedDate)}
                          </p>
                        )}
                        {selectedUserId && selectedUserId !== 'all' && (
                          <p className="text-xs text-muted-foreground">
                            ผู้ใช้: {availableUsers.find(u => u.id === selectedUserId)?.name}
                          </p>
                        )}
                        {selectedLotteryType && selectedLotteryType !== 'all' && (
                          <p className="text-xs text-muted-foreground">
                            ประเภทหวย: {availableLotteryTypes.find(t => t.id.toString() === selectedLotteryType)?.name}
                          </p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">เรียงตาม</label>
                        <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="date">วันที่</SelectItem>
                            <SelectItem value="purchase">ยอดขาย</SelectItem>
                            <SelectItem value="profit">กำไร/ขาดทุน</SelectItem>
                            <SelectItem value="commission">ค่าคอม</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">ลำดับ</label>
                        <Button
                          variant="outline"
                          onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                          className="w-full"
                        >
                          {sortOrder === 'asc' ? (
                            <>
                              <TrendingUp className="h-4 w-4 mr-2" />
                              น้อยไปมาก
                            </>
                          ) : (
                            <>
                              <TrendingDown className="h-4 w-4 mr-2" />
                              มากไปน้อย
                            </>
                          )}
                        </Button>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">รูปแบบการแสดงผล</label>
                        <Select value={viewMode} onValueChange={(value: any) => setViewMode(value)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="cards">การ์ด</SelectItem>
                            <SelectItem value="table">ตาราง</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Period Tabs */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center">
                      <BarChart3 className="h-5 w-5 mr-2" />
                      สรุปรายงานตามช่วงเวลา
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Tabs value={period} onValueChange={(value: any) => setPeriod(value)} className="w-full">
                      <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="daily" className="flex items-center space-x-2">
                          <Calendar className="h-4 w-4" />
                          <span>รายวัน</span>
                        </TabsTrigger>
                        <TabsTrigger value="weekly" className="flex items-center space-x-2">
                          <CalendarDays className="h-4 w-4" />
                          <span>รายสัปดาห์</span>
                        </TabsTrigger>
                        <TabsTrigger value="monthly" className="flex items-center space-x-2">
                          <Activity className="h-4 w-4" />
                          <span>รายเดือน</span>
                        </TabsTrigger>
                      </TabsList>
                      
                      <TabsContent value="daily" className="mt-4">
                        <div className="text-center p-4">
                          <Calendar className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                          <h3 className="text-lg font-semibold">สรุปรายงานรายวัน</h3>
                          <p className="text-sm text-muted-foreground">
                            แสดงข้อมูลสรุปการขายหวยแยกตามวัน
                          </p>
                        </div>
                      </TabsContent>
                      
                      <TabsContent value="weekly" className="mt-4">
                        <div className="text-center p-4">
                          <CalendarDays className="h-8 w-8 mx-auto mb-2 text-green-600" />
                          <h3 className="text-lg font-semibold">สรุปรายงานรายสัปดาห์</h3>
                          <p className="text-sm text-muted-foreground">
                            แสดงข้อมูลสรุปการขายหวยแยกตามสัปดาห์
                          </p>
                        </div>
                      </TabsContent>
                      
                      <TabsContent value="monthly" className="mt-4">
                        <div className="text-center p-4">
                          <Activity className="h-8 w-8 mx-auto mb-2 text-purple-600" />
                          <h3 className="text-lg font-semibold">สรุปรายงานรายเดือน</h3>
                          <p className="text-sm text-muted-foreground">
                            แสดงยอดรวมการขายหวยแยกตามเดือน (ไม่แสดงรายละเอียดผู้ใช้)
                          </p>
                        </div>
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>

                {/* Date-Grouped Data Display */}
                {loading ? (
                  <Card>
                    <CardContent className="flex items-center justify-center py-12">
                      <div className="text-center">
                        <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
                        <p className="text-muted-foreground">กำลังโหลดข้อมูล...</p>
                      </div>
                    </CardContent>
                  </Card>
                ) : error ? (
                  <Card>
                    <CardContent className="flex items-center justify-center py-12">
                      <div className="text-center">
                        <AlertCircle className="h-8 w-8 mx-auto mb-4 text-destructive" />
                        <p className="text-destructive">{error}</p>
                        <Button onClick={loadData} className="mt-4">
                          ลองใหม่
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ) : filteredDateData.length === 0 ? (
                  <Card>
                    <CardContent className="flex items-center justify-center py-12">
                      <div className="text-center">
                        <CalendarDays className="h-8 w-8 mx-auto mb-4 text-muted-foreground" />
                        <p className="text-muted-foreground">ไม่พบข้อมูลในช่วงวันที่ที่เลือก</p>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <AnimatePresence mode="wait">
                    {viewMode === 'cards' ? (
                      <motion.div
                        key="cards"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="space-y-4"
                      >
                        {filteredDateData.map((dateReport, index) => (
                          <motion.div
                            key={dateReport.date}
                            variants={itemVariants}
                            initial="hidden"
                            animate="visible"
                            transition={{ delay: index * 0.1 }}
                          >
                            <Card className="overflow-hidden">
                              <CardHeader className={`border-b ${period === 'monthly' ? 'bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 py-4' : 'bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20'}`}>
                                <div className={`flex items-center ${period === 'monthly' ? 'justify-center' : 'justify-between'}`}>
                                  <div className="flex items-center space-x-4">
                                    <div className="flex items-center justify-center w-12 h-12 bg-primary/10 rounded-full">
                                      {period === 'daily' && <Calendar className="h-6 w-6 text-primary" />}
                                      {period === 'weekly' && <CalendarDays className="h-6 w-6 text-primary" />}
                                      {period === 'monthly' && <BarChart3 className="h-6 w-6 text-primary" />}
                                    </div>
                                    <div>
                                      <CardTitle className="text-xl">{formatPeriodDate(dateReport.date, period)}</CardTitle>
                                      <CardDescription>
                                        {period === 'monthly' ? (
                                          `${dateReport.total_users} ผู้ใช้ • ${dateReport.total_transactions} รายการ`
                                        ) : (
                                          `${dateReport.total_users} ผู้ใช้ • ${Math.round(dateReport.total_transactions)} รายการ • ${Math.round(dateReport.total_bills)} บิล`
                                        )}
                                      </CardDescription>
                                    </div>
                                  </div>
                                  {period !== 'monthly' && (
                                    <div className="flex items-center space-x-6">
                                      <div className="text-right">
                                        <div className="font-semibold text-lg">{formatCurrency(dateReport.total_purchase)}</div>
                                        <div className="text-sm text-muted-foreground">ยอดขาย</div>
                                      </div>
                                      <div className="text-right">
                                        <div className="font-semibold text-lg text-green-600">{formatCurrency(dateReport.total_reward)}</div>
                                        <div className="text-sm text-muted-foreground">รางวัล</div>
                                      </div>
                                      <div className="text-right">
                                        <div className="font-semibold text-lg text-blue-600">{formatCurrency(dateReport.total_commission)}</div>
                                        <div className="text-sm text-muted-foreground">ค่าคอม</div>
                                      </div>
                                      <div className="text-right rounded-md border border-green-200 bg-green-100 dark:border-green-800 dark:bg-green-900/20 p-4">
                                        <div className={`font-semibold text-lg ${dateReport.total_net_amount >= 0 ? 'text-emerald-600' : 'text-orange-600'}`}>
                                          {formatCurrency(dateReport.total_net_amount)}
                                        </div>
                                        <div className="text-sm text-muted-foreground">กำไร/ขาดทุน (สุทธิ)</div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </CardHeader>
                              
                              <CardContent className={`p-0 ${period === 'monthly' ? 'py-2' : ''}`}>
                                <div className="overflow-x-auto">
                                  <Table>
                                    <TableHeader>
                                      <TableRow className="bg-muted/50">
                                        <TableHead className="w-48">ผู้ใช้</TableHead>
                                        <TableHead className="text-right w-20">คอมมิชชั่น</TableHead>
                                        <TableHead className="text-right w-32">ยอดขาย</TableHead>
                                        <TableHead className="text-right w-32">ค่าคอม</TableHead>
                                        <TableHead className="text-right w-32">ยอดจ่าย</TableHead>
                                        <TableHead className="text-right w-32">กำไร/ขาดทุน</TableHead>

                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {period === 'monthly' ? (
                                        // สำหรับรายเดือน แสดงเฉพาะยอดรวม
                                        <TableRow className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 font-bold">
                                          <TableCell className="font-medium">
                                            <div className="flex items-center space-x-2">
                                              <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
                                                <BarChart3 className="h-4 w-4 text-purple-600" />
                                              </div>
                                              <div>
                                                <div className="font-medium">ยอดรวมทั้งหมด</div>
                                                <div className="text-xs text-muted-foreground">
                                                  {dateReport.total_users} ผู้ใช้ • {dateReport.total_transactions} รายการ
                                                </div>
                                              </div>
                                            </div>
                                          </TableCell>
                                          <TableCell className="text-right">
                                            <Badge variant="outline" className="text-xs">
                                              {dateReport.commission_rate_average.toFixed(1)}%
                                            </Badge>
                                          </TableCell>
                                          <TableCell className="text-right font-medium">
                                            {formatCurrency(dateReport.total_purchase)}
                                          </TableCell>
                                          <TableCell className="text-right">
                                            <span className="text-blue-600 font-medium">
                                              {formatCurrency(dateReport.total_commission)}
                                            </span>
                                          </TableCell>
                                          <TableCell className="text-right">
                                            <span className="text-red-600 font-medium">
                                              {formatCurrency(dateReport.total_reward)}
                                            </span>
                                          </TableCell>
                                          <TableCell className="text-right">
                                            <span className={`font-medium ${dateReport.total_net_amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                              {dateReport.total_net_amount >= 0 ? (
                                                <PlusCircle className="h-4 w-4 inline mr-1" />
                                              ) : (
                                                <MinusCircle className="h-4 w-4 inline mr-1" />
                                              )}
                                              {formatCurrency(dateReport.total_net_amount)}
                                            </span>
                                          </TableCell>
                                        </TableRow>
                                      ) : (
                                        // สำหรับรายวันและรายสัปดาห์ แสดงรายละเอียด user
                                        <>
                                          {dateReport.users.map((user, userIndex) => {
                                            const userKey = `${dateReport.date}_${user.user_id}`;
                                            const isExpanded = expandedUsers.has(userKey);
                                            
                                            return (
                                              <React.Fragment key={user.user_id}>
                                                <TableRow className="hover:bg-muted/30">
                                                  <TableCell className="font-medium">
                                                    <div className="flex items-center space-x-2">
                                                      {/* 🔧 ปุ่มขยาย/ย่อ (แสดงเฉพาะเมื่อมีรายละเอียดประเภทหวยให้แสดง) */}
                                                      {selectedLotteryType === 'all' && user.lottery_type_breakdown && user.lottery_type_breakdown.length > 0 ? (
                                                        <Button
                                                          variant="ghost"
                                                          size="sm"
                                                          className="p-1 h-6 w-6"
                                                          onClick={() => toggleUserExpansion(dateReport.date, user.user_id)}
                                                        >
                                                          {isExpanded ? (
                                                            <ChevronUp className="h-3 w-3" />
                                                          ) : (
                                                            <ChevronDown className="h-3 w-3" />
                                                          )}
                                                        </Button>
                                                      ) : (
                                                        <div className="w-6 h-6" /> // placeholder เพื่อรักษาการจัดตำแหน่ง
                                                      )}
                                                      <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                                                        <User className="h-4 w-4 text-primary" />
                                                      </div>
                                                      <div>
                                                        <div className="font-medium flex items-center">
                                                          {user.user_name}
                                                          {user.lottery_type_breakdown && user.lottery_type_breakdown.length > 0 && selectedLotteryType === 'all' && (
                                                            <Badge variant="outline" className="ml-2 text-xs">
                                                              {user.lottery_type_breakdown.length} ประเภท
                                                            </Badge>
                                                          )}
                                                          {selectedLotteryType !== 'all' && (
                                                            <Badge variant="secondary" className="ml-2 text-xs">
                                                              {availableLotteryTypes.find(t => t.id.toString() === selectedLotteryType)?.name}
                                                            </Badge>
                                                          )}
                                                        </div>
                                                        <div className="text-xs text-muted-foreground">
                                                          {Math.round(user.bill_count)} บิล • {Math.round(user.transaction_count)} รายการ
                                                        </div>
                                                      </div>
                                                    </div>
                                                  </TableCell>
                                              <TableCell className="text-right">
                                                <Badge variant="outline" className="text-xs">
                                                  {user.commission_percentage}%
                                                </Badge>
                                              </TableCell>
                                              <TableCell className="text-right font-medium">
                                                {formatCurrency(user.total_purchase)}
                                              </TableCell>
                                              <TableCell className="text-right">
                                                <span className="text-blue-600 font-medium">
                                                  {formatCurrency(user.total_commission)}
                                                </span>
                                              </TableCell>
                                                                                        <TableCell className="text-right">
                                            <span className="text-red-600 font-medium">
                                              {formatCurrency(user.total_reward)}
                                            </span>
                                          </TableCell>
                                          <TableCell className="text-right">
                                            <span className={`font-medium ${user.total_net_amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                              {user.total_net_amount >= 0 ? (
                                                <PlusCircle className="h-4 w-4 inline mr-1" />
                                              ) : (
                                                <MinusCircle className="h-4 w-4 inline mr-1" />
                                              )}
                                              {formatCurrency(user.total_net_amount)}
                                            </span>
                                          </TableCell>
                                                </TableRow>

                                                {/* 🔧 แสดงรายละเอียดประเภทหวยเมื่อขยาย (เฉพาะเมื่อไม่ได้เลือกประเภทหวยเฉพาะ) */}
                                                {isExpanded && user.lottery_type_breakdown && user.lottery_type_breakdown.length > 0 && selectedLotteryType === 'all' && (
                                                  <TableRow>
                                                    <TableCell colSpan={8} className="p-0 bg-slate-50 dark:bg-slate-900/50">
                                                      <div className="p-4">
                                                        <h4 className="text-sm font-medium mb-3 text-slate-700 dark:text-slate-300">
                                                          รายละเอียดตามประเภทหวย
                                                        </h4>
                                                        <div className="overflow-x-auto">
                                                          <Table>
                                                            <TableHeader>
                                                              <TableRow className="bg-white dark:bg-slate-800">
                                                                <TableHead className="text-xs">ประเภทหวย</TableHead>
                                                                <TableHead className="text-xs text-right">ยอดซื้อ</TableHead>
                                                                <TableHead className="text-xs text-right">ค่าคอม</TableHead>
                                                                <TableHead className="text-xs text-right">ยอดจ่าย</TableHead>
                                                                <TableHead className="text-xs text-right">กำไร/ขาดทุน</TableHead>

                                                              </TableRow>
                                                            </TableHeader>
                                                            <TableBody>
                                                              {user.lottery_type_breakdown.map((lotteryType) => (
                                                                <TableRow key={lotteryType.lottery_sub_type_id} className="text-xs">
                                                                  <TableCell>
                                                                    <div>
                                                                      <div className="font-medium">{lotteryType.sub_type_name}</div>
                                                                      <div className="text-xs text-muted-foreground">{lotteryType.country_origin}</div>
                                                                    </div>
                                                                  </TableCell>
                                                                  <TableCell className="text-right">
                                                                    {formatCurrency(lotteryType.total_purchase)}
                                                                  </TableCell>
                                                                  <TableCell className="text-right text-blue-600">
                                                                    {formatCurrency(lotteryType.total_commission)}
                                                                  </TableCell>
                                                                  <TableCell className="text-right text-red-600">
                                                                    {formatCurrency(lotteryType.total_reward)}
                                                                  </TableCell>
                                                                  <TableCell className="text-right">
                                                                    <span className={(lotteryType.total_profit_loss - lotteryType.total_commission) >= 0 ? 'text-green-600' : 'text-red-600'}>
                                                                      {formatCurrency(lotteryType.total_profit_loss - lotteryType.total_commission)}
                                                                    </span>
                                                                  </TableCell>

                                                                </TableRow>
                                                              ))}
                                                            </TableBody>
                                                          </Table>
                                                        </div>
                                                      </div>
                                                    </TableCell>
                                                  </TableRow>
                                                )}
                                              </React.Fragment>
                                            );
                                          })}
                                          {/* Summary Row for Users */}
                                          {dateReport.users.length > 0 && (
                                            <TableRow className="bg-gray-100 dark:bg-gray-800 font-bold">
                                              <TableCell colSpan={1}>ยอดสุทธิรวม</TableCell>
                                              <TableCell></TableCell>
                                              <TableCell className="text-right">
                                                {formatCurrency(dateReport.users.reduce((sum, user) => sum + user.total_purchase, 0))}
                                              </TableCell>
                                              <TableCell className="text-right text-blue-600">
                                                {formatCurrency(dateReport.users.reduce((sum, user) => sum + user.total_commission, 0))}
                                              </TableCell>
                                                                                        <TableCell className="text-right text-red-600">
                                            {formatCurrency(dateReport.users.reduce((sum, user) => sum + user.total_reward, 0))}
                                          </TableCell>
                                          <TableCell className="text-right">
                                            <span className={dateReport.users.reduce((sum, user) => sum + user.total_net_amount, 0) >= 0 ? 'text-green-600' : 'text-red-600'}>
                                              {formatCurrency(dateReport.users.reduce((sum, user) => sum + user.total_net_amount, 0))}
                                            </span>
                                          </TableCell>
                                            </TableRow>
                                          )}
                                        </>
                                      )}
                                    </TableBody>
                                  </Table>
                                </div>
                              </CardContent>
                            </Card>
                          </motion.div>
                        ))}
                      </motion.div>
                    ) : (
                      <motion.div
                        key="table"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                      >
                        <Card>
                          <CardHeader>
                            <CardTitle className="flex items-center">
                              <FileText className="h-5 w-5 mr-2" />
                              ตารางสรุปรายงานตาม{period === 'daily' ? 'วันที่' : period === 'weekly' ? 'สัปดาห์' : 'เดือน'}
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="p-0">
                            <div className="overflow-x-auto">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead className="w-48">{period === 'daily' ? 'วันที่' : period === 'weekly' ? 'สัปดาห์' : 'เดือน'}</TableHead>
                                    <TableHead className="text-right w-20">ผู้ใช้</TableHead>
                                    <TableHead className="text-right w-32">ยอดขาย</TableHead>
                                    <TableHead className="text-right w-32">ค่าคอม</TableHead>
                                    <TableHead className="text-right w-32">ยอดจ่าย</TableHead>
                                    <TableHead className="text-right w-32">กำไร/ขาดทุน</TableHead>

                                    <TableHead className="text-right w-20">อัตราส่วนกำไร</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {filteredDateData.map((dateReport, index) => (
                                    <TableRow key={dateReport.date} className={`hover:bg-muted/30 ${period === 'monthly' ? 'bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 font-bold' : ''}`}>
                                      <TableCell className="font-medium">
                                        <div className="flex items-center space-x-2">
                                          {period === 'daily' && <Calendar className="h-4 w-4 text-muted-foreground" />}
                                          {period === 'weekly' && <CalendarDays className="h-4 w-4 text-muted-foreground" />}
                                          {period === 'monthly' && <Activity className="h-4 w-4 text-muted-foreground" />}
                                          <div>
                                            <div className="font-medium">{formatPeriodDate(dateReport.date, period)}</div>
                                            <div className="text-xs text-muted-foreground">
                                              {period === 'monthly' ? (
                                                `${dateReport.total_users} ผู้ใช้ • ${dateReport.total_transactions} รายการ`
                                              ) : (
                                                `${dateReport.total_transactions} รายการ • ${dateReport.total_bills} บิล`
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      </TableCell>
                                      <TableCell className="text-right">
                                        <Badge variant="outline">
                                          {dateReport.total_users}
                                        </Badge>
                                      </TableCell>
                                      <TableCell className="text-right font-medium">
                                        {formatCurrency(dateReport.total_purchase)}
                                      </TableCell>
                                      <TableCell className="text-right">
                                        <span className="text-blue-600 font-medium">
                                          {formatCurrency(dateReport.total_commission)}
                                        </span>
                                      </TableCell>
                                      <TableCell className="text-right">
                                        <span className="text-green-600 font-medium">
                                          {formatCurrency(dateReport.total_reward)}
                                        </span>
                                      </TableCell>
                                      <TableCell className="text-right">
                                        <span className={`font-medium ${dateReport.total_profit_loss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                          {dateReport.total_profit_loss >= 0 ? (
                                            <CheckCircle className="h-4 w-4 inline mr-1" />
                                          ) : (
                                            <XCircle className="h-4 w-4 inline mr-1" />
                                          )}
                                          {formatCurrency(dateReport.total_profit_loss)}
                                        </span>
                                      </TableCell>

                                      <TableCell></TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                                {/* Summary Row */}
                                {filteredDateData.length > 0 && (
                                  <TableBody>
                                    <TableRow className="bg-gray-100 dark:bg-gray-800 font-bold">
                                      <TableCell colSpan={1}>ยอดสุทธิรวม</TableCell>
                                      <TableCell className="text-right">
                                        {filteredDateData.reduce((sum, item) => sum + item.total_users, 0)}
                                      </TableCell>
                                      <TableCell className="text-right">
                                        {formatCurrency(filteredDateData.reduce((sum, item) => sum + item.total_purchase, 0))}
                                      </TableCell>
                                      <TableCell className="text-right text-blue-600">
                                        {formatCurrency(filteredDateData.reduce((sum, item) => sum + item.total_commission, 0))}
                                      </TableCell>
                                      <TableCell className="text-right text-green-600">
                                        {formatCurrency(filteredDateData.reduce((sum, item) => sum + item.total_reward, 0))}
                                      </TableCell>
                                      <TableCell className="text-right">
                                        <span className={filteredDateData.reduce((sum, item) => sum + item.total_profit_loss, 0) >= 0 ? 'text-green-600' : 'text-red-600'}>
                                          {formatCurrency(filteredDateData.reduce((sum, item) => sum + item.total_profit_loss, 0))}
                                        </span>
                                      </TableCell>

                                      <TableCell></TableCell>
                                    </TableRow>
                                  </TableBody>
                                )}
                              </Table>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    )}
                  </AnimatePresence>
                )}

                {/* Overall Summary Footer */}
                <Card className="mt-8">
                  <CardHeader>
                    <CardTitle className="text-xl flex items-center">
                      <Calculator className="h-5 w-5 mr-2" />
                      สรุปยอดรวม
                    </CardTitle>
                  </CardHeader>
                                      <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* กำไร/ขาดทุนรวม */}
                        <Card className="bg-gradient-to-br from-emerald-50 to-teal-100 dark:from-emerald-900/20 dark:to-teal-900/20 border-emerald-200 dark:border-emerald-800">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                                  <TrendingDown className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">กำไร/ขาดทุนรวม</p>
                                  <p className="text-xs text-emerald-600/70 dark:text-emerald-400/70">Total Profit/Loss</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300">
                                  {formatCurrency(filteredDateData.reduce((sum, item) => sum + item.total_profit_loss, 0))}
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        {/* ยอดคงเหลือสุดท้าย */}
                        <Card className="bg-gradient-to-br from-purple-50 to-violet-100 dark:from-purple-900/20 dark:to-violet-900/20 border-purple-200 dark:border-purple-800">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                                  <Wallet className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-purple-700 dark:text-purple-300">ยอดคงเหลือสุดท้าย</p>
                                  <p className="text-xs text-purple-600/70 dark:text-purple-400/70">Final Balance</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-lg font-bold text-purple-700 dark:text-purple-300">
                                  {formatCurrency(filteredDateData.reduce((sum, item) => sum + (item.total_profit_loss - item.total_commission), 0))}
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>

                      {/* Summary Bar */}
                      <div className="mt-6 p-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-900/50 rounded-lg border dark:border-gray-700">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">สรุปการคำนวณ</h3>
                          <Badge variant="outline" className="text-xs">
                            กำไร/ขาดทุน - ค่าคอมมิชชั่น = ยอดสุทธิ
                          </Badge>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          <div className="flex justify-between items-center p-2 bg-white dark:bg-gray-800 rounded border dark:border-gray-700">
                            <span className="text-gray-600 dark:text-gray-400">กำไร/ขาดทุนรวม:</span>
                            <span className="font-semibold text-emerald-600">
                              {formatCurrency(filteredDateData.reduce((sum, item) => sum + item.total_profit_loss, 0))}
                            </span>
                          </div>
                          <div className="flex justify-between items-center p-2 bg-white dark:bg-gray-800 rounded border dark:border-gray-700">
                            <span className="text-gray-600 dark:text-gray-400">ค่าคอมมิชชั่นรวม:</span>
                            <span className="font-semibold text-blue-600">
                              {formatCurrency(filteredDateData.reduce((sum, item) => sum + item.total_commission, 0))}
                            </span>
                          </div>
                          <div className="flex justify-between items-center p-2 bg-white dark:bg-gray-800 rounded border dark:border-gray-700">
                            <span className="text-gray-600 dark:text-gray-400">ยอดคงเหลือสุดท้าย:</span>
                            <span className="font-semibold text-purple-600">
                              {formatCurrency(filteredDateData.reduce((sum, item) => sum + (item.total_profit_loss - item.total_commission), 0))}
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                </Card>
              </motion.div>
            </div>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </DirectionProvider>
  );
};

export default LotteryReportSummaryPage; 