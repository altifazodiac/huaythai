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
  Search,
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
  MinusCircle
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
import { createResultsMap, calculateWinningsForItem } from '@/lib/utils/lottery-utils';

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
  total_reward_amount: number;
  commission_percentage: number;
  commission_amount: number;
  remaining_balance: number;
  profit_loss: number;
  bill_count: number;
  ticket_count: number;
  status: string;
  deleted_at?: string;
}

interface UserSummary {
  user_id: string;
  user_name: string;
  commission_percentage: number;
  total_purchase: number;
  total_reward: number;
  total_commission: number;
  total_remaining: number;
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
      .select('*, lottery_ticket_items(*, lottery_sub_number(*)), profiles(name)')
      .eq('status', 'confirmed');

    if (startDate) query = query.gte('draw_date', startDate);
    if (endDate) query = query.lte('draw_date', endDate);

    const { data: tickets, error } = await query;
    if (error) throw error;

    return (tickets || []).map((ticket: any) => {
      let total_reward_amount = 0;
      (ticket.lottery_ticket_items || []).forEach((item: any) => {
        const { prize } = calculateWinningsForItem(item, ticket.draw_date, resultsMap);
        total_reward_amount += prize;
      });
      
      const total_purchase_amount = Number(ticket.total_amount || 0);
      const profit_loss = total_purchase_amount - total_reward_amount;
      
      // คำนวณ commission และอื่นๆ
      const commission_percentage = ticket.profiles?.commission_percentage || 0;
      const commission_amount = total_purchase_amount * (commission_percentage / 100);
      const remaining_balance = profit_loss - commission_amount;

      return {
        id: ticket.id,
        draw_date: ticket.draw_date,
        purchase_date: ticket.created_at,
        user_name: ticket.profiles?.name || 'ไม่ระบุ',
        user_id: ticket.user_id,
        total_purchase_amount,
        total_reward_amount,
        commission_percentage,
        commission_amount,
        remaining_balance,
        profit_loss,
        bill_count: 1,
        ticket_count: (ticket.lottery_ticket_items || []).length,
        status: ticket.status,
        deleted_at: ticket.deleted_at
      };
    });
  } catch (err) {
    console.error('Error fetching lottery report data:', err);
    return [];
  }
};

