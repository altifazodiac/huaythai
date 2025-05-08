"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase/supabaseClient"
import { format } from "date-fns"
import { th } from "date-fns/locale"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Edit, Trash2, Eye } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { toast } from "sonner"

interface LotteryResult {
  id: string
  lottery_date: string
  lottery_name: string
  first_prize: string
  created_at: string
  updated_at: string
  _count?: {
    lottery_numbers: number
  }
}

export function LotteryResultsList() {
  const [results, setResults] = useState<LotteryResult[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchResults = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from("lottery_results")
        .select(`
          *,
          _count: lottery_numbers(count)
        `)
        .order("lottery_date", { ascending: false })

      if (error) throw error
      setResults(data || [])
    } catch (err: any) {
      setError(err.message)
      toast.error(`เกิดข้อผิดพลาด: ${err.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchResults()
  }, [])

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("lottery_results").delete().eq("id", id)

      if (error) throw error

      toast.success("ลบข้อมูลสำเร็จ")
      fetchResults()
    } catch (err: any) {
      toast.error(`ลบข้อมูลไม่สำเร็จ: ${err.message}`)
    }
  }

  if (error) {
    return <div className="text-red-500">{error}</div>
  }

  if (isLoading) {
    return <div className="text-center py-8">กำลังโหลด...</div>
  }

  if (results.length === 0) {
    return <div className="text-center py-8">ไม่พบข้อมูลผลสลากกินแบ่ง</div>
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>วันที่</TableHead>
            <TableHead>ชื่องวด</TableHead>
            <TableHead>รางวัลที่ 1</TableHead>
            <TableHead>จำนวนเลขรางวัล</TableHead>
            <TableHead className="text-right">จัดการ</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {results.map((result) => (
            <TableRow key={result.id}>
              <TableCell>{format(new Date(result.lottery_date), "dd MMM yyyy", { locale: th })}</TableCell>
              <TableCell>{result.lottery_name}</TableCell>
              <TableCell>{result.first_prize}</TableCell>
              <TableCell>{result._count?.lottery_numbers || 0}</TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Link href={`/admin/lottery/${result.id}`}>
                    <Button variant="outline" size="icon">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Link href={`/admin/lottery/${result.id}/edit`}>
                    <Button variant="outline" size="icon">
                      <Edit className="h-4 w-4" />
                    </Button>
                  </Link>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="icon">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>ยืนยันการลบข้อมูล</AlertDialogTitle>
                        <AlertDialogDescription>
                          คุณต้องการลบผลสลากกินแบ่งงวดวันที่{" "}
                          {format(new Date(result.lottery_date), "dd MMM yyyy", { locale: th })} ใช่หรือไม่?
                          การลบข้อมูลนี้จะลบเลขรางวัลทั้งหมดที่เกี่ยวข้องด้วย
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(result.id)}>ยืนยัน</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
