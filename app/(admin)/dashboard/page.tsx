"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, Users, Ticket, TrendingUp, Settings, FileText } from 'lucide-react';

// Import components ที่มีอยู่
import RevenueChart from './RevenueChart';
import UserChart from './UserChart';
import TicketChart from './TicketChart';
import LotteryTypePie from './LotteryTypePie';
import DetailModal from './DetailModal';
import ExportButton from './ExportButton';

export default function AdminDashboard() {
  const [selectedDetail, setSelectedDetail] = useState<string | null>(null);
  
  // Sample data for charts
  const sampleRevenueData = {
    labels: ['จันทร์', 'อังคาร', 'พุธ', 'พฤหัส', 'ศุกร์', 'เสาร์', 'อาทิตย์'],
    values: [12000, 19000, 15000, 25000, 22000, 30000, 28000]
  };
  
  const sampleUserData = {
    labels: ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.'],
    newUsers: [120, 150, 180, 200, 250, 300],
    activeUsers: [800, 850, 900, 950, 1000, 1100]
  };
  
  const sampleTicketData = {
    labels: ['สัปดาห์ 1', 'สัปดาห์ 2', 'สัปดาห์ 3', 'สัปดาห์ 4'],
    values: [45000, 52000, 48000, 61000]
  };
  
  const sampleLotteryTypeData = {
    labels: ['หวยรัฐบาล', 'หวยหุ้น', 'หวยยี่กี', 'หวยลาว', 'หวยฮานอย'],
    values: [35, 25, 20, 12, 8]
  };
  
  // Sample export data
  const sampleExportData = [
    { date: '2024-01-01', revenue: 12000, tickets: 150 },
    { date: '2024-01-02', revenue: 19000, tickets: 220 },
    { date: '2024-01-03', revenue: 15000, tickets: 180 },
  ];

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight text-red-900">
          แดชบอร์ดผู้ดูแลระบบ
        </h2>
        <div className="flex items-center space-x-2">
          <ExportButton 
            data={sampleExportData}
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
                <div className="text-2xl font-bold">฿45,231.89</div>
                <p className="text-xs text-muted-foreground">+20.1% จากเดือนที่แล้ว</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">ผู้ใช้งาน</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">+2,350</div>
                <p className="text-xs text-muted-foreground">+180.1% จากเดือนที่แล้ว</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">ตั้วเลขที่ขาย</CardTitle>
                <Ticket className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">+12,234</div>
                <p className="text-xs text-muted-foreground">+19% จากเดือนที่แล้ว</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">อัตราการเติบโต</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">+573</div>
                <p className="text-xs text-muted-foreground">+201 จากเดือนที่แล้ว</p>
              </CardContent>
            </Card>
          </div>
          
          {/* Charts */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="col-span-4">
              <CardHeader>
                <CardTitle>ยอดขายรายวัน</CardTitle>
              </CardHeader>
              <CardContent className="pl-2">
                <RevenueChart 
                  labels={sampleRevenueData.labels}
                  values={sampleRevenueData.values}
                />
              </CardContent>
            </Card>
            
            <Card className="col-span-3">
              <CardHeader>
                <CardTitle>ประเภทลอตเตอรี่</CardTitle>
                <CardDescription>การกระจายตัวของประเภทลอตเตอรี่</CardDescription>
              </CardHeader>
              <CardContent>
                <LotteryTypePie 
                  labels={sampleLotteryTypeData.labels}
                  values={sampleLotteryTypeData.values}
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
                  labels={sampleUserData.labels}
                  newUsers={sampleUserData.newUsers}
                  activeUsers={sampleUserData.activeUsers}
                />
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>สถิติตั๋ว</CardTitle>
                <CardDescription>จำนวนตั๋วที่ขายรายวัน</CardDescription>
              </CardHeader>
              <CardContent>
                <TicketChart 
                  labels={sampleTicketData.labels}
                  values={sampleTicketData.values}
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
                  {sampleRevenueData.labels.map((label, index) => (
                    <li key={index} className="flex justify-between">
                      <span>{label}</span>
                      <span>฿{sampleRevenueData.values[index].toLocaleString()}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {selectedDetail === 'users' && (
              <div>
                <h4 className="font-semibold mb-2">สถิติผู้ใช้งาน</h4>
                <ul className="space-y-1">
                  {sampleUserData.labels.map((label, index) => (
                    <li key={index} className="flex justify-between">
                      <span>{label}</span>
                      <span>ใหม่: {sampleUserData.newUsers[index]}, Active: {sampleUserData.activeUsers[index]}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {selectedDetail === 'tickets' && (
              <div>
                <h4 className="font-semibold mb-2">ยอดขายตั๋ว</h4>
                <ul className="space-y-1">
                  {sampleTicketData.labels.map((label, index) => (
                    <li key={index} className="flex justify-between">
                      <span>{label}</span>
                      <span>฿{sampleTicketData.values[index].toLocaleString()}</span>
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