"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, Users, Ticket, TrendingUp, Settings, FileText, Loader2, DollarSign } from 'lucide-react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { formatInTimeZone } from 'date-fns-tz';

// Import components
import RevenueChart from './RevenueChart';
import UserChart from './UserChart';
import TicketChart from './TicketChart';
import LotteryTypePie from './LotteryTypePie';
import DetailModal from './DetailModal';
import ExportButton from './ExportButton';

// Interfaces for data types
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

// Format currency in Thai Baht
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
};

// Data fetching functions
const fetchDailySummary = async (supabase: any): Promise<DailySummary[]> => {
  try {
    const { data, error } = await supabase.rpc('get_daily_lottery_summary');
    if (!error && data) {
      return data;
    }
    
    // Fallback to direct query if RPC fails
    const { data: tickets, error: ticketError } = await supabase
      .from('lottery_tickets')
      .select('id, draw_date, total_amount, status')
      .eq('status', 'confirmed');

    if (ticketError) throw ticketError;

    const dailyData = tickets.reduce((acc: any, ticket: any) => {
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
      acc[date].total_bills++;
      acc[date].total_purchase_amount += ticket.total_amount || 0;
      return acc;
    }, {});

    return Object.values(dailyData);
  } catch (error) {
    console.error('Error fetching daily summary:', error);
    return [];
  }
};

const fetchLotteryTypeSummary = async (supabase: any): Promise<LotteryTypeSummary[]> => {
  try {
    const { data, error } = await supabase.rpc('get_lottery_type_summary');
    if (!error && data) {
      return data;
    }
    return [];
  } catch (error) {
    console.error('Error fetching lottery type summary:', error);
    return [];
  }
};

