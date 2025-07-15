 
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
import { countryFlagImg } from "@/lib/utils/flags";
import { Badge } from "@/components/ui/badge";

// Comprehensive interfaces for detailed lottery analysis
interface DailySummary {
  draw_date: string;
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
  is_winning: boolean;
  payout_amount: number;
  winning_numbers?: string;
}

// Comprehensive data fetching functions using authenticated Supabase client
const fetchDailySummary = async (supabase: any): Promise<DailySummary[]> => {
  try {
    // Try RPC function first
    const { data, error } = await supabase.rpc('get_daily_lottery_summary');
    if (!error && data) {
      return data;
    }
    
    // Fallback to direct SQL query
    console.log('RPC function failed, using direct query fallback');
    
    // Get all confirmed tickets
    const { data: tickets, error: ticketError } = await supabase
      .from('lottery_tickets')
      .select('id, draw_date, total_amount')
      .eq('status', 'confirmed');
    
    if (ticketError) throw ticketError;
    
    if (!tickets || tickets.length === 0) {
      return [];
    }
    
    // Get ticket items to count total numbers
    const ticketIds = tickets.map((t: any) => t.id);
    const { data: ticketItems, error: itemError } = await supabase
      .from('lottery_ticket_items')
      .select('ticket_id')
      .in('ticket_id', ticketIds);
    
    if (itemError) throw itemError;
    
    // Group by draw_date and calculate totals
    const groupedData = (tickets || []).reduce((acc: any, ticket: any) => {
      const date = ticket.draw_date;
      if (!acc[date]) {
        acc[date] = {
          draw_date: date,
          total_bills: 0,
          total_numbers: 0,
          total_purchase_amount: 0,
          total_payout: 0,
          net_profit_loss: 0
        };
      }
      acc[date].total_bills = 1;
      acc[date].total_purchase_amount = Number(ticket.total_amount || 0);
      acc[date].net_profit_loss = Number(ticket.total_amount || 0);
      return acc;
    }, {});
    
    // Add total_numbers count
    (ticketItems || []).forEach((item: any) => {
      const ticket = tickets.find((t: any) => t.id === item.ticket_id);
      if (ticket) {
        const date = ticket.draw_date;
        if (groupedData[date]) {
          groupedData[date].total_numbers = 1;
        }
      }
    });
    
    return Object.values(groupedData).sort((a: any, b: any) =>
      new Date(b.draw_date).getTime() - new Date(a.draw_date).getTime()
    ) as DailySummary[];
  } catch (err) {
    console.error('Error in fetchDailySummary:', err);
    throw err;
  }
};

const fetchLotteryTypeSummary = async (supabase: any, drawDate?: string): Promise<LotteryTypeSummary[]> => {
  try {
    // Try RPC function first
    const { data, error } = await supabase.rpc('get_lottery_type_summary', { p_draw_date: drawDate });
    if (!error && data) {
      return data;
    }
    
    // Fallback to direct SQL query
    console.log('RPC function failed, using direct query fallback');
    
    // First get all confirmed tickets
    let ticketQuery = supabase
      .from('lottery_tickets')
      .select('id, draw_date, total_amount')
      .eq('status', 'confirmed');
    
    if (drawDate) {
      ticketQuery = ticketQuery.eq('draw_date', drawDate);
    }
    
    const { data: tickets, error: ticketError } = await ticketQuery;
    if (ticketError) throw ticketError;
    
    // Then get ticket items for these tickets
    const ticketIds = tickets?.map((t: any) => t.id) || [];
    if (ticketIds.length === 0) {
      return [];
    }
    
    const { data: ticketItems, error: itemError } = await supabase
      .from('lottery_ticket_items')
      .select(`
        ticket_id,
        lottery_sub_type_id,
        lottery_sub_types!inner(
          lottery_sub_type_id,
          sub_type_name,
          country_origin
        )
      `)
      .in('ticket_id', ticketIds);
    
    if (itemError) throw itemError;
    
    // Group by lottery_sub_type_id and calculate totals
    const groupedData = (ticketItems || []).reduce((acc: any, item: any) => {
      const subTypeId = item.lottery_sub_type_id;
      const subType = item.lottery_sub_types;
      const ticket = tickets?.find((t: any) => t.id === item.ticket_id);
      
      if (!acc[subTypeId]) {
        acc[subTypeId] = {
          lottery_sub_type_id: subTypeId,
          sub_type_name: subType.sub_type_name,
          country_origin: subType.country_origin,
          total_bills: new Set(),
          total_numbers: 0,
          total_purchase_amount: 0,
          total_payout: 0,
          net_profit_loss: 0
        };
      }
      
      acc[subTypeId].total_bills.add(item.ticket_id);
      acc[subTypeId].total_numbers = 1;
      if (ticket) {
        acc[subTypeId].total_purchase_amount = Number(ticket.total_amount || 0);
        acc[subTypeId].net_profit_loss = Number(ticket.total_amount || 0);
      }
      
      return acc;
    }, {});
    
    // Convert Sets to counts and return array
    return Object.values(groupedData).map((item: any) => ({
      ...item,
      total_bills: item.total_bills.size
    })).sort((a: any, b: any) => 
      Number(b.total_purchase_amount) - Number(a.total_purchase_amount)
    );
  } catch (err) {
    console.error('Error in fetchLotteryTypeSummary:', err);
    throw err;
  }
};

