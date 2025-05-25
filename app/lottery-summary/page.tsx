"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase/supabaseClient"
import { AppSidebar } from "@/components/app-sidebar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { DirectionProvider } from "@radix-ui/react-direction"
import { Separator } from "@/components/ui/separator"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { format, isValid } from "date-fns"
import { th } from "date-fns/locale"
import { toZonedTime } from "date-fns-tz"
import { FileDown, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import * as XLSX from "xlsx"
import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const THAILAND_TZ = "Asia/Bangkok"

interface SummaryStats {
  totalPurchases: number
  totalTickets: number
  totalWinningTickets: number
  totalNonWinningTickets: number
  totalPurchaseAmount: number
  totalWinningAmount: number
  totalPaidAmount: number
  totalUnpaidAmount: number
  winningRate: number
  averageTicketPrice: number
  averageWinningAmount: number
  ticketTypeBreakdown: {
    [key: string]: {
      total: number
      winning: number
      amount: number
      winningAmount: number
    }
  }
  purchaseDateBreakdown: {
    [key: string]: {
      total: number
      winning: number
      amount: number
      winningAmount: number
    }
  }
}

export default function LotterySummaryPage() {
  const [latestLottery, setLatestLottery] = useState<any>(null)
  const [summaryStats, setSummaryStats] = useState<SummaryStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isExporting, setIsExporting] = useState(false)

  const convertUtcToThailandTime = (utcDateString: string) => {
    const utcDate = new Date(utcDateString)
    return toZonedTime(utcDate, THAILAND_TZ)
  }

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      try {
        // Get user
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser()
        if (userError || !user) {
          setError("กรุณาเข้าสู่ระบบเพื่อดูสรุปผล")
          return
        }

        // Get latest lottery
        const { data: lotteryData, error: lotteryError } = await supabase
          .from("lottery_results")
          .select(`
            *,
            lottery_draws (id, draw_date),
            ticket_sub_types (type_name)
          `)
          .order("draw_id", { ascending: false })
          .limit(1)
          .single()

        if (lotteryError) throw new Error(`ไม่พบข้อมูลผลสลากล่าสุด: ${lotteryError.message}`)

        setLatestLottery({
          ...lotteryData,
          lottery_date: lotteryData.lottery_draws.draw_date,
        })

        const lotteryDate = new Date(lotteryData.lottery_draws.draw_date)
        if (!isValid(lotteryDate)) {
          throw new Error(`วันที่ไม่ถูกต้อง: ${lotteryData.lottery_draws.draw_date}`)
        }

        // Get all ticket purchases for this lottery
        const { data: ticketData, error: ticketError } = await supabase
          .from("ticket_purchases")
          .select(`
            id,
            transaction_id,
            user_id,
            ticket_set_name,
            ticket_set_number,
            created_at,
            purchase_date,
            deleted_at,
            ticket_purchase_items (
              id,
              ticket_sub_type_id,
              ticket_number,
              amount,
              price,
              total,
              created_at,
              ticket_sub_types (type_name, id)
            )
          `)
          .eq("user_id", user.id)
          .is("deleted_at", null)
          .order("purchase_date", { ascending: false })

        if (ticketError) throw new Error(`ไม่สามารถดึงข้อมูลการซื้อตั๋ว: ${ticketError.message}`)

        // Get winning tickets
        const { data: winningTickets, error: winningError } = await supabase
          .from("winning_tickets")
          .select(`
            *,
            winning_ticket_details (*)
          `)
          .eq("user_id", user.id)
          .eq("lottery_date", format(lotteryDate, "yyyy-MM-dd"))

        if (winningError) throw new Error(`ไม่สามารถดึงข้อมูลตั๋วที่ถูกรางวัล: ${winningError.message}`)

        // Calculate summary statistics
        const stats: SummaryStats = {
          totalPurchases: 0,
          totalTickets: 0,
          totalWinningTickets: 0,
          totalNonWinningTickets: 0,
          totalPurchaseAmount: 0,
          totalWinningAmount: 0,
          totalPaidAmount: 0,
          totalUnpaidAmount: 0,
          winningRate: 0,
          averageTicketPrice: 0,
          averageWinningAmount: 0,
          ticketTypeBreakdown: {},
          purchaseDateBreakdown: {},
        }

        // Process ticket purchases
        ticketData.forEach((purchase) => {
          const purchaseDate = format(convertUtcToThailandTime(purchase.purchase_date), "yyyy-MM-dd")
          
          if (!stats.purchaseDateBreakdown[purchaseDate]) {
            stats.purchaseDateBreakdown[purchaseDate] = {
              total: 0,
              winning: 0,
              amount: 0,
              winningAmount: 0,
            }
          }

          purchase.ticket_purchase_items.forEach((item: any) => {
            const subTypeName = item.ticket_sub_types?.type_name || "Unknown"
            
            if (!stats.ticketTypeBreakdown[subTypeName]) {
              stats.ticketTypeBreakdown[subTypeName] = {
                total: 0,
                winning: 0,
                amount: 0,
                winningAmount: 0,
              }
            }

            stats.totalTickets++
            stats.totalPurchaseAmount += Number(item.amount)
            stats.ticketTypeBreakdown[subTypeName].total++
            stats.ticketTypeBreakdown[subTypeName].amount += Number(item.amount)
            stats.purchaseDateBreakdown[purchaseDate].total++
            stats.purchaseDateBreakdown[purchaseDate].amount += Number(item.amount)
          })

          stats.totalPurchases++
        })

        // สร้าง map: ticket_number+user_id+purchase_date => purchase_date
        const ticketKeyToPurchaseDate: Record<string, string> = {}
        ticketData.forEach((purchase) => {
          const purchaseDate = format(convertUtcToThailandTime(purchase.purchase_date), "yyyy-MM-dd")
          purchase.ticket_purchase_items.forEach((item: any) => {
            // ใช้ key ที่ unique: user_id + ticket_number + purchase_date
            const key = `${purchase.user_id}_${item.ticket_number}_${purchaseDate}`
            ticketKeyToPurchaseDate[key] = purchaseDate
          })
        })

        // วน winningTickets/winning_ticket_details
        winningTickets.forEach((winningTicket) => {
          winningTicket.winning_ticket_details.forEach((detail: any) => {
            // ใช้ key เดียวกับข้างบน
            const key = `${winningTicket.user_id}_${detail.ticket_number}`
            // หา purchase_date ที่ตรงกับ key นี้
            // วนหาทุกวันที่มีใน ticketKeyToPurchaseDate
            let foundDate = null
            for (const k in ticketKeyToPurchaseDate) {
              if (k.startsWith(key)) {
                foundDate = ticketKeyToPurchaseDate[k]
                break
              }
            }
            if (foundDate && stats.purchaseDateBreakdown[foundDate]) {
              stats.purchaseDateBreakdown[foundDate].winning += 1
              stats.purchaseDateBreakdown[foundDate].winningAmount += Number(detail.total)
            }
          })
        })

        // Process winning tickets
        winningTickets.forEach((winningTicket) => {
          const winningAmount = winningTicket.total_winnings
          stats.totalWinningAmount += winningAmount
          stats.totalWinningTickets += winningTicket.winning_ticket_details.length

          if (winningTicket.is_paid) {
            stats.totalPaidAmount += winningAmount
          } else {
            stats.totalUnpaidAmount += winningAmount
          }

          winningTicket.winning_ticket_details.forEach((detail: any) => {
            const subTypeName = detail.sub_type_name
            if (stats.ticketTypeBreakdown[subTypeName]) {
              stats.ticketTypeBreakdown[subTypeName].winning++
              stats.ticketTypeBreakdown[subTypeName].winningAmount += detail.total
            }
          })
        })

        // Calculate derived statistics
        stats.totalNonWinningTickets = stats.totalTickets - stats.totalWinningTickets
        stats.winningRate = (stats.totalWinningTickets / stats.totalTickets) * 100
        stats.averageTicketPrice = stats.totalPurchaseAmount / stats.totalTickets
        stats.averageWinningAmount = stats.totalWinningTickets > 0 ? stats.totalWinningAmount / stats.totalWinningTickets : 0

        setSummaryStats(stats)
      } catch (err: any) {
        setError(`เกิดข้อผิดพลาด: ${err.message}`)
        toast.error(`เกิดข้อผิดพลาด: ${err.message}`, { position: "top-center" })
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  const exportToExcel = () => {
    if (!summaryStats || !latestLottery) return

    try {
      setIsExporting(true)

      // Prepare data for Excel
      const wb = XLSX.utils.book_new()

      // Summary sheet
      const summaryData = [
        ["สรุปผลการซื้อตั๋วและถูกรางวัล"],
        ["งวดวันที่", format(new Date(latestLottery.lottery_date), "dd MMM yyyy", { locale: th })],
        [],
        ["ข้อมูลทั่วไป"],
        ["จำนวนการซื้อทั้งหมด", summaryStats.totalPurchases, "ครั้ง"],
        ["จำนวนตั๋วทั้งหมด", summaryStats.totalTickets, "ใบ"],
        ["จำนวนตั๋วที่ถูกรางวัล", summaryStats.totalWinningTickets, "ใบ"],
        ["จำนวนตั๋วที่ไม่ถูกรางวัล", summaryStats.totalNonWinningTickets, "ใบ"],
        ["อัตราการถูกรางวัล", summaryStats.winningRate.toFixed(2), "%"],
        [],
        ["ข้อมูลเงิน"],
        ["ยอดซื้อตั๋วทั้งหมด", summaryStats.totalPurchaseAmount.toLocaleString("th-TH"), "บาท"],
        ["ยอดถูกรางวัลทั้งหมด", summaryStats.totalWinningAmount.toLocaleString("th-TH"), "บาท"],
        ["ยอดจ่ายแล้ว", summaryStats.totalPaidAmount.toLocaleString("th-TH"), "บาท"],
        ["ยอดยังไม่ได้จ่าย", summaryStats.totalUnpaidAmount.toLocaleString("th-TH"), "บาท"],
        ["ราคาตั๋วเฉลี่ย", summaryStats.averageTicketPrice.toLocaleString("th-TH"), "บาท"],
        ["รางวัลเฉลี่ยต่อใบ", summaryStats.averageWinningAmount.toLocaleString("th-TH"), "บาท"],
      ]

      const ws = XLSX.utils.aoa_to_sheet(summaryData)
      XLSX.utils.book_append_sheet(wb, ws, "สรุปผล")

      // Ticket type breakdown sheet
      const typeData = [
        ["ประเภทตั๋ว", "จำนวนทั้งหมด", "จำนวนที่ถูกรางวัล", "ยอดซื้อ", "ยอดถูกรางวัล"],
        ...Object.entries(summaryStats.ticketTypeBreakdown).map(([type, data]) => [
          type,
          data.total,
          data.winning,
          data.amount.toLocaleString("th-TH"),
          data.winningAmount.toLocaleString("th-TH"),
        ]),
      ]

      const typeWs = XLSX.utils.aoa_to_sheet(typeData)
      XLSX.utils.book_append_sheet(wb, typeWs, "แยกตามประเภท")

      // Purchase date breakdown sheet
      const dateData = [
        ["วันที่ซื้อ", "จำนวนตั๋ว", "จำนวนที่ถูกรางวัล", "ยอดซื้อ", "ยอดถูกรางวัล"],
        ...Object.entries(summaryStats.purchaseDateBreakdown).map(([date, data]) => [
          format(new Date(date), "dd MMM yyyy", { locale: th }),
          data.total,
          data.winning,
          data.amount.toLocaleString("th-TH"),
          data.winningAmount.toLocaleString("th-TH"),
        ]),
      ]

      const dateWs = XLSX.utils.aoa_to_sheet(dateData)
      XLSX.utils.book_append_sheet(wb, dateWs, "แยกตามวันที่")

      // Generate Excel file
      const fileName = `สรุปผลการซื้อตั๋ว_${format(new Date(latestLottery.lottery_date), "yyyyMMdd")}.xlsx`
      XLSX.writeFile(wb, fileName)

      toast.success("ดาวน์โหลดไฟล์ Excel สำเร็จ", { position: "top-center" })
    } catch (error) {
      console.error("Error exporting to Excel:", error)
      toast.error("เกิดข้อผิดพลาดในการดาวน์โหลดไฟล์ Excel", { position: "top-center" })
    } finally {
      setIsExporting(false)
    }
  }

  const exportToPDF = () => {
    if (!summaryStats || !latestLottery) return

    try {
      setIsExporting(true)

      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      })

      // Add title
      doc.setFontSize(16)
      doc.text("สรุปผลการซื้อตั๋วและถูกรางวัล", 14, 20)
      doc.setFontSize(12)
      doc.text(`งวดวันที่: ${format(new Date(latestLottery.lottery_date), "dd MMM yyyy", { locale: th })}`, 14, 30)

      // Add summary table
      autoTable(doc, {
        startY: 40,
        head: [["รายการ", "จำนวน", "หน่วย"]],
        body: [
          ["จำนวนการซื้อทั้งหมด", summaryStats.totalPurchases.toString(), "ครั้ง"],
          ["จำนวนตั๋วทั้งหมด", summaryStats.totalTickets.toString(), "ใบ"],
          ["จำนวนตั๋วที่ถูกรางวัล", summaryStats.totalWinningTickets.toString(), "ใบ"],
          ["จำนวนตั๋วที่ไม่ถูกรางวัล", summaryStats.totalNonWinningTickets.toString(), "ใบ"],
          ["อัตราการถูกรางวัล", `${summaryStats.winningRate.toFixed(2)}%`, ""],
        ],
        theme: "grid",
        headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: "bold" },
      })

      // Add financial summary
      autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 10,
        head: [["รายการ", "จำนวนเงิน", "หน่วย"]],
        body: [
          ["ยอดซื้อตั๋วทั้งหมด", summaryStats.totalPurchaseAmount.toLocaleString("th-TH"), "บาท"],
          ["ยอดถูกรางวัลทั้งหมด", summaryStats.totalWinningAmount.toLocaleString("th-TH"), "บาท"],
          ["ยอดจ่ายแล้ว", summaryStats.totalPaidAmount.toLocaleString("th-TH"), "บาท"],
          ["ยอดยังไม่ได้จ่าย", summaryStats.totalUnpaidAmount.toLocaleString("th-TH"), "บาท"],
          ["ราคาตั๋วเฉลี่ย", summaryStats.averageTicketPrice.toLocaleString("th-TH"), "บาท"],
          ["รางวัลเฉลี่ยต่อใบ", summaryStats.averageWinningAmount.toLocaleString("th-TH"), "บาท"],
        ],
        theme: "grid",
        headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: "bold" },
      })

      // Add ticket type breakdown
      autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 10,
        head: [["ประเภทตั๋ว", "จำนวนทั้งหมด", "จำนวนที่ถูกรางวัล", "ยอดซื้อ", "ยอดถูกรางวัล"]],
        body: Object.entries(summaryStats.ticketTypeBreakdown).map(([type, data]) => [
          type,
          data.total.toString(),
          data.winning.toString(),
          data.amount.toLocaleString("th-TH"),
          data.winningAmount.toLocaleString("th-TH"),
        ]),
        theme: "grid",
        headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: "bold" },
      })

      // Add purchase date breakdown
      autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 10,
        head: [["วันที่ซื้อ", "จำนวนตั๋ว", "จำนวนที่ถูกรางวัล", "ยอดซื้อ", "ยอดถูกรางวัล"]],
        body: Object.entries(summaryStats.purchaseDateBreakdown)
          .sort(([dateA], [dateB]) => new Date(dateB).getTime() - new Date(dateA).getTime())
          .map(([date, data]) => [
            format(new Date(date), "dd MMM yyyy", { locale: th }),
            data.total.toString(),
            data.winning.toString(),
            data.amount.toLocaleString("th-TH"),
            data.winningAmount.toLocaleString("th-TH"),
          ]),
        theme: "grid",
        headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: "bold" },
      })

      // Save PDF
      const fileName = `สรุปผลการซื้อตั๋ว_${format(new Date(latestLottery.lottery_date), "yyyyMMdd")}.pdf`
      doc.save(fileName)

      toast.success("ดาวน์โหลดไฟล์ PDF สำเร็จ", { position: "top-center" })
    } catch (error) {
      console.error("Error exporting to PDF:", error)
      toast.error("เกิดข้อผิดพลาดในการดาวน์โหลดไฟล์ PDF", { position: "top-center" })
    } finally {
      setIsExporting(false)
    }
  }

  if (error) return <div className="container mx-auto p-4 text-red-500">{error}</div>
  if (isLoading || !summaryStats || !latestLottery)
    return (
      <div className="container mx-auto p-4 flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="text-muted-foreground">กำลังโหลด...</p>
        </div>
      </div>
    )

  let formattedDate = "วันที่ไม่ระบุ"
  try {
    const lotteryDate = new Date(latestLottery.lottery_date)
    if (isValid(lotteryDate)) {
      formattedDate = latestLottery.lottery_name || format(lotteryDate, "dd MMM yyyy", { locale: th })
    }
  } catch (e) {
    console.error("Date formatting error:", e)
  }

  return (
    <DirectionProvider dir="ltr">
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset className="bg-background">
          <header className="flex h-16 shrink-0 items-center gap-2 border-b bg-background transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
            <div className="flex items-center gap-2 px-4">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem className="hidden md:block">
                    <BreadcrumbLink href="/">แดชบอร์ด</BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator className="hidden md:block" />
                  <BreadcrumbItem>
                    <BreadcrumbPage>สรุปผลการซื้อตั๋ว</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>
          </header>

          <div className="container mx-auto p-4 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold">สรุปผลการซื้อตั๋วและถูกรางวัล</h1>
                <p className="text-muted-foreground">งวดวันที่: {formattedDate}</p>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" disabled={isExporting}>
                    {isExporting ? (
                      <>
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-1"></div>
                        กำลังดาวน์โหลด...
                      </>
                    ) : (
                      <>
                        <FileDown className="h-4 w-4 mr-1" />
                        ดาวน์โหลด
                      </>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>เลือกรูปแบบไฟล์</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={exportToExcel}>
                    <FileDown className="h-4 w-4 mr-2" />
                    Excel (.xlsx)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={exportToPDF}>
                    <FileText className="h-4 w-4 mr-2" />
                    PDF (.pdf)
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">จำนวนการซื้อทั้งหมด</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{summaryStats.totalPurchases}</div>
                  <p className="text-xs text-muted-foreground">ครั้ง</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">จำนวนตั๋วทั้งหมด</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{summaryStats.totalTickets}</div>
                  <p className="text-xs text-muted-foreground">ใบ</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">จำนวนตั๋วที่ถูกรางวัล</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{summaryStats.totalWinningTickets}</div>
                  <p className="text-xs text-muted-foreground">
                    {summaryStats.winningRate.toFixed(2)}% ของตั๋วทั้งหมด
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">จำนวนตั๋วที่ไม่ถูกรางวัล</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-500">{summaryStats.totalNonWinningTickets}</div>
                  <p className="text-xs text-muted-foreground">
                    {(100 - summaryStats.winningRate).toFixed(2)}% ของตั๋วทั้งหมด
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">ยอดซื้อตั๋วทั้งหมด</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{summaryStats.totalPurchaseAmount.toLocaleString("th-TH")}</div>
                  <p className="text-xs text-muted-foreground">บาท</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">ยอดถูกรางวัลทั้งหมด</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {summaryStats.totalWinningAmount.toLocaleString("th-TH")}
                  </div>
                  <p className="text-xs text-muted-foreground">บาท</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">ยอดจ่ายแล้ว</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {summaryStats.totalPaidAmount.toLocaleString("th-TH")}
                  </div>
                  <p className="text-xs text-muted-foreground">บาท</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">ยอดยังไม่ได้จ่าย</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-500">
                    {summaryStats.totalUnpaidAmount.toLocaleString("th-TH")}
                  </div>
                  <p className="text-xs text-muted-foreground">บาท</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>สรุปตามประเภทตั๋ว</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(summaryStats.ticketTypeBreakdown).map(([type, data]) => (
                      <div key={type} className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{type}</p>
                          <p className="text-sm text-muted-foreground">
                            ถูกรางวัล {data.winning} จาก {data.total} ใบ
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{data.amount.toLocaleString("th-TH")} บาท</p>
                          <p className="text-sm text-green-600">{data.winningAmount.toLocaleString("th-TH")} บาท</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>สรุปตามวันที่ซื้อ</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(summaryStats.purchaseDateBreakdown)
                      .sort(([dateA], [dateB]) => new Date(dateB).getTime() - new Date(dateA).getTime())
                      .map(([date, data]) => (
                        <div key={date} className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{format(new Date(date), "dd MMM yyyy", { locale: th })}</p>
                            <p className="text-sm text-muted-foreground">
                              ถูกรางวัล {data.winning} จาก {data.total} ใบ
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">{data.amount.toLocaleString("th-TH")} บาท</p>
                            <p className="text-sm text-green-600">{data.winningAmount.toLocaleString("th-TH")} บาท</p>
                          </div>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </DirectionProvider>
  )
} 