"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase/supabaseClient"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { format } from "date-fns"
import { th } from "date-fns/locale"
import { CalendarIcon } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

const formSchema = z.object({
  draw_date: z.date({
    required_error: "กรุณาเลือกวันที่",
  }),
})

type FormValues = z.infer<typeof formSchema>

export function LotteryDrawDateForm() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      draw_date: new Date(),
    },
  })

  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true)
    try {
      const formattedDate = format(values.draw_date, "yyyy-MM-dd")

      // ตรวจสอบว่ามีวันที่นี้อยู่แล้วหรือไม่
      const { data: existingDate, error: checkError } = await supabase
        .from("lottery_draw_dates")
        .select("id")
        .eq("draw_date", formattedDate)
        .maybeSingle()

      if (checkError) throw checkError

      if (existingDate) {
        toast.error("วันที่นี้มีอยู่ในระบบแล้ว")
        setIsSubmitting(false)
        return
      }

      // เพิ่มวันที่ออกสลากใหม่
      const { error } = await supabase.from("lottery_draw_dates").insert({
        draw_date: formattedDate,
      })

      if (error) throw error

      toast.success("เพิ่มวันที่ออกสลากสำเร็จ")
      router.push("/admin/lottery-dates")
    } catch (error: any) {
      toast.error(`เกิดข้อผิดพลาด: ${error.message}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>ข้อมูลวันที่ออกสลาก</CardTitle>
            <CardDescription>กำหนดวันที่ออกสลากสำหรับใช้ในระบบ</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="draw_date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>วันที่ออกสลาก</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                        >
                          {field.value ? format(field.value, "dd MMMM yyyy", { locale: th }) : <span>เลือกวันที่</span>}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                    </PopoverContent>
                  </Popover>
                  <FormDescription>วันที่ที่จะมีการออกสลากกินแบ่ง</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "กำลังบันทึก..." : "บันทึก"}
          </Button>
        </div>
      </form>
    </Form>
  )
}