const fetchBillSummary = async (supabase: any, drawDate?: string, lotteryTypeId?: number): Promise<BillSummary[]> => {
  try {
    console.log('Fetching bill summary with params:', { drawDate, lotteryTypeId });
    
    // Try RPC function first
    const params: any = {};
    if (drawDate) params.p_draw_date = drawDate;
    if (lotteryTypeId) params.p_lottery_type_id = lotteryTypeId;
    
    const { data, error } = await supabase.rpc('get_bill_summary', params);
    
    if (!error && data) {
      console.log('Received bill summary data:', data);
      return data;
    }
    
    // Fallback to direct SQL query
    console.log('RPC function failed, using direct query fallback');
    
    // Get tickets
    let ticketQuery = supabase
      .from('lottery_tickets')
      .select('id, bill_number, draw_date, total_amount, status, user_id')
      .eq('status', 'confirmed');
    
    if (drawDate) {
      ticketQuery = ticketQuery.eq('draw_date', drawDate);
    }
    
    const { data: tickets, error: ticketError } = await ticketQuery;
    if (ticketError) {
      console.error('Error in get_bill_summary fallback query:', ticketError);
      throw ticketError;
    }
    
    if (!tickets || tickets.length === 0) {
      return [];
    }
    
    // Get user profiles
    const userIds = [...new Set(tickets.map((t: any) => t.user_id))];
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, name')
      .in('id', userIds);
    
    if (profileError) throw profileError;
    
    // Get ticket items
    const ticketIds = tickets.map((t: any) => t.id);
    let itemQuery = supabase
      .from('lottery_ticket_items')
      .select(`
        ticket_id,
        lottery_sub_type_id,
        lottery_sub_types!inner(
          lottery_sub_type_id,
          sub_type_name,
          country_origin
        )
      `)
      .in('ticket_id', ticketIds);
    
    if (lotteryTypeId) {
      itemQuery = itemQuery.eq('lottery_sub_type_id', lotteryTypeId);
    }
    
    const { data: ticketItems, error: itemError } = await itemQuery;
    if (itemError) throw itemError;
    
    // Group items by ticket_id
    const itemsByTicket = (ticketItems || []).reduce((acc: any, item: any) => {
      if (!acc[item.ticket_id]) {
        acc[item.ticket_id] = [];
      }
      acc[item.ticket_id].push(item);
      return acc;
    }, {});
    
    // Transform data to match expected format
    const transformedData = tickets.map((ticket: any) => {
      const ticketItems = itemsByTicket[ticket.id] || [];
      const profile = profiles?.find((p: any) => p.id === ticket.user_id);
      const firstItem = ticketItems[0];
      
      return {
        bill_number: ticket.bill_number,
        draw_date: ticket.draw_date,
        user_name: profile?.name || 'ไม่ระบุ',
        sub_type_name: firstItem?.lottery_sub_types?.sub_type_name || 'ไม่ระบุ',
        country_origin: firstItem?.lottery_sub_types?.country_origin || 'ไม่ระบุ',
        total_amount: Number(ticket.total_amount || 0),
        total_payout: 0, // Placeholder
        net_profit_loss: Number(ticket.total_amount || 0), // Placeholder
        numbers_count: ticketItems.length,
        status: ticket.status
      };
    });
    
    console.log('Transformed bill summary data:', transformedData);
    return transformedData;
  } catch (err) {
    console.error('Error in fetchBillSummary:', err);
    throw err;
  }
};

const fetchNumberDetails = async (supabase: any, billNumber?: string): Promise<NumberDetail[]> => {
  try {
    // Try RPC function first
    const { data, error } = await supabase.rpc('get_number_details', { p_bill_number: billNumber });
    if (!error && data) {
      return data;
    }
    
    // Fallback to direct SQL query
    console.log('RPC function failed, using direct query fallback');
    
    // Get tickets
    let ticketQuery = supabase
      .from('lottery_tickets')
      .select('id, bill_number')
      .eq('status', 'confirmed');
    
    if (billNumber) {
      ticketQuery = ticketQuery.eq('bill_number', billNumber);
    }
    
    const { data: tickets, error: ticketError } = await ticketQuery;
    if (ticketError) throw ticketError;
    
    if (!tickets || tickets.length === 0) {
      return [];
    }
    
    // Get ticket items for these tickets
    const ticketIds = tickets.map((t: any) => t.id);
    const { data: ticketItems, error: itemError } = await supabase
      .from('lottery_ticket_items')
      .select(`
        id,
        ticket_id,
        numbers,
        amount,
        lottery_sub_number_id,
        lottery_sub_number!inner(
          id,
          digit_number,
          type_number,
          price_paid
        )
      `)
      .in('ticket_id', ticketIds);
    
    if (itemError) throw itemError;
    
    // Transform data to match expected format
    const transformedData: NumberDetail[] = [];
    (ticketItems || []).forEach((item: any) => {
      const ticket = tickets.find((t: any) => t.id === item.ticket_id);
      if (ticket) {
        transformedData.push({
          id: item.id,
          bill_number: ticket.bill_number,
          lottery_type_name: `${item.lottery_sub_number.digit_number} ตัว${item.lottery_sub_number.type_number}`,
          digit_number: item.lottery_sub_number.digit_number,
          type_number: item.lottery_sub_number.type_number,
          numbers: item.numbers,
          amount: Number(item.amount || 0),
          price_paid: Number(item.lottery_sub_number.price_paid || 0),
          is_winning: false, // Placeholder
          payout_amount: 0, // Placeholder
          winning_numbers: undefined // Placeholder
        });
      }
    });
    
    return transformedData;
  } catch (err) {
    console.error('Error in fetchNumberDetails:', err);
    throw err;
  }
};

