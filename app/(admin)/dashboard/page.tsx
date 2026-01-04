"use client";

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  TrendingUp, 
  TrendingDown,
  Loader2, 
  RefreshCw,
  Calendar,
  Users,
  Ticket,
  Award,
  DollarSign
} from 'lucide-react';
import { fetchDashboardDataOptimized, type DashboardDataOptimized } from './dashboardDataOptimized';

// Format currency
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
};

export default function AdminDashboardFast() {
  const [data, setData] = useState<DashboardDataOptimized | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dateRange, setDateRange] = useState('week');

  const loadData = async () => {
    const startTime = Date.now();
    try {
      const result = await fetchDashboardDataOptimized(dateRange);
      setData(result);
      console.log(`⚡ UI updated in ${Date.now() - startTime}ms`);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    loadData();
  }, [dateRange]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-lg font-medium">กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p>ไม่พบข้อมูล</p>
      </div>
    );
  }

  const { summary, dailyStats, topUsers, lotteryTypes } = data;
  const isProfit = summary.netProfit >= 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex-1 space-y-6 p-4 md:p-8"
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between space-y-4 md:space-y-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            แดชบอร์ดผู้ดูแลระบบ
          </h1>
          <Badge variant="secondary" className="mt-2">
            <Calendar className="h-3 w-3 mr-1" />
            {dateRange === 'day' ? 'วันนี้' : dateRange === 'week' ? '7 วันล่าสุด' : dateRange === 'month' ? '30 วันล่าสุด' : '90 วันล่าสุด'}
          </Badge>
        </div>
        
        <div className="flex items-center space-x-3">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">วันนี้</SelectItem>
              <SelectItem value="week">7 วัน</SelectItem>
              <SelectItem value="month">30 วัน</SelectItem>
              <SelectItem value="quarter">90 วัน</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            รีเฟรช
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card className="border-0 shadow-lg">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-blue-600 rounded-t-lg"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ยอดซื้อรวม</CardTitle>
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-full">
              <TrendingUp className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary.totalSales)}</div>
            <p className="text-xs text-muted-foreground">{summary.totalBills} บิล</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-500 to-green-600 rounded-t-lg"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ยอดจ่ายรางวัล</CardTitle>
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-full">
              <Award className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary.totalPayout)}</div>
            <p className="text-xs text-muted-foreground">
              {summary.totalSales > 0 ? ((summary.totalPayout / summary.totalSales) * 100).toFixed(1) : 0}% ของยอดซื้อ
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <div className={`absolute top-0 left-0 w-full h-1 rounded-t-lg ${isProfit ? 'bg-gradient-to-r from-emerald-500 to-emerald-600' : 'bg-gradient-to-r from-red-500 to-red-600'}`}></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">กำไรสุทธิ</CardTitle>
            <div className={`p-2 rounded-full ${isProfit ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
              {isProfit ? <TrendingUp className="h-4 w-4 text-emerald-600" /> : <TrendingDown className="h-4 w-4 text-red-600" />}
            </div>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${isProfit ? 'text-emerald-600' : 'text-red-600'}`}>
              {formatCurrency(summary.netProfit)}
            </div>
            <p className="text-xs text-muted-foreground">
              {summary.totalSales > 0 ? ((summary.netProfit / summary.totalSales) * 100).toFixed(1) : 0}% margin
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 to-amber-600 rounded-t-lg"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">จำนวนบิล</CardTitle>
            <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-full">
              <Ticket className="h-4 w-4 text-amber-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalBills.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">รอดำเนินการ: {summary.totalPending}</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-purple-600 rounded-t-lg"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ค่าคอมมิชชั่น</CardTitle>
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-full">
              <DollarSign className="h-4 w-4 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{formatCurrency(summary.commissionTotal)}</div>
            <p className="text-xs text-muted-foreground">
              {summary.totalSales > 0 ? ((summary.commissionTotal / summary.totalSales) * 100).toFixed(1) : 0}% ของยอดซื้อ
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Lottery Types Stats */}
      {lotteryTypes.length > 0 && (
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Ticket className="h-5 w-5 mr-2" />
              ยอดขายตามประเภทหวย
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {lotteryTypes.slice(0, 6).map((type, index) => (
                <div key={index} className="p-4 bg-muted/50 rounded-lg border">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="font-medium text-foreground">{type.name}</p>
                      {type.country && (
                        <p className="text-xs text-muted-foreground">{type.country}</p>
                      )}
                    </div>
                    <Badge variant="secondary">{type.count} รายการ</Badge>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">ยอดขาย:</span>
                      <span className="font-medium">{formatCurrency(type.revenue)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">จ่ายรางวัล:</span>
                      <span className="font-medium">{formatCurrency(type.payout)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">กำไร:</span>
                      <span className={`font-bold ${type.profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {formatCurrency(type.profit)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Daily Stats Table */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle>สถิติรายวัน</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4">วันที่</th>
                  <th className="text-right py-3 px-4">ยอดซื้อ</th>
                  <th className="text-right py-3 px-4">ยอดจ่าย</th>
                  <th className="text-right py-3 px-4">กำไร/ขาดทุน</th>
                  <th className="text-right py-3 px-4">จำนวนบิล</th>
                </tr>
              </thead>
              <tbody>
                {dailyStats.slice(-10).reverse().map((day, index) => (
                  <tr key={day.date} className={index % 2 === 0 ? 'bg-muted/50' : ''}>
                    <td className="py-3 px-4">{day.date}</td>
                    <td className="text-right py-3 px-4">{formatCurrency(day.revenue)}</td>
                    <td className="text-right py-3 px-4">{formatCurrency(day.payout)}</td>
                    <td className={`text-right py-3 px-4 font-medium ${day.netProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {formatCurrency(day.netProfit)}
                    </td>
                    <td className="text-right py-3 px-4">{day.bills}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Top Users */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="h-5 w-5 mr-2" />
            ผู้ใช้ยอดซื้อสูงสุด
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {topUsers.slice(0, 5).map((user, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                    index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-amber-600' : 'bg-blue-500'
                  }`}>
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium">{user.name}</p>
                    <p className="text-xs text-muted-foreground">{user.branch}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold">{formatCurrency(user.totalSpent)}</p>
                  <p className="text-xs text-muted-foreground">{user.ticketCount} บิล</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
