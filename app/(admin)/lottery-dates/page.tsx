import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus } from "lucide-react"
import Link from "next/link"
import { LotteryDrawDatesList } from "@/components/lottery/lottery-draw-dates-list"

export default function LotteryDrawDatesPage() {
  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">จัดการวันที่ออกสลาก</h1>
        <Link href="/admin/lottery-dates/new">
          <Button className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            <span>เพิ่มวันที่ออกสลาก</span>
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>วันที่ออกสลากทั้งหมด</CardTitle>
          <CardDescription>วันที่ออกสลากที่กำหนดไว้ในระบบ จะถูกใช้ในการเลือกวันที่เมื่อเพิ่มผลสลากใหม่</CardDescription>
        </CardHeader>
        <CardContent>
          <LotteryDrawDatesList />
        </CardContent>
      </Card>
    </div>
  )
}
