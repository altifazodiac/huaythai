"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  BarChart3, 
  Calculator, 
  TrendingUp, 
  TrendingDown,
  Loader2, 
  RefreshCw,
  Filter,
  Calendar,
  Eye,
  EyeOff,
  PieChart,
  Activity,
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
  CheckCircle2,
  XCircle,
  AlertCircle,
  Search,
  Filter as FilterIcon,
  SortAsc,
  SortDesc,
  DollarSign
} from 'lucide-react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { supabase } from '@/lib/supabase/supabaseClient';

// Types
interface LotterySubType {
  lottery_sub_type_id: number;
  sub_type_name: string;
  country_origin: string;
  payout_rate: number;
}

interface LotterySubNumber {
  id: number;
  lottery_sub_type_id: number;
  digit_number: number;
  type_number: string;
  price_paid: number;
}

interface NumberAnalysis {
  lottery_sub_type_id: number;
  sub_type_name: string;
  country_origin: string;
  digit_number: number;
  type_number: string;
  number: string;
  count: number;
  total_possible: number;
  percentage: number;
  risk_level: 'low' | 'medium' | 'high';
  total_amount: number;
}

interface FilterState {
  selectedSubType: string;
  selectedDigit: string;
  selectedType: string;
  searchNumber: string;
  sortBy: 'count' | 'percentage' | 'number';
  sortOrder: 'asc' | 'desc';
  riskFilter: 'all' | 'low' | 'medium' | 'high';
  selectedDate: string;
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

// Utility functions
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
};

const formatPercentage = (value: number) => {
  return `${value.toFixed(2)}%`;
};

const getRiskLevel = (percentage: number): 'low' | 'medium' | 'high' => {
  if (percentage <= 5) return 'low';
  if (percentage <= 15) return 'medium';
  return 'high';
};

const getRiskColor = (level: 'low' | 'medium' | 'high') => {
  switch (level) {
    case 'low': return 'text-green-600 bg-green-50 border-green-200';
    case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    case 'high': return 'text-red-600 bg-red-50 border-red-200';
  }
};

const getRiskIcon = (level: 'low' | 'medium' | 'high') => {
  switch (level) {
    case 'low': return CheckCircle2;
    case 'medium': return AlertCircle;
    case 'high': return XCircle;
  }
};

const getTotalPossible = (digitNumber: number): number => {
  switch (digitNumber) {
    case 1: return 10; // 0-9
    case 2: return 100; // 00-99
    case 3: return 1000; // 000-999
    case 4: return 10000; // 0000-9999
    default: return 100;
  }
};

