import { LotteryForm } from "@/components/lottery/lottery-form"
import { Button } from "@/components/ui/button"
import { ChevronLeft } from "lucide-react"
import Link from "next/link"

export default function NewLotteryPage() {
  return (
    <div className="container mx-auto py-10">
      <div className="mb-8">
        <Link href="/admin/lottery">
          <Button variant="outline" className="flex items-center gap-2">
            <ChevronLeft className="h-4 w-4" />
            <span>กลับ</span>
          </Button>
        </Link>
      </div>

      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">เพิ่มผลสลากกินแบ่งใหม่</h1>
      </div>

      <LotteryForm />
    </div>
  )
}
