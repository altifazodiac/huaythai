"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  Hash,
  AlertTriangle,
  Shield,
  Building,
  Percent,
  Calculator,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Sun,
  Moon
} from 'lucide-react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useTheme } from 'next-themes';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';

// Import updated components
import RevenueChart from './RevenueChart';
import UserChart from './UserChart';
import TicketChart from './TicketChart';
import LotteryTypePie from './LotteryTypePie';
import CommissionChart from './CommissionChart';
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

// Format percentage
const formatPercentage = (value: number) => {
  return `${value.toFixed(1)}%`;
};

// Utility function to get date range display text
const getDateRangeDisplay = (dateRange: string) => {
  switch (dateRange) {
    case 'day':
      return 'วันนี้';
    case 'week':
      return '7 วันล่าสุด';
    case 'month':
      return '30 วันล่าสุด';
    case 'quarter':
      return '90 วันล่าสุด';
    default:
      return '7 วันล่าสุด';
  }
};

// Utility function to get date range suffix
const getDateRangeSuffix = (dateRange: string) => {
  switch (dateRange) {
    case 'day':
      return ' (วันนี้)';
    case 'week':
      return ' (7 วันล่าสุด)';
    case 'month':
      return ' (30 วันล่าสุด)';
    case 'quarter':
      return ' (90 วันล่าสุด)';
    default:
      return ' (7 วันล่าสุด)';
  }
};