export default function NumberAnalysisPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [analysisData, setAnalysisData] = useState<NumberAnalysis[]>([]);
  const [subTypes, setSubTypes] = useState<LotterySubType[]>([]);
  const [subNumbers, setSubNumbers] = useState<LotterySubNumber[]>([]);
  const [filters, setFilters] = useState<FilterState>({
    selectedSubType: 'all',
    selectedDigit: 'all',
    selectedType: 'all',
    searchNumber: '',
    sortBy: 'count',
    sortOrder: 'desc',
    riskFilter: 'all',
    selectedDate: ''
  });
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [activeTab, setActiveTab] = useState('analysis');

  // Fetch data
  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch lottery sub types
      const { data: subTypesData } = await supabase
        .from('lottery_sub_types')
        .select('*')
        .order('sub_type_name');
      
      // Fetch lottery sub numbers
      const { data: subNumbersData } = await supabase
        .from('lottery_sub_number')
        .select('*')
        .order('digit_number')
        .order('type_number');
      
      // ดึงข้อมูลทั้งหมดแบบง่ายๆ แล้วกรองใน JavaScript
      const { data: allTicketItems } = await supabase
        .from('lottery_ticket_items')
        .select(`
          *,
          lottery_sub_types:lottery_sub_types(*),
          lottery_sub_number:lottery_sub_number(*)
        `);

      const { data: allTickets } = await supabase
        .from('lottery_tickets')
        .select('id, status, draw_date')
        .eq('status', 'confirmed')
        .order('draw_date', { ascending: false });

      // ดึงวันที่ที่มีข้อมูลและตั้งค่าวันที่ล่าสุด
      const uniqueDates = [...new Set(allTickets?.map(t => t.draw_date) || [])].sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
      setAvailableDates(uniqueDates);
      
      // ตั้งค่าวันที่ล่าสุดเป็นค่าเริ่มต้นถ้ายังไม่ได้เลือก
      if (!filters.selectedDate && uniqueDates.length > 0) {
        setFilters(prev => ({ ...prev, selectedDate: uniqueDates[0] }));
      }

      // สร้าง map ของ ticket status และ draw_date
      const ticketMap = new Map();
      allTickets?.forEach(ticket => {
        ticketMap.set(ticket.id, { status: ticket.status, draw_date: ticket.draw_date });
      });

      // กรองเฉพาะ confirmed tickets และตามวันที่ที่เลือก
      const filteredTicketItems = allTicketItems?.filter(item => {
        const ticketInfo = ticketMap.get(item.ticket_id);
        if (!ticketInfo || ticketInfo.status !== 'confirmed') return false;
        
        // ถ้าเลือกวันที่แล้ว ให้กรองตามวันที่
        if (filters.selectedDate && ticketInfo.draw_date !== filters.selectedDate) return false;
        
        return true;
      }) || [];



              if (subTypesData) {
          setSubTypes(subTypesData);
        }
      if (subNumbersData) {
        setSubNumbers(subNumbersData);
      }

      // Process analysis data
      if (filteredTicketItems) {
        const analysis: Record<string, NumberAnalysis> = {};

        filteredTicketItems.forEach((item: any) => {
          const subType = item.lottery_sub_types;
          const subNumber = item.lottery_sub_number;
          
          if (!subType || !subNumber) {
            return;
          }

          item.numbers.forEach((number: string) => {
            const key = `${subType.lottery_sub_type_id}-${subNumber.digit_number}-${subNumber.type_number}-${number}`;
            
            if (!analysis[key]) {
              analysis[key] = {
                lottery_sub_type_id: subType.lottery_sub_type_id,
                sub_type_name: subType.sub_type_name,
                country_origin: subType.country_origin || 'ไม่ระบุ',
                digit_number: subNumber.digit_number,
                type_number: subNumber.type_number,
                number: number,
                count: 0,
                total_possible: getTotalPossible(subNumber.digit_number),
                percentage: 0,
                risk_level: 'low',
                total_amount: 0
              };
            }
            
            analysis[key].count += 1;
            analysis[key].total_amount += item.amount;
          });
        });

        // Calculate percentages and risk levels
        Object.values(analysis).forEach(item => {
          item.percentage = (item.count / item.total_possible) * 100;
          item.risk_level = getRiskLevel(item.percentage);
        });

        setAnalysisData(Object.values(analysis));
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Refresh data
  const refreshData = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  // Load data on component mount and when filters change
  useEffect(() => {
    fetchData();
  }, [filters.selectedDate]);

  // Filter and sort data
  const filteredData = analysisData
    .filter(item => {
      if (filters.selectedSubType !== 'all' && 
          item.lottery_sub_type_id.toString() !== filters.selectedSubType) return false;
      if (filters.selectedDigit !== 'all' && 
          item.digit_number.toString() !== filters.selectedDigit) return false;
      if (filters.selectedType !== 'all' && 
          item.type_number !== filters.selectedType) return false;
      if (filters.searchNumber && 
          !item.number.includes(filters.searchNumber)) return false;
      if (filters.riskFilter !== 'all' && 
          item.risk_level !== filters.riskFilter) return false;
      return true;
    })
    .sort((a, b) => {
      let comparison = 0;
      switch (filters.sortBy) {
        case 'count':
          comparison = a.count - b.count;
          break;
        case 'percentage':
          comparison = a.percentage - b.percentage;
          break;
        case 'number':
          comparison = a.number.localeCompare(b.number);
          break;
      }
      return filters.sortOrder === 'asc' ? comparison : -comparison;
    });

  // Get unique values for filters
  const uniqueDigits = [...new Set(analysisData.map(item => item.digit_number))].sort();
  const uniqueTypes = [...new Set(analysisData.map(item => item.type_number))].sort();

  // Summary statistics
  const summaryStats = {
    totalNumbers: filteredData.length,
    totalCount: filteredData.reduce((sum, item) => sum + item.count, 0),
    totalAmount: filteredData.reduce((sum, item) => sum + item.total_amount, 0),
    averagePercentage: filteredData.length > 0 
      ? filteredData.reduce((sum, item) => sum + item.percentage, 0) / filteredData.length 
      : 0,
    highRiskCount: filteredData.filter(item => item.risk_level === 'high').length,
    mediumRiskCount: filteredData.filter(item => item.risk_level === 'medium').length,
    lowRiskCount: filteredData.filter(item => item.risk_level === 'low').length
  };

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
          <h2 className="text-xl font-semibold text-gray-700">กำลังโหลดข้อมูลการวิเคราะห์...</h2>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6"
      >
        <div>
          <h1 className="text-2xl font-bold text-gray-900">การวิเคราะห์หมายเลขหวย</h1>
          <p className="text-gray-600">วิเคราะห์จำนวนและเปอร์เซ็นต์ของหมายเลขหวยแต่ละประเภท</p>
          {(filters.selectedDate || availableDates.length === 0) && (
            <div className={`mt-2 flex items-center gap-2 text-sm ${
              availableDates.length === 0 
                ? 'text-red-600' 
                : 'text-blue-600'
            }`}>
              <Calendar className="h-4 w-4" />
              {availableDates.length === 0 ? (
                <>
                  <span>ไม่มีข้อมูล: ไม่พบข้อมูลบิลที่ยืนยันแล้ว</span>
                </>
              ) : (
                <>
                  <span>วันที่: {filters.selectedDate ? format(new Date(filters.selectedDate), 'PPP', { locale: th }) : 'ยังไม่ได้เลือก'}</span>
                  <Badge variant="outline" className="text-xs">
                    {availableDates.length} วันที่มีข้อมูล
                  </Badge>
                </>
              )}
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setShowFilters(!showFilters)}
            variant="outline"
            size="sm"
          >
            <FilterIcon className="h-4 w-4 mr-2" />
            ตัวกรอง
          </Button>
          <Button
            onClick={refreshData}
            disabled={refreshing}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            รีเฟรช
          </Button>
        </div>
      </motion.div>

      {/* Filters */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-white rounded-lg border shadow-sm p-6 space-y-6"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <Label>ประเภทหวย</Label>
                <Select
                  value={filters.selectedSubType}
                  onValueChange={(value) => setFilters(prev => ({ ...prev, selectedSubType: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="เลือกประเภทหวย" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">ทั้งหมด</SelectItem>
                    {subTypes.map(subType => (
                      <SelectItem key={subType.lottery_sub_type_id} value={subType.lottery_sub_type_id.toString()}>
                        {subType.sub_type_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>จำนวนหลัก</Label>
                <Select
                  value={filters.selectedDigit}
                  onValueChange={(value) => setFilters(prev => ({ ...prev, selectedDigit: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="เลือกจำนวนหลัก" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">ทั้งหมด</SelectItem>
                    {uniqueDigits.map(digit => (
                      <SelectItem key={digit} value={digit.toString()}>
                        {digit} หลัก
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>ประเภทการเล่น</Label>
                <Select
                  value={filters.selectedType}
                  onValueChange={(value) => setFilters(prev => ({ ...prev, selectedType: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="เลือกประเภทการเล่น" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">ทั้งหมด</SelectItem>
                    {uniqueTypes.map(type => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>ระดับความเสี่ยง</Label>
                <Select
                  value={filters.riskFilter}
                  onValueChange={(value: 'all' | 'low' | 'medium' | 'high') => 
                    setFilters(prev => ({ ...prev, riskFilter: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="เลือกระดับความเสี่ยง" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">ทั้งหมด</SelectItem>
                    <SelectItem value="low">ต่ำ</SelectItem>
                    <SelectItem value="medium">ปานกลาง</SelectItem>
                    <SelectItem value="high">สูง</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>วันที่ ({availableDates.length} วัน)</Label>
                <Select
                  value={filters.selectedDate}
                  onValueChange={(value) => setFilters(prev => ({ ...prev, selectedDate: value }))}
                  disabled={availableDates.length === 0}
                >
                  <SelectTrigger>
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
                            <span>{format(new Date(date), 'PPP', { locale: th })}</span>
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
                {filters.selectedDate && (
                  <p className="text-xs text-muted-foreground mt-1">
                    เลือก: {format(new Date(filters.selectedDate), 'PPP', { locale: th })}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div>
                <Label>ค้นหาหมายเลข</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="ค้นหาหมายเลข..."
                    value={filters.searchNumber}
                    onChange={(e) => setFilters(prev => ({ ...prev, searchNumber: e.target.value }))}
                    className="pl-10"
                  />
                </div>
              </div>

              <div>
                <Label>เรียงตาม</Label>
                <Select
                  value={filters.sortBy}
                  onValueChange={(value: 'count' | 'percentage' | 'number') => 
                    setFilters(prev => ({ ...prev, sortBy: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="count">จำนวน</SelectItem>
                    <SelectItem value="percentage">เปอร์เซ็นต์</SelectItem>
                    <SelectItem value="number">หมายเลข</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>ลำดับ</Label>
                <div className="flex gap-2">
                  <Button
                    variant={filters.sortOrder === 'desc' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilters(prev => ({ ...prev, sortOrder: 'desc' }))}
                  >
                    <SortDesc className="h-4 w-4 mr-1" />
                    มากไปน้อย
                  </Button>
                  <Button
                    variant={filters.sortOrder === 'asc' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilters(prev => ({ ...prev, sortOrder: 'asc' }))}
                  >
                    <SortAsc className="h-4 w-4 mr-1" />
                    น้อยไปมาก
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Summary Cards */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        <motion.div variants={cardVariants}>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <Hash className="h-4 w-4" />
                จำนวนหมายเลขทั้งหมด
                {filters.selectedDate && (
                  <Badge variant="secondary" className="text-xs">
                    {format(new Date(filters.selectedDate), 'dd/MM', { locale: th })}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{summaryStats.totalNumbers.toLocaleString()}</div>
              <p className="text-xs text-gray-500">
                {filters.selectedDate ? 'หมายเลขที่พบในวันที่เลือก' : 'หมายเลขที่พบทั้งหมด'}
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={cardVariants}>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                จำนวนการซื้อทั้งหมด
                {filters.selectedDate && (
                  <Badge variant="secondary" className="text-xs">
                    {format(new Date(filters.selectedDate), 'dd/MM', { locale: th })}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{summaryStats.totalCount.toLocaleString()}</div>
              <p className="text-xs text-gray-500">
                {filters.selectedDate ? 'ครั้งในวันที่เลือก' : 'ครั้งทั้งหมด'}
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={cardVariants}>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                มูลค่าทั้งหมด
                {filters.selectedDate && (
                  <Badge variant="secondary" className="text-xs">
                    {format(new Date(filters.selectedDate), 'dd/MM', { locale: th })}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{formatCurrency(summaryStats.totalAmount)}</div>
              <p className="text-xs text-gray-500">
                {filters.selectedDate ? 'บาทในวันที่เลือก' : 'บาททั้งหมด'}
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={cardVariants}>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">เปอร์เซ็นต์เฉลี่ย</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">{formatPercentage(summaryStats.averagePercentage)}</div>
              <p className="text-xs text-gray-500">เฉลี่ยต่อหมายเลข</p>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* Risk Level Summary */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 sm:grid-cols-3 gap-6"
      >
        <motion.div variants={cardVariants}>
          <Card className="border-green-200 bg-green-50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-green-700 flex items-center">
                <CheckCircle2 className="h-4 w-4 mr-2" />
                ความเสี่ยงต่ำ
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{summaryStats.lowRiskCount}</div>
              <p className="text-xs text-green-600">≤ 5%</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={cardVariants}>
          <Card className="border-yellow-200 bg-yellow-50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-yellow-700 flex items-center">
                <AlertCircle className="h-4 w-4 mr-2" />
                ความเสี่ยงปานกลาง
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{summaryStats.mediumRiskCount}</div>
              <p className="text-xs text-yellow-600">5-15%</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={cardVariants}>
          <Card className="border-red-200 bg-red-50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-red-700 flex items-center">
                <XCircle className="h-4 w-4 mr-2" />
                ความเสี่ยงสูง
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{summaryStats.highRiskCount}</div>
              <p className="text-xs text-red-600">> 15%</p>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* Analysis Results */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-6"
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">ผลการวิเคราะห์</h2>
            {filters.selectedDate && (
              <p className="text-sm text-gray-600 mt-1">
                สำหรับวันที่: {format(new Date(filters.selectedDate), 'PPP', { locale: th })}
              </p>
            )}
          </div>
          <Badge variant="secondary" className="text-sm">
            แสดง {filteredData.length} รายการ
          </Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 auto-rows-fr">
          {filteredData.map((item, index) => {
            const RiskIcon = getRiskIcon(item.risk_level);
            const riskColor = getRiskColor(item.risk_level);
            
            return (
              <motion.div
                key={`${item.lottery_sub_type_id}-${item.digit_number}-${item.type_number}-${item.number}`}
                variants={itemVariants}
                className="group h-full"
              >
                <Card className={`hover:shadow-lg transition-all duration-200 cursor-pointer border-2 h-full flex flex-col ${riskColor}`}>
                  <CardHeader className="pb-2 flex-shrink-0">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg font-bold text-gray-900">
                        {item.number}
                      </CardTitle>
                      <RiskIcon className="h-5 w-5 flex-shrink-0" />
                    </div>
                    <CardDescription className="text-sm">
                      {item.sub_type_name} - {item.digit_number}หลัก {item.type_number}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2 flex-grow flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">จำนวน:</span>
                        <span className="font-semibold text-blue-600">{item.count.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">เปอร์เซ็นต์:</span>
                        <span className="font-semibold text-purple-600">{formatPercentage(item.percentage)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">มูลค่า:</span>
                        <span className="font-semibold text-green-600">{formatCurrency(item.total_amount)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">จากทั้งหมด:</span>
                        <span className="font-semibold text-gray-700">{item.total_possible.toLocaleString()}</span>
                      </div>
                    </div>
                    
                    <div className="space-y-2 mt-auto">
                      {/* Progress bar */}
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full transition-all duration-300 ${
                            item.risk_level === 'low' ? 'bg-green-500' :
                            item.risk_level === 'medium' ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${Math.min(item.percentage, 100)}%` }}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>{item.count}/{item.total_possible}</span>
                        <span>{formatPercentage(item.percentage)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {filteredData.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200"
          >
            <AlertTriangle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-900 mb-3">ไม่พบข้อมูลการวิเคราะห์</h3>
            <p className="text-gray-500 mb-4">
              {filters.selectedDate 
                ? `สำหรับวันที่: ${format(new Date(filters.selectedDate), 'PPP', { locale: th })}`
                : 'ลองปรับตัวกรองหรือค้นหาใหม่'
              }
            </p>
            {availableDates.length === 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-w-md mx-auto">
                <p className="text-sm text-red-600 font-medium">ไม่มีข้อมูลบิลที่ยืนยันแล้ว</p>
                <p className="text-xs text-red-500 mt-1">กรุณาตรวจสอบข้อมูลในระบบ</p>
              </div>
            )}
            {availableDates.length > 0 && !filters.selectedDate && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md mx-auto">
                <p className="text-sm text-blue-600 font-medium">กรุณาเลือกวันที่เพื่อดูข้อมูล</p>
                <p className="text-xs text-blue-500 mt-1">มีข้อมูล {availableDates.length} วันให้เลือก</p>
              </div>
            )}
          </motion.div>
        )}
      </motion.div>
    </div>
  );
} 