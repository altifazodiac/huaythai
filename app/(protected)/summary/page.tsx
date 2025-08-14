"use client";
import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  user_percent: number;
  lottery_sub_type_id: number;
  lottery_sub_type_name: string;
  total_bills: number;
  total_numbers: number;
  total_purchase_amount: number;
  total_payout: number;
  net_profit_loss: number;
  commission_amount: number;
  net_amount: number; // ยอดสุทธิ = กำไร/ขาดทุน - คอมมิชชั่น
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
  commission_amount: number;
  net_amount: number; // ยอดสุทธิ = กำไร/ขาดทุน - คอมมิชชั่น
}

interface BillSummary {
  bill_number: string;
  draw_date: string;
  user_name: string;
  user_percent: number;
  sub_type_name: string;
  country_origin: string;
  total_amount: number;
  total_payout: number;
  net_profit_loss: number;
  numbers_count: number;
  status: string;
  commission_amount: number;
  net_amount: number; // ยอดสุทธิ = กำไร/ขาดทุน - คอมมิชชั่น
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

// 🔧 **ใหม่**: Interface สำหรับการวิเคราะห์หมายเลขหวย
interface NumberAnalysis {
  number: string;
  digit_count: number;
  type_number: string;
  lottery_sub_type_id: number;
  sub_type_name: string;
  country_origin: string;
  total_purchases: number;
  total_amount: number;
  average_amount: number;
  purchase_frequency: number;
  risk_level: 'low' | 'medium' | 'high';
  last_purchased_date: string;
  purchase_trend: 'increasing' | 'decreasing' | 'stable';
}

// 🔧 **ใหม่**: Interface สำหรับการวิเคราะห์หมายเลขหวยแบบละเอียด
interface DetailedNumberAnalysis {
  number: string;
  digit_count: number;
  type_number: string;
  lottery_sub_type_id: number;
  sub_type_name: string;
  country_origin: string;
  total_purchases: number;
  total_amount: number;
  average_amount: number;
  purchase_frequency: number;
  risk_level: 'low' | 'medium' | 'high';
  last_purchased_date: string;
  purchase_trend: 'increasing' | 'decreasing' | 'stable';
  // 🔧 ใหม่: ข้อมูลเพิ่มเติม
  max_single_purchase: number;
  min_single_purchase: number;
  purchase_times: string[];
  user_count: number;
  bill_count: number;
  popularity_rank: number;
  category: 'hot' | 'cold' | 'trending' | 'stable';
  // 🔧 เพิ่มจาก paid-analysis
  potential_payout: number;
  payout_rate: number;
  risk_score: number;
  market_share: number;
  volatility_index: number;
}

//  **ใหม่**: ฟังก์ชันกลางสำหรับคำนวณรางวัล
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


// 🔧 **ปรับปรุง**: แก้ไขฟังก์ชันดึงข้อมูลสรุปทั้งหมด
const fetchDailySummary = async (supabase: any, resultsMap: Record<string, LotteryResult>, drawDate?: string): Promise<DailySummary[]> => {
  try {
    let ticketQuery = supabase
      .from('lottery_tickets')
      .select('id, draw_date, total_amount, user_id, bill_number, lottery_ticket_items(*, lottery_sub_number(*), lottery_sub_types(lottery_sub_type_id, sub_type_name, percent))')
      .eq('status', 'confirmed')
      .is('deleted_at', null);
    
    if (drawDate) {
      ticketQuery = ticketQuery.eq('draw_date', drawDate);
    }
    
    const { data: tickets, error: ticketError } = await ticketQuery;
    if (ticketError) throw ticketError;
    if (!tickets || tickets.length === 0) return [];

    // ✅ ดึงข้อมูลจาก lottery_winning_bills
    let winningQuery = supabase
      .from('lottery_winning_bills')
      .select('bill_number, total_prize, draw_date');

    if (drawDate) {
      winningQuery = winningQuery.eq('draw_date', drawDate);
    }

    const { data: winningBills } = await winningQuery;

    // สร้าง Map สำหรับ winningBills เพื่อค้นหาได้เร็ว
    const winningBillsMap = new Map<string, number>();
    (winningBills || []).forEach((bill: any) => {
      winningBillsMap.set(bill.bill_number, Number(bill.total_prize || 0));
    });

    console.log('fetchDailySummary - drawDate:', drawDate);
    console.log('fetchDailySummary - tickets count:', tickets.length);
    console.log('fetchDailySummary - tickets dates:', tickets.map((t: any) => t.draw_date));

    const userIds = [...new Set(tickets.map((t: any) => t.user_id).filter(Boolean))];
    const { data: profiles, error: profileError } = await supabase.from('profiles').select('id, name').in('id', userIds);
    if (profileError) throw profileError;
    const profilesMap = new Map<string, { name: string }>();
    profiles.forEach((p: {id: string, name: string}) => {
      profilesMap.set(p.id, { name: p.name });
    });

    const groupedData = (tickets || []).reduce((acc: any, ticket: any) => {
      if (!ticket.user_id || !ticket.lottery_ticket_items) return acc;
      
      // Group ตาม user และ lottery_sub_type แยกกัน เพื่อให้ผู้ใช้สามารถมีหลายรายการตามประเภทหวย
      const lotterySubTypes = new Set<number>();
      (ticket.lottery_ticket_items || []).forEach((item: any) => {
        if (item.lottery_sub_types?.lottery_sub_type_id) {
          lotterySubTypes.add(item.lottery_sub_types.lottery_sub_type_id);
        }
      });

      lotterySubTypes.forEach((subTypeId: number) => {
        const key = `${ticket.draw_date}__${ticket.user_id}__${subTypeId}`;
        
        if (!acc[key]) {
          const userProfile = profilesMap.get(ticket.user_id);
          // หา lottery_sub_type ข้อมูลสำหรับ subTypeId นี้
          const subTypeInfo = (ticket.lottery_ticket_items || [])
            .find((item: any) => item.lottery_sub_types?.lottery_sub_type_id === subTypeId)
            ?.lottery_sub_types;
          
          acc[key] = {
            draw_date: ticket.draw_date,
            user_id: ticket.user_id,
            user_name: userProfile?.name || 'ไม่ระบุ',
            user_percent: subTypeInfo?.percent || 0,
            lottery_sub_type_id: subTypeId,
            lottery_sub_type_name: subTypeInfo?.sub_type_name || 'ไม่ระบุ',
            total_bills: 0,
            total_numbers: 0,
            total_purchase_amount: 0,
            total_payout: 0,
          };
        }

        // ✅ ใช้ข้อมูลจาก lottery_winning_bills แทนการคำนวณ manual
        const ticketPayout = winningBillsMap.get(ticket.bill_number) || 0;
        
        // คำนวณเฉพาะ items ที่ตรงกับ lottery_sub_type_id นี้
        const itemsForThisType = (ticket.lottery_ticket_items || [])
          .filter((item: any) => item.lottery_sub_types?.lottery_sub_type_id === subTypeId);
        
        const numbersCount = itemsForThisType.reduce((sum: number, item: any) => 
          sum + (item.numbers || []).length, 0);
        
        // คำนวณสัดส่วนของ amount และ payout สำหรับประเภทหวยนี้
        const totalItemsInTicket = (ticket.lottery_ticket_items || []).length;
        const itemsForThisTypeCount = itemsForThisType.length;
        const proportionForThisType = totalItemsInTicket > 0 ? itemsForThisTypeCount / totalItemsInTicket : 0;
        
        acc[key].total_bills += 1;
        acc[key].total_numbers += numbersCount;
        acc[key].total_purchase_amount += Number(ticket.total_amount || 0) * proportionForThisType;
        acc[key].total_payout += ticketPayout * proportionForThisType;
      });
      
      return acc;
    }, {});

    return Object.values(groupedData).map((summary: any) => {
      const netProfitLoss = summary.total_purchase_amount - summary.total_payout;
      const commissionAmount = (summary.total_purchase_amount * summary.user_percent) / 100;
      return {
        ...summary,
        net_profit_loss: netProfitLoss,
        commission_amount: commissionAmount,
        net_amount: netProfitLoss - commissionAmount // ยอดสุทธิ = กำไร/ขาดทุน - คอมมิชชั่น
      };
    }).sort((a: any, b: any) => new Date(b.draw_date).getTime() - new Date(a.draw_date).getTime());
  } catch (err) {
    console.error('Error in fetchDailySummary:', err);
    throw err;
  }
};

const fetchLotteryTypeSummary = async (supabase: any, resultsMap: Record<string, LotteryResult>, drawDate?: string): Promise<LotteryTypeSummary[]> => {
  try {
    let ticketQuery = supabase
      .from('lottery_tickets')
      .select('id, draw_date, bill_number, user_id, total_amount, lottery_ticket_items!inner(*, lottery_sub_number(*), lottery_sub_types!inner(*))')
      .eq('status', 'confirmed')
      .is('deleted_at', null);
    if (drawDate) {
      ticketQuery = ticketQuery.eq('draw_date', drawDate);
    }
    const { data: tickets, error: ticketError } = await ticketQuery;
    if (ticketError) throw ticketError;
    
    // ✅ ดึงข้อมูลจาก lottery_winning_bills
    let winningQuery = supabase
      .from('lottery_winning_bills')
      .select('bill_number, total_prize, draw_date');

    if (drawDate) {
      winningQuery = winningQuery.eq('draw_date', drawDate);
    }

    const { data: winningBills } = await winningQuery;

    // สร้าง Map สำหรับ winningBills เพื่อค้นหาได้เร็ว
    const winningBillsMap = new Map<string, number>();
    (winningBills || []).forEach((bill: any) => {
      winningBillsMap.set(bill.bill_number, Number(bill.total_prize || 0));
    });

    // 🔧 ดึงข้อมูล user profiles (ไม่ต้องใช้ percent จาก profiles อีกต่อไป)
    const userIds = [...new Set(tickets?.map((t: any) => t.user_id).filter(Boolean) || [])];
    let profilesMap = new Map<string, { name: string }>();
    
    console.log('fetchLotteryTypeSummary - userIds:', userIds);
    
    if (userIds.length > 0) {
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, name')
        .in('id', userIds);
      
      if (profileError) throw profileError;
      
      console.log('fetchLotteryTypeSummary - profiles:', profiles);
      
      profiles?.forEach((p: {id: string, name: string}) => {
        profilesMap.set(p.id, { name: p.name });
      });
    }
    
    const groupedData = (tickets || []).reduce((acc: any, ticket: any) => {
      // ✅ ใช้ข้อมูลจาก lottery_winning_bills แทนการคำนวณ manual
      const ticketPayout = winningBillsMap.get(ticket.bill_number) || 0;
      
      // 🔧 ใช้ percent จาก lottery_sub_types แทน profiles
      const userProfile = profilesMap.get(ticket.user_id);
      
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
            total_commission: 0, // 🔧 เพิ่มฟิลด์สำหรับเก็บผลรวมคอมมิชชั่น
          };
        }
        
        // แบ่งสัดส่วน payout ตามจำนวน amount ของแต่ละ item ใน bill
        const ticketTotalAmount = (ticket.lottery_ticket_items || []).reduce((sum: number, i: any) => sum + Number(i.amount || 0), 0);
        const itemPayout = ticketTotalAmount > 0 ? (ticketPayout * Number(item.amount || 0)) / ticketTotalAmount : 0;
        
        // 🔧 คำนวณคอมมิชชั่นสำหรับ item นี้ จาก lottery_sub_types.percent
        const subTypePercent = subType.percent || 0;
        const itemCommission = (Number(item.amount || 0) * subTypePercent) / 100;
      
        acc[subTypeId].total_bills.add(ticket.id);
        acc[subTypeId].total_numbers += (item.numbers || []).length;
        acc[subTypeId].total_purchase_amount += Number(item.amount || 0);
        acc[subTypeId].total_payout += itemPayout;
        acc[subTypeId].total_commission += itemCommission; // 🔧 รวมคอมมิชชั่น
      });
      return acc;
    }, {});
    
    const result = Object.values(groupedData).map((item: any) => {
      const netProfitLoss = item.total_purchase_amount - item.total_payout;
      const commissionAmount = item.total_commission; // 🔧 ใช้ค่าคอมมิชชั่นที่คำนวณแล้ว
      return {
        ...item,
        total_bills: item.total_bills.size,
        net_profit_loss: netProfitLoss,
        commission_amount: commissionAmount,
        net_amount: netProfitLoss - commissionAmount // ยอดสุทธิ = กำไร/ขาดทุน - คอมมิชชั่น
      };
    }).sort((a: any, b: any) => b.total_purchase_amount - a.total_purchase_amount);

    // 🔧 Debug log
    console.log('fetchLotteryTypeSummary - commission calculation:');
    result.forEach((item: any) => {
      console.log(`${item.sub_type_name}: purchase=${item.total_purchase_amount}, commission=${item.commission_amount}`);
    });

    return result;
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
      .eq('status', 'confirmed')
      .is('deleted_at', null);
    
    if (drawDate) ticketQuery = ticketQuery.eq('draw_date', drawDate);
    if (userId && userId !== 'all') ticketQuery = ticketQuery.eq('user_id', userId);
    if (lotteryTypeId) ticketQuery = ticketQuery.eq('lottery_ticket_items.lottery_sub_type_id', lotteryTypeId);
    
    const { data: tickets, error: ticketError } = await ticketQuery;
    if (ticketError) throw ticketError;
    if (!tickets || tickets.length === 0) return [];
    
    // ✅ ดึงข้อมูลจาก lottery_winning_bills
    let winningQuery = supabase
      .from('lottery_winning_bills')
      .select('bill_number, total_prize, draw_date');

    if (drawDate) {
      winningQuery = winningQuery.eq('draw_date', drawDate);
    }

    const { data: winningBills } = await winningQuery;

    // สร้าง Map สำหรับ winningBills เพื่อค้นหาได้เร็ว
    const winningBillsMap = new Map<string, number>();
    (winningBills || []).forEach((bill: any) => {
      winningBillsMap.set(bill.bill_number, Number(bill.total_prize || 0));
    });
    
    const userIds = [...new Set(tickets.map((t: any) => t.user_id))];
    const { data: profiles, error: profileError } = await supabase.from('profiles').select('id, name').in('id', userIds);
    if (profileError) throw profileError;
    const profilesMap = new Map<string, { name: string }>();
    profiles.forEach((p: {id: string, name: string}) => {
      profilesMap.set(p.id, { name: p.name });
    });
    
          const transformedData = tickets.map((ticket: any) => {
        const subTypeNames = [...new Set(ticket.lottery_ticket_items.map((item: any) => item.lottery_sub_types?.sub_type_name).filter(Boolean))];
        const countries = [...new Set(ticket.lottery_ticket_items.map((item: any) => item.lottery_sub_types?.country_origin).filter(Boolean))];
        const userProfile = profilesMap.get(ticket.user_id);
        
        // ✅ ใช้ข้อมูลจาก lottery_winning_bills แทนการคำนวณ manual
        const totalPayout = winningBillsMap.get(ticket.bill_number) || 0;
        
        let totalNumbers = 0;
        (ticket.lottery_ticket_items || []).forEach((item: any) => {
          totalNumbers += (item.numbers || []).length;
        });
          
          // คำนวณเปอร์เซนต์เฉลี่ยจาก lottery_sub_types.percent ของ ticket items
          const ticketPercents = ticket.lottery_ticket_items
            .map((item: any) => item.lottery_sub_types?.percent || 0)
            .filter((p: number) => p > 0);
          const avgPercent = ticketPercents.length > 0 
            ? ticketPercents.reduce((sum: number, p: number) => sum + p, 0) / ticketPercents.length 
            : 0;
          
          const netProfitLoss = Number(ticket.total_amount || 0) - totalPayout;
          const commissionAmount = (Number(ticket.total_amount || 0) * avgPercent) / 100;
          return {
            bill_number: ticket.bill_number,
            draw_date: ticket.draw_date,
            user_name: userProfile?.name || 'ไม่ระบุ',
            user_percent: avgPercent,
            sub_type_name: subTypeNames.join(', '),
            country_origin: countries.join(', '),
            total_amount: Number(ticket.total_amount || 0),
            total_payout: totalPayout,
            net_profit_loss: netProfitLoss,
            numbers_count: totalNumbers,
            status: ticket.status,
            commission_amount: commissionAmount,
            net_amount: netProfitLoss - commissionAmount // ยอดสุทธิ = กำไร/ขาดทุน - คอมมิชชั่น
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
      .is('deleted_at', null)
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
const fetchUsers = async (supabase: any): Promise<{ id: string; name: string; phone: string; percent: number }[]> => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, name, phone, percent')
      .order('name');
    
    if (error) throw error;
    
    return data || [];
  } catch (err) {
    console.error('Error fetching users:', err);
    return [];
  }
};

// �� **ใหม่**: ฟังก์ชันวิเคราะห์หมายเลขหวย
const analyzeLotteryNumbers = async (supabase: any, drawDate?: string): Promise<NumberAnalysis[]> => {
  try {
    let ticketQuery = supabase
      .from('lottery_tickets')
      .select(`
        id, 
        draw_date, 
        lottery_ticket_items!inner(
          id,
          numbers,
          amount,
          lottery_sub_number!inner(
            digit_number,
            type_number
          ),
          lottery_sub_types!inner(
            lottery_sub_type_id,
            sub_type_name,
            country_origin
          )
        )
      `)
      .eq('status', 'confirmed')
      .is('deleted_at', null);
    
    if (drawDate) {
      ticketQuery = ticketQuery.eq('draw_date', drawDate);
    }
    
    const { data: tickets, error: ticketError } = await ticketQuery;
    if (ticketError) throw ticketError;
    if (!tickets || tickets.length === 0) return [];

    // 🔧 วิเคราะห์ข้อมูลหมายเลขหวย
    const numberAnalysis: Record<string, NumberAnalysis> = {};
    
    tickets.forEach((ticket: any) => {
      ticket.lottery_ticket_items.forEach((item: any) => {
        const { digit_number, type_number } = item.lottery_sub_number;
        const { lottery_sub_type_id, sub_type_name, country_origin } = item.lottery_sub_types;
        
        item.numbers.forEach((number: string) => {
          const key = `${number}_${digit_number}_${type_number}_${lottery_sub_type_id}`;
          
          if (!numberAnalysis[key]) {
            numberAnalysis[key] = {
              number,
              digit_count: digit_number,
              type_number,
              lottery_sub_type_id,
              sub_type_name,
              country_origin,
              total_purchases: 0,
              total_amount: 0,
              average_amount: 0,
              purchase_frequency: 0,
              risk_level: 'low',
              last_purchased_date: ticket.draw_date,
              purchase_trend: 'stable'
            };
          }
          
          numberAnalysis[key].total_purchases += 1;
          numberAnalysis[key].total_amount += Number(item.amount || 0);
          numberAnalysis[key].last_purchased_date = ticket.draw_date;
        });
      });
    });

    // 🔧 คำนวณสถิติเพิ่มเติม
    const analysisResults = Object.values(numberAnalysis).map((analysis: any) => {
      analysis.average_amount = analysis.total_amount / analysis.total_purchases;
      
      // 🔧 กำหนดระดับความเสี่ยง
      if (analysis.total_amount > 10000) {
        analysis.risk_level = 'high';
      } else if (analysis.total_amount > 5000) {
        analysis.risk_level = 'medium';
      } else {
        analysis.risk_level = 'low';
      }
      
      // 🔧 คำนวณความถี่การซื้อ
      analysis.purchase_frequency = analysis.total_purchases;
      
      return analysis;
    });

    // 🔧 เรียงลำดับตามยอดซื้อรวม
    return analysisResults.sort((a: any, b: any) => b.total_amount - a.total_amount);
  } catch (err) {
    console.error('Error in analyzeLotteryNumbers:', err);
    throw err;
  }
};

// 🔧 **ใหม่**: ฟังก์ชันวิเคราะห์หมายเลขหวยแบบละเอียด
const analyzeLotteryNumbersDetailed = async (supabase: any, drawDate?: string, userId?: string): Promise<DetailedNumberAnalysis[]> => {
  try {
    let ticketQuery = supabase
      .from('lottery_tickets')
      .select(`
        id, 
        draw_date,
        user_id,
        bill_number,
        lottery_ticket_items!inner(
          id,
          numbers,
          amount,
          lottery_sub_number!inner(
            digit_number,
            type_number,
            price_paid
          ),
          lottery_sub_types!inner(
            lottery_sub_type_id,
            sub_type_name,
            country_origin
          )
        )
      `)
      .eq('status', 'confirmed')
      .is('deleted_at', null);
    
    // 🔧 เพิ่มการกรองตาม user_id ถ้ามี
    if (userId) {
      ticketQuery = ticketQuery.eq('user_id', userId);
    }
    
    if (drawDate) {
      ticketQuery = ticketQuery.eq('draw_date', drawDate);
    }
    
    const { data: tickets, error: ticketError } = await ticketQuery;
    if (ticketError) throw ticketError;
    if (!tickets || tickets.length === 0) return [];

    // 🔧 วิเคราะห์ข้อมูลหมายเลขหวยแบบละเอียด
    const numberAnalysis: Record<string, DetailedNumberAnalysis> = {};
    const userSets: Record<string, Set<string>> = {};
    const billSets: Record<string, Set<string>> = {};
    const purchaseAmounts: Record<string, number[]> = {};
    const purchaseDates: Record<string, string[]> = {};
    
    // 🔧 คำนวณยอดรวมทั้งหมดสำหรับ market share (เฉพาะ user ตัวเอง)
    let totalMarketAmount = 0;
    
    tickets.forEach((ticket: any) => {
      ticket.lottery_ticket_items.forEach((item: any) => {
        const { digit_number, type_number, price_paid } = item.lottery_sub_number;
        const { lottery_sub_type_id, sub_type_name, country_origin } = item.lottery_sub_types;
        
        item.numbers.forEach((number: string) => {
          const key = `${number}_${digit_number}_${type_number}_${lottery_sub_type_id}`;
          const amount = Number(item.amount || 0);
          totalMarketAmount += amount;
          
          if (!numberAnalysis[key]) {
            numberAnalysis[key] = {
              number,
              digit_count: digit_number,
              type_number,
              lottery_sub_type_id,
              sub_type_name,
              country_origin,
              total_purchases: 0,
              total_amount: 0,
              average_amount: 0,
              purchase_frequency: 0,
              risk_level: 'low',
              last_purchased_date: ticket.draw_date,
              purchase_trend: 'stable',
              max_single_purchase: 0,
              min_single_purchase: Number.MAX_SAFE_INTEGER,
              purchase_times: [],
              user_count: 0,
              bill_count: 0,
              popularity_rank: 0,
              category: 'stable',
              potential_payout: 0,
              payout_rate: 0,
              risk_score: 0,
              market_share: 0,
              volatility_index: 0
            };
            userSets[key] = new Set();
            billSets[key] = new Set();
            purchaseAmounts[key] = [];
            purchaseDates[key] = [];
          }
          
          numberAnalysis[key].total_purchases += 1;
          numberAnalysis[key].total_amount += amount;
          numberAnalysis[key].last_purchased_date = ticket.draw_date;
          
          // 🔧 คำนวณ potential payout ตามอัตรารางวัลจริง
          const payoutRate = Number(price_paid || 0);
          numberAnalysis[key].potential_payout += amount * payoutRate;
          
          // 🔧 เก็บข้อมูลเพิ่มเติม
          userSets[key].add(ticket.user_id);
          billSets[key].add(ticket.bill_number);
          purchaseAmounts[key].push(amount);
          purchaseDates[key].push(ticket.draw_date);
          
          // 🔧 อัพเดทค่าสูงสุดและต่ำสุด
          if (amount > numberAnalysis[key].max_single_purchase) {
            numberAnalysis[key].max_single_purchase = amount;
          }
          if (amount < numberAnalysis[key].min_single_purchase) {
            numberAnalysis[key].min_single_purchase = amount;
          }
        });
      });
    });

    // 🔧 คำนวณสถิติเพิ่มเติม
    const analysisResults = Object.values(numberAnalysis).map((analysis: any, index: number) => {
      const key = `${analysis.number}_${analysis.digit_count}_${analysis.type_number}_${analysis.lottery_sub_type_id}`;
      
      analysis.average_amount = analysis.total_amount / analysis.total_purchases;
      analysis.user_count = userSets[key]?.size || 0; // จะเป็น 1 เสมอสำหรับ user เดียว
      analysis.bill_count = billSets[key]?.size || 0;
      analysis.purchase_times = purchaseDates[key] || [];
      
      // 🔧 คำนวณ payout rate (อัตรารางวัลเฉลี่ยต่อครั้ง)
      analysis.payout_rate = analysis.total_purchases > 0 ? analysis.potential_payout / analysis.total_purchases : 0;
      
      // 🔧 คำนวณ market share
      analysis.market_share = totalMarketAmount > 0 ? (analysis.total_amount / totalMarketAmount) * 100 : 0;
      
      // 🔧 คำนวณ risk score (0-100)
      const amountRisk = Math.min(analysis.total_amount / 1000, 50); // สูงสุด 50 คะแนน
      const frequencyRisk = Math.min(analysis.total_purchases * 5, 30); // สูงสุด 30 คะแนน
      const payoutRisk = Math.min(analysis.payout_rate / 100, 20); // สูงสุด 20 คะแนน
      analysis.risk_score = Math.round(amountRisk + frequencyRisk + payoutRisk);
      
      // 🔧 คำนวณ volatility index
      const amounts = purchaseAmounts[key] || [];
      if (amounts.length > 1) {
        const mean = amounts.reduce((sum, val) => sum + val, 0) / amounts.length;
        const variance = amounts.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / amounts.length;
        analysis.volatility_index = Math.round(Math.sqrt(variance) / mean * 100);
      } else {
        analysis.volatility_index = 0;
      }
      
      // 🔧 กำหนดระดับความเสี่ยงแบบใหม่
      if (analysis.risk_score >= 70) {
        analysis.risk_level = 'high';
      } else if (analysis.risk_score >= 40) {
        analysis.risk_level = 'medium';
      } else {
        analysis.risk_level = 'low';
      }
      
      // 🔧 กำหนดหมวดหมู่ความนิยม
      if (analysis.total_purchases >= 8 || analysis.market_share >= 5) {
        analysis.category = 'hot';
      } else if (analysis.total_purchases >= 4 || analysis.market_share >= 2) {
        analysis.category = 'trending';
      } else if (analysis.total_purchases <= 1 && analysis.market_share < 1) {
        analysis.category = 'cold';
      } else {
        analysis.category = 'stable';
      }
      
      // 🔧 คำนวณแนวโน้ม
      if (analysis.purchase_times.length >= 2) {
        const sortedDates = analysis.purchase_times.sort();
        const firstHalf = sortedDates.slice(0, Math.floor(sortedDates.length / 2));
        const secondHalf = sortedDates.slice(Math.floor(sortedDates.length / 2));
        
        if (secondHalf.length > firstHalf.length * 1.5) {
          analysis.purchase_trend = 'increasing';
        } else if (firstHalf.length > secondHalf.length * 1.5) {
          analysis.purchase_trend = 'decreasing';
        } else {
          analysis.purchase_trend = 'stable';
        }
      }
      
      return analysis;
    });

    // 🔧 เรียงลำดับตามรางวัลที่ต้องจ่าย (มากที่สุดก่อน)
    const sortedResults = analysisResults.sort((a: any, b: any) => {
      // เรียงตามรางวัลที่ต้องจ่ายก่อน
      if (b.potential_payout !== a.potential_payout) {
        return b.potential_payout - a.potential_payout;
      }
      // ถ้ารางวัลเท่ากัน เรียงตามยอดซื้อรวม
      if (b.total_amount !== a.total_amount) {
        return b.total_amount - a.total_amount;
      }
      // ถ้ายอดเท่ากัน เรียงตามจำนวนครั้ง
      return b.total_purchases - a.total_purchases;
    });

    // 🔧 กำหนดอันดับความนิยม (เฉพาะ user ตัวเอง)
    sortedResults.forEach((analysis: any, index: number) => {
      analysis.popularity_rank = index + 1;
    });

    return sortedResults;
  } catch (err) {
    console.error('Error in analyzeLotteryNumbersDetailed:', err);
    throw err;
  }
};



// 🔧 เพิ่มฟังก์ชัน helper สำหรับการวิเคราะห์แบบละเอียด
const getRiskLevelColor = (riskLevel: string) => {
  switch (riskLevel) {
    case 'high':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'medium':
      return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'low':
      return 'bg-green-100 text-green-800 border-green-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

const getSortedData = (data: DetailedNumberAnalysis[], sortField: keyof DetailedNumberAnalysis, sortDirection: 'asc' | 'desc') => {
  if (!Array.isArray(data)) return [];
  
  const sorted = [...data].sort((a, b) => {
    let aValue = a[sortField];
    let bValue = b[sortField];
    
    // Convert to numbers for numeric fields
    if (typeof aValue === 'string' && !isNaN(Number(aValue))) {
      aValue = Number(aValue);
      bValue = Number(bValue);
    }
    
    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  return sorted;
};

const SortIcon = ({ field, currentField, direction }: { field: keyof DetailedNumberAnalysis; currentField: keyof DetailedNumberAnalysis; direction: 'asc' | 'desc' }) => {
  if (currentField !== field) {
    return <span className="text-gray-400">↕</span>;
  }
  return direction === 'asc' ? <span className="text-blue-600">↑</span> : <span className="text-blue-600">↓</span>;
};

const exportToCSV = (data: DetailedNumberAnalysis[], selectedDate: string) => {
  if (data.length === 0) return;

  const headers = ['อันดับ', 'หมายเลข', 'ประเภท', 'หวย', 'ประเทศ', 'จำนวนครั้ง', 'ยอดซื้อรวม', 'รางวัลที่ต้องจ่าย', 'ส่วนแบ่งตลาด', 'คะแนนความเสี่ยง', 'ระดับความเสี่ยง', 'หมวดหมู่'];
  const csvContent = [
    headers.join(','),
    ...data.map(item => [
      item.popularity_rank,
      item.number,
      `${item.digit_count} ตัว${item.type_number}`,
      item.sub_type_name,
      item.country_origin,
      item.total_purchases,
      item.total_amount,
      item.potential_payout,
      item.market_share.toFixed(2),
      item.risk_score,
      item.risk_level === 'high' ? 'สูง' : item.risk_level === 'medium' ? 'ปานกลาง' : 'ต่ำ',
      item.category === 'hot' ? 'ร้อนแรง' : item.category === 'trending' ? 'มาแรง' : item.category === 'cold' ? 'เย็น' : 'ปกติ'
    ].join(','))
  ].join('\n');

  const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `lottery-analysis-detailed-${selectedDate}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
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
  const [users, setUsers] = useState<{ id: string; name: string; phone: string; percent: number }[]>([]);
  const [resultsMap, setResultsMap] = useState<Record<string, LotteryResult>>({}); // 🔧 ใหม่
  // 🔧 **ใหม่**: เพิ่ม state สำหรับการวิเคราะห์หมายเลขหวย
  const [numberAnalysis, setNumberAnalysis] = useState<NumberAnalysis[]>([]);
  // 🔧 **ใหม่**: เพิ่ม state สำหรับการวิเคราะห์หมายเลขหวยแบบละเอียด
  const [detailedNumberAnalysis, setDetailedNumberAnalysis] = useState<DetailedNumberAnalysis[]>([]);
  
  // Filter states
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedLotteryType, setSelectedLotteryType] = useState<number | null>(null);
  const [selectedBillNumber, setSelectedBillNumber] = useState<string>('');
  const [selectedUserId, setSelectedUserId] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  // 🔧 เพิ่ม state สำหรับเก็บรายการประเภทหวย
  const [lotteryTypes, setLotteryTypes] = useState<{ lottery_sub_type_id: number; sub_type_name: string; country_origin: string }[]>([]);
    // 🔧 เพิ่ม state สำหรับการวิเคราะห์แบบละเอียด
  const [selectedNumberType, setSelectedNumberType] = useState<string>('all');
  const [sortField, setSortField] = useState<keyof DetailedNumberAnalysis>('potential_payout');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  
  // 🔧 เพิ่ม ref เพื่อ track การ reset
  const isResettingLotteryType = useRef(false);

  useRequireAuth();

  // 🔧 **ปรับปรุง**: แยกฟังก์ชัน loadData ออกมา
  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // 🔧 แก้ไข: ดึงข้อมูลบิลก่อนเพื่อใช้กรองผลหวย
      const { data: ticketsData, error: ticketsError } = await supabase
        .from('lottery_tickets')
        .select('draw_date')
        .eq('status', 'confirmed')
        .is('deleted_at', null)
        .order('draw_date', { ascending: false });
      
      if (ticketsError) throw ticketsError;
      
      // 🔧 ใหม่: ดึงวันที่ที่มีข้อมูลและตั้งค่าวันที่ล่าสุด
      const uniqueDates = [...new Set(ticketsData?.map(t => t.draw_date) || [])].sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
      setAvailableDates(uniqueDates);
      
      // 🔧 ใหม่: ตั้งค่าวันที่ล่าสุดเป็นค่าเริ่มต้นถ้ายังไม่ได้เลือก
      if (!selectedDate && uniqueDates.length > 0) {
        setSelectedDate(uniqueDates[0]);
        return; // ออกจากฟังก์ชันเพื่อให้ useEffect ที่สองจัดการการโหลดข้อมูล
      }
      
      // ถ้าไม่มีวันที่ให้เลือก ให้ออกจากฟังก์ชัน
      if (uniqueDates.length === 0) {
        setIsLoading(false);
        return;
      }
      
      // 🔧 แก้ไข: กรองผลหวยตามวันที่ที่มีบิล
      const { data: resultsData, error: resultsError } = await supabase
        .from('lottery_results')
        .select('*')
        .in('draw_date', uniqueDates)
        .order('draw_date', { ascending: false });
        
      if (resultsError) throw resultsError;
      
      // 🔧 Debug: ตรวจสอบข้อมูลที่โหลด
      console.log('=== SUMMARY DEBUG ===');
      console.log('Selected Date:', selectedDate);
      console.log('Available Dates:', uniqueDates);
      console.log('Tickets dates:', ticketsData?.map(t => t.draw_date));
      console.log('Results count:', resultsData?.length);
      
      const newResultsMap: Record<string, LotteryResult> = (resultsData || []).reduce((acc, res) => {
        const key = `${res.draw_date}|${res.lottery_sub_type_id}|${res.prize_code}`;
        acc[key] = res;
        return acc;
      }, {});
      setResultsMap(newResultsMap);

      // 🔧 ดึงข้อมูลประเภทหวยที่มีข้อมูลในวันที่ที่เลือก
      let lotteryTypesData: { lottery_sub_type_id: number; sub_type_name: string; country_origin: string }[] = [];
      
      if (selectedDate) {
        // ดึงเฉพาะประเภทหวยที่มีข้อมูลในวันที่ที่เลือก
        const { data: filteredTypesData, error: lotteryTypesError } = await supabase
          .from('lottery_tickets')
          .select(`
            lottery_ticket_items!inner(
              lottery_sub_types!inner(
                lottery_sub_type_id,
                sub_type_name,
                country_origin
              )
            )
          `)
          .eq('draw_date', selectedDate)
          .eq('status', 'confirmed')
          .is('deleted_at', null);
        
        if (lotteryTypesError) throw lotteryTypesError;
        
        // Extract unique lottery types
        const uniqueTypes = new Map();
        filteredTypesData?.forEach((ticket: any) => {
          ticket.lottery_ticket_items?.forEach((item: any) => {
            const lotteryType = item.lottery_sub_types;
            if (lotteryType && !uniqueTypes.has(lotteryType.lottery_sub_type_id)) {
              uniqueTypes.set(lotteryType.lottery_sub_type_id, lotteryType);
            }
          });
        });
        
        lotteryTypesData = Array.from(uniqueTypes.values()).sort((a, b) => 
          a.sub_type_name.localeCompare(b.sub_type_name, 'th')
        );
      } else {
        // ถ้าไม่มีวันที่เลือก ให้ดึงประเภทหวยทั้งหมด
        const { data: allTypesData, error: lotteryTypesError } = await supabase
          .from('lottery_sub_types')
          .select('lottery_sub_type_id, sub_type_name, country_origin')
          .order('sub_type_name', { ascending: true });
        
        if (lotteryTypesError) throw lotteryTypesError;
        lotteryTypesData = allTypesData || [];
      }
      
      setLotteryTypes(lotteryTypesData);

      const [dailyData, typeData, billData, numberData, analysisData, detailedAnalysisData] = await Promise.all([
        fetchDailySummary(supabase, newResultsMap, selectedDate || undefined),
        fetchLotteryTypeSummary(supabase, newResultsMap, selectedDate || undefined),
        fetchBillSummary(supabase, newResultsMap, selectedDate || undefined, selectedLotteryType || undefined, selectedUserId === 'all' ? undefined : selectedUserId || undefined),
        fetchNumberDetails(supabase, newResultsMap, selectedBillNumber || undefined),
        analyzeLotteryNumbers(supabase, selectedDate || undefined),
        analyzeLotteryNumbersDetailed(supabase, selectedDate || undefined, user?.id) // 🔧 ใหม่: เพิ่ม user.id
      ] as const);
      
      setDailySummary(dailyData as DailySummary[]);
      setLotteryTypeSummary(typeData as LotteryTypeSummary[]);
      setBillSummary(billData as BillSummary[]);
      setNumberDetails(numberData as NumberDetail[]);
      setNumberAnalysis(analysisData as NumberAnalysis[]);
      setDetailedNumberAnalysis(detailedAnalysisData as DetailedNumberAnalysis[]); // 🔧 ใหม่
      
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

  // Load initial data
  useEffect(() => {
    if (!supabase) return;
    loadData();
  }, [supabase]);

  // Reset selectedLotteryType if it's not in the current lottery types list
  useEffect(() => {
    if (selectedLotteryType && lotteryTypes.length > 0 && !lotteryTypes.some(type => type.lottery_sub_type_id === selectedLotteryType)) {
      isResettingLotteryType.current = true;
      setSelectedLotteryType(null);
    }
  }, [lotteryTypes, selectedLotteryType]);

  // Refresh data when filters change
  useEffect(() => {
    if (!supabase || !selectedDate) return;
    
    // ถ้าเป็นการ reset จาก useEffect ด้านบน ให้ skip การ loadData
    if (isResettingLotteryType.current) {
      isResettingLotteryType.current = false;
      return;
    }
    
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

  // 🔧 เพิ่ม: Filtered data สำหรับ dailySummary ตาม selectedUserId
  const filteredDailySummary = useMemo(() => {
    if (selectedUserId === 'all' || !selectedUserId) {
      return dailySummary;
    }
    return dailySummary.filter(item => item.user_id === selectedUserId);
  }, [dailySummary, selectedUserId]);

  const clearFilters = () => {
    // 🔧 ใหม่: ตั้งค่าวันที่ล่าสุดแทนที่จะล้าง
    if (availableDates.length > 0) {
      setSelectedDate(availableDates[0]);
    }
    setSelectedLotteryType(null);
    setSelectedBillNumber('');
    setSelectedUserId('all');
    setSearchTerm('');
    setSelectedNumberType('all');
    setSortField('potential_payout');
    setSortDirection('desc');
  };

  const handleSort = (field: keyof DetailedNumberAnalysis) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      // ตั้งค่าเริ่มต้นให้เรียงจากมากไปน้อยสำหรับฟิลด์ตัวเลข
      if (field === 'total_amount' || field === 'total_purchases' || field === 'potential_payout' || 
          field === 'risk_score' || field === 'market_share' || field === 'popularity_rank') {
        setSortDirection('desc');
      } else {
        setSortDirection('asc');
      }
    }
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
                  <TableHead>ประเภทหวย</TableHead>
                  <TableHead>วันที่</TableHead>
                  <TableHead className="text-right">จำนวนบิล</TableHead>
                  <TableHead className="text-right">จำนวนเลข</TableHead>
                  <TableHead className="text-right">ยอดซื้อ</TableHead>
                  <TableHead className="text-right">ยอดจ่าย</TableHead>
                  <TableHead className="text-right">กำไร/ขาดทุน</TableHead>
                  {role === 'admin' && <TableHead className="text-right">%</TableHead>}
                  {role === 'admin' && <TableHead className="text-right">คอมมิชชั่น</TableHead>}
                  {role === 'admin' && <TableHead className="text-right">ยอดสุทธิ</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDailySummary.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={role === 'admin' ? 10 : 7} className="text-center py-8 text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        <AlertCircle className="h-8 w-8 text-muted-foreground/50" />
                        <p>ไม่พบข้อมูลสรุปรายวัน</p>
                        {selectedDate && (
                          <p className="text-xs">สำหรับวันที่: {formatDate(selectedDate)}</p>
                        )}
                        {availableDates.length === 0 && (
                          <p className="text-xs">ไม่มีข้อมูลบิลที่ยืนยันแล้ว</p>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  <AnimatePresence>
                    {filteredDailySummary.map((item, index) => (
                    <motion.tr 
                      key={`${item.draw_date}__${item.user_id || ''}__${item.lottery_sub_type_id}`}
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
                      <TableCell className="max-w-[180px]">
                        <div className="truncate" title={item.lottery_sub_type_name}>
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">
                            {item.lottery_sub_type_name || 'ไม่ระบุ'}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatDate(item.draw_date)}
                      </TableCell>
                      <TableCell className="text-right">{item.total_bills.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{item.total_numbers.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{formatCurrency(Number(item.total_purchase_amount))}</TableCell>
                      <TableCell className="text-right text-red-600">{formatCurrency(Number(item.total_payout))}</TableCell>
                      <TableCell className={`text-right font-semibold ${
                        Number(item.net_profit_loss) >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {formatCurrency(Number(item.net_profit_loss))}
                      </TableCell>
                      {role === 'admin' && (
                        <TableCell className="text-right text-blue-600 font-semibold">
                          {item.user_percent}%
                        </TableCell>
                  )}
                      {role === 'admin' && (
                        <TableCell className="text-right text-purple-600 font-semibold">
                          {formatCurrency(Number(item.commission_amount))}
                        </TableCell>
                      )}
                      {role === 'admin' && (
                        <TableCell className={`text-right font-semibold ${
                          Number(item.net_amount) >= 0 ? 'text-emerald-600' : 'text-orange-600'
                        }`}>
                          {formatCurrency(Number(item.net_amount) || 0)}
                        </TableCell>
                      )}
                    </motion.tr>
                  ))}
                </AnimatePresence>
                )}
                {role === 'admin' && filteredDailySummary.length > 0 && (
                  <tr className="font-bold bg-gray-100 dark:bg-gray-800 dark:text-white text-black">
                    <TableCell colSpan={2}>ยอดสุทธิรวม</TableCell>
                    <TableCell></TableCell>
                    <TableCell className="text-right">{filteredDailySummary.reduce((sum, item) => sum + Number(item.total_bills), 0).toLocaleString()}</TableCell>
                    <TableCell className="text-right">{filteredDailySummary.reduce((sum, item) => sum + Number(item.total_numbers), 0).toLocaleString()}</TableCell>
                    <TableCell className="text-right">{formatCurrency(filteredDailySummary.reduce((sum, item) => sum + Number(item.total_purchase_amount), 0))}</TableCell>
                    <TableCell className="text-right">{formatCurrency(filteredDailySummary.reduce((sum, item) => sum + Number(item.total_payout), 0))}</TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatCurrency(filteredDailySummary.reduce((sum, item) => sum + Number(item.net_profit_loss), 0))}
                    </TableCell>
                    <TableCell></TableCell>
                    <TableCell className="text-right text-purple-600 font-semibold">
                      {formatCurrency(filteredDailySummary.reduce((sum, item) => sum + Number(item.commission_amount), 0))}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-emerald-600">
                      {formatCurrency(filteredDailySummary.reduce((sum, item) => sum + Number(item.net_amount), 0))}
                    </TableCell>
                  </tr>
                )}
              </TableBody>
            </Table>
          </div>
          {role === 'admin' && filteredDailySummary.length > 0 && (
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* ยอดซื้อรวม */}
              <Card className="bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                        <DollarSign className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-blue-700 dark:text-blue-300">ยอดซื้อรวม</p>
                        <p className="text-xs text-blue-600/70 dark:text-blue-400/70">Total Purchase</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-blue-700 dark:text-blue-300">
                        {formatCurrency(filteredDailySummary.reduce((sum, item) => sum + Number(item.total_purchase_amount), 0))}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* ยอดจ่ายรวม */}
              <Card className="bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                        <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-green-700 dark:text-green-300">ยอดจ่ายรวม</p>
                        <p className="text-xs text-green-600/70 dark:text-green-400/70">Total Payout</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-green-700 dark:text-green-300">
                        {formatCurrency(filteredDailySummary.reduce((sum, item) => sum + Number(item.total_payout), 0))}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* คอมมิชชั่นรวม */}
              <Card className="bg-gradient-to-br from-purple-50 to-violet-100 dark:from-purple-900/20 dark:to-violet-900/20 border-purple-200 dark:border-purple-800">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                        <BarChart3 className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-purple-700 dark:text-purple-300">คอมมิชชั่นรวม</p>
                        <p className="text-xs text-purple-600/70 dark:text-purple-400/70">Total Commission</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-purple-700 dark:text-purple-300">
                        {formatCurrency(filteredDailySummary.reduce((sum, item) => sum + Number(item.commission_amount), 0))}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* ยอดสุทธิรวม */}
              <Card className="bg-gradient-to-br from-emerald-50 to-teal-100 dark:from-emerald-900/20 dark:to-teal-900/20 border-emerald-200 dark:border-emerald-800">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                        <TrendingDown className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">ยอดสุทธิรวม</p>
                        <p className="text-xs text-emerald-600/70 dark:text-emerald-400/70">Net Total</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300">
                        {formatCurrency(dailySummary.reduce((sum, item) => sum + (Number(item.net_amount) || 0), 0))}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
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
                  {role === 'admin' && <TableHead className="text-right">คอมมิชชั่น</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {lotteryTypeSummary.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={role === 'admin' ? 8 : 7} className="text-center py-8 text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        <AlertCircle className="h-8 w-8 text-muted-foreground/50" />
                        <p>ไม่พบข้อมูลสรุปตามประเภทหวย</p>
                        {selectedDate && (
                          <p className="text-xs">สำหรับวันที่: {formatDate(selectedDate)}</p>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
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
                      {role === 'admin' && (
                        <TableCell className="text-right text-purple-600 font-semibold">
                          {formatCurrency(Number(item.commission_amount))}
                        </TableCell>
                      )}
                    </motion.tr>
                  ))}
                </AnimatePresence>
                )}
              </TableBody>
            </Table>
          </div>
          {role === 'admin' && lotteryTypeSummary.length > 0 && (
            <div className="mt-4 p-4 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-lg border">
              <div className="flex justify-between items-center">
                <div className="text-sm text-muted-foreground">
                  <span className="font-semibold">สรุปคอมมิชชั่นทั้งหมด:</span>
                </div>
                <div className="text-lg font-bold text-purple-600">
                  {formatCurrency(lotteryTypeSummary.reduce((sum, item) => sum + Number(item.commission_amount), 0))}
                </div>
              </div>
            </div>
          )}
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
                {selectedLotteryType && ` (ประเภทหวย: ${lotteryTypes.find(t => t.lottery_sub_type_id === selectedLotteryType)?.sub_type_name || selectedLotteryType})`}
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
                  {role === 'admin' && <TableHead>ผู้ใช้</TableHead>}
                  <TableHead>ประเภทหวย</TableHead>
                  <TableHead>ประเทศ</TableHead>
                  <TableHead className="text-right">จำนวนเลข</TableHead>
                  <TableHead className="text-right">ยอดซื้อ</TableHead>
                  <TableHead className="text-right">ยอดจ่าย</TableHead>
                  <TableHead className="text-right">กำไร/ขาดทุน</TableHead>
                  {role === 'admin' && <TableHead className="text-right">%</TableHead>}
                  {role === 'admin' && <TableHead className="text-right">คอมมิชชั่น</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {billSummary.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={role === 'admin' ? 10 : 8} className="text-center py-8 text-muted-foreground">
                      ไม่พบข้อมูลบิล
                      {selectedDate && <div className="text-xs mt-1">สำหรับวันที่: {formatDate(selectedDate)}</div>}
                      {selectedLotteryType && <div className="text-xs mt-1">ประเภทหวย: {lotteryTypes.find(t => t.lottery_sub_type_id === selectedLotteryType)?.sub_type_name || selectedLotteryType}</div>}
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
                        {role === 'admin' && (
                          <TableCell className="max-w-[150px]">
                            <div className="truncate" title={item.user_name}>
                              {item.user_name}
                            </div>
                          </TableCell>
                        )}
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
                        {role === 'admin' && (
                          <TableCell className="text-right text-blue-600 font-semibold">
                            {item.user_percent}%
                          </TableCell>
                        )}
                        {role === 'admin' && (
                          <TableCell className="text-right text-purple-600 font-semibold">
                            {formatCurrency(Number(item.commission_amount))}
                          </TableCell>
                        )}
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                )}
              </TableBody>
            </Table>
          </div>
          {role === 'admin' && billSummary.length > 0 && (
            <div className="mt-4 p-4 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-lg border">
              <div className="flex justify-between items-center">
                <div className="text-sm text-muted-foreground">
                  <span className="font-semibold">สรุปคอมมิชชั่นทั้งหมด:</span>
                </div>
                <div className="text-lg font-bold text-purple-600">
                  {formatCurrency(billSummary.reduce((sum, item) => sum + Number(item.commission_amount), 0))}
                </div>
              </div>
            </div>
          )}
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
                {numberDetails.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        <AlertCircle className="h-8 w-8 text-muted-foreground/50" />
                        <p>ไม่พบข้อมูลรายละเอียดเลข</p>
                        {selectedBillNumber && (
                          <p className="text-xs">สำหรับบิล: {selectedBillNumber}</p>
                        )}
                        {!selectedBillNumber && (
                          <p className="text-xs">กรุณาเลือกบิลเพื่อดูรายละเอียด</p>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
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
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // 🔧 **ใหม่**: แสดงผลการวิเคราะห์หมายเลขหวย
  const renderNumberAnalysisTab = () => (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Hash className="h-5 w-5" />
            วิเคราะห์หมายเลขหวย
            {selectedDate && (
              <span className="text-sm font-normal text-muted-foreground">
                - {formatDate(selectedDate)}
              </span>
            )}
          </CardTitle>
          <CardDescription>
            วิเคราะห์การซื้อหมายเลขหวยตามหลักการตรวจวิเคราะห์หมายเลขหวยมาตรฐานสากล
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>หมายเลข</TableHead>
                  <TableHead>ประเภท</TableHead>
                  <TableHead>หวย</TableHead>
                  <TableHead>ประเทศ</TableHead>
                  <TableHead className="text-right">จำนวนครั้ง</TableHead>
                  <TableHead className="text-right">ยอดซื้อรวม</TableHead>
                  <TableHead className="text-right">ยอดเฉลี่ย</TableHead>
                  <TableHead className="text-center">ระดับความเสี่ยง</TableHead>
                  <TableHead>วันที่ซื้อล่าสุด</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {numberAnalysis.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        <AlertCircle className="h-8 w-8 text-muted-foreground/50" />
                        <p>ไม่พบข้อมูลการวิเคราะห์หมายเลขหวย</p>
                        {selectedDate && (
                          <p className="text-xs">สำหรับวันที่: {formatDate(selectedDate)}</p>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  <AnimatePresence>
                    {numberAnalysis.map((item, index) => (
                      <motion.tr 
                        key={`${item.number}_${item.lottery_sub_type_id}_${item.type_number}`}
                        layout
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                        className="border-b transition-colors hover:bg-muted/50"
                      >
                        <TableCell className="font-mono font-bold text-lg">
                          {item.number}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {item.digit_count} ตัว{item.type_number}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">
                          {item.sub_type_name}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="text-sm">{item.country_origin}</span>
                            {item.country_origin === 'Laos' && (
                              <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">ลาว</span>
                            )}
                            {item.country_origin === 'Vietnam' && (
                              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">ฮานอย</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {item.total_purchases.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatCurrency(Number(item.total_amount))}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {formatCurrency(Number(item.average_amount))}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge 
                            variant={
                              item.risk_level === 'high' ? 'destructive' : 
                              item.risk_level === 'medium' ? 'secondary' : 'default'
                            }
                          >
                            {item.risk_level === 'high' ? 'สูง' : 
                             item.risk_level === 'medium' ? 'ปานกลาง' : 'ต่ำ'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(item.last_purchased_date)}
                        </TableCell>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                )}
              </TableBody>
            </Table>
          </div>
          
          {/* 🔧 สรุปสถิติการวิเคราะห์ */}
          {numberAnalysis.length > 0 && (
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* จำนวนหมายเลขทั้งหมด */}
              <Card className="bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                        <Hash className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-blue-700 dark:text-blue-300">หมายเลขทั้งหมด</p>
                        <p className="text-xs text-blue-600/70 dark:text-blue-400/70">Total Numbers</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-blue-700 dark:text-blue-300">
                        {numberAnalysis.length.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* ยอดซื้อรวม */}
              <Card className="bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                        <DollarSign className="h-4 w-4 text-green-600 dark:text-green-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-green-700 dark:text-green-300">ยอดซื้อรวม</p>
                        <p className="text-xs text-green-600/70 dark:text-green-400/70">Total Amount</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-green-700 dark:text-green-300">
                        {formatCurrency(numberAnalysis.reduce((sum, item) => sum + Number(item.total_amount), 0))}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* หมายเลขความเสี่ยงสูง */}
              <Card className="bg-gradient-to-br from-red-50 to-orange-100 dark:from-red-900/20 dark:to-orange-900/20 border-red-200 dark:border-red-800">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                        <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-red-700 dark:text-red-300">ความเสี่ยงสูง</p>
                        <p className="text-xs text-red-600/70 dark:text-red-400/70">High Risk</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-red-700 dark:text-red-300">
                        {numberAnalysis.filter(item => item.risk_level === 'high').length}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* ยอดเฉลี่ยต่อหมายเลข */}
              <Card className="bg-gradient-to-br from-purple-50 to-violet-100 dark:from-purple-900/20 dark:to-violet-900/20 border-purple-200 dark:border-purple-800">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                        <BarChart3 className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-purple-700 dark:text-purple-300">ยอดเฉลี่ย</p>
                        <p className="text-xs text-purple-600/70 dark:text-purple-400/70">Average</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-purple-700 dark:text-purple-300">
                        {formatCurrency(
                          numberAnalysis.length > 0 
                            ? numberAnalysis.reduce((sum, item) => sum + Number(item.total_amount), 0) / numberAnalysis.length
                            : 0
                        )}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  // 🔧 **ใหม่**: แสดงผลการวิเคราะห์หมายเลขหวยแบบละเอียด
  const renderDetailedNumberAnalysisTab = () => {
    // 🔧 กรองข้อมูลตามประเภทเลขและคำค้นหา
    const filteredData = detailedNumberAnalysis.filter(item => {
      const matchesNumberType = selectedNumberType === 'all' || item.type_number === selectedNumberType;
      const matchesSearch = !searchTerm || 
        item.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.sub_type_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.country_origin.toLowerCase().includes(searchTerm.toLowerCase());
      
      return matchesNumberType && matchesSearch;
    });

    // 🔧 เรียงลำดับข้อมูล
    const sortedData = getSortedData(filteredData, sortField, sortDirection);

    return (
      <div className="space-y-4">
        {/* 🔧 ตัวกรองเพิ่มเติม */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              ตัวกรองการวิเคราะห์
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">ประเภทเลข</label>
                <Select value={selectedNumberType} onValueChange={setSelectedNumberType}>
                  <SelectTrigger>
                    <SelectValue placeholder="เลือกประเภทเลข" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">ทั้งหมด</SelectItem>
                    <SelectItem value="3ตัวบน">3 ตัวบน</SelectItem>
                    <SelectItem value="3ตัวล่าง">3 ตัวล่าง</SelectItem>
                    <SelectItem value="3ตัวโต๊ด">3 ตัวโต๊ด</SelectItem>
                    <SelectItem value="2ตัวบน">2 ตัวบน</SelectItem>
                    <SelectItem value="2ตัวล่าง">2 ตัวล่าง</SelectItem>
                    <SelectItem value="2ตัวโต๊ด">2 ตัวโต๊ด</SelectItem>
                    <SelectItem value="เลขวิ่งบน">เลขวิ่งบน</SelectItem>
                    <SelectItem value="เลขวิ่งล่าง">เลขวิ่งล่าง</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end gap-2">
                <Button 
                  onClick={() => exportToCSV(sortedData, selectedDate || 'all')}
                  disabled={sortedData.length === 0}
                  variant="outline"
                  className="flex-1"
                >
                  ส่งออก CSV
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 🔧 สรุปสถิติ */}
        {sortedData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>สรุปสถิติการวิเคราะห์</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {sortedData.length}
                  </div>
                  <div className="text-sm text-gray-600">จำนวนหมายเลขที่วิเคราะห์ (ของคุณ)</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {formatCurrency(sortedData.reduce((sum, item) => sum + item.total_amount, 0))}
                  </div>
                  <div className="text-sm text-gray-600">ยอดซื้อรวมทั้งหมด (ของคุณ)</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {formatCurrency(Math.max(...sortedData.map(item => item.potential_payout)))}
                  </div>
                  <div className="text-sm text-gray-600">รางวัลที่ต้องจ่ายสูงสุด (ของคุณ)</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {sortedData.filter(item => item.risk_level === 'high').length}
                  </div>
                  <div className="text-sm text-gray-600">หมายเลขที่มีความเสี่ยงสูง (ของคุณ)</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 🔧 ตารางวิเคราะห์แบบละเอียด */}
        <Card>
          <CardHeader>
                      <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            วิเคราะห์หมายเลขหวยแบบละเอียด (ของคุณ)
            {selectedDate && (
              <span className="text-sm font-normal text-muted-foreground">
                - {formatDate(selectedDate)}
              </span>
            )}
          </CardTitle>
          <CardDescription>
            วิเคราะห์การซื้อหมายเลขหวยของคุณแบบละเอียดตามหลักการตรวจวิเคราะห์หมายเลขหวยมาตรฐานสากล
          </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-center cursor-pointer hover:bg-gray-50" onClick={() => handleSort('popularity_rank')}>
                      <div className="flex items-center justify-center gap-1">
                        อันดับ
                        <SortIcon field="popularity_rank" currentField={sortField} direction={sortDirection} />
                      </div>
                    </TableHead>
                    <TableHead className="text-center cursor-pointer hover:bg-gray-50" onClick={() => handleSort('number')}>
                      <div className="flex items-center justify-center gap-1">
                        หมายเลข
                        <SortIcon field="number" currentField={sortField} direction={sortDirection} />
                      </div>
                    </TableHead>
                    <TableHead className="text-center cursor-pointer hover:bg-gray-50" onClick={() => handleSort('type_number')}>
                      <div className="flex items-center justify-center gap-1">
                        ประเภท
                        <SortIcon field="type_number" currentField={sortField} direction={sortDirection} />
                      </div>
                    </TableHead>
                    <TableHead className="text-center cursor-pointer hover:bg-gray-50" onClick={() => handleSort('sub_type_name')}>
                      <div className="flex items-center justify-center gap-1">
                        หวย
                        <SortIcon field="sub_type_name" currentField={sortField} direction={sortDirection} />
                      </div>
                    </TableHead>
                    <TableHead className="text-center">ประเทศ</TableHead>
                    <TableHead className="text-center cursor-pointer hover:bg-gray-50" onClick={() => handleSort('total_purchases')}>
                      <div className="flex items-center justify-center gap-1">
                        จำนวนครั้ง
                        <SortIcon field="total_purchases" currentField={sortField} direction={sortDirection} />
                      </div>
                    </TableHead>
                    <TableHead className="text-center cursor-pointer hover:bg-gray-50" onClick={() => handleSort('total_amount')}>
                      <div className="flex items-center justify-center gap-1">
                        ยอดซื้อรวม
                        <SortIcon field="total_amount" currentField={sortField} direction={sortDirection} />
                      </div>
                    </TableHead>
                    <TableHead className="text-center cursor-pointer hover:bg-gray-50" onClick={() => handleSort('potential_payout')}>
                      <div className="flex items-center justify-center gap-1">
                        รางวัลที่ต้องจ่าย
                        <SortIcon field="potential_payout" currentField={sortField} direction={sortDirection} />
                      </div>
                    </TableHead>
                    <TableHead className="text-center cursor-pointer hover:bg-gray-50" onClick={() => handleSort('market_share')}>
                      <div className="flex items-center justify-center gap-1">
                        ส่วนแบ่งตลาด
                        <SortIcon field="market_share" currentField={sortField} direction={sortDirection} />
                      </div>
                    </TableHead>
                    <TableHead className="text-center cursor-pointer hover:bg-gray-50" onClick={() => handleSort('risk_score')}>
                      <div className="flex items-center justify-center gap-1">
                        คะแนนความเสี่ยง
                        <SortIcon field="risk_score" currentField={sortField} direction={sortDirection} />
                      </div>
                    </TableHead>
                    <TableHead className="text-center cursor-pointer hover:bg-gray-50" onClick={() => handleSort('risk_level')}>
                      <div className="flex items-center justify-center gap-1">
                        ระดับความเสี่ยง
                        <SortIcon field="risk_level" currentField={sortField} direction={sortDirection} />
                      </div>
                    </TableHead>
                    <TableHead className="text-center cursor-pointer hover:bg-gray-50" onClick={() => handleSort('category')}>
                      <div className="flex items-center justify-center gap-1">
                        หมวดหมู่
                        <SortIcon field="category" currentField={sortField} direction={sortDirection} />
                      </div>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={12} className="text-center py-8 text-muted-foreground">
                        <div className="flex flex-col items-center gap-2">
                          <AlertCircle className="h-8 w-8 text-muted-foreground/50" />
                          <p>ไม่พบข้อมูลการวิเคราะห์หมายเลขหวยของคุณ</p>
                          {selectedDate && (
                            <p className="text-xs">สำหรับวันที่: {formatDate(selectedDate)}</p>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    <AnimatePresence>
                      {sortedData.map((item, index) => (
                        <motion.tr 
                          key={`${item.number}_${item.lottery_sub_type_id}_${item.type_number}`}
                          layout
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          transition={{ duration: 0.3, delay: index * 0.05 }}
                          className="border-b transition-colors hover:bg-muted/50"
                        >
                          <TableCell className="text-center">
                            <Badge variant={item.popularity_rank <= 3 ? "default" : "outline"}>
                              #{item.popularity_rank}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono font-bold text-lg text-center">
                            {item.number}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline">
                              {item.digit_count} ตัว{item.type_number}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-medium text-center">
                            {item.sub_type_name}
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-2">
                              <span className="text-sm">{item.country_origin}</span>
                              {item.country_origin === 'Laos' && (
                                <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">ลาว</span>
                              )}
                              {item.country_origin === 'Vietnam' && (
                                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">ฮานอย</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-center font-semibold">
                            {item.total_purchases.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-center font-semibold text-green-600">
                            {formatCurrency(Number(item.total_amount))}
                          </TableCell>
                          <TableCell className="text-center font-semibold text-red-600">
                            {formatCurrency(Number(item.potential_payout))}
                          </TableCell>
                          <TableCell className="text-center text-muted-foreground">
                            {item.market_share.toFixed(2)}%
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline">
                              {item.risk_score}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge className={getRiskLevelColor(item.risk_level)}>
                              {item.risk_level === 'high' ? 'สูง' : 
                               item.risk_level === 'medium' ? 'ปานกลาง' : 'ต่ำ'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge 
                              variant={
                                item.category === 'hot' ? 'destructive' : 
                                item.category === 'trending' ? 'default' : 
                                item.category === 'cold' ? 'secondary' : 'outline'
                              }
                            >
                              {item.category === 'hot' ? 'ร้อนแรง' : 
                               item.category === 'trending' ? 'มาแรง' : 
                               item.category === 'cold' ? 'เย็น' : 'ปกติ'}
                            </Badge>
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
  };

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
                {(selectedDate || availableDates.length === 0) && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5, delay: 0.4 }}
                    className={`mt-4 p-3 rounded-lg border ${
                      availableDates.length === 0 
                        ? 'bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 border-red-200 dark:border-red-800'
                        : 'bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-4 text-sm">
                      {availableDates.length === 0 ? (
                        <div className="flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 text-red-600" />
                          <span className="font-medium text-red-700 dark:text-red-300">ไม่มีข้อมูล:</span>
                          <span className="text-red-700 dark:text-red-300 font-semibold">
                            ไม่พบข้อมูลบิลที่ยืนยันแล้ว
                          </span>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-blue-600" />
                            <span className="font-medium">วันที่เลือก:</span>
                            <span className="text-blue-700 dark:text-blue-300 font-semibold">
                              {selectedDate ? formatDate(selectedDate) : 'ยังไม่ได้เลือก'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <BarChart3 className="h-4 w-4 text-green-600" />
                            <span className="font-medium">ข้อมูลทั้งหมด:</span>
                            <span className="text-green-700 dark:text-green-300 font-semibold">
                              {availableDates.length} วัน
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  </motion.div>
                )}
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
                    <div className={`grid grid-cols-1 ${role === 'admin' ? 'md:grid-cols-6' : 'md:grid-cols-5'} gap-4`}>
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          วันที่ ({availableDates.length} วัน)
                        </label>
                        <Select value={selectedDate} onValueChange={setSelectedDate} disabled={availableDates.length === 0}>
                          <SelectTrigger className="w-full">
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
                                    <span>{formatDate(date)}</span>
                                    {index === 0 && (
                                      <Badge variant="secondary" className="ml-2 text-xs">
                                        ล่าสุด
                                      </Badge>
                                    )}
                                  </div>
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                        {selectedDate && (
                          <p className="text-xs text-muted-foreground mt-1">
                            เลือก: {formatDate(selectedDate)}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">ประเภทหวย</label>
                        <Select value={selectedLotteryType?.toString() || 'all'} onValueChange={(value) => setSelectedLotteryType(value === 'all' ? null : Number(value))}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="เลือกประเภทหวย" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">ทั้งหมด</SelectItem>
                            {lotteryTypes.map((type) => (
                              <SelectItem key={type.lottery_sub_type_id} value={type.lottery_sub_type_id.toString()}>
                                <div className="flex items-center justify-between w-full">
                                  <span>{type.sub_type_name}</span>
                                  <span className="text-xs text-muted-foreground ml-2">
                                    {type.country_origin}
                                  </span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {selectedLotteryType && (
                          <p className="text-xs text-muted-foreground mt-1">
                            เลือก: {lotteryTypes.find(t => t.lottery_sub_type_id === selectedLotteryType)?.sub_type_name}
                          </p>
                        )}
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
                      <div>
                        <label className="block text-sm font-medium mb-2">ค้นหา</label>
                        <Input
                          type="text"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          placeholder="ค้นหาหมายเลข, ประเภทหวย, ประเทศ..."
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
                      {role === 'admin' && (
                        <div>
                          <label className="block text-sm font-medium mb-2">% คอมมิชชั่น</label>
                          <div className="text-sm text-muted-foreground p-2 bg-muted rounded border">
                            {selectedUserId && selectedUserId !== 'all' 
                              ? `${(users.find(u => u.id === selectedUserId) as any)?.percent || 0}%`
                              : 'เลือกผู้ใช้เพื่อดู %'
                            }
                          </div>
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
                  <TabsList className="grid w-full grid-cols-5"> {/* 🔧 เปลี่ยนจาก 4 เป็น 5 */}
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
                    <TabsTrigger value="analysis" className="flex items-center gap-2"> {/* 🔧 ใหม่ */}
                      <TrendingUp className="h-4 w-4" />
                      วิเคราะห์
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
                        {activeTab === "analysis" && renderDetailedNumberAnalysisTab()} {/* 🔧 ใหม่ */}
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

 