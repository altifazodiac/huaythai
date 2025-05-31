import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BarChart3, CalendarDays, DollarSign, Ticket, TrendingUp, Users } from "lucide-react"

export default function AdminDashboardPage() {
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
                <div className="text-2xl font-bold">฿152,325</div>
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
                <CardTitle className="text-sm font-medium">ตั๋วที่ขายได้</CardTitle>
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
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">+573.7%</div>
                <p className="text-xs text-muted-foreground">+201 จากเดือนที่แล้ว</p>
              </CardContent>
            </Card>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="col-span-4">
              <CardHeader>
                <CardTitle>ภาพรวมรายได้</CardTitle>
              </CardHeader>
              <CardContent className="pl-2">
                <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                  กราฟแสดงรายได้จะแสดงที่นี่
                </div>
              </CardContent>
            </Card>
            <Card className="col-span-3">
              <CardHeader>
                <CardTitle>กิจกรรมล่าสุด</CardTitle>
                <CardDescription>มี 5 รายการที่ดำเนินการในวันนี้</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center">
                    <CalendarDays className="mr-2 h-4 w-4 text-muted-foreground" />
                    <div className="ml-2 space-y-1">
                      <p className="text-sm font-medium leading-none">เพิ่มผลสลากงวดใหม่</p>
                      <p className="text-sm text-muted-foreground">เมื่อ 2 ชั่วโมงที่แล้ว</p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <Users className="mr-2 h-4 w-4 text-muted-foreground" />
                    <div className="ml-2 space-y-1">
                      <p className="text-sm font-medium leading-none">ผู้ใช้ใหม่ลงทะเบียน</p>
                      <p className="text-sm text-muted-foreground">เมื่อ 4 ชั่วโมงที่แล้ว</p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <BarChart3 className="mr-2 h-4 w-4 text-muted-foreground" />
                    <div className="ml-2 space-y-1">
                      <p className="text-sm font-medium leading-none">สร้างรายงานประจำเดือน</p>
                      <p className="text-sm text-muted-foreground">เมื่อ 5 ชั่วโมงที่แล้ว</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        <TabsContent value="analytics" className="h-[400px] flex items-center justify-center text-muted-foreground">
          ข้อมูลการวิเคราะห์จะแสดงที่นี่
        </TabsContent>
        <TabsContent value="reports" className="h-[400px] flex items-center justify-center text-muted-foreground">
          รายงานจะแสดงที่นี่
        </TabsContent>
        <TabsContent value="notifications" className="h-[400px] flex items-center justify-center text-muted-foreground">
          การแจ้งเตือนจะแสดงที่นี่
        </TabsContent>
      </Tabs>
    </div>
  )
}
