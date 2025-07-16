 
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
  Trash,
  Eye,
  EyeOff,
  Users,
  ShoppingCart,
  Target,
  Minus,
  Plus
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
import { useRequireAuth } from "@/hooks/use-require-auth";
import { useAuth } from '@/lib/contexts/AuthContext';
import { countryFlagImg } from "@/lib/utils/flags";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/lib/supabase/supabaseClient";
import { useIsMobile } from '@/hooks/use-mobile';

// Enhanced interfaces for lottery report
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

interface UserGroupedReport {
  user_id: string;
  user_name: string;
  total_purchase: number;
  total_reward: number;
  total_commission: number;
  total_remaining: number;
  total_profit_loss: number;
  bill_count: number;
  transaction_count: number;
  commission_percentage: number;
  transactions: LotteryTransactionData[];
  date_summary: { [key: string]: DateSummary };
}

interface DateSummary {
  date: string;
  purchase_amount: number;
  reward_amount: number;
  commission_amount: number;
  remaining_balance: number;
  profit_loss: number;
  bill_count: number;
  transactions: LotteryTransactionData[];
}

interface OverallSummary {
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
const fetchLotteryReportData = async (supabase: any, startDate?: string, endDate?: string): Promise<LotteryTransactionData[]> => {
  try {
    let query = supabase
      .from('lottery_tickets')
      .select(`
        id,
        draw_date,
        purchase_date,
        total_amount,
        status,
        deleted_at,
        user_id,
        bill_number,
        profiles!inner(
          name,
          percent
        ),
        lottery_ticket_items(count)
      `)
      .order('profiles(name)', { ascending: true })
      .order('draw_date', { ascending: false });

    if (startDate) query = query.gte('draw_date', startDate);
    if (endDate) query = query.lte('draw_date', endDate);

    const { data: tickets, error } = await query;
    if (error) throw error;
    if (!tickets || tickets.length === 0) return [];

    return tickets.map((ticket: any) => {
      const totalPurchase = Number(ticket.total_amount || 0);
      const totalReward = 0; // Would be calculated from actual winnings
      const commissionPercentage = Number(ticket.profiles?.percent || 0);
      const commissionAmount = (totalPurchase * commissionPercentage) / 100;
      const remainingBalance = totalPurchase - totalReward - commissionAmount;
      // สำหรับเจ้ามือ: กำไร = ยอดขาย - เงินรางวัลที่ต้องจ่าย - ค่าคอม
      const profitLoss = totalPurchase - totalReward - commissionAmount; // Positive = profit, Negative = loss

      return {
        id: ticket.id,
        draw_date: ticket.draw_date,
        purchase_date: ticket.purchase_date,
        user_name: ticket.profiles?.name || '',
        user_id: ticket.user_id,
        total_purchase_amount: totalPurchase,
        total_reward_amount: totalReward,
        commission_percentage: commissionPercentage,
        commission_amount: commissionAmount,
        remaining_balance: remainingBalance,
        profit_loss: profitLoss,
        bill_count: 1,
        ticket_count: ticket.lottery_ticket_items?.[0]?.count || 0,
        status: ticket.status,
        deleted_at: ticket.deleted_at,
      };
    });
  } catch (err) {
    console.error('Error fetching lottery report data:', err);
    throw err;
  }
};

const LotteryReportPage: React.FC = () => {
  const { user } = useAuth();
  const [reportData, setReportData] = useState<LotteryTransactionData[]>([]);
  const [userGroupedData, setUserGroupedData] = useState<UserGroupedReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<'user' | 'purchase' | 'profit' | 'commission'>('user');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [statusFilter, setStatusFilter] = useState<string>('confirmed');
  const [showDeletedRecords, setShowDeletedRecords] = useState(false);
  const isMobile = useIsMobile();

  // Calculate overall summary
  const overallSummary = useMemo((): OverallSummary => {
    const totalUsers = userGroupedData.length;
    const totalTransactions = userGroupedData.reduce((sum, user) => sum + user.transaction_count, 0);
    const totalBills = userGroupedData.reduce((sum, user) => sum + user.bill_count, 0);
    const totalPurchase = userGroupedData.reduce((sum, user) => sum + user.total_purchase, 0);
    const totalReward = userGroupedData.reduce((sum, user) => sum + user.total_reward, 0);
    const totalCommission = userGroupedData.reduce((sum, user) => sum + user.total_commission, 0);
    const totalRemaining = userGroupedData.reduce((sum, user) => sum + user.total_remaining, 0);
    const totalProfitLoss = userGroupedData.reduce((sum, user) => sum + user.total_profit_loss, 0);
    const profitMarginPercentage = totalPurchase > 0 ? (totalProfitLoss / totalPurchase) * 100 : 0;
    const commissionRateAverage = totalPurchase > 0 ? (totalCommission / totalPurchase) * 100 : 0;

    return {
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
    };
  }, [userGroupedData]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchLotteryReportData(supabase, selectedDate);
      setReportData(data);

      // Group data by user first, then by date
      const userGroups = data.reduce((acc: { [key: string]: UserGroupedReport }, transaction) => {
        const userId = transaction.user_id;
        
        if (!acc[userId]) {
          acc[userId] = {
            user_id: userId,
            user_name: transaction.user_name,
            total_purchase: 0,
            total_reward: 0,
            total_commission: 0,
            total_remaining: 0,
            total_profit_loss: 0,
            bill_count: 0,
            transaction_count: 0,
            commission_percentage: transaction.commission_percentage,
            transactions: [],
            date_summary: {}
          };
        }

        const userGroup = acc[userId];
        userGroup.total_purchase += transaction.total_purchase_amount;
        userGroup.total_reward += transaction.total_reward_amount;
        userGroup.total_commission += transaction.commission_amount;
        userGroup.total_remaining += transaction.remaining_balance;
        userGroup.total_profit_loss += transaction.profit_loss;
        userGroup.bill_count += transaction.bill_count;
        userGroup.transaction_count += 1;
        userGroup.transactions.push(transaction);

        // Group by date within user
        const date = transaction.draw_date;
        if (!userGroup.date_summary[date]) {
          userGroup.date_summary[date] = {
            date,
            purchase_amount: 0,
            reward_amount: 0,
            commission_amount: 0,
            remaining_balance: 0,
            profit_loss: 0,
            bill_count: 0,
            transactions: []
          };
        }

        const dateSummary = userGroup.date_summary[date];
        dateSummary.purchase_amount += transaction.total_purchase_amount;
        dateSummary.reward_amount += transaction.total_reward_amount;
        dateSummary.commission_amount += transaction.commission_amount;
        dateSummary.remaining_balance += transaction.remaining_balance;
        dateSummary.profit_loss += transaction.profit_loss;
        dateSummary.bill_count += transaction.bill_count;
        dateSummary.transactions.push(transaction);

        return acc;
      }, {});

      // Sort user groups
      const sortedUserGroups = Object.values(userGroups).sort((a, b) => {
        switch (sortBy) {
          case 'user':
            return sortOrder === 'asc' 
              ? a.user_name.localeCompare(b.user_name)
              : b.user_name.localeCompare(a.user_name);
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

      setUserGroupedData(sortedUserGroups);
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
      minimumFractionDigits: 2
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

  const toggleUserExpansion = (userId: string) => {
    const newExpanded = new Set(expandedUsers);
    if (newExpanded.has(userId)) {
      newExpanded.delete(userId);
    } else {
      newExpanded.add(userId);
    }
    setExpandedUsers(newExpanded);
  };

  const toggleDateExpansion = (dateKey: string) => {
    const newExpanded = new Set(expandedDates);
    if (newExpanded.has(dateKey)) {
      newExpanded.delete(dateKey);
    } else {
      newExpanded.add(dateKey);
    }
    setExpandedDates(newExpanded);
  };

  const filteredUserData = useMemo(() => {
    let filtered = userGroupedData;
    
    if (searchTerm) {
      filtered = filtered.filter(user =>
        user.user_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.map(user => ({
        ...user,
        transactions: user.transactions.filter(transaction => {
          if (statusFilter === 'deleted') {
            return transaction.deleted_at;
          } else {
            return transaction.status === statusFilter && !transaction.deleted_at;
          }
        }),
        date_summary: Object.fromEntries(
          Object.entries(user.date_summary).filter(([_, dateSummary]) => 
            dateSummary.transactions.some(transaction => {
              if (statusFilter === 'deleted') {
                return transaction.deleted_at;
              } else {
                return transaction.status === statusFilter && !transaction.deleted_at;
              }
            })
          )
        )
      })).filter(user => user.transactions.length > 0);
    }

    return filtered;
  }, [userGroupedData, searchTerm, statusFilter]);

  const clearFilters = () => {
    setSelectedDate('');
    setSearchTerm('');
    setStatusFilter('confirmed');
    setExpandedUsers(new Set());
    setExpandedDates(new Set());
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
                      <BreadcrumbPage>รายงานหวยแบบรายละเอียด</BreadcrumbPage>
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
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight">รายงานหวยแบบรายละเอียด</h1>
                    <p className="text-muted-foreground">
                      วิเคราะห์ข้อมูลการขายหวยตามผู้ใช้ พร้อมคำนวณกำไร-ขาดทุนสำหรับเจ้ามือ
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
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                        <label className="text-sm font-medium">สถานะ</label>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">ทั้งหมด</SelectItem>
                            <SelectItem value="confirmed">ยืนยันแล้ว</SelectItem>
                            <SelectItem value="pending">รออนุมัติ</SelectItem>
                            <SelectItem value="cancelled">ยกเลิก</SelectItem>
                            <SelectItem value="deleted">ลบแล้ว</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">เรียงตาม</label>
                        <div className="flex space-x-2">
                          <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="user">ผู้ใช้</SelectItem>
                              <SelectItem value="purchase">ยอดขาย</SelectItem>
                              <SelectItem value="profit">กำไร/ขาดทุน</SelectItem>
                              <SelectItem value="commission">ค่าคอม</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                          >
                            {sortOrder === 'asc' ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Enhanced Summary Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <motion.div variants={cardVariants}>
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">ยอดขายรวม (เจ้ามือ)</CardTitle>
                        <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(overallSummary.total_purchase)}</div>
                        <p className="text-xs text-muted-foreground">
                          {overallSummary.total_users} ผู้ใช้ • {overallSummary.total_bills} บิล
                        </p>
                      </CardContent>
                    </Card>
                  </motion.div>

                  <motion.div variants={cardVariants}>
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">เงินรางวัลจ่าย</CardTitle>
                        <Trophy className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-green-600">{formatCurrency(overallSummary.total_reward)}</div>
                        <p className="text-xs text-muted-foreground">
                          รางวัลที่จ่ายออกไป
                        </p>
                      </CardContent>
                    </Card>
                  </motion.div>

                  <motion.div variants={cardVariants}>
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">ค่าคอมมิชชั่น</CardTitle>
                        <Percent className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-blue-600">{formatCurrency(overallSummary.total_commission)}</div>
                        <p className="text-xs text-muted-foreground">
                          {overallSummary.commission_rate_average.toFixed(2)}% เฉลี่ย
                        </p>
                      </CardContent>
                    </Card>
                  </motion.div>

                  <motion.div variants={cardVariants}>
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">กำไร/ขาดทุน (เจ้ามือ)</CardTitle>
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
                          {overallSummary.profit_margin_percentage.toFixed(2)}% margin
                        </p>
                      </CardContent>
                    </Card>
                  </motion.div>
                </div>

                {/* User-Grouped Data Display */}
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
                ) : filteredUserData.length === 0 ? (
                  <Card>
                    <CardContent className="flex items-center justify-center py-12">
                      <div className="text-center">
                        <Users className="h-8 w-8 mx-auto mb-4 text-muted-foreground" />
                        <p className="text-muted-foreground">ไม่พบข้อมูลผู้ใช้</p>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {filteredUserData.map((userReport, index) => (
                      <motion.div
                        key={userReport.user_id}
                        variants={itemVariants}
                        initial="hidden"
                        animate="visible"
                        transition={{ delay: index * 0.1 }}
                      >
                        <Card className="overflow-hidden">
                          <Collapsible
                            open={expandedUsers.has(userReport.user_id)}
                            onOpenChange={() => toggleUserExpansion(userReport.user_id)}
                          >
                            <CollapsibleTrigger asChild>
                              <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-4">
                                    <div className="flex items-center justify-center w-12 h-12 bg-primary/10 rounded-full">
                                      <User className="h-6 w-6 text-primary" />
                                    </div>
                                    <div>
                                      <CardTitle className="text-xl">{userReport.user_name}</CardTitle>
                                      <CardDescription>
                                        {userReport.transaction_count} รายการ • {userReport.bill_count} บิล • คอมมิชชั่น {userReport.commission_percentage}%
                                      </CardDescription>
                                    </div>
                                  </div>
                                  <div className="flex items-center space-x-6">
                                    <div className="text-right">
                                      <div className="font-semibold text-lg">{formatCurrency(userReport.total_purchase)}</div>
                                      <div className="text-sm text-muted-foreground">ยอดขาย</div>
                                    </div>
                                    <div className="text-right">
                                      <div className="font-semibold text-lg text-green-600">{formatCurrency(userReport.total_reward)}</div>
                                      <div className="text-sm text-muted-foreground">รางวัล</div>
                                    </div>
                                    <div className="text-right">
                                      <div className="font-semibold text-lg text-blue-600">{formatCurrency(userReport.total_commission)}</div>
                                      <div className="text-sm text-muted-foreground">ค่าคอม</div>
                                    </div>
                                    <div className="text-right">
                                      <div className={`font-semibold text-lg ${userReport.total_profit_loss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {formatCurrency(userReport.total_profit_loss)}
                                      </div>
                                      <div className="text-sm text-muted-foreground">
                                        {userReport.total_profit_loss >= 0 ? 'กำไร' : 'ขาดทุน'}
                                      </div>
                                    </div>
                                    {expandedUsers.has(userReport.user_id) ? (
                                      <ChevronUp className="h-5 w-5 text-muted-foreground" />
                                    ) : (
                                      <ChevronDown className="h-5 w-5 text-muted-foreground" />
                                    )}
                                  </div>
                                </div>
                              </CardHeader>
                            </CollapsibleTrigger>
                            
                            <CollapsibleContent>
                              <CardContent className="pt-0">
                                <div className="space-y-4">
                                  {Object.entries(userReport.date_summary)
                                    .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
                                    .map(([date, dateSummary]) => (
                                      <div key={`${userReport.user_id}-${date}`} className="border rounded-lg p-4">
                                        <Collapsible
                                          open={expandedDates.has(`${userReport.user_id}-${date}`)}
                                          onOpenChange={() => toggleDateExpansion(`${userReport.user_id}-${date}`)}
                                        >
                                          <CollapsibleTrigger asChild>
                                            <div className="flex items-center justify-between cursor-pointer hover:bg-muted/30 p-2 rounded">
                                              <div className="flex items-center space-x-3">
                                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                                <div>
                                                  <div className="font-medium">{formatDate(date)}</div>
                                                  <div className="text-sm text-muted-foreground">
                                                    {dateSummary.bill_count} บิล • {dateSummary.transactions.length} รายการ
                                                  </div>
                                                </div>
                                              </div>
                                              <div className="flex items-center space-x-4">
                                                <div className="text-right">
                                                  <div className="font-medium">{formatCurrency(dateSummary.purchase_amount)}</div>
                                                  <div className="text-xs text-muted-foreground">ยอดขาย</div>
                                                </div>
                                                <div className="text-right">
                                                  <div className="font-medium text-green-600">{formatCurrency(dateSummary.reward_amount)}</div>
                                                  <div className="text-xs text-muted-foreground">รางวัล</div>
                                                </div>
                                                <div className="text-right">
                                                  <div className="font-medium text-blue-600">{formatCurrency(dateSummary.commission_amount)}</div>
                                                  <div className="text-xs text-muted-foreground">ค่าคอม</div>
                                                </div>
                                                <div className="text-right">
                                                  <div className={`font-medium ${dateSummary.profit_loss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                    {formatCurrency(dateSummary.profit_loss)}
                                                  </div>
                                                  <div className="text-xs text-muted-foreground">
                                                    {dateSummary.profit_loss >= 0 ? 'กำไร' : 'ขาดทุน'}
                                                  </div>
                                                </div>
                                                {expandedDates.has(`${userReport.user_id}-${date}`) ? (
                                                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                                                ) : (
                                                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                                )}
                                              </div>
                                            </div>
                                          </CollapsibleTrigger>
                                          
                                          <CollapsibleContent>
                                            <div className="mt-4">
                                              <Table>
                                                <TableHeader>
                                                  <TableRow>
                                                    <TableHead>เลขที่บิล</TableHead>
                                                    <TableHead className="text-right">ยอดขาย</TableHead>
                                                    <TableHead className="text-right">รางวัล</TableHead>
                                                    <TableHead className="text-right">ค่าคอม</TableHead>
                                                    <TableHead className="text-right">คงเหลือ</TableHead>
                                                    <TableHead className="text-right">กำไร/ขาดทุน</TableHead>
                                                    <TableHead className="text-right">สถานะ</TableHead>
                                                    <TableHead className="text-right">วันที่ซื้อ</TableHead>
                                                  </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                  {dateSummary.transactions.map((transaction, transactionIndex) => (
                                                    <TableRow key={transaction.id}>
                                                      <TableCell className="font-medium">{transaction.id.substring(0, 8)}...</TableCell>
                                                      <TableCell className="text-right font-medium">
                                                        {formatCurrency(transaction.total_purchase_amount)}
                                                      </TableCell>
                                                      <TableCell className="text-right">
                                                        <span className="text-green-600 font-medium">
                                                          {formatCurrency(transaction.total_reward_amount)}
                                                        </span>
                                                      </TableCell>
                                                      <TableCell className="text-right">
                                                        <span className="text-blue-600 font-medium">
                                                          {formatCurrency(transaction.commission_amount)}
                                                        </span>
                                                      </TableCell>
                                                      <TableCell className="text-right">
                                                        {formatCurrency(transaction.remaining_balance)}
                                                      </TableCell>
                                                      <TableCell className="text-right">
                                                        <span className={`font-medium ${transaction.profit_loss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                          {formatCurrency(transaction.profit_loss)}
                                                        </span>
                                                      </TableCell>
                                                      <TableCell className="text-right">
                                                        <Badge variant={
                                                          transaction.deleted_at ? 'destructive' :
                                                          transaction.status === 'confirmed' ? 'default' :
                                                          transaction.status === 'pending' ? 'secondary' : 'outline'
                                                        }>
                                                          {transaction.deleted_at ? 'ลบแล้ว' : transaction.status}
                                                        </Badge>
                                                      </TableCell>
                                                      <TableCell className="text-right">
                                                        {formatShortDate(transaction.purchase_date)}
                                                      </TableCell>
                                                    </TableRow>
                                                  ))}
                                                </TableBody>
                                              </Table>
                                            </div>
                                          </CollapsibleContent>
                                        </Collapsible>
                                      </div>
                                    ))}
                                </div>
                              </CardContent>
                            </CollapsibleContent>
                          </Collapsible>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                )}

                {/* Overall Summary Footer */}
                <Card className="mt-8">
                  <CardHeader>
                    <CardTitle className="text-xl flex items-center">
                      <Calculator className="h-5 w-5 mr-2" />
                      สรุปรวมทั้งหมด
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-primary">{overallSummary.total_users}</div>
                        <div className="text-sm text-muted-foreground">ผู้ใช้ทั้งหมด</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold">{formatCurrency(overallSummary.total_purchase)}</div>
                        <div className="text-sm text-muted-foreground">ยอดขายรวม (เจ้ามือ)</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">{formatCurrency(overallSummary.total_commission)}</div>
                        <div className="text-sm text-muted-foreground">ค่าคอมรวม ({overallSummary.commission_rate_average.toFixed(2)}%)</div>
                      </div>
                      <div className="text-center">
                        <div className={`text-2xl font-bold ${overallSummary.total_profit_loss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatCurrency(overallSummary.total_profit_loss)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {overallSummary.total_profit_loss >= 0 ? 'กำไรสุทธิ (เจ้ามือ)' : 'ขาดทุนสุทธิ (เจ้ามือ)'} ({overallSummary.profit_margin_percentage.toFixed(2)}%)
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

export default LotteryReportPage;
 
 