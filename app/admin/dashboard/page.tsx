"use client"
import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BarChart3, CalendarDays, DollarSign, Ticket, TrendingUp, Users } from "lucide-react"
import { fetchDashboardData } from './dashboardData'
import RevenueChart from './RevenueChart'
import UserChart from './UserChart'
import TicketChart from './TicketChart'
import LotteryTypePie from './LotteryTypePie'
import ExportButton from './ExportButton'
import DetailModal from './DetailModal'
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase/supabaseClient"
import { useRequireAuth } from "@/hooks/use-require-auth"

// คุณอาจต้องติดตั้ง chart.js หรือ recharts และสร้าง Chart component เพิ่มเติม
// ตัวอย่างนี้ใช้ pseudo component <BarChart />

export default function AdminDashboardPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<{ open: boolean, title: string, content: React.ReactNode }>({ open: false, title: '', content: null })
  const router = useRouter()

  useRequireAuth();

  useEffect(() => {
    fetchDashboardData().then(setData).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
      }
    };
    checkUser();
  }, [router]);

  if (loading) return <div className="p-10 text-center">กำลังโหลดข้อมูล...</div>
  if (!data) return <div className="p-10 text-center text-red-500">ไม่สามารถโหลดข้อมูลได้</div>

  // กราฟรายได้
  const revenueLabels = Object.keys(data.revenue.byDrawDate).sort()
  const revenueValues = revenueLabels.map(date => data.revenue.byDrawDate[date])

  // --- เพิ่มข้อมูลยอดขายต่อเดือนจาก Supabase (mock data ด้านล่างให้แทนด้วยข้อมูลจริงที่ query มา) ---
  const monthlySales = [
    { month: '2025-06', total_sales: 800 },
    { month: '2025-05', total_sales: 1000 },
  ]
  const latestMonth = monthlySales[0]?.month || ''
  const latestSales = monthlySales[0]?.total_sales || 0
  const monthNamesTH = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']
  const latestMonthText = latestMonth ? `${monthNamesTH[parseInt(latestMonth.slice(5,7))-1]} ${parseInt(latestMonth.slice(0,4))+543}` : ''

  // ตัวอย่างข้อมูลผู้ใช้รายเดือน (mock)
  const userMonthLabels = ["2025-04", "2025-05", "2025-06"]
  const userNew = [2, 1, data.users.newThisMonth]
  const userActive = [3, 2, data.users.active]

  // Pie Chart ประเภทหวย (mock)
  const lotteryTypeLabels = ["หวยรัฐบาล", "หวยหุ้น", "หวยยี่กี", "หวยลาว"]
  const lotteryTypeValues = [2, 1, 1, 0].slice(0, data.lotteryTypes)

  // กราฟยอดขายตั๋ว (mock: ใช้ revenueLabels/Values)
  const ticketLabels = revenueLabels
  const ticketValues = revenueValues

  // Export data ตัวอย่าง
  const exportRevenue = revenueLabels.map((d, i) => ({ วันที่: d, รายได้: revenueValues[i] }))
  const exportTickets = data.recentActivities.map((item: any) => ({
    เลข: item.numbers?.join(', '),
    ยอด: item.amount,
    วันที่: item.created_at?.slice(0, 19).replace('T', ' ')
  }))
  const exportUsers = [{ ผู้ใช้งานรวม: data.users.total, ใหม่เดือนนี้: data.users.newThisMonth, Active30วัน: data.users.active }]

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-8">แดชบอร์ดผู้ดูแลระบบ</h1>
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">ภาพรวม</TabsTrigger>
          <TabsTrigger value="analytics">วิเคราะห์</TabsTrigger>
          <TabsTrigger value="reports">รายงาน</TabsTrigger>
          <TabsTrigger value="notifications">การแจ้งเตือน</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">รายได้รวม</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-2xl font-bold">฿{latestSales.toLocaleString()} <span className="text-base font-normal">({latestMonthText})</span></div>
                  <ExportButton data={exportRevenue} filename="revenue.csv" />
                </div>
                <p className="text-xs text-muted-foreground">ยอดขายตั๋วที่ยืนยันแล้วต่อเดือน</p>
                <button className="text-xs underline mt-2" onClick={() => setModal({ open: true, title: 'รายละเอียดรายได้', content: <RevenueChart labels={monthlySales.map(m=>m.month)} values={monthlySales.map(m=>m.total_sales)} /> })}>ดูกราฟ</button>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">ผู้ใช้งาน</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-2xl font-bold">{data.users.total.toLocaleString()}</div>
                  <ExportButton data={exportUsers} filename="users.csv" />
                </div>
                <p className="text-xs text-muted-foreground">ใหม่เดือนนี้: {data.users.newThisMonth} | Active 30 วัน: {data.users.active}</p>
                <button className="text-xs underline mt-2" onClick={() => setModal({ open: true, title: 'ผู้ใช้งานใหม่และ Active', content: <UserChart labels={userMonthLabels} newUsers={userNew} activeUsers={userActive} /> })}>ดูกราฟ</button>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">ตั๋วที่ขายได้</CardTitle>
                <Ticket className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-2xl font-bold">{data.tickets.sold.toLocaleString()}</div>
                  <ExportButton data={exportTickets} filename="tickets.csv" />
                </div>
                <p className="text-xs text-muted-foreground">ยอดขาย: ฿{data.tickets.sales.toLocaleString()} | รอ: {data.tickets.pending}</p>
                <button className="text-xs underline mt-2" onClick={() => setModal({ open: true, title: 'ยอดขายตั๋ว', content: <TicketChart labels={ticketLabels} values={ticketValues} /> })}>ดูกราฟ</button>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">บิลถูกรางวัล</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.winning.total.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">จ่ายรางวัล: ฿{data.winning.totalPrize.toLocaleString()}</p>
              </CardContent>
            </Card>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="col-span-4">
              <CardHeader>
                <CardTitle>ภาพรวมรายได้</CardTitle>
              </CardHeader>
              <CardContent className="pl-2">
                <RevenueChart labels={revenueLabels} values={revenueValues} />
              </CardContent>
            </Card>
            <Card className="col-span-3">
              <CardHeader>
                <CardTitle>กิจกรรมล่าสุด</CardTitle>
                <CardDescription>5 รายการล่าสุด</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data.recentActivities.map((item: any, idx: number) => (
                    <div className="flex items-center" key={item.id || idx}>
                      <CalendarDays className="mr-2 h-4 w-4 text-muted-foreground" />
                      <div className="ml-2 space-y-1">
                        <p className="text-sm font-medium leading-none">เลข: {item.numbers?.join(', ') || '-'}</p>
                        <p className="text-xs text-muted-foreground">ยอด: ฿{item.amount?.toLocaleString()} | {item.created_at?.slice(0, 19).replace('T', ' ')}</p>
                      </div>
                    </div>
                  ))}
                  <ExportButton data={exportTickets} filename="recent_activities.csv" />
                </div>
              </CardContent>
            </Card>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mt-4">
            <Card>
              <CardHeader>
                <CardTitle>ธุรกรรมเครดิต 30 วัน</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.credit.totalTx} รายการ</div>
                <p className="text-xs text-muted-foreground">รวม: ฿{data.credit.totalAmount.toLocaleString()}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>ประเภทหวยในระบบ</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-2xl font-bold">{data.lotteryTypes}</div>
                  <ExportButton data={lotteryTypeLabels.map((l, i) => ({ ประเภท: l, จำนวน: lotteryTypeValues[i] }))} filename="lottery_types.csv" />
                </div>
                <p className="text-xs text-muted-foreground">ประเภทหวยที่เปิดให้บริการ</p>
                <button className="text-xs underline mt-2" onClick={() => setModal({ open: true, title: 'สัดส่วนประเภทหวย', content: <LotteryTypePie labels={lotteryTypeLabels} values={lotteryTypeValues} /> })}>ดูกราฟ</button>
              </CardContent>
            </Card>
          </div>
          <DetailModal open={modal.open} onClose={() => setModal({ ...modal, open: false })} title={modal.title}>
            {modal.content}
          </DetailModal>
        </TabsContent>
        <TabsContent value="analytics" className="h-[400px] flex flex-col items-center justify-center text-muted-foreground">
          <div className="w-full max-w-2xl">
            <UserChart labels={userMonthLabels} newUsers={userNew} activeUsers={userActive} />
          </div>
          <div className="w-full max-w-2xl mt-8">
            <TicketChart labels={ticketLabels} values={ticketValues} />
          </div>
          <div className="w-full max-w-2xl mt-8">
            <LotteryTypePie labels={lotteryTypeLabels} values={lotteryTypeValues} />
          </div>
        </TabsContent>
        <TabsContent value="reports" className="h-[400px] flex flex-col items-center justify-center text-muted-foreground">
          <div className="mb-4">Export รายงาน:</div>
          <ExportButton data={exportRevenue} filename="revenue.xlsx" type="xlsx">Export รายได้ (Excel)</ExportButton>
          <ExportButton data={exportTickets} filename="tickets.xlsx" type="xlsx">Export ตั๋ว (Excel)</ExportButton>
          <ExportButton data={exportUsers} filename="users.xlsx" type="xlsx">Export ผู้ใช้งาน (Excel)</ExportButton>
        </TabsContent>
        <TabsContent value="notifications" className="h-[400px] flex items-center justify-center text-muted-foreground">
          <div>การแจ้งเตือนจะแสดงที่นี่</div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
