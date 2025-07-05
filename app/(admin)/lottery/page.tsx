import { LotteryResultsList } from "@/components/lottery/lottery-results-list"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import Link from "next/link"

export default async function LotteryAdminPage() {
  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">จัดการผลสลากกินแบ่ง</h1>
        <Link href="/admin/lottery/new">
          <Button className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            <span>เพิ่มผลสลากใหม่</span>
          </Button>
        </Link>
      </div>

      <LotteryResultsList />
    </div>
  )
}