const LotterySummaryPage: React.FC = () => {
  const { supabase, user } = useAuth();
  const [activeTab, setActiveTab] = useState('daily');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Data states
  const [dailySummary, setDailySummary] = useState<DailySummary[]>([]);
  const [lotteryTypeSummary, setLotteryTypeSummary] = useState<LotteryTypeSummary[]>([]);
  const [billSummary, setBillSummary] = useState<BillSummary[]>([]);
  const [numberDetails, setNumberDetails] = useState<NumberDetail[]>([]);

  // Filter states
  const todayStr = new Date().toISOString().slice(0, 10);
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [selectedLotteryType, setSelectedLotteryType] = useState<number | null>(null);
  const [selectedBillNumber, setSelectedBillNumber] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
 
  useRequireAuth();

  // Load initial data
  useEffect(() => {
    if (!supabase) return;
    loadData();
  }, [supabase]);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const [dailyData, typeData, billData, numberData] = await Promise.all([
        fetchDailySummary(supabase),
        fetchLotteryTypeSummary(supabase, selectedDate || undefined),
        fetchBillSummary(supabase, selectedDate || undefined, selectedLotteryType || undefined),
        fetchNumberDetails(supabase, selectedBillNumber || undefined)
      ]);
      
      setDailySummary(dailyData);
      setLotteryTypeSummary(typeData);
      setBillSummary(billData);
      setNumberDetails(numberData);
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
  }, [selectedDate, selectedLotteryType, selectedBillNumber]);

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
                      key={item.draw_date}
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
            {(selectedDate || selectedLotteryType) && (
              <span className="text-sm font-normal text-muted-foreground">
                - {selectedDate && formatDate(selectedDate)}
                {selectedLotteryType && ` (ID: ${selectedLotteryType})`}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>เลขที่บิล</TableHead>
                  <TableHead>วันที่</TableHead>
                  <TableHead>ผู้ซื้อ</TableHead>
                  <TableHead>ประเภทหวย</TableHead>
                  <TableHead className="text-right">จำนวนเลข</TableHead>
                  <TableHead className="text-right">ยอดซื้อ</TableHead>
                  <TableHead className="text-right">ยอดจ่าย</TableHead>
                  <TableHead className="text-right">กำไร/ขาดทุน</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
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
                      <TableCell>{item.user_name || 'ไม่ระบุ'}</TableCell>
                      <TableCell>{item.sub_type_name} ({item.country_origin})</TableCell>
                      <TableCell className="text-right">{item.numbers_count.toLocaleString()}</TableCell>
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
                  <TableHead>บิล</TableHead>
                  <TableHead>ประเภทหวย</TableHead>
                  <TableHead>จำนวนหลัก</TableHead>
                  <TableHead>ประเภท</TableHead>
                  <TableHead>เลข</TableHead>
                  <TableHead className="text-right">ยอดซื้อ</TableHead>
                  <TableHead className="text-right">อัตราจ่าย</TableHead>
                  <TableHead className="text-center">ถูกรางวัล</TableHead>
                  <TableHead className="text-right">ยอดจ่าย</TableHead>
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
                      <TableCell className="font-medium">{item.bill_number}</TableCell>
                      <TableCell>{item.lottery_type_name}</TableCell>
                      <TableCell className="text-center">{item.digit_number}</TableCell>
                      <TableCell>{item.type_number}</TableCell>
                      <TableCell className="font-mono">{item.numbers.join(', ')}</TableCell>
                      <TableCell className="text-right">{formatCurrency(Number(item.amount))}</TableCell>
                      <TableCell className="text-right">{item.price_paid}x</TableCell>
                      <TableCell className="text-center">
                        {item.is_winning ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            ถูก
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            ไม่ถูก
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {item.is_winning ? formatCurrency(Number(item.payout_amount)) : '-'}
                      </TableCell>
                      <TableCell className="font-mono">{item.winning_numbers || '-'}</TableCell>
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
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
 