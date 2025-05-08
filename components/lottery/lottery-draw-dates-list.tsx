"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase/supabaseClient"
import { format } from "date-fns"
import { th } from "date-fns/locale"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Trash2 } from "lucide-react"
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

interface LotteryDrawDate {
  id: string
  draw_date: string
  created_at: string
}

export function LotteryDrawDatesList() {
  const [drawDates, setDrawDates] = useState<LotteryDrawDate[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDrawDates = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from("lottery_draw_dates")
        .select("*")
        .order("draw_date", { ascending: false })

      if (error) throw error
      setDrawDates(data || [])
    } catch (err: any) {
      setError(err.message)
      toast.error(`เกิดข้อผิดพลาด: ${err.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchDrawDates()
  }, [])

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("lottery_draw_dates").delete().eq("id", id)

      if (error) throw error

      toast.success("ลบข้อมูลสำเร็จ")
      fetchDrawDates()
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

  if (drawDates.length === 0) {
    return <div className="text-center py-8">ไม่พบข้อมูลวันที่ออกสลาก</div>
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>วันที่</TableHead>
            <TableHead>วันที่สร้าง</TableHead>
            <TableHead className="text-right">จัดการ</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {drawDates.map((date) => (
            <TableRow key={date.id}>
              <TableCell className="font-medium">
                {format(new Date(date.draw_date), "dd MMMM yyyy", { locale: th })}
              </TableCell>
              <TableCell>{format(new Date(date.created_at), "dd MMM yyyy HH:mm", { locale: th })}</TableCell>
              <TableCell className="text-right">
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
                        คุณต้องการลบวันที่ออกสลาก {format(new Date(date.draw_date), "dd MMMM yyyy", { locale: th })} ใช่หรือไม่?
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDelete(date.id)}>ยืนยัน</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
