"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  BarChart3, 
  Users, 
  Ticket, 
  TrendingUp, 
  TrendingDown,
  Settings, 
  FileText, 
  Loader2, 
  DollarSign,
  RefreshCw,
  Filter,
  Calendar,
  Eye,
  EyeOff,
  PieChart,
  Activity,
  Award,
  Target,
  Zap,
  Clock,
  Star,
  ArrowUp,
  ArrowDown,
  Hash
} from 'lucide-react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';

// Import updated components
import RevenueChart from './RevenueChart';
import UserChart from './UserChart';
import TicketChart from './TicketChart';
import LotteryTypePie from './LotteryTypePie';
import DetailModal from './DetailModal';
import ExportButton from './ExportButton';

// Import updated data fetching
import { fetchDashboardData, type DashboardData } from './dashboardData';

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

// Format currency in Thai Baht
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
};

// Performance indicator component
const PerformanceIndicator = ({ value, previousValue, label }: { value: number; previousValue: number; label: string }) => {
  const change = value - previousValue;
  const changePercent = previousValue > 0 ? ((change / previousValue) * 100) : 0;
  const isPositive = change >= 0;

  return (
    <div className="flex items-center space-x-2">
      <div className={`flex items-center space-x-1 ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
        {isPositive ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
        <span className="text-xs font-medium">
          {Math.abs(changePercent).toFixed(1)}%
        </span>
      </div>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
};

export default function AdminDashboard() {
  const { user } = useAuth();
  const [selectedDetail, setSelectedDetail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [dateRange, setDateRange] = useState('week');
  const [chartType, setChartType] = useState<'bar' | 'line'>('bar');
  const [showFilters, setShowFilters] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [refreshing, setRefreshing] = useState(false);

  // Fetch data function
  const loadData = async () => {
    try {
      setLoading(true);
      const data = await fetchDashboardData(dateRange);
      setDashboardData(data);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Refresh data
  const refreshData = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  // Load data on component mount and when dateRange changes
  useEffect(() => {
    loadData();
  }, [dateRange]);

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-lg font-medium">กำลังโหลดข้อมูล...</p>
          <p className="text-sm text-muted-foreground">รอสักครู่...</p>
        </motion.div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="flex items-center justify-center h-screen">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-lg font-medium">ไม่พบข้อมูล</p>
          <Button onClick={loadData} className="mt-4">
            ลองใหม่
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="flex-1 space-y-6 p-4 md:p-8"
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between space-y-4 md:space-y-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            แดชบอร์ดผู้ดูแลระบบ
          </h1>
          <p className="text-muted-foreground">
            ภาพรวมข้อมูลการขายหวยและสถิติต่างๆ
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center space-x-2"
          >
            <Filter className="h-4 w-4" />
            <span>ตัวกรอง</span>
            {showFilters ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={refreshData}
            disabled={refreshing}
            className="flex items-center space-x-2"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span>รีเฟรช</span>
          </Button>
          <ExportButton
            data={dashboardData.revenue.dailyRevenue}
            filename="dashboard-report"
            size="sm"
          >
            ส่งออกรายงาน
          </ExportButton>
        </div>
      </div>

      {/* Filters */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <Settings className="h-5 w-5 mr-2" />
                  ตัวกรองและการตั้งค่า
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">ช่วงเวลา</label>
                    <Select value={dateRange} onValueChange={setDateRange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="week">7 วันล่าสุด</SelectItem>
                        <SelectItem value="month">30 วันล่าสุด</SelectItem>
                        <SelectItem value="quarter">90 วันล่าสุด</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">ประเภทกราฟ</label>
                    <Select value={chartType} onValueChange={(value: 'bar' | 'line') => setChartType(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bar">แท่งกราฟ</SelectItem>
                        <SelectItem value="line">เส้นกราฟ</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">การแสดงผล</label>
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline">
                        <Activity className="h-3 w-3 mr-1" />
                        สด
                      </Badge>
                      <Badge variant="outline">
                        <Calendar className="h-3 w-3 mr-1" />
                        {dateRange === 'week' ? '7 วัน' : dateRange === 'month' ? '30 วัน' : '90 วัน'}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview" className="flex items-center space-x-2">
            <BarChart3 className="h-4 w-4" />
            <span>ภาพรวม</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center space-x-2">
            <Activity className="h-4 w-4" />
            <span>การวิเคราะห์</span>
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center space-x-2">
            <FileText className="h-4 w-4" />
            <span>รายงาน</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-6">
          {/* Quick Stats Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <motion.div variants={cardVariants}>
              <Card className="relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-blue-600"></div>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">ยอดขายรวม</CardTitle>
                  <div className="p-2 bg-blue-100 rounded-full">
                    <TrendingUp className="h-4 w-4 text-blue-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatCurrency(dashboardData.performance.totalSales)}
                  </div>
                  <PerformanceIndicator 
                    value={dashboardData.performance.totalSales}
                    previousValue={dashboardData.performance.averageDailySales * 7}
                    label="เทียบกับสัปดาห์ก่อน"
                  />
                </CardContent>
              </Card>
            </motion.div>
            
            <motion.div variants={cardVariants}>
              <Card className="relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-500 to-green-600"></div>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">จ่ายรางวัล</CardTitle>
                  <div className="p-2 bg-green-100 rounded-full">
                    <Award className="h-4 w-4 text-green-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatCurrency(dashboardData.performance.totalPayout)}
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <Target className="h-3 w-3" />
                    <span>อัตราจ่าย: {dashboardData.winning.payoutRate.toFixed(1)}%</span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
            
            <motion.div variants={cardVariants}>
              <Card className="relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 to-amber-600"></div>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">จำนวนตั๋ว</CardTitle>
                  <div className="p-2 bg-amber-100 rounded-full">
                    <Ticket className="h-4 w-4 text-amber-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{dashboardData.tickets.sold.toLocaleString()}</div>
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>รอ: {dashboardData.tickets.pending.toLocaleString()}</span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
            
            <motion.div variants={cardVariants}>
              <Card className="relative overflow-hidden">
                <div className={`absolute top-0 left-0 w-full h-1 ${dashboardData.performance.netProfit >= 0 ? 'bg-gradient-to-r from-green-500 to-green-600' : 'bg-gradient-to-r from-red-500 to-red-600'}`}></div>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">กำไร/ขาดทุน</CardTitle>
                  <div className={`p-2 rounded-full ${dashboardData.performance.netProfit >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                    {dashboardData.performance.netProfit >= 0 ? (
                      <TrendingUp className="h-4 w-4 text-green-600" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-red-600" />
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${dashboardData.performance.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(dashboardData.performance.netProfit)}
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <Zap className="h-3 w-3" />
                    <span>margin: {dashboardData.performance.profitMargin.toFixed(1)}%</span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Number Cap Performance Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <motion.div variants={cardVariants}>
              <Card className="relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-500 to-orange-600"></div>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">ประหยัดจากเลขอั้น</CardTitle>
                  <div className="p-2 bg-orange-100 rounded-full">
                    <Target className="h-4 w-4 text-orange-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-600">
                    {formatCurrency(dashboardData.performance.numberCapSavings || 0)}
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <Star className="h-3 w-3" />
                    <span>ลดค่าจ่าย: {(dashboardData.performance.numberCapSavingsPercentage || 0).toFixed(1)}%</span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
            
            <motion.div variants={cardVariants}>
              <Card className="relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-purple-600"></div>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">รายการที่ใช้เลขอั้น</CardTitle>
                  <div className="p-2 bg-purple-100 rounded-full">
                    <Activity className="h-4 w-4 text-purple-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-purple-600">
                    {(dashboardData.performance.numberCapAffectedTickets || 0).toLocaleString()}
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <Hash className="h-3 w-3" />
                    <span>รายการ</span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
            
            <motion.div variants={cardVariants}>
              <Card className="relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-indigo-600"></div>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">เปรียบเทียบอัตราจ่าย</CardTitle>
                  <div className="p-2 bg-indigo-100 rounded-full">
                    <BarChart3 className="h-4 w-4 text-indigo-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">เดิม:</span>
                      <span className="text-sm font-semibold text-red-600">
                        {formatCurrency(dashboardData.performance.totalOriginalPayout || 0)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">ปัจจุบัน:</span>
                      <span className="text-sm font-semibold text-green-600">
                        {formatCurrency(dashboardData.performance.totalPayout)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
          
          {/* Charts */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <motion.div variants={itemVariants} className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle className="flex items-center">
                      <BarChart3 className="h-5 w-5 mr-2" />
                      รายได้ประจำวัน
                    </CardTitle>
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline">
                        {dashboardData.revenue.dailyRevenue.length} วัน
                      </Badge>
                      <Badge variant={dashboardData.revenue.growth >= 0 ? 'default' : 'destructive'}>
                        {dashboardData.revenue.growth >= 0 ? '+' : ''}{dashboardData.revenue.growth.toFixed(1)}%
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <RevenueChart
                      labels={dashboardData.revenue.dailyRevenue.map(item => 
                        format(new Date(item.date), 'EEE dd/MM', { locale: th })
                      )}
                      values={dashboardData.revenue.dailyRevenue.map(item => item.revenue)}
                      chartType={chartType}
                      title="รายได้รายวัน"
                      showComparison={true}
                      comparisonData={dashboardData.revenue.dailyRevenue.map(item => item.netProfit)}
                      comparisonLabel="กำไรสุทธิ"
                    />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
            
            <motion.div variants={itemVariants}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <PieChart className="h-5 w-5 mr-2" />
                    สัดส่วนประเภทหวย
                  </CardTitle>
                  <CardDescription>
                    ตามยอดขาย ({dashboardData.lotteryTypes.total} ประเภท)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <LotteryTypePie
                      labels={dashboardData.lotteryTypes.popular.map(item => item.name)}
                      values={dashboardData.lotteryTypes.popular.map(item => item.revenue)}
                      chartType="doughnut"
                      title=""
                      showPercentage={true}
                    />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </TabsContent>
        
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <motion.div variants={itemVariants}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Users className="h-5 w-5 mr-2" />
                    สถิติผู้ใช้งาน
                  </CardTitle>
                  <CardDescription>
                    จำนวนผู้ใช้งานรายวัน ({dashboardData.users.total} คนทั้งหมด)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <UserChart
                      labels={dashboardData.users.dailyStats.map(item => 
                        format(new Date(item.date), 'EEE dd/MM', { locale: th })
                      )}
                      newUsers={dashboardData.users.dailyStats.map(item => item.newUsers)}
                      activeUsers={dashboardData.users.dailyStats.map(item => item.activeUsers)}
                      chartType={chartType}
                      title="สถิติผู้ใช้งาน"
                    />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
            
            <motion.div variants={itemVariants}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Ticket className="h-5 w-5 mr-2" />
                    จำนวนตั๋วที่ขาย
                  </CardTitle>
                  <CardDescription>
                    จำนวนตั๋วที่ขายได้ในแต่ละวัน
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <TicketChart
                      labels={dashboardData.tickets.dailyStats.map(item => 
                        format(new Date(item.date), 'EEE dd/MM', { locale: th })
                      )}
                      values={dashboardData.tickets.dailyStats.map(item => item.sold)}
                      chartType={chartType}
                      title="จำนวนตั๋วรายวัน"
                      showComparison={true}
                      comparisonData={dashboardData.tickets.dailyStats.map(item => item.avgTicketValue)}
                      comparisonLabel="มูลค่าเฉลี่ย"
                    />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Performance Metrics */}
          <motion.div variants={itemVariants}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Star className="h-5 w-5 mr-2" />
                  ตัวชี้วัดประสิทธิภาพ
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {dashboardData.performance.bestPerformingDay 
                        ? format(new Date(dashboardData.performance.bestPerformingDay), 'dd MMM', { locale: th })
                        : '-'}
                    </div>
                    <div className="text-sm text-muted-foreground">วันที่ดีที่สุด</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {formatCurrency(dashboardData.performance.averageDailySales)}
                    </div>
                    <div className="text-sm text-muted-foreground">ยอดขายเฉลี่ย/วัน</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {dashboardData.winning.total}
                    </div>
                    <div className="text-sm text-muted-foreground">รางวัลที่จ่าย</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">
                      {formatCurrency(dashboardData.winning.largestWin)}
                    </div>
                    <div className="text-sm text-muted-foreground">รางวัลใหญ่สุด</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>
        
        <TabsContent value="reports" className="space-y-6">
          <motion.div variants={itemVariants}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="h-5 w-5 mr-2" />
                  รายงานและข้อมูลสถิติ
                </CardTitle>
                <CardDescription>
                  เข้าถึงรายงานต่างๆ และข้อมูลโดยรวม
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <Button 
                    variant="outline" 
                    className="h-24 flex flex-col items-center justify-center hover:bg-blue-50"
                    onClick={() => setSelectedDetail('revenue')}
                  >
                    <TrendingUp className="h-8 w-8 mb-2 text-blue-600" />
                    <span className="font-medium">รายงานยอดขาย</span>
                    <span className="text-xs text-muted-foreground">รายละเอียดรายได้</span>
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="h-24 flex flex-col items-center justify-center hover:bg-green-50"
                    onClick={() => setSelectedDetail('users')}
                  >
                    <Users className="h-8 w-8 mb-2 text-green-600" />
                    <span className="font-medium">รายงานผู้ใช้งาน</span>
                    <span className="text-xs text-muted-foreground">สถิติและการเติบโต</span>
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="h-24 flex flex-col items-center justify-center hover:bg-purple-50"
                    onClick={() => setSelectedDetail('tickets')}
                  >
                    <Ticket className="h-8 w-8 mb-2 text-purple-600" />
                    <span className="font-medium">รายงานตั๋ว</span>
                    <span className="text-xs text-muted-foreground">การขายและประเภท</span>
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="h-24 flex flex-col items-center justify-center hover:bg-orange-50"
                    onClick={() => setSelectedDetail('performance')}
                  >
                    <Activity className="h-8 w-8 mb-2 text-orange-600" />
                    <span className="font-medium">รายงานประสิทธิภาพ</span>
                    <span className="text-xs text-muted-foreground">KPI และเมตริกส์</span>
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="h-24 flex flex-col items-center justify-center hover:bg-red-50"
                    onClick={() => setSelectedDetail('winnings')}
                  >
                    <Award className="h-8 w-8 mb-2 text-red-600" />
                    <span className="font-medium">รายงานรางวัล</span>
                    <span className="text-xs text-muted-foreground">การจ่ายและอัตรา</span>
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="h-24 flex flex-col items-center justify-center hover:bg-indigo-50"
                    onClick={() => setSelectedDetail('recent_wins')}
                  >
                    <Clock className="h-8 w-8 mb-2 text-indigo-600" />
                    <span className="font-medium">รางวัลล่าสุด</span>
                    <span className="text-xs text-muted-foreground">การชนะล่าสุด</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>
      </Tabs>
      
      {/* Detail Modal */}
      {selectedDetail && (
        <DetailModal 
          open={true}
          onClose={() => setSelectedDetail(null)}
          title={`รายงาน${
            selectedDetail === 'revenue' ? 'ยอดขาย' : 
            selectedDetail === 'users' ? 'ผู้ใช้งาน' : 
            selectedDetail === 'tickets' ? 'ตั๋ว' :
            selectedDetail === 'performance' ? 'ประสิทธิภาพ' :
            selectedDetail === 'winnings' ? 'รางวัล' : 'รางวัลล่าสุด'
          }`}
          subtitle={`ข้อมูลรายละเอียดช่วง ${dateRange === 'week' ? '7 วัน' : dateRange === 'month' ? '30 วัน' : '90 วัน'} ล่าสุด`}
          size="lg"
        >
          <div className="space-y-6">
            {selectedDetail === 'revenue' && (
              <div>
                <h4 className="font-semibold mb-4 flex items-center">
                  <TrendingUp className="h-5 w-5 mr-2" />
                  รายได้รายวัน
                </h4>
                <div className="space-y-3">
                  {dashboardData.revenue.dailyRevenue.map((day, index) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <div>
                        <div className="font-medium">{format(new Date(day.date), 'EEEE dd MMMM yyyy', { locale: th })}</div>
                        <div className="text-sm text-gray-500">{day.tickets} ตั๋ว</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold">{formatCurrency(day.revenue)}</div>
                        <div className={`text-sm ${day.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          กำไร: {formatCurrency(day.netProfit)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {selectedDetail === 'users' && (
              <div>
                <h4 className="font-semibold mb-4 flex items-center">
                  <Users className="h-5 w-5 mr-2" />
                  สถิติผู้ใช้งาน
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{dashboardData.users.total}</div>
                    <div className="text-sm text-blue-800">ผู้ใช้งานทั้งหมด</div>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{dashboardData.users.active}</div>
                    <div className="text-sm text-green-800">ผู้ใช้งานที่ใช้งาน</div>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">{dashboardData.users.newThisMonth}</div>
                    <div className="text-sm text-purple-800">ผู้ใช้งานใหม่เดือนนี้</div>
                  </div>
                  <div className="p-4 bg-orange-50 rounded-lg">
                    <div className="text-2xl font-bold text-orange-600">{dashboardData.users.growthRate.toFixed(1)}%</div>
                    <div className="text-sm text-orange-800">อัตราการเติบโต</div>
                  </div>
                </div>
              </div>
            )}
            
            {selectedDetail === 'recent' && (
              <div>
                <h4 className="font-semibold mb-4 flex items-center">
                  <Clock className="h-5 w-5 mr-2" />
                  กิจกรรมล่าสุด
                </h4>
                <div className="space-y-3">
                  {dashboardData.recentActivities.map((activity, index) => (
                    <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <div className="flex-1">
                        <div className="font-medium">{activity.description}</div>
                        <div className="text-sm text-gray-500">
                          {format(new Date(activity.timestamp), 'dd/MM/yyyy HH:mm', { locale: th })}
                        </div>
                      </div>
                      {activity.amount && (
                        <div className="font-bold text-green-600">
                          {formatCurrency(activity.amount)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedDetail === 'recent_wins' && (
              <div>
                <h4 className="font-semibold mb-4 flex items-center">
                  <Clock className="h-5 w-5 mr-2" />
                  รางวัลล่าสุด
                </h4>
                <div className="space-y-3">
                  {dashboardData.winning.recentWins.map((win, index) => (
                    <div key={index} className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <div className="flex-1">
                        <div className="font-medium">
                          {win.user} ชนะรางวัลจากหวย {win.type}
                        </div>
                        <div className="text-sm text-gray-500">
                          {format(new Date(win.date), 'dd/MM/yyyy', { locale: th })} (บิล: {win.bill_number})
                        </div>
                      </div>
                      <div className="font-bold text-green-600">
                        {formatCurrency(win.amount)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DetailModal>
      )}
    </motion.div>
  );
} 