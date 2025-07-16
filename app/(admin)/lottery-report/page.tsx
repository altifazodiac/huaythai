 
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
  Trash
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

// Comprehensive interfaces for lottery report
interface LotteryReportData {
  draw_date: string;
  user_name: string;
  total_purchase_amount: number;
  total_reward_amount: number;
  remaining_balance: number;
  commission_percentage: number;
  net_remaining_balance: number;
  bill_count: number;
  ticket_count: number;
  status: string;
  deleted_at?: string;
  purchase_date: string;
}

interface DateGroupedReport {
  date: string;
  total_purchase: number;
  total_reward: number;
  total_remaining: number;
  total_commission: number;
  total_net_remaining: number;
  user_count: number;
  bill_count: number;
  reports: LotteryReportData[];
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

// Data fetching function
const fetchLotteryReportData = async (supabase: any, startDate?: string, endDate?: string): Promise<LotteryReportData[]> => {
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
        profiles!inner(
          name,
          percent
        ),
        lottery_ticket_items(count)
      `)
      .order('draw_date', { ascending: false });
    if (startDate) query = query.gte('draw_date', startDate);
    if (endDate) query = query.lte('draw_date', endDate);
    const { data: tickets, error } = await query;
    if (error) throw error;
    if (!tickets || tickets.length === 0) return [];
    return tickets.map((ticket: any) => {
      const totalReward = 0;
      const commissionPercentage = Number(ticket.profiles?.percent || 0);
      const remainingBalance = Number(ticket.total_amount || 0) - totalReward;
      const commissionAmount = (remainingBalance * commissionPercentage) / 100;
      const netRemainingBalance = remainingBalance - commissionAmount;
      return {
        draw_date: ticket.draw_date,
        purchase_date: ticket.purchase_date,
        user_name: ticket.profiles?.name || '',
        total_purchase_amount: Number(ticket.total_amount || 0),
        total_reward_amount: totalReward,
        remaining_balance: remainingBalance,
        commission_percentage: commissionPercentage,
        net_remaining_balance: netRemainingBalance,
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
  const [reportData, setReportData] = useState<LotteryReportData[]>([]);
  const [groupedData, setGroupedData] = useState<DateGroupedReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'user'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const isMobile = useIsMobile();

  // Calculate totals
  const totals = useMemo(() => {
    return groupedData.reduce((acc, group) => ({
      total_purchase: acc.total_purchase + group.total_purchase,
      total_reward: acc.total_reward + group.total_reward,
      total_remaining: acc.total_remaining + group.total_remaining,
      total_commission: acc.total_commission + group.total_commission,
      total_net_remaining: acc.total_net_remaining + group.total_net_remaining,
      total_users: acc.total_users + group.user_count,
      total_bills: acc.total_bills + group.bill_count
    }), {
      total_purchase: 0,
      total_reward: 0,
      total_remaining: 0,
      total_commission: 0,
      total_net_remaining: 0,
      total_users: 0,
      total_bills: 0
    });
  }, [groupedData]);

  // Summary by status
  const statusSummary = useMemo(() => {
    const summary = { confirmed: 0, pending: 0, cancelled: 0, deleted: 0 };
    reportData.forEach((item) => {
      if (item.deleted_at) summary.deleted++;
      else if (item.status === 'confirmed') summary.confirmed++;
      else if (item.status === 'pending') summary.pending++;
      else if (item.status === 'cancelled') summary.cancelled++;
    });
    return summary;
  }, [reportData]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchLotteryReportData(supabase, selectedDate);
      setReportData(data);

      // Group data by date
      const grouped = data.reduce((acc: { [key: string]: DateGroupedReport }, item) => {
        const date = item.draw_date;
        if (!acc[date]) {
          acc[date] = {
            date,
            total_purchase: 0,
            total_reward: 0,
            total_remaining: 0,
            total_commission: 0,
            total_net_remaining: 0,
            user_count: 0,
            bill_count: 0,
            reports: []
          };
        }
        
        acc[date].total_purchase = item.total_purchase_amount;
        acc[date].total_reward = item.total_reward_amount;
        acc[date].total_remaining = item.remaining_balance;
        acc[date].total_commission = (item.remaining_balance * item.commission_percentage / 100);
        acc[date].total_net_remaining = item.net_remaining_balance;
        acc[date].user_count = 1;
        acc[date].bill_count = item.bill_count;
        acc[date].reports.push(item);
        
        return acc;
      }, {});

      const sortedGroups = Object.values(grouped).sort((a, b) => {
        switch (sortBy) {
          case 'date':
            return sortOrder === 'desc' 
              ? new Date(b.date).getTime() - new Date(a.date).getTime()
              : new Date(a.date).getTime() - new Date(b.date).getTime();
          case 'amount':
            return sortOrder === 'desc' 
              ? b.total_purchase - a.total_purchase
              : a.total_purchase - b.total_purchase;
          case 'user':
            return sortOrder === 'desc' 
              ? b.user_count - a.user_count
              : a.user_count - b.user_count;
          default:
            return 0;
        }
      });

      setGroupedData(sortedGroups);
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

  const toggleDateExpansion = (date: string) => {
    const newExpanded = new Set(expandedDates);
    if (newExpanded.has(date)) {
      newExpanded.delete(date);
    } else {
      newExpanded.add(date);
    }
    setExpandedDates(newExpanded);
  };

  const filteredGroupedData = useMemo(() => {
    let filtered = groupedData;
    if (searchTerm) {
      filtered = filtered.map(group => ({
        ...group,
        reports: group.reports.filter(report =>
          report.user_name.toLowerCase().includes(searchTerm.toLowerCase())
        )
      })).filter(group => group.reports.length > 0);
    }
    if (statusFilter && statusFilter !== 'all') {
      filtered = filtered.map(group => ({
        ...group,
        reports: group.reports.filter(report =>
          statusFilter === 'deleted'
            ? report.deleted_at
            : report.status === statusFilter && !report.deleted_at
        )
      })).filter(group => group.reports.length > 0);
    } else if (!searchTerm) {
      // Default: แสดงเฉพาะ confirmed (และไม่ถูกลบ)
      filtered = filtered.map(group => ({
        ...group,
        reports: group.reports.filter(report => report.status === 'confirmed' && !report.deleted_at)
      })).filter(group => group.reports.length > 0);
    }
    // ถ้า filter ผู้ใช้ ให้แสดงแค่แถวเดียวต่อ user (user_name)
    if (searchTerm) {
      filtered = filtered.map(group => ({
        ...group,
        reports: group.reports.slice(0, 1)
      }));
    }
    return filtered;
  }, [groupedData, searchTerm, statusFilter]);

  const clearFilters = () => {
    setSelectedDate('');
    setSearchTerm('');
    setStatusFilter('all');
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
                      <BreadcrumbPage>รายงานหวย</BreadcrumbPage>
                    </BreadcrumbItem>
                  </BreadcrumbList>
                </Breadcrumb>
              </div>
            </div>

            <div className={`p-1 md:p-4 space-y-2 md:space-y-4`}> {/* ลด padding และ space-y */}
              {/* Header */}
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-3xl font-bold tracking-tight">รายงานหวย</h1>
                    <p className="text-muted-foreground">
                      ดูสรุปข้อมูลการซื้อหวย รางวัล และกำไร-ขาดทุน
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

                {/* Filters */}
                <Card className="p-2 md:p-4">
                  <CardHeader className="pb-2 flex flex-row items-center justify-between">
                    <CardTitle className="text-base md:text-lg flex items-center">
                      <Filter className="h-4 w-4 mr-2" />
                      ตัวกรองข้อมูล
                    </CardTitle>
                    <Button size="sm" variant="ghost" className="ml-auto" onClick={clearFilters}>
                      <X className="h-4 w-4" />
                    </Button>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
                      {/* วันที่ */}
                      <div className="space-y-1">
                        <label className="text-xs font-medium">วันที่</label>
                        <Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="text-xs py-1 px-2" placeholder="เลือกวันที่" />
                      </div>
                      {/* ค้นหาผู้ใช้ */}
                      <div className="space-y-1">
                        <label className="text-xs font-medium">ค้นหาผู้ใช้</label>
                        <div className="relative">
                          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                          <Input placeholder="ชื่อผู้ใช้..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-8 text-xs py-1 px-2" />
                        </div>
                      </div>
                      {/* สถานะบิล */}
                      <div className="space-y-1">
                        <label className="text-xs font-medium">สถานะบิล</label>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                          <SelectTrigger className="text-xs py-1 px-2 h-8">
                            <SelectValue placeholder="ทั้งหมด" />
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
                      {/* เรียงตาม */}
                      <div className="space-y-1">
                        <label className="text-xs font-medium">เรียงตาม</label>
                        <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                          <SelectTrigger className="text-xs py-1 px-2 h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="date">วันที่</SelectItem>
                            <SelectItem value="amount">ยอดซื้อ</SelectItem>
                            <SelectItem value="user">จำนวนผู้ใช้</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {/* ลำดับ */}
                      <div className="space-y-1">
                        <label className="text-xs font-medium">ลำดับ</label>
                        <Select value={sortOrder} onValueChange={(value: any) => setSortOrder(value)}>
                          <SelectTrigger className="text-xs py-1 px-2 h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="desc">มากไปน้อย</SelectItem>
                            <SelectItem value="asc">น้อยไปมาก</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Summary Cards: เพิ่มสถานะ */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4"> {/* ลด gap บน mobile */}
                  <motion.div variants={cardVariants}>
                    <Card className="py-1 px-1 md:py-2 md:px-2">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 md:pb-2">
                        <CardTitle className="text-xs md:text-sm font-medium">บิลยืนยันแล้ว</CardTitle>
                        <CreditCard className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-base md:text-2xl font-bold">{statusSummary.confirmed}</div>
                        <p className="text-xs text-muted-foreground">confirmed</p>
                      </CardContent>
                    </Card>
                  </motion.div>
                  <motion.div variants={cardVariants}>
                    <Card className="py-1 px-1 md:py-2 md:px-2">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 md:pb-2">
                        <CardTitle className="text-xs md:text-sm font-medium">รออนุมัติ</CardTitle>
                        <AlertCircle className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-base md:text-2xl font-bold">{statusSummary.pending}</div>
                        <p className="text-xs text-muted-foreground">pending</p>
                      </CardContent>
                    </Card>
                  </motion.div>
                  <motion.div variants={cardVariants}>
                    <Card className="py-1 px-1 md:py-2 md:px-2">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 md:pb-2">
                        <CardTitle className="text-xs md:text-sm font-medium">บิลยกเลิก</CardTitle>
                        <X className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-base md:text-2xl font-bold">{statusSummary.cancelled}</div>
                        <p className="text-xs text-muted-foreground">cancelled</p>
                      </CardContent>
                    </Card>
                  </motion.div>
                  <motion.div variants={cardVariants}>
                    <Card className="py-1 px-1 md:py-2 md:px-2">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 md:pb-2">
                        <CardTitle className="text-xs md:text-sm font-medium">บิลที่ถูกลบ</CardTitle>
                        <Trash className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-base md:text-2xl font-bold">{statusSummary.deleted}</div>
                        <p className="text-xs text-muted-foreground">deleted</p>
                      </CardContent>
                    </Card>
                  </motion.div>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <motion.div variants={cardVariants}>
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">ยอดซื้อรวม</CardTitle>
                        <CreditCard className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(totals.total_purchase)}</div>
                        <p className="text-xs text-muted-foreground">
                          {totals.total_bills} บิล
                        </p>
                      </CardContent>
                    </Card>
                  </motion.div>

                  <motion.div variants={cardVariants}>
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">เงินรางวัลรวม</CardTitle>
                        <Trophy className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-green-600">{formatCurrency(totals.total_reward)}</div>
                        <p className="text-xs text-muted-foreground">
                          รางวัลทั้งหมด
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
                        <div className="text-2xl font-bold text-orange-600">{formatCurrency(totals.total_commission)}</div>
                        <p className="text-xs text-muted-foreground">
                          ค่าคอมรวม
                        </p>
                      </CardContent>
                    </Card>
                  </motion.div>

                  <motion.div variants={cardVariants}>
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">ยอดคงเหลือสุทธิ</CardTitle>
                        <PiggyBank className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-blue-600">{formatCurrency(totals.total_net_remaining)}</div>
                        <p className="text-xs text-muted-foreground">
                          หลังหักค่าคอม
                        </p>
                      </CardContent>
                    </Card>
                  </motion.div>
                </div>

                {/* Data Table: เพิ่ม column สถานะ, ปรับขนาด font/card/table สำหรับ mobile */}
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
                ) : filteredGroupedData.length === 0 ? (
                  <Card>
                    <CardContent className="flex items-center justify-center py-12">
                      <div className="text-center">
                        <FileText className="h-8 w-8 mx-auto mb-4 text-muted-foreground" />
                        <p className="text-muted-foreground">ไม่พบข้อมูลรายงาน</p>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {filteredGroupedData.map((group, index) => (
                      <motion.div
                        key={group.date}
                        variants={itemVariants}
                        initial="hidden"
                        animate="visible"
                        transition={{ delay: index * 0.1 }}
                      >
                        <Card>
                          <Collapsible
                            open={expandedDates.has(group.date)}
                            onOpenChange={() => toggleDateExpansion(group.date)}
                          >
                            <CollapsibleTrigger asChild>
                              <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-4">
                                    <Calendar className="h-5 w-5 text-muted-foreground" />
                                    <div>
                                      <CardTitle className="text-lg">{formatDate(group.date)}</CardTitle>
                                      <CardDescription>
                                        {group.user_count} ผู้ใช้ • {group.bill_count} บิล
                                      </CardDescription>
                                    </div>
                                  </div>
                                  <div className="flex items-center space-x-4">
                                    <div className="text-right">
                                      <div className="font-semibold">{formatCurrency(group.total_purchase)}</div>
                                      <div className="text-sm text-muted-foreground">ยอดซื้อ</div>
                                    </div>
                                    <div className="text-right">
                                      <div className="font-semibold text-green-600">{formatCurrency(group.total_reward)}</div>
                                      <div className="text-sm text-muted-foreground">รางวัล</div>
                                    </div>
                                    <div className="text-right">
                                      <div className="font-semibold text-blue-600">{formatCurrency(group.total_net_remaining)}</div>
                                      <div className="text-sm text-muted-foreground">คงเหลือสุทธิ</div>
                                    </div>
                                    {expandedDates.has(group.date) ? (
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
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>ผู้ใช้</TableHead>
                                      <TableHead className="text-right">ยอดซื้อ</TableHead>
                                      <TableHead className="text-right">เงินรางวัล</TableHead>
                                      <TableHead className="text-right">ยอดคงเหลือ</TableHead>
                                      <TableHead className="text-right">ค่าคอม %</TableHead>
                                      <TableHead className="text-right">คงเหลือสุทธิ</TableHead>
                                      <TableHead className="text-right">จำนวนบิล</TableHead>
                                      <TableHead className="text-right">สถานะ</TableHead>
                                      <TableHead className="text-right">จำนวนรายการ</TableHead>
                                      <TableHead className="text-right">วันที่ซื้อ</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {group.reports.map((report, reportIndex) => (
                                      <motion.tr
                                        key={`${report.draw_date}-${report.user_name}-${reportIndex}`}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: reportIndex * 0.05 }}
                                        className="hover:bg-muted/50"
                                      >
                                        <TableCell>
                                          <div className="flex items-center space-x-2">
                                            <User className="h-4 w-4 text-muted-foreground" />
                                            <span className="font-medium">{report.user_name}</span>
                                          </div>
                                        </TableCell>
                                        <TableCell className="text-right font-medium">
                                          {formatCurrency(report.total_purchase_amount)}
                                        </TableCell>
                                        <TableCell className="text-right">
                                          <span className="text-green-600 font-medium">
                                            {formatCurrency(report.total_reward_amount)}
                                          </span>
                                        </TableCell>
                                        <TableCell className="text-right">
                                          {formatCurrency(report.remaining_balance)}
                                        </TableCell>
                                        <TableCell className="text-right">
                                          <Badge variant="outline">
                                            {report.commission_percentage}%
                                          </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                          <span className="text-blue-600 font-medium">
                                            {formatCurrency(report.net_remaining_balance)}
                                          </span>
                                        </TableCell>
                                        <TableCell className="text-right">
                                          <Badge variant="secondary">
                                            {report.bill_count}
                                          </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                          <Badge variant={report.deleted_at ? 'destructive' : report.status === 'confirmed' ? 'default' : report.status === 'pending' ? 'secondary' : 'outline'}>
                                            {report.deleted_at ? 'ลบแล้ว' : report.status}
                                          </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">{report.ticket_count}</TableCell>
                                        <TableCell className="text-right">{formatShortDate(report.purchase_date)}</TableCell>
                                      </motion.tr>
                                    ))}
                                  </TableBody>
                                </Table>
                              </CardContent>
                            </CollapsibleContent>
                          </Collapsible>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            </div>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </DirectionProvider>
  );
};

export default LotteryReportPage;
 