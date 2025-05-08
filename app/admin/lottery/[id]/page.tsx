import { supabase } from "@/lib/supabase/supabaseClient"
import { Button } from "@/components/ui/button"
import { ChevronLeft, Edit } from "lucide-react"
import Link from "next/link"
import { format } from "date-fns"
import { th } from "date-fns/locale"
import { notFound } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export default async function LotteryDetailPage({ params }: { params: { id: string } }) {
  const { data: result, error } = await supabase.from("lottery_results").select("*").eq("id", params.id).single()

  if (error || !result) {
    notFound()
  }

  const { data: numbers } = await supabase
    .from("lottery_numbers")
    .select("*")
    .eq("lottery_result_id", params.id)
    .order("group_name", { ascending: true })

  // Group numbers by group_name
  const groupedNumbers: Record<string, string[]> = {}
  numbers?.forEach((number) => {
    if (!groupedNumbers[number.group_name]) {
      groupedNumbers[number.group_name] = []
    }
    groupedNumbers[number.group_name].push(number.lottery_number)
  })

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
        <h1 className="text-3xl font-bold">รายละเอียดผลสลากกินแบ่ง</h1>
        <Link href={`/admin/lottery/${params.id}/edit`}>
          <Button className="flex items-center gap-2">
            <Edit className="h-4 w-4" />
            <span>แก้ไข</span>
          </Button>
        </Link>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>ข้อมูลทั่วไป</CardTitle>
            <CardDescription>ข้อมูลพื้นฐานของผลสลากกินแบ่ง</CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">วันที่</dt>
                <dd className="mt-1 text-lg">
                  {format(new Date(result.lottery_date), "dd MMMM yyyy", { locale: th })}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">ชื่องวด</dt>
                <dd className="mt-1 text-lg">{result.lottery_name}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">รางวัลที่ 1</dt>
                <dd className="mt-1 text-lg font-bold">{result.first_prize}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">จำนวนเลขรางวัล</dt>
                <dd className="mt-1 text-lg">{numbers?.length || 0} รายการ</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>เลขรางวัล</CardTitle>
            <CardDescription>รายการเลขรางวัลทั้งหมด</CardDescription>
          </CardHeader>
          <CardContent>
            {Object.keys(groupedNumbers).length === 0 ? (
              <div className="text-center py-4 text-gray-500">ไม่พบข้อมูลเลขรางวัล</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ประเภทรางวัล</TableHead>
                    <TableHead>เลขรางวัล</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(groupedNumbers).map(([groupName, numbers]) => (
                    <TableRow key={groupName}>
                      <TableCell className="font-medium">{groupName}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-2">
                          {numbers.map((number, index) => (
                            <span key={index} className="px-2 py-1 bg-gray-100 rounded-md">
                              {number}
                            </span>
                          ))}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