// Performance indicator component
const PerformanceIndicator = ({ value, previousValue, label, isInverted = false }: { 
  value: number; 
  previousValue: number; 
  label: string;
  isInverted?: boolean;
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  
  const change = value - previousValue;
  const changePercent = previousValue !== 0 ? (change / previousValue) * 100 : 0;
  const isPositive = isInverted ? change < 0 : change > 0;
  
  return (
    <div className="flex items-center space-x-2">
      <div className={`flex items-center space-x-1 ${isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
        {isPositive ? (
          <ArrowUp className="h-3 w-3" />
        ) : (
          <ArrowDown className="h-3 w-3" />
        )}
        <span className="text-xs font-medium">
          {Math.abs(changePercent).toFixed(1)}%
        </span>
      </div>
      <span className={`text-xs ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
        {label}
      </span>
    </div>
  );
};

// Risk indicator component
const RiskIndicator = ({ level, value }: { level: 'low' | 'medium' | 'high'; value: string }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  
  const getRiskColor = () => {
    switch (level) {
      case 'low':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'high':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  return (
    <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getRiskColor()}`}>
      <div className={`w-2 h-2 rounded-full mr-2 ${
        level === 'low' ? 'bg-green-500 dark:bg-green-400' :
        level === 'medium' ? 'bg-yellow-500 dark:bg-yellow-400' :
        'bg-red-500 dark:bg-red-400'
      }`} />
      {value}
    </div>
  );
};

export default function AdminDashboard() {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState('week');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedTab, setSelectedTab] = useState('overview');
  const [selectedDetail, setSelectedDetail] = useState<string | null>(null);
  const [chartType, setChartType] = useState<'bar' | 'line'>('bar');

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
            ภาพรวมข้อมูลการขายหวยและสถิติต่างๆ แบบครบถ้วนและละเอียด
          </p>
          <div className="flex items-center space-x-2 mt-2">
            <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
              <Calendar className="h-3 w-3 mr-1" />
              {getDateRangeDisplay(dateRange)}
            </Badge>
            <Badge variant="outline" className="text-xs">
              ข้อมูลสด
            </Badge>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="flex items-center space-x-2"
          >
            {theme === 'dark' ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
            <span>{theme === 'dark' ? 'โหมดสว่าง' : 'โหมดมืด'}</span>
          </Button>
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
                        <SelectItem value="day">วันนี้</SelectItem>
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
                        {getDateRangeDisplay(dateRange)}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
      
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview" className="flex items-center space-x-2">
            <BarChart3 className="h-4 w-4" />
            <span>ภาพรวม</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center space-x-2">
            <Star className="h-4 w-4" />
            <span>การวิเคราะห์</span>
          </TabsTrigger>
          <TabsTrigger value="performance" className="flex items-center space-x-2">
            <Target className="h-4 w-4" />
            <span>ประสิทธิภาพ</span>
          </TabsTrigger>
          <TabsTrigger value="commission" className="flex items-center space-x-2">
            <Award className="h-4 w-4" />
            <span>ค่าคอมมิชชั่น</span>
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center space-x-2">
            <FileText className="h-4 w-4" />
            <span>รายงาน</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-6">
          {/* Debug log */}
          {(() => {
            console.log('🔍 Dashboard lotteryTypes data:', {
              total: dashboardData.lotteryTypes.total,
              popular: dashboardData.lotteryTypes.popular,
              popularLength: dashboardData.lotteryTypes.popular.length,
              labels: dashboardData.lotteryTypes.popular.map(item => item.name),
              values: dashboardData.lotteryTypes.popular.map(item => item.revenue)
            });
            return null;
          })()}
          
          {/* Executive Summary Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <motion.div variants={cardVariants}>
              <Card className="relative overflow-hidden border-0 shadow-lg dark:shadow-gray-800/20">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-blue-600"></div>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium dark:text-gray-100">ยอดซื้อรวม</CardTitle>
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                    <TrendingUp className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold dark:text-white">
                    {formatCurrency(dashboardData.performance.totalSales)}
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground dark:text-gray-400">
                    <Calculator className="h-3 w-3" />
                    <span>
                      {dateRange === 'day' ? 'วันนี้' : 
                       `เฉลี่ย: ${formatCurrency(dashboardData.performance.averageDailySales)}/วัน`}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
            
            <motion.div variants={cardVariants}>
              <Card className="relative overflow-hidden border-0 shadow-lg dark:shadow-gray-800/20">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-500 to-green-600"></div>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium dark:text-gray-100">ยอดจ่ายรางวัล</CardTitle>
                  <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-full">
                    <Award className="h-4 w-4 text-green-600 dark:text-green-400" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold dark:text-white">
                    {formatCurrency(dashboardData.performance.totalPayout)}
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground dark:text-gray-400">
                    <Percent className="h-3 w-3" />
                    <span>อัตราจ่าย: {formatPercentage(dashboardData.performance.payoutRate)}</span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
            
            <motion.div variants={cardVariants}>
              <Card className="relative overflow-hidden border-0 shadow-lg dark:shadow-gray-800/20">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-purple-600"></div>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium dark:text-gray-100">ค่าคอมมิชชั่น</CardTitle>
                  <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-full">
                    <Award className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                    {formatCurrency(dashboardData.commission.total)}
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground dark:text-gray-400">
                    <Percent className="h-3 w-3" />
                    <span>อัตรา: {formatPercentage(dashboardData.commission.commissionRate)}</span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
            
            <motion.div variants={cardVariants}>
              <Card className="relative overflow-hidden border-0 shadow-lg dark:shadow-gray-800/20">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 to-amber-600"></div>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium dark:text-gray-100">จำนวนบิล</CardTitle>
                  <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-full">
                    <Ticket className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold dark:text-white">{dashboardData.tickets.sold.toLocaleString()}</div>
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground dark:text-gray-400">
                    <Clock className="h-3 w-3" />
                    <span>รอ: {dashboardData.tickets.pending.toLocaleString()}</span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
            
            <motion.div variants={cardVariants}>
              <Card className="relative overflow-hidden border-0 shadow-lg dark:shadow-gray-800/20">
                <div className={`absolute top-0 left-0 w-full h-1 ${(dashboardData.performance.netProfit - dashboardData.commission.total) >= 0 ? 'bg-gradient-to-r from-green-500 to-green-600' : 'bg-gradient-to-r from-red-500 to-red-600'}`}></div>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium dark:text-gray-100">กำไรสุทธิ</CardTitle>
                  <div className={`p-2 rounded-full ${(dashboardData.performance.netProfit - dashboardData.commission.total) >= 0 ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
                    {(dashboardData.performance.netProfit - dashboardData.commission.total) >= 0 ? (
                      <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${(dashboardData.performance.netProfit - dashboardData.commission.total) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {formatCurrency(dashboardData.performance.netProfit - dashboardData.commission.total)}
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground dark:text-gray-400">
                    <Zap className="h-3 w-3" />
                    <span>หลังหักค่าคอม: {formatPercentage(((dashboardData.performance.netProfit - dashboardData.commission.total) / dashboardData.performance.totalSales) * 100)}</span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Advanced Performance Metrics */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <motion.div variants={cardVariants}>
              <Card className="relative overflow-hidden border-0 shadow-lg dark:shadow-gray-800/20">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-500 to-orange-600"></div>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium dark:text-gray-100">ประหยัดจากเลขอั้น</CardTitle>
                  <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-full">
                    <Shield className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                    {formatCurrency(dashboardData.performance.numberCapSavings)}
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground dark:text-gray-400">
                    <Star className="h-3 w-3" />
                    <span>ลดค่าจ่าย: {formatPercentage(dashboardData.performance.numberCapSavingsPercentage)}</span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
            
            <motion.div variants={cardVariants}>
              <Card className="relative overflow-hidden border-0 shadow-lg dark:shadow-gray-800/20">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-purple-600"></div>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium dark:text-gray-100">ROI</CardTitle>
                  <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-full">
                    <TrendingUp className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                    {formatPercentage(dashboardData.performance.roi)}
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground dark:text-gray-400">
                    <Star className="h-3 w-3" />
                    <span>ผลตอบแทน</span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
            
            <motion.div variants={cardVariants}>
              <Card className="relative overflow-hidden border-0 shadow-lg dark:shadow-gray-800/20">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-indigo-600"></div>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium dark:text-gray-100">ความเสี่ยง</CardTitle>
                  <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-full">
                    <AlertTriangle className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                    {dashboardData.performance.riskMetrics.sharpeRatio.toFixed(2)}
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground dark:text-gray-400">
                    <Star className="h-3 w-3" />
                    <span>Sharpe Ratio</span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
            
            <motion.div variants={cardVariants}>
              <Card className="relative overflow-hidden border-0 shadow-lg dark:shadow-gray-800/20">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-pink-500 to-pink-600"></div>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium dark:text-gray-100">ผู้ใช้งาน</CardTitle>
                  <div className="p-2 bg-pink-100 dark:bg-pink-900/30 rounded-full">
                    <Users className="h-4 w-4 text-pink-600 dark:text-pink-400" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-pink-600 dark:text-pink-400">
                    {dashboardData.users.total.toLocaleString()}
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground dark:text-gray-400">
                    <Star className="h-3 w-3" />
                    <span>ใหม่: {dashboardData.users.newThisMonth}</span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
            
            <motion.div variants={cardVariants}>
              <Card className="relative overflow-hidden border-0 shadow-lg dark:shadow-gray-800/20">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-teal-500 to-teal-600"></div>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium dark:text-gray-100">ค่าคอมเฉลี่ย</CardTitle>
                  <div className="p-2 bg-teal-100 dark:bg-teal-900/30 rounded-full">
                    <Award className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-teal-600 dark:text-teal-400">
                    {formatCurrency(dashboardData.commission.averageCommission)}
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground dark:text-gray-400">
                    <Star className="h-3 w-3" />
                    <span>ต่อบิล</span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* ยอดถูกรางวัลรายละเอียด */}
          <motion.div variants={itemVariants}>
            <Card className="border-0 shadow-lg dark:shadow-gray-800/20">
              <CardHeader>
                <CardTitle className="flex items-center dark:text-gray-100">
                  <Award className="h-5 w-5 mr-2" />
                  รายละเอียดยอดถูกรางวัลและค่าคอมมิชชั่น
                </CardTitle>
                <CardDescription className="dark:text-gray-400">
                  ข้อมูลการถูกรางวัล อัตราการจ่ายรางวัล และค่าคอมมิชชั่น
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {formatCurrency(dashboardData.performance.totalPayout)}
                    </div>
                    <div className="text-sm text-green-800 dark:text-green-300">ยอดจ่ายรางวัลรวม</div>
                  </div>
                  <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {formatCurrency(dashboardData.performance.totalOriginalPayout)}
                    </div>
                    <div className="text-sm text-blue-800 dark:text-blue-300">ยอดจ่ายรางวัลเดิม</div>
                  </div>
                  <div className="text-center p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                    <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                      {formatPercentage(dashboardData.performance.payoutRate)}
                    </div>
                    <div className="text-sm text-orange-800 dark:text-orange-300">อัตราการจ่ายรางวัล</div>
                  </div>
                  <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                      {formatCurrency(dashboardData.commission.total)}
                    </div>
                    <div className="text-sm text-purple-800 dark:text-purple-300">ค่าคอมมิชชั่นรวม</div>
                  </div>
                  <div className="text-center p-4 bg-teal-50 dark:bg-teal-900/20 rounded-lg">
                    <div className="text-2xl font-bold text-teal-600 dark:text-teal-400">
                      {formatPercentage(dashboardData.commission.commissionRate)}
                    </div>
                    <div className="text-sm text-teal-800 dark:text-teal-300">อัตราค่าคอมมิชชั่น</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Risk Assessment */}
          <motion.div variants={itemVariants}>
            <Card className="border-0 shadow-lg dark:shadow-gray-800/20">
              <CardHeader>
                <CardTitle className="flex items-center dark:text-gray-100">
                  <AlertTriangle className="h-5 w-5 mr-2" />
                  การประเมินความเสี่ยงและยอดถูกรางวัล
                </CardTitle>
                <CardDescription className="dark:text-gray-400">
                  ข้อมูลความเสี่ยงและสถิติการถูกรางวัล
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-lg font-bold text-red-600 dark:text-red-400">
                      {formatCurrency(dashboardData.performance.riskMetrics.maxDailyLoss)}
                    </div>
                    <div className="text-sm text-muted-foreground dark:text-gray-400">ขาดทุนสูงสุด/วัน</div>
                    <RiskIndicator 
                      level={Math.abs(dashboardData.performance.riskMetrics.maxDailyLoss) > 100000 ? 'high' : 'medium'} 
                      value="ติดตาม" 
                    />
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-green-600 dark:text-green-400">
                      {formatCurrency(dashboardData.performance.riskMetrics.maxDailyProfit)}
                    </div>
                    <div className="text-sm text-muted-foreground dark:text-gray-400">กำไรสูงสุด/วัน</div>
                    <RiskIndicator level="low" value="ปกติ" />
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-blue-600">
                      {dashboardData.performance.riskMetrics.volatility.toFixed(2)}
                    </div>
                    <div className="text-sm text-muted-foreground">ความผันผวน</div>
                    <RiskIndicator 
                      level={dashboardData.performance.riskMetrics.volatility > 50000 ? 'high' : 'low'} 
                      value="ควบคุม" 
                    />
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-purple-600">
                      {dashboardData.performance.breakEvenPoint.toFixed(1)}
                    </div>
                    <div className="text-sm text-muted-foreground">จุดคุ้มทุน (วัน)</div>
                    <RiskIndicator level="medium" value="ปกติ" />
                  </div>
                </div>
                
                {/* ยอดถูกรางวัล */}
                <div className="mt-6 pt-6 border-t">
                  <h4 className="text-lg font-semibold mb-4 text-center">สถิติการถูกรางวัลและค่าคอมมิชชั่น</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    <div className="text-center">
                      <div className="text-lg font-bold text-green-600">
                        {formatCurrency(dashboardData.performance.totalPayout)}
                      </div>
                      <div className="text-sm text-muted-foreground">ยอดจ่ายรางวัลรวม</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-blue-600">
                        {formatPercentage(dashboardData.performance.payoutRate)}
                      </div>
                      <div className="text-sm text-muted-foreground">อัตราการจ่ายรางวัล</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-orange-600">
                        {formatCurrency(dashboardData.performance.numberCapSavings)}
                      </div>
                      <div className="text-sm text-muted-foreground">ประหยัดจากเลขอั้น</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-purple-600">
                        {formatCurrency(dashboardData.commission.total)}
                      </div>
                      <div className="text-sm text-muted-foreground">ค่าคอมมิชชั่นรวม</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-teal-600">
                        {formatPercentage(dashboardData.commission.commissionRate)}
                      </div>
                      <div className="text-sm text-muted-foreground">อัตราค่าคอมมิชชั่น</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
          
          {/* Charts */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <motion.div variants={itemVariants} className="lg:col-span-2">
              <Card className="border-0 shadow-lg dark:shadow-gray-800/20">
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle className="flex items-center dark:text-gray-100">
                      <BarChart3 className="h-5 w-5 mr-2" />
                      ยอดซื้อและยอดจ่ายรางวัลประจำวัน
                    </CardTitle>
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline" className="dark:border-gray-600 dark:text-gray-300">
                        {dashboardData.revenue.dailyRevenue.length} วัน
                      </Badge>
                      <Badge variant={dashboardData.revenue.growth >= 0 ? 'default' : 'destructive'}>
                        {dashboardData.revenue.growth >= 0 ? '+' : ''}{formatPercentage(dashboardData.revenue.growth)}
                      </Badge>
                    </div>
                  </div>
                  <CardDescription className="dark:text-gray-400">
                    แสดงยอดซื้อและยอดจ่ายรางวัลรายวัน พร้อมกำไร/ขาดทุน{getDateRangeSuffix(dateRange)}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <RevenueChart
                      labels={dashboardData.revenue.dailyRevenue.map(item => 
                        format(new Date(item.date), 'EEE dd/MM', { locale: th })
                      )}
                      values={dashboardData.revenue.dailyRevenue.map(item => item.revenue)}
                      chartType={chartType}
                      title="ยอดซื้อและยอดจ่ายรางวัลรายวัน"
                      showComparison={true}
                      comparisonData={dashboardData.revenue.dailyRevenue.map(item => item.payout)}
                      comparisonLabel="ยอดจ่ายรางวัล"
                    />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
            
            <motion.div variants={itemVariants}>
              <Card className="border-0 shadow-lg dark:shadow-gray-800/20">
                <CardHeader>
                  <CardTitle className="flex items-center dark:text-gray-100">
                    <PieChart className="h-5 w-5 mr-2" />
                    สัดส่วนประเภทหวย
                  </CardTitle>
                  <CardDescription className="dark:text-gray-400">
                    ตามยอดขาย ({dashboardData.lotteryTypes.total} ประเภท){getDateRangeSuffix(dateRange)}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <LotteryTypePie
                      labels={dashboardData.lotteryTypes.popular.map(item => item.name)}
                      values={dashboardData.lotteryTypes.popular.map(item => item.count)}
                      chartType="doughnut"
                      title=""
                      showPercentage={true}
                    />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Top Users */}
          <motion.div variants={itemVariants}>
            <Card className="border-0 shadow-lg dark:shadow-gray-800/20">
              <CardHeader>
                <CardTitle className="flex items-center dark:text-gray-100">
                  <Users className="h-5 w-5 mr-2" />
                  ผู้ใช้ที่มียอดขายสูงสุด
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {dashboardData.users.topUsers.map((user, index) => (
                    <div key={user.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                          <span className="text-sm font-bold text-blue-600 dark:text-blue-400">{index + 1}</span>
                        </div>
                        <div>
                          <div className="font-medium dark:text-gray-100">{user.name}</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">{user.branch} • {user.ticketCount} บิล</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold dark:text-gray-100">{formatCurrency(user.totalSpent)}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          เฉลี่ย: {formatCurrency(user.avgSpent)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>
        
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <motion.div variants={itemVariants}>
              <Card className="border-0 shadow-lg dark:shadow-gray-800/20">
                <CardHeader>
                  <CardTitle className="flex items-center dark:text-gray-100">
                    <Users className="h-5 w-5 mr-2" />
                    สถิติผู้ใช้งาน
                  </CardTitle>
                  <CardDescription className="dark:text-gray-400">
                    จำนวนผู้ใช้งานรายวัน ({dashboardData.users.total} คนทั้งหมด){getDateRangeSuffix(dateRange)}
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
              <Card className="border-0 shadow-lg dark:shadow-gray-800/20">
                <CardHeader>
                  <CardTitle className="flex items-center dark:text-gray-100">
                    <Ticket className="h-5 w-5 mr-2" />
                    จำนวนบิลที่ขาย
                  </CardTitle>
                  <CardDescription className="dark:text-gray-400">
                    จำนวนบิลที่ขายได้ในแต่ละวัน{getDateRangeSuffix(dateRange)}
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
                      title="จำนวนบิลรายวัน"
                      showComparison={true}
                      comparisonData={dashboardData.tickets.dailyStats.map(item => item.avgTicketValue)}
                      comparisonLabel="มูลค่าเฉลี่ย"
                    />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Ticket Status Distribution */}
          <motion.div variants={itemVariants}>
            <Card className="bg-white dark:bg-gray-800 mt-20">
              <CardHeader>
                <CardTitle className="flex items-center dark:text-gray-100">
                  <Activity className="h-5 w-5 mr-2" />
                  การกระจายตัวของสถานะบิล{getDateRangeSuffix(dateRange)}
                </CardTitle>
                <CardDescription className="dark:text-gray-400">
                  สถิติการกระจายตัวของสถานะบิลตามช่วงเวลาที่เลือก
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {dashboardData.tickets.statusDistribution.map((status, index) => (
                    <div key={index} className="text-center p-4 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-bold text-gray-900">
                        {status.count.toLocaleString()}
                      </div>
                      <div className="text-sm text-gray-500 capitalize">{status.status}</div>
                      <div className="text-xs text-gray-400">
                        {formatPercentage(status.percentage)}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>
        
        <TabsContent value="performance" className="space-y-6">
          {/* Performance Metrics */}
          <motion.div variants={itemVariants}>
            <Card className="border-0 shadow-lg dark:shadow-gray-800/20">
              <CardHeader>
                <CardTitle className="flex items-center dark:text-gray-100">
                  <Star className="h-5 w-5 mr-2" />
                  ตัวชี้วัดประสิทธิภาพ{getDateRangeSuffix(dateRange)}
                </CardTitle>
                <CardDescription className="dark:text-gray-400">
                  ข้อมูลประสิทธิภาพและ KPI ตามช่วงเวลาที่เลือก
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {dashboardData.performance.bestPerformingDay 
                        ? format(new Date(dashboardData.performance.bestPerformingDay), 'dd MMM', { locale: th })
                        : '-'}
                    </div>
                    <div className="text-sm text-muted-foreground dark:text-gray-400">วันที่ดีที่สุด</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {formatCurrency(dashboardData.performance.averageDailySales)}
                    </div>
                    <div className="text-sm text-muted-foreground dark:text-gray-400">ยอดขายเฉลี่ย/วัน</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                      {dashboardData.winning.total}
                    </div>
                    <div className="text-sm text-muted-foreground dark:text-gray-400">รางวัลที่จ่าย</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                      {formatCurrency(dashboardData.winning.largestWin)}
                    </div>
                    <div className="text-sm text-muted-foreground dark:text-gray-400">รางวัลใหญ่สุด</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Lottery Type Performance */}
          <motion.div variants={itemVariants}>
            <Card className="border-0 shadow-lg dark:shadow-gray-800/20">
              <CardHeader>
                <CardTitle className="flex items-center dark:text-gray-100">
                  <Target className="h-5 w-5 mr-2" />
                  ประสิทธิภาพตามประเภทหวย{getDateRangeSuffix(dateRange)}
                </CardTitle>
                <CardDescription className="dark:text-gray-400">
                  การเปรียบเทียบประสิทธิภาพของแต่ละประเภทหวยตามช่วงเวลาที่เลือก
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {dashboardData.lotteryTypes.popular.map((type, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-sm font-bold text-blue-600 dark:text-blue-400">{index + 1}</span>
                        </div>
                        <div>
                          <div className="font-medium dark:text-gray-100">{type.name}</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">{type.country}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold dark:text-gray-100">{formatCurrency(type.revenue)}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          กำไร: {formatCurrency(type.netProfit)} ({formatPercentage(type.profitMargin)})
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>
        
        <TabsContent value="commission" className="space-y-6">
          <motion.div variants={itemVariants}>
            <Card className="border-0 shadow-lg dark:shadow-gray-800/20">
              <CardHeader>
                <CardTitle className="flex items-center dark:text-gray-100">
                  <Award className="h-5 w-5 mr-2" />
                  ข้อมูลค่าคอมมิชชั่น{getDateRangeSuffix(dateRange)}
                </CardTitle>
                <CardDescription className="dark:text-gray-400">
                  สถิติค่าคอมมิชชั่นและการจ่ายเงินตามช่วงเวลาที่เลือก
                </CardDescription>
              </CardHeader>
              <CardContent>
                <CommissionChart data={dashboardData.commission} />
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
                <CardDescription className="dark:text-gray-400">
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
                    <span className="font-medium">รายงานบิล</span>
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
                    onClick={() => setSelectedDetail('analytics')}
                  >
                    <Star className="h-8 w-8 mb-2 text-indigo-600" />
                    <span className="font-medium">การวิเคราะห์ขั้นสูง</span>
                    <span className="text-xs text-muted-foreground">Trends & Forecasts</span>
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
            selectedDetail === 'tickets' ? 'บิล' :
            selectedDetail === 'performance' ? 'ประสิทธิภาพ' :
            selectedDetail === 'winnings' ? 'รางวัล' : 
            selectedDetail === 'analytics' ? 'การวิเคราะห์' : 'รายงาน'
          }`}
          subtitle={`ข้อมูลรายละเอียดช่วง ${getDateRangeDisplay(dateRange)} ล่าสุด`}
          size="lg"
        >
          <div className="space-y-6">
            {selectedDetail === 'revenue' && (
              <div>
                <h4 className="font-semibold mb-4 flex items-center dark:text-gray-100">
                  <TrendingUp className="h-5 w-5 mr-2" />
                  ยอดซื้อและยอดจ่ายรางวัลรายวัน
                </h4>
                <div className="space-y-3">
                  {dashboardData.revenue.dailyRevenue.map((day, index) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div>
                        <div className="font-medium dark:text-gray-100">{format(new Date(day.date), 'EEEE dd MMMM yyyy', { locale: th })}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">{day.tickets} บิล • ยอดซื้อ: {formatCurrency(day.revenue)}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-green-600 dark:text-green-400">{formatCurrency(day.payout)}</div>
                        <div className={`text-sm ${day.netProfit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                          กำไร: {formatCurrency(day.netProfit)} ({formatPercentage(day.profitMargin)})
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          อัตราจ่าย: {formatPercentage(day.payoutRate)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {selectedDetail === 'users' && (
              <div>
                <h4 className="font-semibold mb-4 flex items-center dark:text-gray-100">
                  <Users className="h-5 w-5 mr-2" />
                  สถิติผู้ใช้งาน
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{dashboardData.users.total}</div>
                    <div className="text-sm text-blue-800 dark:text-blue-300">ผู้ใช้งานทั้งหมด</div>
                  </div>
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">{dashboardData.users.active}</div>
                    <div className="text-sm text-green-800 dark:text-green-300">ผู้ใช้งานที่ใช้งาน</div>
                  </div>
                  <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{dashboardData.users.newThisMonth}</div>
                    <div className="text-sm text-purple-800 dark:text-purple-300">ผู้ใช้งานใหม่เดือนนี้</div>
                  </div>
                  <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                    <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{formatPercentage(dashboardData.users.growthRate)}</div>
                    <div className="text-sm text-orange-800 dark:text-orange-300">อัตราการเติบโต</div>
                  </div>
                </div>
              </div>
            )}
            
            {selectedDetail === 'performance' && (
              <div>
                <h4 className="font-semibold mb-4 flex items-center dark:text-gray-100">
                  <Target className="h-5 w-5 mr-2" />
                  ข้อมูลประสิทธิภาพ
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <div className="text-lg font-bold text-green-600 dark:text-green-400">
                      {formatPercentage(dashboardData.performance.profitMargin)}
                    </div>
                    <div className="text-sm text-green-800 dark:text-green-300">Profit Margin</div>
                  </div>
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                      {formatPercentage(dashboardData.performance.roi)}
                    </div>
                    <div className="text-sm text-blue-800 dark:text-blue-300">ROI</div>
                  </div>
                  <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                    <div className="text-lg font-bold text-orange-600 dark:text-orange-400">
                      {formatCurrency(dashboardData.performance.averageDailyProfit)}
                    </div>
                    <div className="text-sm text-orange-800 dark:text-orange-300">กำไรเฉลี่ย/วัน</div>
                  </div>
                  <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                    <div className="text-lg font-bold text-purple-600 dark:text-purple-400">
                      {dashboardData.performance.breakEvenPoint.toFixed(1)}
                    </div>
                    <div className="text-sm text-purple-800 dark:text-purple-300">จุดคุ้มทุน (วัน)</div>
                  </div>
                </div>
                
                <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg mt-4">
                  <h5 className="font-semibold text-indigo-800 dark:text-indigo-300 mb-2">ข้อมูลยอดถูกรางวัล</h5>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
                        {formatCurrency(dashboardData.performance.totalPayout)}
                      </div>
                      <div className="text-sm text-indigo-800 dark:text-indigo-300">ยอดจ่ายรางวัลรวม</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
                        {formatPercentage(dashboardData.performance.payoutRate)}
                      </div>
                      <div className="text-sm text-indigo-800 dark:text-indigo-300">อัตราการจ่ายรางวัล</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
                        {formatCurrency(dashboardData.performance.totalOriginalPayout)}
                      </div>
                      <div className="text-sm text-indigo-800 dark:text-indigo-300">ยอดจ่ายรางวัลเดิม</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
                        {formatCurrency(dashboardData.performance.numberCapSavings)}
                      </div>
                      <div className="text-sm text-indigo-800 dark:text-indigo-300">ประหยัดจากเลขอั้น</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {selectedDetail === 'analytics' && (
              <div>
                <h4 className="font-semibold mb-4 flex items-center dark:text-gray-100">
                  <Star className="h-5 w-5 mr-2" />
                  การวิเคราะห์ขั้นสูง
                </h4>
                <div className="space-y-4">
                  <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
                    <div className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
                      การวิเคราะห์ความเสี่ยง
                    </div>
                    <div className="text-sm text-indigo-800 dark:text-indigo-300 mt-2">
                      Sharpe Ratio: {dashboardData.performance.riskMetrics.sharpeRatio.toFixed(2)}
                    </div>
                    <div className="text-sm text-indigo-800 dark:text-indigo-300">
                      Volatility: {dashboardData.performance.riskMetrics.volatility.toFixed(2)}
                    </div>
                  </div>
                  <div className="p-4 bg-teal-50 dark:bg-teal-900/20 rounded-lg">
                    <div className="text-lg font-bold text-teal-600 dark:text-teal-400">
                      การประหยัดจากเลขอั้น
                    </div>
                    <div className="text-sm text-teal-800 dark:text-teal-300 mt-2">
                      ประหยัด: {formatCurrency(dashboardData.performance.numberCapSavings)}
                    </div>
                    <div className="text-sm text-teal-800 dark:text-teal-300">
                      เปอร์เซ็นต์: {formatPercentage(dashboardData.performance.numberCapSavingsPercentage)}
                    </div>
                  </div>
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <div className="text-lg font-bold text-green-600 dark:text-green-400">
                      ข้อมูลยอดถูกรางวัล
                    </div>
                    <div className="text-sm text-green-800 dark:text-green-300 mt-2">
                      ยอดจ่ายรางวัลรวม: {formatCurrency(dashboardData.performance.totalPayout)}
                    </div>
                    <div className="text-sm text-green-800 dark:text-green-300">
                      อัตราการจ่าย: {formatPercentage(dashboardData.performance.payoutRate)}
                    </div>
                    <div className="text-sm text-green-800 dark:text-green-300">
                      ยอดจ่ายรางวัลเดิม: {formatCurrency(dashboardData.performance.totalOriginalPayout)}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </DetailModal>
      )}
    </motion.div>
  );
} 