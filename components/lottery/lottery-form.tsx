"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase/supabaseClient"
import { zodResolver } from "@hookform/resolvers/zod"
import { useFieldArray, useForm } from "react-hook-form"
import { z } from "zod"
import { format, isValid } from "date-fns"
import { th } from "date-fns/locale"
import { CalendarIcon, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"

interface TicketSubType {
  id: string
  type_name: string
  multiplication_factor: number
}

interface LotteryDrawDate {
  id: string
  draw_date: string
}

const lotteryNumberSchema = z.object({
  id: z.string().optional(),
  group_name: z.string().min(1, "กรุณาเลือกประเภทรางวัล"),
  lottery_number: z.string().min(1, "กรุณากรอกเลขรางวัล"),
})

const formSchema = z.object({
  lottery_date: z.date({
    required_error: "กรุณาเลือกวันที่",
  }),
  lottery_name: z.string().min(1, "กรุณากรอกชื่องวด"),
  first_prize: z.string().min(1, "กรุณากรอกเลขรางวัลที่ 1"),
  lottery_numbers: z.array(lotteryNumberSchema),
})

type FormValues = z.infer<typeof formSchema>

interface LotteryFormProps {
  initialData?: {
    id: string
    lottery_date: string
    lottery_name: string
    first_prize: string
    lottery_numbers: {
      id: string
      group_name: string
      lottery_number: string
    }[]
  }
}

export function LotteryForm({ initialData }: LotteryFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [ticketSubTypes, setTicketSubTypes] = useState<TicketSubType[]>([])
  const [drawDates, setDrawDates] = useState<LotteryDrawDate[]>([])
  const [error, setError] = useState<string | null>(null)
  const [availableDates, setAvailableDates] = useState<string[]>([])

  // ดึงข้อมูลประเภทรางวัลและวันที่ออกสลาก
// Update the fetchData function in useEffect
useEffect(() => {
  const fetchData = async () => {
    setIsLoading(true)
    try {
      // Get current year's start and end dates
      const currentYear = new Date().getFullYear()
      const startDate = `${currentYear}-01-01`
      const endDate = `${currentYear}-12-31`

      // Fetch ticket sub types
      const { data: subTypesData, error: subTypesError } = await supabase
        .from("ticket_sub_types")
        .select("id, type_name, multiplication_factor")
        .order("type_name")

      if (subTypesError) throw new Error(`ไม่สามารถดึงข้อมูลประเภทรางวัล: ${subTypesError.message}`)

      setTicketSubTypes(subTypesData || [])

      // Fetch lottery draw dates for current year
      const { data: drawDatesData, error: drawDatesError } = await supabase
        .from("lottery_draw_dates")
        .select("id, draw_date")
        .gte('draw_date', startDate)
        .lte('draw_date', endDate)
        .order("draw_date", { ascending: false })

      if (drawDatesError) throw new Error(`ไม่สามารถดึงข้อมูลวันที่ออกสลาก: ${drawDatesError.message}`)

      console.log("Draw dates from DB:", drawDatesData)

      // Store LotteryDrawDate objects
      setDrawDates(drawDatesData || [])

      // Create array of available dates for calendar
      const dateStrings = drawDatesData?.map((item) =>
        new Date(item.draw_date).toISOString().split("T")[0]
      ) || []
      setAvailableDates(dateStrings)

      if (drawDatesData?.length === 0) {
        console.warn("ไม่พบข้อมูลวันที่ออกสลากในปีปัจจุบัน")
        toast.warning("ไม่พบข้อมูลวันที่ออกสลากในปีปัจจุบัน")
      }
    } catch (err: any) {
      console.error("Error fetching data:", err)
      setError(err.message)
      toast.error(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  fetchData()
}, [])

  // สร้างชื่องวดอัตโนมัติจากวันที่
  const generateLotteryName = (date: Date): string => {
    if (!isValid(date)) return ""
    return `งวดวันที่ ${format(date, "d MMMM yyyy", { locale: th })}`
  }

  // ฟังก์ชันตรวจสอบว่าวันที่อยู่ในรายการวันที่ที่อนุญาตหรือไม่
  const isDateAvailable = (date: Date): boolean => {
    if (!date || !isValid(date) || availableDates.length === 0) return false

    const dateString = date.toISOString().split("T")[0]
    return availableDates.includes(dateString)
  }

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData
      ? {
          lottery_date: new Date(initialData.lottery_date),
          lottery_name: initialData.lottery_name,
          first_prize: initialData.first_prize,
          lottery_numbers: initialData.lottery_numbers,
        }
      : {
          lottery_date: drawDates.length > 0 ? new Date(drawDates[0].draw_date) : new Date(),
          lottery_name: "",
          first_prize: "",
          lottery_numbers: [{ group_name: "", lottery_number: "" }],
        },
  })

  // อัพเดทชื่องวดอัตโนมัติเมื่อเลือกวันที่
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === "lottery_date" && value.lottery_date) {
        const date = value.lottery_date as Date
        if (isValid(date) && !initialData) {
          form.setValue("lottery_name", generateLotteryName(date))
        }
      }
    })

    return () => subscription.unsubscribe()
  }, [form, initialData])

  // อัพเดทค่าเริ่มต้นของฟอร์มเมื่อโหลดข้อมูลเสร็จ
  useEffect(() => {
    if (!isLoading && drawDates.length > 0 && !initialData) {
      form.setValue("lottery_date", new Date(drawDates[0].draw_date))
      form.setValue("lottery_name", generateLotteryName(new Date(drawDates[0].draw_date)))
    }
  }, [isLoading, drawDates, form, initialData])

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "lottery_numbers",
  })

  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true)
    try {
      const formattedDate = format(values.lottery_date, "yyyy-MM-dd")

      if (initialData) {
        // Update existing lottery result
        const { error: resultError } = await supabase
          .from("lottery_results")
          .update({
            lottery_date: formattedDate,
            lottery_name: values.lottery_name,
            first_prize: values.first_prize,
            updated_at: new Date().toISOString(),
          })
          .eq("id", initialData.id)

        if (resultError) throw resultError

        // Delete existing lottery numbers
        const { error: deleteError } = await supabase
          .from("lottery_numbers")
          .delete()
          .eq("lottery_result_id", initialData.id)

        if (deleteError) throw deleteError

        // Insert new lottery numbers
        const { error: numbersError } = await supabase.from("lottery_numbers").insert(
          values.lottery_numbers.map((number) => ({
            lottery_result_id: initialData.id,
            group_name: number.group_name,
            lottery_number: number.lottery_number,
          })),
        )

        if (numbersError) throw numbersError

        toast.success("อัพเดทข้อมูลสำเร็จ")
        router.push(`/admin/lottery/${initialData.id}`)
      } else {
        // Insert new lottery result
        const { data: resultData, error: resultError } = await supabase
          .from("lottery_results")
          .insert({
            lottery_date: formattedDate,
            lottery_name: values.lottery_name,
            first_prize: values.first_prize,
          })
          .select()
          .single()

        if (resultError) throw resultError

        // Insert lottery numbers
        const { error: numbersError } = await supabase.from("lottery_numbers").insert(
          values.lottery_numbers.map((number) => ({
            lottery_result_id: resultData.id,
            group_name: number.group_name,
            lottery_number: number.lottery_number,
          })),
        )

        if (numbersError) throw numbersError

        toast.success("เพิ่มข้อมูลสำเร็จ")
        router.push(`/admin/lottery/${resultData.id}`)
      }
    } catch (error: any) {
      toast.error(`เกิดข้อผิดพลาด: ${error.message}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-600">
        <p>เกิดข้อผิดพลาด: {error}</p>
        <Button variant="outline" className="mt-2" onClick={() => router.push("/admin/lottery")}>
          กลับไปหน้าจัดการผลสลาก
        </Button>
      </div>
    )
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>ข้อมูลทั่วไป</CardTitle>
            <CardDescription>ข้อมูลพื้นฐานของผลสลากกินแบ่ง</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
          
<FormField
  control={form.control}
  name="lottery_date"
  render={({ field }) => (
    <FormItem>
      <FormLabel>วันที่</FormLabel>
      <Select 
        onValueChange={(value) => {
          const date = new Date(value);
          field.onChange(date);
        }}
        value={field.value?.toISOString()}
      >
        <FormControl>
          <SelectTrigger>
            <SelectValue placeholder="เลือกวันที่">
              {field.value ? format(field.value, "dd MMMM yyyy", { locale: th }) : "เลือกวันที่"}
            </SelectValue>
          </SelectTrigger>
        </FormControl>
        <SelectContent>
          {isLoading ? (
            <SelectItem value="loading-state">
              <Skeleton className="h-4 w-[100px]" />
            </SelectItem>
          ) : (
            drawDates.map((date) => (
              <SelectItem 
                key={date.id} 
                value={date.draw_date}
              >
                {format(new Date(date.draw_date), "dd MMMM yyyy", { locale: th })}
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>
      <FormDescription>
        {availableDates.length > 0 
          ? `มีวันที่ออกสลากทั้งหมด ${availableDates.length} วัน` 
          : "วันที่ประกาศผลสลากกินแบ่ง"}
      </FormDescription>
      <FormMessage />
    </FormItem>
  )}
/>

            <FormField
              control={form.control}
              name="lottery_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ชื่องวด</FormLabel>
                  <FormControl>
                    <Input placeholder="เช่น งวดวันที่ 16 พฤษภาคม 2566" {...field} />
                  </FormControl>
                  <FormDescription>ชื่อที่ใช้แสดงสำหรับงวดนี้</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="first_prize"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>รางวัลที่ 1</FormLabel>
                  <FormControl>
                    <Input placeholder="เช่น 123456" {...field} />
                  </FormControl>
                  <FormDescription>เลขรางวัลที่ 1 ของงวดนี้</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>เลขรางวัล</CardTitle>
            <CardDescription>รายการเลขรางวัลทั้งหมด</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-end gap-4">
                    <div className="flex-1">
                      <Skeleton className="h-10 w-full mb-1" />
                      <Skeleton className="h-8 w-full" />
                    </div>
                    <div className="flex-1">
                      <Skeleton className="h-10 w-full mb-1" />
                      <Skeleton className="h-8 w-full" />
                    </div>
                    <Skeleton className="h-10 w-10" />
                  </div>
                ))}
              </div>
            ) : (
              <>
                {fields.map((field, index) => (
                  <div key={field.id} className="flex items-end gap-4">
                    <FormField
                      control={form.control}
                      name={`lottery_numbers.${index}.group_name`}
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormLabel>ประเภทรางวัล</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="เลือกประเภทรางวัล" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {ticketSubTypes.map((type) => (
                                <SelectItem key={type.id} value={type.type_name}>
                                  {type.type_name} (x{type.multiplication_factor})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name={`lottery_numbers.${index}.lottery_number`}
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormLabel>เลขรางวัล</FormLabel>
                          <FormControl>
                            <Input placeholder="เช่น 123" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => remove(index)}
                      disabled={fields.length === 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}

                <Button
                  type="button"
                  variant="outline"
                  className="flex items-center gap-2"
                  onClick={() => append({ group_name: "", lottery_number: "" })}
                >
                  <Plus className="h-4 w-4" />
                  <span>เพิ่มเลขรางวัล</span>
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={isSubmitting || isLoading}>
            {isSubmitting ? "กำลังบันทึก..." : initialData ? "อัพเดท" : "บันทึก"}
          </Button>
        </div>
      </form>
    </Form>
  )
}