const LotteryReportSummaryPage: React.FC = () => {
  const { user } = useAuth();
  const [reportData, setReportData] = useState<LotteryTransactionData[]>([]);
  const [dateGroupedData, setDateGroupedData] = useState<DateGroupedReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'purchase' | 'profit' | 'commission'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [statusFilter, setStatusFilter] = useState<string>('confirmed');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const isMobile = useIsMobile();

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

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const startDate = selectedDate || undefined;
      const endDate = selectedDate || undefined;

      const resultsMap = await createResultsMap(supabase, startDate || new Date(0).toISOString());
      const data = await fetchLotteryReportData(supabase, resultsMap, startDate, endDate);
      
      setReportData(data);

      // Group data by date first, then by user
      const dateGroups = data.reduce((acc: { [key: string]: DateGroupedReport }, transaction) => {
        const date = transaction.draw_date;
        
        if (!acc[date]) {
          acc[date] = {
            date,
            total_users: 0,
            total_purchase: 0,
            total_reward: 0,
            total_commission: 0,
            total_remaining: 0,
            total_profit_loss: 0,
            total_bills: 0,
            total_transactions: 0,
            users: [],
            commission_rate_average: 0,
            profit_margin_percentage: 0,
          };
        }

        const dateGroup = acc[date];
        dateGroup.total_purchase += transaction.total_purchase_amount;
        dateGroup.total_reward += transaction.total_reward_amount;
        dateGroup.total_commission += transaction.commission_amount;
        dateGroup.total_remaining += transaction.remaining_balance;
        dateGroup.total_profit_loss += transaction.profit_loss;
        dateGroup.total_bills += transaction.bill_count;
        dateGroup.total_transactions += 1;

        // Group users within date
        let userSummary = dateGroup.users.find(u => u.user_id === transaction.user_id);
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
            bill_count: 0,
            transaction_count: 0,
          };
          dateGroup.users.push(userSummary);
        }

        userSummary.total_purchase += transaction.total_purchase_amount;
        userSummary.total_reward += transaction.total_reward_amount;
        userSummary.total_commission += transaction.commission_amount;
        userSummary.total_remaining += transaction.remaining_balance;
        userSummary.total_profit_loss += transaction.profit_loss;
        userSummary.bill_count += transaction.bill_count;
        userSummary.transaction_count += 1;

        return acc;
      }, {});

      // Calculate percentages and set user count
      Object.values(dateGroups).forEach(dateGroup => {
        dateGroup.total_users = dateGroup.users.length;
        dateGroup.commission_rate_average = dateGroup.total_purchase > 0 ? (dateGroup.total_commission / dateGroup.total_purchase) * 100 : 0;
        dateGroup.profit_margin_percentage = dateGroup.total_purchase > 0 ? (dateGroup.total_profit_loss / dateGroup.total_purchase) * 100 : 0;
        
        // Sort users by purchase amount desc
        dateGroup.users.sort((a, b) => b.total_purchase - a.total_purchase);
      });

      // Sort date groups
      const sortedDateGroups = Object.values(dateGroups).sort((a, b) => {
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

      setDateGroupedData(sortedDateGroups);
    } catch (err) {
      console.error('Error loading data:', err);
      setError('เกิดข้อผิดพลาดในการโหลดข้อมูล');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user, selectedDate, sortBy, sortOrder]);

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

  const filteredDateData = useMemo(() => {
    let filtered = dateGroupedData;
    
    if (searchTerm) {
      filtered = filtered.filter(dateGroup =>
        dateGroup.users.some(user => 
          user.user_name.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }

    return filtered;
  }, [dateGroupedData, searchTerm]);

  const clearFilters = () => {
    setSelectedDate('');
    setSearchTerm('');
    setStatusFilter('confirmed');
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
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">ค้นหาผู้ใช้</label>
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="ชื่อผู้ใช้..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">วันที่เริ่มต้น</label>
                        <Input
                          type="date"
                          value={selectedDate}
                          onChange={(e) => setSelectedDate(e.target.value)}
                        />
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

                {/* Enhanced Summary Cards 
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <motion.div variants={cardVariants}>
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Sales Revenue</CardTitle>
                        <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(overallSummary.total_purchase)}</div>
                        <p className="text-xs text-muted-foreground">
                          {overallSummary.total_dates} วัน • {overallSummary.total_users} ผู้ใช้
                        </p>
                      </CardContent>
                    </Card>
                  </motion.div>

                  <motion.div variants={cardVariants}>
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Rewards Paid</CardTitle>
                        <Trophy className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-green-600">{formatCurrency(overallSummary.total_reward)}</div>
                        <p className="text-xs text-muted-foreground">
                          รางวัลที่จ่ายออก
                        </p>
                      </CardContent>
                    </Card>
                  </motion.div>

                  <motion.div variants={cardVariants}>
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Commission</CardTitle>
                        <Percent className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-blue-600">{formatCurrency(overallSummary.total_commission)}</div>
                        <p className="text-xs text-muted-foreground">
                          {overallSummary.commission_rate_average.toFixed(1)}% เฉลี่ย
                        </p>
                      </CardContent>
                    </Card>
                  </motion.div>

                  <motion.div variants={cardVariants}>
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Net Profit/Loss</CardTitle>
                        {overallSummary.total_profit_loss >= 0 ? (
                          <TrendingUp className="h-4 w-4 text-green-600" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-red-600" />
                        )}
                      </CardHeader>
                      <CardContent>
                        <div className={`text-2xl font-bold ${overallSummary.total_profit_loss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatCurrency(overallSummary.total_profit_loss)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {overallSummary.profit_margin_percentage.toFixed(1)}% margin
                        </p>
                      </CardContent>
                    </Card>
                  </motion.div>
                </div>*/}

                {/* Key Performance Indicators 
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center">
                        <Target className="h-4 w-4 mr-2" />
                        Best Performance Day
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-lg font-bold text-green-600">
                        {overallSummary.best_profit_date ? formatShortDate(overallSummary.best_profit_date) : 'N/A'}
                      </div>
                      <p className="text-xs text-muted-foreground">วันที่ทำกำไรสูงสุด</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center">
                        <AlertCircle className="h-4 w-4 mr-2" />
                        Worst Performance Day
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-lg font-bold text-red-600">
                        {overallSummary.worst_profit_date ? formatShortDate(overallSummary.worst_profit_date) : 'N/A'}
                      </div>
                      <p className="text-xs text-muted-foreground">วันที่ขาดทุนสูงสุด</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center">
                        <BarChart3 className="h-4 w-4 mr-2" />
                        Highest Sales Day
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-lg font-bold text-blue-600">
                        {overallSummary.highest_sales_date ? formatShortDate(overallSummary.highest_sales_date) : 'N/A'}
                      </div>
                      <p className="text-xs text-muted-foreground">วันที่ขายได้สูงสุด</p>
                    </CardContent>
                  </Card>
                </div>*/}

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
                              <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50 border-b">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-4">
                                    <div className="flex items-center justify-center w-12 h-12 bg-primary/10 rounded-full">
                                      <Calendar className="h-6 w-6 text-primary" />
                                    </div>
                                    <div>
                                      <CardTitle className="text-xl">{formatDate(dateReport.date)}</CardTitle>
                                      <CardDescription>
                                        {dateReport.total_users} ผู้ใช้ • {dateReport.total_transactions} รายการ • {dateReport.total_bills} บิล
                                      </CardDescription>
                                    </div>
                                  </div>
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
                                    <div className="text-right">
                                      <div className={`font-semibold text-lg ${dateReport.total_profit_loss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {formatCurrency(dateReport.total_profit_loss)}
                                      </div>
                                      <div className="text-sm text-muted-foreground">
                                        {dateReport.total_profit_loss >= 0 ? 'กำไร' : 'ขาดทุน'}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </CardHeader>
                              
                              <CardContent className="p-0">
                                <div className="overflow-x-auto">
                                  <Table>
                                    <TableHeader>
                                      <TableRow className="bg-muted/50">
                                        <TableHead className="w-48">ผู้ใช้</TableHead>
                                        <TableHead className="text-right w-20">คอมมิชชั่น</TableHead>
                                        <TableHead className="text-right w-32">ยอดขาย</TableHead>
                                        <TableHead className="text-right w-32">ค่าคอม</TableHead>
                                        <TableHead className="text-right w-32">ถูกรางวัล</TableHead>
                                        <TableHead className="text-right w-32">ยอดคงเหลือ</TableHead>
                                        <TableHead className="text-right w-32">กำไร/ขาดทุน</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {dateReport.users.map((user, userIndex) => (
                                        <TableRow key={user.user_id} className="hover:bg-muted/30">
                                          <TableCell className="font-medium">
                                            <div className="flex items-center space-x-2">
                                              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                                                <User className="h-4 w-4 text-primary" />
                                              </div>
                                              <div>
                                                <div className="font-medium">{user.user_name}</div>
                                                <div className="text-xs text-muted-foreground">
                                                  {user.bill_count} บิล • {user.transaction_count} รายการ
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
                                            <span className="text-green-600 font-medium">
                                              {formatCurrency(user.total_reward)}
                                            </span>
                                          </TableCell>
                                          <TableCell className="text-right">
                                            <span className="font-medium">
                                              {formatCurrency(user.total_remaining)}
                                            </span>
                                          </TableCell>
                                          <TableCell className="text-right">
                                            <span className={`font-medium ${user.total_profit_loss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                              {user.total_profit_loss >= 0 ? (
                                                <PlusCircle className="h-4 w-4 inline mr-1" />
                                              ) : (
                                                <MinusCircle className="h-4 w-4 inline mr-1" />
                                              )}
                                              {formatCurrency(user.total_profit_loss)}
                                            </span>
                                          </TableCell>
                                        </TableRow>
                                      ))}
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
                              ตารางสรุปรายงานตามวันที่
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="p-0">
                            <div className="overflow-x-auto">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead className="w-48">วันที่</TableHead>
                                    <TableHead className="text-right w-20">ผู้ใช้</TableHead>
                                    <TableHead className="text-right w-32">ยอดขาย</TableHead>
                                    <TableHead className="text-right w-32">ค่าคอม</TableHead>
                                    <TableHead className="text-right w-32">ถูกรางวัล</TableHead>
                                    <TableHead className="text-right w-32">ยอดคงเหลือ</TableHead>
                                    <TableHead className="text-right w-32">กำไร/ขาดทุน</TableHead>
                                    <TableHead className="text-right w-20">อัตราส่วนกำไร</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {filteredDateData.map((dateReport, index) => (
                                    <TableRow key={dateReport.date} className="hover:bg-muted/30">
                                      <TableCell className="font-medium">
                                        <div className="flex items-center space-x-2">
                                          <Calendar className="h-4 w-4 text-muted-foreground" />
                                          <div>
                                            <div className="font-medium">{formatDate(dateReport.date)}</div>
                                            <div className="text-xs text-muted-foreground">
                                              {dateReport.total_transactions} รายการ • {dateReport.total_bills} บิล
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
                                        <span className="font-medium">
                                          {formatCurrency(dateReport.total_remaining)}
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
                                      <TableCell className="text-right">
                                        <Badge variant={dateReport.profit_margin_percentage >= 0 ? 'default' : 'destructive'}>
                                          {dateReport.profit_margin_percentage.toFixed(1)}%
                                        </Badge>
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
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
                      Overall Summary Report
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-primary">{overallSummary.total_dates}</div>
                        <div className="text-sm text-muted-foreground">วันที่ทั้งหมด</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold">{formatCurrency(overallSummary.total_purchase)}</div>
                        <div className="text-sm text-muted-foreground">ยอดขายรวม</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">{formatCurrency(overallSummary.total_commission)}</div>
                        <div className="text-sm text-muted-foreground">ค่าคอมรวม ({overallSummary.commission_rate_average.toFixed(1)}%)</div>
                      </div>
                      <div className="text-center">
                        <div className={`text-2xl font-bold ${overallSummary.total_profit_loss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatCurrency(overallSummary.total_profit_loss)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {overallSummary.total_profit_loss >= 0 ? 'กำไรสุทธิ' : 'ขาดทุนสุทธิ'} ({overallSummary.profit_margin_percentage.toFixed(1)}%)
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