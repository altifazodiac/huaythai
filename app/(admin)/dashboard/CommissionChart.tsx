"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  DollarSign,
  Award,
  Building,
  Percent,
  Calendar,
  BarChart3
} from 'lucide-react';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';

interface CommissionData {
  total: number;
  totalPaid: number;
  totalPending: number;
  averageCommission: number;
  commissionRate: number;
  topEarners: Array<{
    id: string;
    name: string;
    branch: string;
    commissionRate: number;
    totalSales: number;
    totalCommission: number;
    paidCommission: number;
    pendingCommission: number;
    ticketCount: number;
    avgCommissionPerTicket: number;
  }>;
  dailyCommission: Array<{
    date: string;
    totalSales: number;
    totalCommission: number;
    paidCommission: number;
    pendingCommission: number;
    commissionRate: number;
    activeUsers: number;
  }>;
  commissionByBranch: Array<{
    branch: string;
    totalSales: number;
    totalCommission: number;
    paidCommission: number;
    pendingCommission: number;
    userCount: number;
    avgCommissionPerUser: number;
  }>;
  commissionTrends: Array<{
    date: string;
    commission: number;
    sales: number;
    commissionRate: number;
    growthRate: number;
  }>;
}

interface CommissionChartProps {
  data: CommissionData;
}

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
  return `${value.toFixed(2)}%`;
};

export default function CommissionChart({ data }: CommissionChartProps) {
  const {
    total,
    totalPaid,
    totalPending,
    averageCommission,
    commissionRate,
    topEarners,
    dailyCommission,
    commissionByBranch,
    commissionTrends
  } = data;

  const recentTrend = commissionTrends.length > 1 
    ? commissionTrends[0].growthRate 
    : 0;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ค่าคอมมิชชั่นรวม</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(total)}</div>
            <p className="text-xs text-muted-foreground">
              อัตราเฉลี่ย {formatPercentage(commissionRate)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">จ่ายแล้ว</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(totalPaid)}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatPercentage((totalPaid / total) * 100)} ของทั้งหมด
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ค้างจ่าย</CardTitle>
            <TrendingDown className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {formatCurrency(totalPending)}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatPercentage((totalPending / total) * 100)} ของทั้งหมด
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">เฉลี่ยต่อบิล</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(averageCommission)}</div>
            <p className="text-xs text-muted-foreground">
              {recentTrend > 0 ? '+' : ''}{formatPercentage(recentTrend)} จากวันก่อน
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Top Earners */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            พนักงานที่ได้ค่าคอมมิชชั่นสูงสุด
          </CardTitle>
          <CardDescription>
            แสดงรายชื่อพนักงานที่ได้ค่าคอมมิชชั่นสูงสุด 10 อันดับแรก
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {topEarners.slice(0, 10).map((earner, index) => (
              <div key={earner.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 bg-primary text-primary-foreground rounded-full text-sm font-bold">
                    {index + 1}
                  </div>
                  <div>
                    <div className="font-medium">{earner.name}</div>
                    <div className="text-sm text-muted-foreground flex items-center gap-2">
                      <Building className="h-3 w-3" />
                      {earner.branch}
                      <Badge variant="secondary" className="text-xs">
                        {formatPercentage(earner.commissionRate)}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold">{formatCurrency(earner.totalCommission)}</div>
                  <div className="text-sm text-muted-foreground">
                    {earner.ticketCount} บิล
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Commission by Branch */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            ค่าคอมมิชชั่นตามสาขา
          </CardTitle>
          <CardDescription>
            แสดงค่าคอมมิชชั่นแยกตามสาขา
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {commissionByBranch.map((branch) => (
              <div key={branch.branch} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <div className="font-medium">{branch.branch}</div>
                  <div className="text-sm text-muted-foreground">
                    {branch.userCount} พนักงาน
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold">{formatCurrency(branch.totalCommission)}</div>
                  <div className="text-sm text-muted-foreground">
                    {formatCurrency(branch.avgCommissionPerUser)} ต่อคน
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Daily Commission Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            ค่าคอมมิชชั่นรายวัน
          </CardTitle>
          <CardDescription>
            แสดงค่าคอมมิชชั่นที่ได้รับในแต่ละวัน
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {dailyCommission.slice(0, 7).map((day) => (
              <div key={day.date} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="font-medium">
                      {format(new Date(day.date), 'EEEE, d MMMM yyyy', { locale: th })}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {day.activeUsers} พนักงานที่ทำงาน
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold">{formatCurrency(day.totalCommission)}</div>
                  <div className="text-sm text-muted-foreground">
                    {formatPercentage(day.commissionRate)} ของยอดขาย
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 