export default function AdminDashboard() {
  const { supabase } = useAuth();
  const [selectedDetail, setSelectedDetail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [dailyData, setDailyData] = useState<DailySummary[]>([]);
  const [lotteryTypeData, setLotteryTypeData] = useState<LotteryTypeSummary[]>([]);
  const [selectedDateRange, setSelectedDateRange] = useState('week');
  
  // Calculate summary stats
  const summary = dailyData.length > 0 ? {
    totalSales: dailyData[0].total_purchase_amount,
    totalPayout: dailyData[0].total_payout,
    netProfit: dailyData[0].net_profit_loss,
    totalBills: dailyData[0].total_bills,
    totalNumbers: dailyData[0].total_numbers,
    date: dailyData[0].draw_date
  } : null;

  // Prepare chart data
  const chartData = {
    revenueData: {
      labels: dailyData.slice(0, 7).map(item => 
        format(new Date(item.draw_date), 'EEE', { locale: th })
      ),
      values: dailyData.slice(0, 7).map(item => item.total_purchase_amount)
    },
    ticketData: {
      labels: dailyData.slice(0, 7).map(item => 
        format(new Date(item.draw_date), 'd MMM', { locale: th })
      ),
      values: dailyData.slice(0, 7).map(item => item.total_bills)
    },
    lotteryTypeData: {
      labels: lotteryTypeData.map(item => item.sub_type_name),
      values: lotteryTypeData.map(item => item.total_purchase_amount)
    }
  };

  // Fetch data on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [daily, lotteryTypes] = await Promise.all([
          fetchDailySummary(supabase),
          fetchLotteryTypeSummary(supabase)
        ]);
        
        setDailyData(daily);
        setLotteryTypeData(lotteryTypes);
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [supabase]);

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-red-600" />
        <span className="ml-2">กำลังโหลดข้อมูล...</span>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight text-red-900">
          แดชบอร์ดผู้ดูแลระบบ
        </h2>
        <div className="flex items-center space-x-2">
          <ExportButton 
            data={dailyData}
            filename="dashboard-report"
            type="xlsx"
          >
            ส่งออกรายงาน
          </ExportButton>
        </div>
      </div>
      
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">ภาพรวม</TabsTrigger>
          <TabsTrigger value="analytics">การวิเคราะห์</TabsTrigger>
          <TabsTrigger value="reports">รายงาน</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-4">
          {/* Quick Stats Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">ยอดขายรวม</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {summary ? formatCurrency(summary.totalSales) : 'N/A'}
                </div>
                <p className="text-xs text-muted-foreground">
                  วันที่ {summary ? format(new Date(summary.date), 'd MMM yyyy', { locale: th }) : 'N/A'}
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">จ่ายรางวัล</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {summary ? formatCurrency(summary.totalPayout) : 'N/A'}
                </div>
                <p className="text-xs text-muted-foreground">
                  {summary ? `กำไรสุทธิ: ${formatCurrency(summary.netProfit)}` : 'N/A'}
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">จำนวนบิล</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary?.totalBills || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {summary?.totalNumbers || 0} หมายเลข
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">ประเภทหวย</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{lotteryTypeData.length}</div>
                <p className="text-xs text-muted-foreground">ประเภท</p>
              </CardContent>
            </Card>
          </div>
          
          {/* Charts */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="col-span-4 lg:col-span-3">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>รายได้ประจำวัน</CardTitle>
                  <div className="flex space-x-2">
                    <Button 
                      variant={selectedDateRange === 'week' ? 'default' : 'outline'} 
                      size="sm"
                      onClick={() => setSelectedDateRange('week')}
                    >
                      7 วัน
                    </Button>
                    <Button 
                      variant={selectedDateRange === 'month' ? 'default' : 'outline'} 
                      size="sm"
                      onClick={() => setSelectedDateRange('month')}
                    >
                      30 วัน
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pl-2">
                <RevenueChart 
                  labels={chartData.revenueData.labels} 
                  values={chartData.revenueData.values} 
                />
              </CardContent>
            </Card>
            
            <Card className="col-span-4 lg:col-span-1">
              <CardHeader>
                <CardTitle>ประเภทหวย</CardTitle>
                <CardDescription>สัดส่วนยอดขายตามประเภทหวย</CardDescription>
              </CardHeader>
              <CardContent>
                <LotteryTypePie 
                  labels={chartData.lotteryTypeData.labels} 
                  values={chartData.lotteryTypeData.values} 
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="analytics" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>สถิติผู้ใช้งาน</CardTitle>
                <CardDescription>จำนวนผู้ใช้งานรายวัน</CardDescription>
              </CardHeader>
              <CardContent>
                <UserChart 
                  labels={dailyData.slice(0, 7).map(item => 
                    format(new Date(item.draw_date), 'EEE', { locale: th })
                  )}
                  newUsers={dailyData.slice(0, 7).map(item => item.total_bills)}
                  activeUsers={dailyData.slice(0, 7).map(item => item.total_numbers)}
                />
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>จำนวนบิลที่ขาย</CardTitle>
                <CardDescription>จำนวนบิลที่ขายได้ในแต่ละวัน</CardDescription>
              </CardHeader>
              <CardContent>
                <TicketChart 
                  labels={chartData.ticketData.labels} 
                  values={chartData.ticketData.values} 
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>รายงานระบบ</CardTitle>
              <CardDescription>ดูรายงานและข้อมูลสถิติต่างๆ</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Button 
                  variant="outline" 
                  className="h-20 flex flex-col items-center justify-center"
                  onClick={() => setSelectedDetail('revenue')}
                >
                  <TrendingUp className="h-6 w-6 mb-2" />
                  รายงานยอดขาย
                </Button>
                
                <Button 
                  variant="outline" 
                  className="h-20 flex flex-col items-center justify-center"
                  onClick={() => setSelectedDetail('users')}
                >
                  <Users className="h-6 w-6 mb-2" />
                  รายงานผู้ใช้งาน
                </Button>
                
                <Button 
                  variant="outline" 
                  className="h-20 flex flex-col items-center justify-center"
                  onClick={() => setSelectedDetail('tickets')}
                >
                  <Ticket className="h-6 w-6 mb-2" />
                  รายงานตั๋ว
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Detail Modal */}
      {selectedDetail && (
        <DetailModal 
          open={true}
          onClose={() => setSelectedDetail(null)}
          title={`รายงาน${selectedDetail === 'revenue' ? 'ยอดขาย' : selectedDetail === 'users' ? 'ผู้ใช้งาน' : 'ตั๋ว'}`}
        >
          <div className="space-y-4">
            <p>รายละเอียดรายงาน{selectedDetail === 'revenue' ? 'ยอดขาย' : selectedDetail === 'users' ? 'ผู้ใช้งาน' : 'ตั๋ว'}</p>
            {selectedDetail === 'revenue' && (
              <div>
                <h4 className="font-semibold mb-2">ยอดขายรายวัน</h4>
                <ul className="space-y-1">
                  {dailyData.slice(0, 7).map((day) => (
                    <li key={day.draw_date} className="flex justify-between">
                      <span>{format(new Date(day.draw_date), 'd MMM', { locale: th })}</span>
                      <span>{formatCurrency(day.total_purchase_amount)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {selectedDetail === 'users' && (
              <div>
                <h4 className="font-semibold mb-2">สถิติบิล</h4>
                <ul className="space-y-1">
                  {dailyData.slice(0, 7).map((day) => (
                    <li key={day.draw_date} className="flex justify-between">
                      <span>{format(new Date(day.draw_date), 'd MMM', { locale: th })}</span>
                      <span>บิล: {day.total_bills}, หมายเลข: {day.total_numbers}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {selectedDetail === 'tickets' && (
              <div>
                <h4 className="font-semibold mb-2">สรุปรายได้</h4>
                <ul className="space-y-1">
                  {dailyData.slice(0, 7).map((day) => (
                    <li key={day.draw_date} className="flex justify-between">
                      <span>{format(new Date(day.draw_date), 'd MMM', { locale: th })}</span>
                      <span>
                        ขาย: {formatCurrency(day.total_purchase_amount)}
                        <span className={`ml-2 ${day.net_profit_loss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {day.net_profit_loss >= 0 ? '▲' : '▼'} {formatCurrency(Math.abs(day.net_profit_loss))}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </DetailModal>
      )}
    </div>
  );
} 