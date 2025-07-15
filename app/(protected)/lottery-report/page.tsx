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
  PiggyBank
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
      duration: 0.5,
      ease: "easeOut"
    }
  }
};

const cardVariants = {
  hidden: { scale: 0.95, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: {
      duration: 0.3,
      ease: "easeOut"
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
        total_amount,
        status,
        user_id,
        users!inner(
          user_name,
          commission_percentage
        ),
        lottery_ticket_items(count)
      `)
      .eq('status', 'confirmed')
      .order('draw_date', { ascending: false });

    if (startDate) {
      query = query.gte('draw_date', startDate);
    }
    if (endDate) {
      query = query.lte('draw_date', endDate);
    }

    const { data: tickets, error } = await query;
    if (error) throw error;

    if (!tickets || tickets.length === 0) {
      return [];
    }

    // Process and group data - for now, we'll set reward amount to 0
    // This can be updated when payout calculation logic is implemented
    const reportData: LotteryReportData[] = tickets.map((ticket: any) => {
      const totalReward = 0; // Placeholder - will be calculated when payout system is implemented
      const commissionPercentage = Number(ticket.users.commission_percentage || 0);
      const remainingBalance = Number(ticket.total_amount || 0) - totalReward;
      const commissionAmount = (remainingBalance * commissionPercentage) / 100;
      const netRemainingBalance = remainingBalance - commissionAmount;

      return {
        draw_date: ticket.draw_date,
        user_name: ticket.users.user_name,
        total_purchase_amount: Number(ticket.total_amount || 0),
        total_reward_amount: totalReward,
        remaining_balance: remainingBalance,
        commission_percentage: commissionPercentage,
        net_remaining_balance: netRemainingBalance,
        bill_count: 1,
        ticket_count: ticket.lottery_ticket_items?.[0]?.count || 0,
        status: ticket.status
      };
    });

    return reportData;
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

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { supabase } = await import('@/lib/supabase/client');
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
        
        acc[date].total_purchase += item.total_purchase_amount;
        acc[date].total_reward += item.total_reward_amount;
        acc[date].total_remaining += item.remaining_balance;
        acc[date].total_commission += (item.remaining_balance * item.commission_percentage / 100);
        acc[date].total_net_remaining += item.net_remaining_balance;
        acc[date].user_count += 1;
        acc[date].bill_count += item.bill_count;
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
    if (!searchTerm) return groupedData;
    
    return groupedData.filter(group => 
      group.reports.some(report => 
        report.user_name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
  }, [groupedData, searchTerm]);

  const clearFilters = () => {
    setSelectedDate('');
    setSearchTerm('');
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

            <div className="p-6 space-y-6">
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
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Filter className="h-5 w-5 mr-2" />
                      ตัวกรองข้อมูล
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">วันที่</label>
                        <Input
                          type="date"
                          value={selectedDate}
                          onChange={(e) => setSelectedDate(e.target.value)}
                          placeholder="เลือกวันที่"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">ค้นหาผู้ใช้</label>
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="ชื่อผู้ใช้..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">เรียงตาม</label>
                        <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="date">วันที่</SelectItem>
                            <SelectItem value="amount">ยอดซื้อ</SelectItem>
                            <SelectItem value="user">จำนวนผู้ใช้</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">ลำดับ</label>
                        <Select value={sortOrder} onValueChange={(value: any) => setSortOrder(value)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="desc">มากไปน้อย</SelectItem>
                            <SelectItem value="asc">น้อยไปมาก</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="flex justify-end mt-4">
                      <Button variant="outline" onClick={clearFilters}>
                        <X className="h-4 w-4 mr-2" />
                        ล้างตัวกรอง
                      </Button>
                    </div>
                  </CardContent>
                </Card>

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

                {/* Data Table */}
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