"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase/supabaseClient"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Trash2, Pencil } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

const formSchema = z.object({
  type_name: z.string().min(1, "กรุณากรอกชื่อประเภทรางวัล"),
  multiplication_factor: z.string().min(1, "กรุณากรอกตัวคูณ"),
  type_number: z.string().min(1, "กรุณากรอกลำดับที่"),
})

type FormValues = z.infer<typeof formSchema>

interface TicketSubType {
  id: string
  type_name: string
  multiplication_factor: number
  type_number: number
  created_at: string
  updated_at: string
}

export function LotterySubTypeForm() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [subTypes, setSubTypes] = useState<TicketSubType[]>([])
  const [selectedSubType, setSelectedSubType] = useState<TicketSubType | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      type_name: "",
      multiplication_factor: "",
      type_number: "",
    },
  })

  useEffect(() => {
    fetchSubTypes()
  }, [])

  const fetchSubTypes = async () => {
    try {
      const { data, error } = await supabase
        .from("ticket_sub_types")
        .select("*")
        .order("type_number")

      if (error) throw error
      setSubTypes(data || [])
    } catch (error) {
      console.error("Error fetching sub types:", error)
      toast.error("ไม่สามารถดึงข้อมูลประเภทรางวัลได้")
    } finally {
      setIsLoading(false)
    }
  }

  const onSubmit = async (values: FormValues) => {
    try {
      setIsSubmitting(true)
      
      const subTypeData = {
        type_name: values.type_name,
        multiplication_factor: parseInt(values.multiplication_factor),
        type_number: parseInt(values.type_number),
      }

      if (selectedSubType) {
        // Update existing sub type
        const { error } = await supabase
          .from("ticket_sub_types")
          .update(subTypeData)
          .eq("id", selectedSubType.id)

        if (error) throw error
        toast.success("อัปเดตประเภทรางวัลสำเร็จ")
      } else {
        // Create new sub type
        const { error } = await supabase
          .from("ticket_sub_types")
          .insert([subTypeData])

        if (error) throw error
        toast.success("เพิ่มประเภทรางวัลสำเร็จ")
      }

      setIsDialogOpen(false)
      form.reset()
      setSelectedSubType(null)
      fetchSubTypes()
    } catch (error) {
      console.error("Error saving sub type:", error)
      toast.error("ไม่สามารถบันทึกข้อมูลได้")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = (subType: TicketSubType) => {
    setSelectedSubType(subType)
    form.reset({
      type_name: subType.type_name,
      multiplication_factor: subType.multiplication_factor.toString(),
      type_number: subType.type_number.toString(),
    })
    setIsDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm("คุณต้องการลบประเภทรางวัลนี้ใช่หรือไม่?")) return

    try {
      const { error } = await supabase
        .from("ticket_sub_types")
        .delete()
        .eq("id", id)

      if (error) throw error
      toast.success("ลบประเภทรางวัลสำเร็จ")
      fetchSubTypes()
    } catch (error) {
      console.error("Error deleting sub type:", error)
      toast.error("ไม่สามารถลบข้อมูลได้")
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold tracking-tight">จัดการประเภทรางวัล</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              เพิ่มประเภทรางวัล
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{selectedSubType ? "แก้ไขประเภทรางวัล" : "เพิ่มประเภทรางวัล"}</DialogTitle>
              <DialogDescription>
                กรอกข้อมูลประเภทรางวัลที่ต้องการเพิ่มหรือแก้ไข
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="type_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ชื่อประเภทรางวัล</FormLabel>
                      <FormControl>
                        <Input placeholder="เช่น รางวัลที่ 1" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="multiplication_factor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ตัวคูณ</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="เช่น 80" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="type_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ลำดับที่</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="เช่น 1" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "กำลังบันทึก..." : "บันทึก"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>รายการประเภทรางวัล</CardTitle>
          <CardDescription>รายการประเภทรางวัลทั้งหมดในระบบ</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ลำดับที่</TableHead>
                <TableHead>ชื่อประเภทรางวัล</TableHead>
                <TableHead>ตัวคูณ</TableHead>
                <TableHead className="text-right">จัดการ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subTypes.map((subType) => (
                <TableRow key={subType.id}>
                  <TableCell>{subType.type_number}</TableCell>
                  <TableCell>{subType.type_name}</TableCell>
                  <TableCell>{subType.multiplication_factor}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(subType)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(subType.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
} 